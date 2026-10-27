import { useEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import coinMp3Url from "../../assets/sounds/coin.mp3";
import "./CoinFall.css";

const COIN_MODEL_URL = `${import.meta.env.BASE_URL}3DModels/coin-new2.glb`;
const COIN_SOUND_VOLUME = 0.45;

const COIN_COUNT = 7;
const MODEL_UNIT_SCALE = 1.52;
const CAMERA_FOV = 42;
/** Minimum camera Z when auto-fit runs (full stack must stay in frustum). */
const CAMERA_Z_MIN = 5;
const CAMERA_Z_MAX = 28;
const FALL_DURATION_S = 0.65;
/** Delay before the next coin starts falling (more = clearer one-after-another drops). */
const STAGGER_S = 0.21;
/** Align each coin hit with landing (tween end), not drop start. */
const COIN_SOUND_DELAY_AFTER_STAGGER_S = FALL_DURATION_S;
/** How far above the rest pose each coin starts — longer = more visible fall. */
const DROP_RISE = 2.95;
/**
 * Negative Y shifts the whole stack down in the frame (uses space below) without moving camera off Z.
 */
const STACK_SHIFT_Y = -1.48;
/** Max |x| / |z| offset at rest so the pile isn’t one column (scene units). */
const COIN_LAND_XZ_JITTER = 0.095;
/** Tiny rest Y wobble so the stack isn’t perfectly level. */
const COIN_Y_REST_JITTER = 0.038;
/** Per-coin multiplier range for how high the drop starts (varies fall distance on Y). */
const DROP_RISE_MUL_MIN = 0.82;
const DROP_RISE_MUL_MAX = 1.14;
/** Extra XZ offset at drop start vs rest so the path isn’t purely vertical. */
const DROP_START_XZ_EXTRA = 0.048;
/** Rotate +90° on X so the disc lies flat on the stack (face in XZ). Use `-Math.PI / 2` if it reads flipped. */
const COIN_FLAT_ROT_X_RAD = Math.PI / 2;

function jitterSigned(maxAbs) {
  return (Math.random() - 0.5) * 2 * maxAbs;
}

function disposeStackResources(stackGroup) {
  const geoms = new Set();
  const mats = new Set();
  stackGroup.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) {
        geoms.add(child.geometry);
      }
      const ms = Array.isArray(child.material)
        ? child.material
        : [child.material];
      ms.forEach((m) => m && mats.add(m));
    }
  });
  geoms.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
}

function wrapNormalizeAndCenter(gltfRoot, unitScale) {
  const anchor = new THREE.Group();
  anchor.add(gltfRoot);
  anchor.updateWorldMatrix(true, true);
  const size = new THREE.Box3()
    .setFromObject(anchor)
    .getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  anchor.scale.setScalar((1 / maxDim) * unitScale);
  anchor.updateWorldMatrix(true, true);
  const centre = new THREE.Box3()
    .setFromObject(anchor)
    .getCenter(new THREE.Vector3());
  anchor.position.sub(centre);
  return anchor;
}

function snapBottomToWorldY(root, worldBottomY) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) {
    return;
  }
  root.position.y += worldBottomY - box.min.y;
}

/**
 * Vertical distance from bottom to top of one coin in world Y after it sits on the floor.
 * (Using min(x,y,z) was wrong for this mesh — it underestimated the stack step and coins merged.)
 */
function stackStepAlongWorldY(coin) {
  coin.position.set(0, 0, 0);
  snapBottomToWorldY(coin, 0);
  coin.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(coin);
  if (box.isEmpty()) {
    coin.position.set(0, 0, 0);
    return 0.02;
  }
  const step = box.max.y - box.min.y;
  coin.position.set(0, 0, 0);
  return step > 1e-6 ? step : 0.02;
}

/**
 * Coins stack with random XZ + slight Y rest variation; each drop uses varied rise and a slight diagonal into rest.
 *
 * @param {{ playIteration?: number }} props — increment to replay.
 */
function CoinFall({ playIteration = 0 }) {
  const containerRef = useRef(null);
  const playKeyRef = useRef(playIteration);
  playKeyRef.current = playIteration;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    let cancelled = false;
    let frameId = 0;
    let stackTl = null;
    const coins = [];
    const coinSoundTimeoutIds = [];

    const clearCoinSoundTimeouts = () => {
      coinSoundTimeoutIds.forEach((id) => window.clearTimeout(id));
      coinSoundTimeoutIds.length = 0;
    };

    const scheduleCoinSoundsInSuccession = (count) => {
      clearCoinSoundTimeouts();
      for (let i = 0; i < count; i += 1) {
        const id = window.setTimeout(() => {
          if (cancelled) {
            return;
          }
          const audio = new Audio(coinMp3Url);
          audio.volume = COIN_SOUND_VOLUME;
          void audio.play().catch(() => {});
        }, (i * STAGGER_S + COIN_SOUND_DELAY_AFTER_STAGGER_S) * 1000);
        coinSoundTimeoutIds.push(id);
      }
    };

    const reduceMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
    camera.position.set(0, 0, CAMERA_Z_MIN);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.domElement.className = "disc-coin-gl-view__canvas";
    renderer.domElement.style.pointerEvents = "none";
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const light = new THREE.DirectionalLight(0xffffff, 1.8);
    light.position.set(2, 3.5, 2);
    scene.add(light);
    const fillWest = new THREE.DirectionalLight(0xffffff, 0.9);
    fillWest.position.set(-3.5, 1.5, 0.5);
    scene.add(fillWest);
    const fillEast = new THREE.DirectionalLight(0xffffff, 0.9);
    fillEast.position.set(3.5, 1.5, 0.5);
    scene.add(fillEast);

    const stackGroup = new THREE.Group();
    scene.add(stackGroup);

    const fitCameraToStack = () => {
      if (coins.length === 0) {
        return;
      }
      stackGroup.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(stackGroup);
      if (box.isEmpty()) {
        return;
      }
      const size = box.getSize(new THREE.Vector3());
      const fovRad = (camera.fov * Math.PI) / 180;
      const tanHalf = Math.tan(fovRad / 2);
      const margin = 1.15;
      const distY = ((size.y / 2) * margin) / tanHalf;
      const distX =
        ((size.x / 2) * margin) / (tanHalf * Math.max(0.4, camera.aspect));
      camera.position.set(
        0,
        0,
        Math.min(CAMERA_Z_MAX, Math.max(CAMERA_Z_MIN, Math.max(distY, distX))),
      );
    };

    const startStackPlayback = (reduceMotion) => {
      clearCoinSoundTimeouts();
      stackTl?.kill();
      stackTl = null;
      if (coins.length === 0) {
        return;
      }

      stackGroup.position.set(0, 0, 0);

      coins.forEach((coin) => {
        coin.position.set(0, 0, 0);
        coin.rotation.set(COIN_FLAT_ROT_X_RAD, 0, 0);
      });

      const stackStep = stackStepAlongWorldY(coins[0]);

      coins.forEach((coin, i) => {
        snapBottomToWorldY(coin, i * stackStep);
        let yRest = coin.position.y;
        yRest += jitterSigned(COIN_Y_REST_JITTER);
        const xRest = jitterSigned(COIN_LAND_XZ_JITTER);
        const zRest = jitterSigned(COIN_LAND_XZ_JITTER);
        coin.userData.xRest = xRest;
        coin.userData.yRest = yRest;
        coin.userData.zRest = zRest;
        const riseMul =
          DROP_RISE_MUL_MIN +
          Math.random() * (DROP_RISE_MUL_MAX - DROP_RISE_MUL_MIN);
        if (reduceMotion) {
          coin.position.set(xRest, yRest, zRest);
        } else {
          coin.position.set(
            xRest + jitterSigned(DROP_START_XZ_EXTRA),
            yRest + DROP_RISE * riseMul,
            zRest + jitterSigned(DROP_START_XZ_EXTRA),
          );
        }
      });

      stackGroup.position.set(0, STACK_SHIFT_Y, 0);

      fitCameraToStack();

      if (reduceMotion) {
        return;
      }

      stackTl = gsap.timeline();
      scheduleCoinSoundsInSuccession(coins.length);
      coins.forEach((coin, i) => {
        stackTl.to(
          coin.position,
          {
            x: coin.userData.xRest,
            y: coin.userData.yRest,
            z: coin.userData.zRest,
            duration: FALL_DURATION_S,
            ease: "power2.in",
          },
          i * STAGGER_S,
        );
      });
    };

    let lastPlayKey = playKeyRef.current;

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      COIN_MODEL_URL,
      (gltf) => {
        if (cancelled) {
          gltf.scene.traverse((child) => {
            if (child.isMesh) {
              child.geometry?.dispose();
              const ms = Array.isArray(child.material)
                ? child.material
                : [child.material];
              ms.forEach((m) => m?.dispose?.());
            }
          });
          return;
        }
        const proto = wrapNormalizeAndCenter(gltf.scene, MODEL_UNIT_SCALE);
        proto.rotation.set(COIN_FLAT_ROT_X_RAD, 0, 0);
        coins.length = 0;
        coins.push(proto);
        stackGroup.add(proto);
        for (let i = 1; i < COIN_COUNT; i += 1) {
          const c = proto.clone(true);
          coins.push(c);
          stackGroup.add(c);
        }
        lastPlayKey = playKeyRef.current;
        startStackPlayback(reduceMotionQuery.matches);
      },
      undefined,
      () => {},
    );

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) {
        return;
      }
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (coins.length > 0) {
        fitCameraToStack();
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();
    requestAnimationFrame(resize);
    requestAnimationFrame(() => requestAnimationFrame(resize));

    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      if (cancelled) {
        return;
      }
      const pk = playKeyRef.current;
      if (pk !== lastPlayKey && coins.length > 0) {
        lastPlayKey = pk;
        startStackPlayback(reduceMotionQuery.matches);
      }
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelled = true;
      clearCoinSoundTimeouts();
      stackTl?.kill();
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      scene.remove(stackGroup);
      disposeStackResources(stackGroup);
      stackGroup.clear();
      coins.length = 0;
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="coin-fall" aria-hidden="true">
      <div ref={containerRef} className="coin-fall__stage" />
    </div>
  );
}

export default CoinFall;
