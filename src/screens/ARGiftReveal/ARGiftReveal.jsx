import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import TapHintLoop from "../../animations/TapHintLoop/TapHintLoop.jsx";
import { WediscovrHeaderLogo } from "../../components/common/WediscovrTopHeader/WediscovrTopHeader.jsx";
import WarningGlassCard from "../../components/common/WarningGlassCard/WarningGlassCard.jsx";
import { primeSuccessSound } from "../../behaviours/sound.js";
import { buildFinalDiscProgressMilestone } from "../../lib/buildFinalDiscProgressMilestone.js";
import {
  useCamera,
  CAMERA_BATTERY_WARNING_RESUME,
  CAMERA_BATTERY_WARNING_TITLE,
} from "../../hooks/useCamera.js";
import {
  applyDeviceOrientationToObject3D,
  DEFAULT_ABSOLUTE_BETA_MAX,
} from "../../lib/applyDeviceOrientationToObject3D.js";
import {
  applyArRevealProductPbrMaterials,
  applyGiftBoxMaterialsFromCss,
} from "../../lib/giftBoxMaterials.js";
import { createARConfetti } from "../../lib/ARConfetti.js";
import { AR_CONFETTI_CONFIG } from "../../lib/ARConfettiConfig.js";
import {
  giftRevealConfigAR,
  runGiftRevealTimeline,
} from "../../lib/giftRevealTimeline.js";
import GiftDropSuccess, {
  GIFT_DROP_TICK_DRAW_MS,
} from "../../components/ar-gift-unlock/GiftDropSuccess/GiftDropSuccess.jsx";
import { avoidOrphanLastLine } from "../TapToUnlock/utils.tsx";
import "../ClueDetail/ClueDetail.css";
import "./ARGiftReveal.css";

const AR_MODEL_SCALE = 1.25;
const GIFT_UNIT = 0.45 * AR_MODEL_SCALE;
const PRODUCT_UNIT = 0.35 * AR_MODEL_SCALE;
const PRODUCT_HIDDEN_SCALE = 0.5;
const PRODUCT_EXTRA_FRONT_YAW_DEG = -80;
const AR_TILT_SCALE_ROLL_BEFORE_REVEAL = 1.25;
const AR_TILT_SCALE_ROLL_AFTER_REVEAL = 1.95;
const UNLOCK_CONFETTI_DELAY_MS = 750;
const UNLOCK_LABEL_DELAY_MS = UNLOCK_CONFETTI_DELAY_MS + 200;
const LABEL_SECONDARY_LOCKED = "Gift Waiting";
const TAP_TO_UNLOCK_HINT = "Tap to Unlock";
const TAP_TO_ADD_DROPS_HINT = "Tap to Add to Drops";
const ADDED_TO_DROPS_LABEL = "Added to Drops";

function wrapNormalizeAndCenter(gltfRoot, unitScale = 1) {
  const anchor = new THREE.Group();
  anchor.add(gltfRoot);
  anchor.updateWorldMatrix(true, true);
  const size = new THREE.Box3()
    .setFromObject(anchor)
    .getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const appliedScale = (1 / maxDim) * unitScale;
  anchor.scale.setScalar(appliedScale);
  anchor.updateWorldMatrix(true, true);
  const centre = new THREE.Box3()
    .setFromObject(anchor)
    .getCenter(new THREE.Vector3());
  anchor.position.sub(centre);
  return anchor;
}

function ARGiftReveal({
  brandLogo,
  brandName = "Brand",
  giftProductName = "",
  huntStartDiscPoints = 0,
  initialDiscPoints = 0,
  onFlowComplete,
  onMotionUnavailable,
}) {
  const containerRef = useRef(null);
  const modelRef = useRef(null);
  const motionReceivedRef = useRef(false);
  const fallbackFiredRef = useRef(false);
  const onMotionUnavailableRef = useRef(onMotionUnavailable);
  const onFlowCompleteRef = useRef(onFlowComplete);
  const arFlowPhaseRef = useRef("unlock");
  const discBaselineRef = useRef(initialDiscPoints);
  const huntStartDiscPointsRef = useRef(huntStartDiscPoints);
  const addToDropsInFlightRef = useRef(false);
  const successMilestoneRef = useRef(null);

  const [arFlowPhase, setArFlowPhase] = useState("unlock");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [tapHintVisible, setTapHintVisible] = useState(true);

  const setIsUnlockedRef = useRef(setIsUnlocked);
  const setTapHintVisibleRef = useRef(setTapHintVisible);
  const { videoRef, startCamera, releaseCameraMedia, batteryCameraOff } =
    useCamera();
  const batteryCameraOffRef = useRef(batteryCameraOff);

  useEffect(() => {
    discBaselineRef.current = initialDiscPoints;
  }, [initialDiscPoints]);

  useEffect(() => {
    huntStartDiscPointsRef.current = huntStartDiscPoints;
  }, [huntStartDiscPoints]);

  useEffect(() => {
    arFlowPhaseRef.current = arFlowPhase;
  }, [arFlowPhase]);

  useEffect(() => {
    onFlowCompleteRef.current = onFlowComplete;
  }, [onFlowComplete]);

  const performAddToDrops = useCallback(async () => {
    if (
      batteryCameraOffRef.current ||
      addToDropsInFlightRef.current ||
      arFlowPhaseRef.current !== "add-drops"
    ) {
      return;
    }
    addToDropsInFlightRef.current = true;
    try {
      successMilestoneRef.current = await buildFinalDiscProgressMilestone(
        huntStartDiscPointsRef.current,
        discBaselineRef.current,
      );
      setTapHintVisible(false);
      arFlowPhaseRef.current = "success";
      setArFlowPhase("success");
    } catch (err) {
      console.error("[addToDrops] milestone error", err);
      addToDropsInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (arFlowPhase !== "success") {
      return undefined;
    }
    const milestone = successMilestoneRef.current;
    if (!milestone) {
      return undefined;
    }
    const id = window.setTimeout(() => {
      const root = containerRef.current;
      if (root) {
        root.style.visibility = "hidden";
        root.style.pointerEvents = "none";
        root.setAttribute("aria-hidden", "true");
      }
      releaseCameraMedia();
      onFlowCompleteRef.current?.(milestone);
    }, GIFT_DROP_TICK_DRAW_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [arFlowPhase, releaseCameraMedia]);

  useEffect(() => {
    batteryCameraOffRef.current = batteryCameraOff;
  }, [batteryCameraOff]);

  useEffect(() => {
    setIsUnlockedRef.current = setIsUnlocked;
    setTapHintVisibleRef.current = setTapHintVisible;
  });

  useEffect(() => {
    onMotionUnavailableRef.current = onMotionUnavailable;
  }, [onMotionUnavailable]);

  useEffect(() => {
    startCamera(() => true);
    return () => {
      releaseCameraMedia();
    };
  }, [startCamera, releaseCameraMedia]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    let cancelled = false;
    let frameId = 0;
    let baselineBeta = null;
    let baselineGamma = null;
    motionReceivedRef.current = false;
    fallbackFiredRef.current = false;

    const unlockGuard = { started: false };
    let giftHitTarget = null;
    let activeUnlockTimeline = null;
    let confettiTimerId = null;
    let labelTimerId = null;
    let postRevealRollTilt = false;
    let lastAnimMs = performance.now();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 2.2);
    scene.add(camera);

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
    container.appendChild(renderer.domElement);

    let environmentMap = null;
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    environmentMap = pmremGenerator.fromScene(new RoomEnvironment()).texture;
    scene.environment = environmentMap;
    pmremGenerator.dispose();

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5ea, 3.1);
    dirLight.position.set(0, 2, 2);
    scene.add(dirLight);

    const pitchGroup = new THREE.Group();
    const rollGroup = new THREE.Group();
    pitchGroup.add(rollGroup);
    scene.add(pitchGroup);

    const swapGroup = new THREE.Group();
    rollGroup.add(swapGroup);

    const unlockSpinState = { speed: 0 };

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    const arConfetti = createARConfetti({
      parent: camera,
      loader,
      config: AR_CONFETTI_CONFIG,
    });
    arConfetti.loadTemplates().catch(() => {});

    let loadedCount = 0;
    let giftAnchor = null;
    let productAnchor = null;

    function attachWhenReady() {
      if (cancelled || loadedCount < 2 || !giftAnchor || !productAnchor) {
        return;
      }
      swapGroup.add(giftAnchor);
      swapGroup.add(productAnchor);
      modelRef.current = swapGroup;
      giftHitTarget = giftAnchor;
    }

    loader.load(
      `${import.meta.env.BASE_URL}3DModels/gift-optimized.glb`,
      (gltf) => {
        if (cancelled) {
          return;
        }
        giftAnchor = wrapNormalizeAndCenter(gltf.scene, GIFT_UNIT);
        applyGiftBoxMaterialsFromCss(giftAnchor, { variant: "ar" });
        giftAnchor.rotation.set(0, THREE.MathUtils.degToRad(15), 0, "YXZ");
        loadedCount += 1;
        attachWhenReady();
      },
      undefined,
      (err) => {
        console.warn("ARGiftReveal: gift GLB load error", err);
      },
    );

    loader.load(
      `${import.meta.env.BASE_URL}3DModels/amazingy01-optimized.glb`,
      (gltf) => {
        if (cancelled) {
          return;
        }
        productAnchor = wrapNormalizeAndCenter(gltf.scene, PRODUCT_UNIT);
        applyArRevealProductPbrMaterials(productAnchor);
        productAnchor.userData.arRevealFullScale = {
          x: productAnchor.scale.x,
          y: productAnchor.scale.y,
          z: productAnchor.scale.z,
        };
        productAnchor.scale.multiplyScalar(PRODUCT_HIDDEN_SCALE);
        productAnchor.rotation.set(
          0,
          THREE.MathUtils.degToRad(15 + PRODUCT_EXTRA_FRONT_YAW_DEG),
          0,
          "YXZ",
        );
        productAnchor.traverse((child) => {
          if (child.isMesh) {
            const mats = Array.isArray(child.material)
              ? child.material
              : [child.material];
            mats.forEach((mat) => {
              mat.transparent = true;
              mat.opacity = 0;
            });
          }
        });
        loadedCount += 1;
        attachWhenReady();
      },
      undefined,
      (err) => {
        console.warn("ARGiftReveal: product GLB load error", err);
      },
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
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    function onPointerDown() {
      if (batteryCameraOffRef.current) {
        return;
      }

      const phase = arFlowPhaseRef.current;
      if (phase === "add-drops") {
        void performAddToDrops();
        return;
      }

      if (phase !== "unlock" || unlockGuard.started || !giftHitTarget) {
        return;
      }

      unlockGuard.started = true;
      setTapHintVisibleRef.current(false);
      primeSuccessSound();
      confettiTimerId = window.setTimeout(() => {
        arConfetti.startBurst();
      }, UNLOCK_CONFETTI_DELAY_MS);
      labelTimerId = window.setTimeout(() => {
        setIsUnlockedRef.current(true);
      }, UNLOCK_LABEL_DELAY_MS);
      activeUnlockTimeline = runGiftRevealTimeline({
        swapGroup,
        giftRoot: giftHitTarget,
        productRoot: productAnchor,
        spinState: unlockSpinState,
        config: giftRevealConfigAR,
        onGiftDisposed: () => {
          giftHitTarget = null;
          postRevealRollTilt = true;
        },
        onRevealReady: () => {
          arFlowPhaseRef.current = "add-drops";
          setArFlowPhase("add-drops");
          setTapHintVisible(true);
        },
      });
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    const orientationHandler = (event) => {
      if (batteryCameraOffRef.current) {
        return;
      }
      if (
        event.beta == null ||
        event.gamma == null ||
        Number.isNaN(event.beta) ||
        Number.isNaN(event.gamma)
      ) {
        return;
      }
      if (baselineBeta == null) {
        baselineBeta = Math.min(event.beta, DEFAULT_ABSOLUTE_BETA_MAX);
        baselineGamma = event.gamma;
      }
      const applied = applyDeviceOrientationToObject3D(
        event,
        pitchGroup,
        rollGroup,
        {
          baselineBeta,
          baselineGamma,
          tiltScaleRoll: postRevealRollTilt
            ? AR_TILT_SCALE_ROLL_AFTER_REVEAL
            : AR_TILT_SCALE_ROLL_BEFORE_REVEAL,
        },
      );
      if (applied.ok) {
        motionReceivedRef.current = true;
      }
    };

    window.addEventListener("deviceorientation", orientationHandler);

    /** Motion fallback: if no valid deviceorientation reading arrives within this window (sensor missing, blocked, or silent despite permission), hand over to tap-to-unlock via onMotionUnavailable. */
    const motionFallbackMs = 2800;
    const fallbackTimeoutId = window.setTimeout(() => {
      if (fallbackFiredRef.current || motionReceivedRef.current || cancelled) {
        return;
      }
      fallbackFiredRef.current = true;
      const cb = onMotionUnavailableRef.current;
      if (typeof cb === "function") {
        cb();
      }
    }, motionFallbackMs);

    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      if (cancelled) {
        return;
      }
      const now = performance.now();
      const dt = Math.min(0.064, (now - lastAnimMs) / 1000);
      lastAnimMs = now;
      arConfetti.update(dt);
      swapGroup.rotation.y += unlockSpinState.speed;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelled = true;
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("deviceorientation", orientationHandler);
      window.clearTimeout(fallbackTimeoutId);
      if (confettiTimerId != null) {
        window.clearTimeout(confettiTimerId);
      }
      if (labelTimerId != null) {
        window.clearTimeout(labelTimerId);
      }
      if (activeUnlockTimeline) {
        activeUnlockTimeline.kill();
      }
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      scene.environment = null;
      if (environmentMap) {
        environmentMap.dispose();
        environmentMap = null;
      }
      arConfetti.dispose();
      const root = modelRef.current;
      if (root) {
        root.traverse((child) => {
          if (child.isMesh) {
            child.geometry?.dispose();
            const mats = Array.isArray(child.material)
              ? child.material
              : [child.material];
            mats.forEach((mat) => mat?.dispose());
          }
        });
        modelRef.current = null;
      }
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const showUnlockOrAddHint =
    (arFlowPhase === "unlock" || arFlowPhase === "add-drops") &&
    tapHintVisible &&
    arFlowPhase !== "success";

  return (
    <div
      ref={containerRef}
      className="ar-gift-reveal"
      role="region"
      aria-label={giftProductName || "AR gift reveal"}
    >
      <video
        ref={videoRef}
        className="ar-gift-reveal__feed"
        autoPlay
        playsInline
        muted
      />
      <div className="ar-gift-reveal__ui">
        <div className="ar-gift-reveal__brand clue-detail__header u-gift-run-shell__header">
          <WediscovrHeaderLogo />
          <img
            className="ar-gift-reveal__brand-logo"
            src={brandLogo}
            alt={brandName}
            decoding="async"
          />
          {!isUnlocked || giftProductName ? (
            <p className="ar-gift-reveal__product-line">
              {avoidOrphanLastLine(
                !isUnlocked ? LABEL_SECONDARY_LOCKED : giftProductName,
              )}
            </p>
          ) : null}
        </div>
        {showUnlockOrAddHint ? (
          <div className="ar-gift-reveal__tap-hint-host">
            <TapHintLoop />
            <p className="ar-gift-reveal__tap-hint">
              {arFlowPhase === "unlock"
                ? TAP_TO_UNLOCK_HINT
                : TAP_TO_ADD_DROPS_HINT}
            </p>
          </div>
        ) : null}
        {arFlowPhase === "success" ? (
          <div className="ar-gift-reveal__tap-hint-host">
            <GiftDropSuccess text={ADDED_TO_DROPS_LABEL} />
          </div>
        ) : null}
        {batteryCameraOff ? (
          <div
            className="u-dark-overlay u-dark-overlay--fill u-dark-overlay--center ar-gift-reveal__battery-tap-layer"
            aria-label={`${CAMERA_BATTERY_WARNING_TITLE} ${CAMERA_BATTERY_WARNING_RESUME}`}
            onClick={() => {
              startCamera(() => true);
            }}
          >
            <div className="u-glass-card-layout__column u-glass-card-layout--fluid">
              <WarningGlassCard variant="camera-battery" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default ARGiftReveal;
