import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { applyVerticalBobMotion } from "../../../animations/VerticalBobMotion/verticalBobMotion.js";
import { createMapTapHintHandlers } from "../../../animations/MapTapHint/mapTapHint.js";
import TapIcon from "../../../assets/svg/tap-icon.svg?react";
import "./MapInteractiveCard.css";

const MAP_MODEL_URL = "/3DModels/map-new.glb";
const LOCATION_MODEL_URL = "/3DModels/location.glb";

function placeLocationPinsOnMapAnchor(mapAnchor, locationScene, placements) {
  let added = null;
  for (let i = 0; i < placements.length; i += 1) {
    const { checkpointId, position } = placements[i];
    const pin = locationScene.clone(true);
    pin.position.set(position.x, position.y, position.z);
    pin.userData.checkpointId = checkpointId;
    pin.userData.verticalBobBase = pin.position.clone();
    mapAnchor.add(pin);
    added = pin;
  }
  return added;
}

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

function MapInteractiveCard({
  className = "",
  onContentClick,
  activeCheckpointId = "",
  mapPinPlacements = [],
}) {
  const containerRef = useRef(null);
  const contentRootRef = useRef(null);
  const landsAtRef = useRef(0);
  const interactedRef = useRef(false);
  const hintLoopStartedRef = useRef(false);
  const hintTimerRef = useRef(null);
  const hintTimelineRef = useRef(null);
  const hintIconRef = useRef(null);
  const hoverRef = useRef(false);
  const [showTapHint, setShowTapHint] = useState(false);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    let cancelled = false;
    let contentRoot = null;
    let locationPin = null;
    landsAtRef.current = performance.now();
    interactedRef.current = false;
    hintLoopStartedRef.current = false;

    const tapHint = createMapTapHintHandlers(
      () => cancelled,
      {
        landsAtRef,
        interactedRef,
        hintLoopStartedRef,
        hintTimerRef,
        hintTimelineRef,
        hintIconRef,
        contentRootRef,
      },
      setShowTapHint,
    );

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.5, 3);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const onCanvasPointerDown = () => {
      tapHint.dismissHintInteraction();
    };
    renderer.domElement.addEventListener("pointerdown", onCanvasPointerDown);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(2, 4, 2);
    scene.add(light);

    const fillWest = new THREE.DirectionalLight(0xffffff, 1);
    fillWest.position.set(-4, 1.5, 0);
    scene.add(fillWest);

    const fillEast = new THREE.DirectionalLight(0xffffff, 1);
    fillEast.position.set(4, 1.5, 0);
    scene.add(fillEast);

    const fillBack = new THREE.DirectionalLight(0xffffff, 1);
    fillBack.position.set(0, 1.5, -4);
    scene.add(fillBack);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 1.75;
    controls.maxDistance = 5.5;

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      MAP_MODEL_URL,
      (gltf) => {
        if (cancelled) {
          disposeObjectTree(gltf.scene);
          return;
        }
        const pivot = new THREE.Group();
        const mapTilt = new THREE.Group();
        mapTilt.add(gltf.scene);
        pivot.add(mapTilt);
        pivot.updateWorldMatrix(true, true);
        const size = new THREE.Box3()
          .setFromObject(pivot)
          .getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        pivot.scale.setScalar((1 / maxDim) * 1.5);
        pivot.updateWorldMatrix(true, true);
        const centre = new THREE.Box3()
          .setFromObject(pivot)
          .getCenter(new THREE.Vector3());
        pivot.position.sub(centre);
        mapTilt.rotation.x = THREE.MathUtils.degToRad(22);
        contentRoot = pivot;
        contentRootRef.current = pivot;
        scene.add(pivot);
        camera.position.set(0, 1.5, 2.45);
        controls.update();
        tapHint.scheduleHintTimer();

        loader.load(
          LOCATION_MODEL_URL,
          (locGltf) => {
            if (cancelled) {
              disposeObjectTree(locGltf.scene);
              return;
            }
            const placementsForClue = mapPinPlacements.filter(
              (p) => p.checkpointId === activeCheckpointId,
            );
            locationPin = placeLocationPinsOnMapAnchor(
              mapTilt,
              locGltf.scene,
              placementsForClue,
            );
            disposeObjectTree(locGltf.scene);
          },
          undefined,
          () => {},
        );
      },
      undefined,
      undefined,
    );

    tapHint.scheduleHintTimer();

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

    const clock = new THREE.Clock();
    const reduceMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const getReduceMotion = () => reduceMotionQuery.matches;

    let frameId = 0;
    const animate = () => {
      frameId = window.requestAnimationFrame(animate);

      if (cancelled) {
        return;
      }

      const elapsed = clock.getElapsedTime();
      if (locationPin && locationPin.userData.verticalBobBase) {
        applyVerticalBobMotion(locationPin, {
          elapsed,
          hoverActive: hoverRef.current,
          reduceMotion: getReduceMotion(),
          basePosition: locationPin.userData.verticalBobBase,
        });
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelled = true;
      renderer.domElement.removeEventListener(
        "pointerdown",
        onCanvasPointerDown,
      );
      tapHint.cleanupMountGsap();
      if (!renderer.domElement.isConnected) {
        return;
      }
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
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
  }, [activeCheckpointId, mapPinPlacements]);

  const rootMods = ["map-interactive-card", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rootMods}
      onClick={onContentClick}
      onPointerEnter={() => {
        hoverRef.current = true;
      }}
      onPointerLeave={() => {
        hoverRef.current = false;
      }}
    >
      <div className="map-interactive-card__canvas-stack">
        <div ref={containerRef} className="map-interactive-card__canvas-host" />
        {showTapHint ? (
          <div className="map-interactive-card__tap-hint" aria-hidden="true">
            <div className="map-interactive-card__tap-hint-shift">
              <div
                ref={hintIconRef}
                className="map-interactive-card__tap-hint-icon-wrap"
              >
                <TapIcon className="map-interactive-card__tap-hint-icon" />
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <p className="map-interactive-card__hint u-text-pretty-center">
        Swipe and zoom to interact with the map
      </p>
    </div>
  );
}

export default MapInteractiveCard;
