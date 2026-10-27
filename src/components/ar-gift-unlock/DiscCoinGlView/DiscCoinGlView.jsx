import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { applyFloaterIdleMotion } from "../../../animations/FloaterIdleMotion/floaterIdleMotion.js";
import "./DiscCoinGlView.css";

const COIN_MODEL_URL = "/3DModels/coin-new2.glb";

function disposeObjectTree(root) {
  root.traverse((child) => {
    if (child.isMesh) {
      child.geometry?.dispose();
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      mats.forEach((m) => m?.dispose?.());
    }
  });
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

function DiscCoinGlView({
  className = "",
  idleMotion = true,
  cameraZ = 2.58,
  modelUnitScale = 1.15,
}) {
  const containerRef = useRef(null);
  const hoverRef = useRef(false);
  const idleMotionRef = useRef(idleMotion);
  idleMotionRef.current = idleMotion;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    let cancelled = false;
    let contentRoot = null;
    let frameId = 0;

    const reduceMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const getReduceMotion = () => reduceMotionQuery.matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, cameraZ);

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

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const light = new THREE.DirectionalLight(0xffffff, 1.8);
    light.position.set(2, 3.5, 2);
    scene.add(light);

    const fillWest = new THREE.DirectionalLight(0xffffff, 0.9);
    fillWest.position.set(-3.5, 1.5, 0.5);
    scene.add(fillWest);

    const fillEast = new THREE.DirectionalLight(0xffffff, 0.9);
    fillEast.position.set(3.5, 1.5, 0.5);
    scene.add(fillEast);

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      COIN_MODEL_URL,
      (gltf) => {
        if (cancelled) {
          disposeObjectTree(gltf.scene);
          return;
        }
        const anchor = wrapNormalizeAndCenter(gltf.scene, modelUnitScale);
        contentRoot = anchor;
        scene.add(anchor);
      },
      undefined,
      () => {},
    );

    const clock = new THREE.Clock();
    const basePosition = new THREE.Vector3(0, 0, 0);

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) {
        return;
      }
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
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
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      if (contentRoot && idleMotionRef.current) {
        applyFloaterIdleMotion(contentRoot, {
          delta,
          elapsed,
          hoverActive: hoverRef.current,
          reduceMotion: getReduceMotion(),
          basePosition,
        });
      }
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      if (contentRoot) {
        scene.remove(contentRoot);
        disposeObjectTree(contentRoot);
      }
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [cameraZ, modelUnitScale]);

  const rootClass = ["disc-coin-gl-view", className].filter(Boolean).join(" ");

  return (
    <div
      className={rootClass}
      onPointerEnter={() => {
        hoverRef.current = true;
      }}
      onPointerLeave={() => {
        hoverRef.current = false;
      }}
    >
      <div ref={containerRef} className="disc-coin-gl-view__mount" />
    </div>
  );
}

export default DiscCoinGlView;
