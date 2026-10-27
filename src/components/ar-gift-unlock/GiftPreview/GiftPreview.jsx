import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import gsap from "gsap";
import {
  primeSuccessSound,
  triggerDropSuccess,
} from "../../../behaviours/sound.js";
import { applyGiftBoxMaterialsFromCss } from "../../../lib/giftBoxMaterials.js";
import {
  giftRevealConfigTapToUnlock,
  runGiftRevealTimeline,
} from "../../../lib/giftRevealTimeline.js";
import "./GiftPreview.css";

/** Longest edge → `unitScale` world units, centered at origin. Wraps glTF root so nested matrix transforms behave. */
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
  return { anchor, rawSize: size, appliedScale };
}

const GiftPreview = forwardRef(
  (
    { dropZoneRef, onDragStart, onDragEnd, onDrop, onDropZoneHoverChange },
    ref,
  ) => {
    const containerRef = useRef(null);
    const groupRef = useRef(null);
    const giftRef = useRef(null);
    const productRef = useRef(null);
    const triggerRef = useRef(null);
    const draggableRef = useRef(false);
    const dragRelayRef = useRef({ onDragStart, onDragEnd, onDrop });
    dragRelayRef.current = {
      onDragStart,
      onDragEnd,
      onDrop,
      onDropZoneHoverChange,
    };

    useImperativeHandle(ref, () => ({
      triggerUnlock: () => triggerRef.current?.(),
    }));

    useEffect(() => {
      const container = containerRef.current;

      if (!container) {
        return undefined;
      }

      let cancelled = false;

      const rotState = { speed: 0.02 };

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(0, 0.1, 2.2);

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

      const keyLight = new THREE.DirectionalLight(0xfff5ea, 3.1);
      keyLight.target.position.set(0, 0, 0);
      scene.add(keyLight, keyLight.target);

      const keyLightScratch = new THREE.Vector3();

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      const lockedPolarAngle = controls.getPolarAngle();
      controls.minPolarAngle = lockedPolarAngle;
      controls.maxPolarAngle = lockedPolarAngle;

      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);

      let loadedCount = 0;
      const anchors = [];

      function onBothLoaded() {
        if (cancelled) {
          return;
        }
        const group = new THREE.Group();
        anchors.forEach((anchor) => group.add(anchor));
        scene.add(group);
        groupRef.current = group;
      }

      loader.load(
        `${import.meta.env.BASE_URL}3DModels/gift-optimized.glb`,
        (gltf) => {
          if (cancelled) {
            return;
          }
          const { anchor } = wrapNormalizeAndCenter(
            gltf.scene,
            0.45,
          );
          giftRef.current = anchor;
          applyGiftBoxMaterialsFromCss(giftRef.current);
          anchors.push(anchor);
          loadedCount += 1;
          if (loadedCount === 2) {
            onBothLoaded();
          }
        },
        undefined,
        () => {},
      );

      loader.load(
        `${import.meta.env.BASE_URL}3DModels/amazingy01-optimized.glb`,
        (gltf) => {
          if (cancelled) {
            return;
          }
          const { anchor } = wrapNormalizeAndCenter(
            gltf.scene,
            0.35,
          );
          productRef.current = anchor;
          productRef.current.traverse((child) => {
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
          anchors.push(anchor);
          loadedCount += 1;
          if (loadedCount === 2) {
            onBothLoaded();
          }
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
      };

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      resize();

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const dragPoint = new THREE.Vector3();
      const localPointer = new THREE.Vector3();

      let isDragging = false;
      let isOverZone = false;
      const dragOffset = new THREE.Vector3();
      const originalPosition = new THREE.Vector3();

      function onPointerDown(e) {
        if (!draggableRef.current || !productRef.current) return;

        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);

        const hits = raycaster.intersectObject(productRef.current, true);
        if (hits.length === 0) return;

        const parent = productRef.current.parent;
        if (!parent) return;

        isDragging = true;
        originalPosition.copy(productRef.current.position);

        raycaster.ray.intersectPlane(dragPlane, dragPoint);
        localPointer.copy(dragPoint);
        parent.worldToLocal(localPointer);
        dragOffset.copy(localPointer).sub(productRef.current.position);

        gsap.killTweensOf(rotState);
        rotState.speed = 0;
        controls.enabled = false;
        renderer.domElement.style.cursor = "grabbing";
        primeSuccessSound();
        dragRelayRef.current.onDragStart?.();
      }

      function restoreProductToRest() {
        if (!productRef.current) {
          return;
        }
        gsap.to(productRef.current.position, {
          x: originalPosition.x,
          y: originalPosition.y,
          z: originalPosition.z,
          duration: 0.5,
          ease: "back.out(1.4)",
          onComplete: () => {
            rotState.speed = 0.02;
            controls.enabled = true;
          },
        });
      }

      function onPointerMove(e) {
        if (!isDragging || !productRef.current) return;

        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        raycaster.ray.intersectPlane(dragPlane, dragPoint);

        const parent = productRef.current.parent;
        if (!parent) return;

        localPointer.copy(dragPoint);
        parent.worldToLocal(localPointer);

        productRef.current.position.set(
          localPointer.x - dragOffset.x,
          localPointer.y - dragOffset.y,
          productRef.current.position.z,
        );

        let overZone = false;
        if (dropZoneRef?.current) {
          const dropRect = dropZoneRef.current.getBoundingClientRect();
          overZone =
            e.clientX >= dropRect.left &&
            e.clientX <= dropRect.right &&
            e.clientY >= dropRect.top &&
            e.clientY <= dropRect.bottom;
        }
        dragRelayRef.current.onDropZoneHoverChange?.(overZone);
      }

      function onPointerUp(e) {
        if (!isDragging || !productRef.current) return;

        dragRelayRef.current.onDropZoneHoverChange?.(false);

        if (dropZoneRef?.current && e) {
          const rect = dropZoneRef.current.getBoundingClientRect();
          const overZone =
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom;

          if (overZone) {
            isDragging = false;
            renderer.domElement.style.cursor = "grab";

            const maybePromise = dragRelayRef.current.onDrop?.();
            Promise.resolve(maybePromise)
              .then((ok) => {
                if (ok === true) {
                  triggerDropSuccess();
                  destroyScene();
                } else {
                  restoreProductToRest();
                }
              })
              .catch(() => {
                restoreProductToRest();
              })
              .finally(() => {
                dragRelayRef.current.onDragEnd?.();
              });
            return;
          }
        }

        isDragging = false;
        renderer.domElement.style.cursor = "grab";
        dragRelayRef.current.onDragEnd?.();

        gsap.to(productRef.current.position, {
          x: originalPosition.x,
          y: originalPosition.y,
          z: originalPosition.z,
          duration: 0.5,
          ease: "back.out(1.4)",
          onComplete: () => {
            rotState.speed = 0.02;
            controls.enabled = true;
          },
        });
      }

      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerup", onPointerUp);
      renderer.domElement.addEventListener("pointerleave", onPointerUp);

      function triggerUnlock() {
        if (!groupRef.current || !giftRef.current || !productRef.current) {
          return;
        }

        runGiftRevealTimeline({
          swapGroup: groupRef.current,
          giftRoot: giftRef.current,
          productRoot: productRef.current,
          spinState: rotState,
          config: giftRevealConfigTapToUnlock,
          onGiftDisposed: () => {
            giftRef.current = null;
          },
          onComplete: () => {
            draggableRef.current = true;
            renderer.domElement.style.cursor = "grab";
          },
        });
      }

      triggerRef.current = triggerUnlock;

      let frameId = 0;
      const animate = () => {
        frameId = window.requestAnimationFrame(animate);

        if (groupRef.current && !isDragging) {
          groupRef.current.rotation.y += rotState.speed;
        }

        controls.update();

        keyLightScratch.copy(camera.up).multiplyScalar(0.18);
        keyLight.position.copy(camera.position).add(keyLightScratch);

        renderer.render(scene, camera);
      };

      animate();

      function destroyScene() {
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerup", onPointerUp);
        renderer.domElement.removeEventListener("pointerleave", onPointerUp);
        window.cancelAnimationFrame(frameId);
        resizeObserver.disconnect();
        controls.dispose();

        if (productRef.current) {
          productRef.current.traverse((child) => {
            if (child.isMesh) {
              child.geometry?.dispose();
              const mats = Array.isArray(child.material)
                ? child.material
                : [child.material];
              mats.forEach((mat) => mat.dispose());
            }
          });
          productRef.current.parent?.remove(productRef.current);
          productRef.current = null;
        }

        renderer.dispose();
        scene.clear();

        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }

        draggableRef.current = false;
      }

      return () => {
        cancelled = true;
        if (renderer.domElement.isConnected) {
          window.cancelAnimationFrame(frameId);
          resizeObserver.disconnect();
          controls.dispose();
          renderer.dispose();
          scene.clear();

          if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
          }
        }
      };
    }, []);

    return (
      <div className="gift-preview" ref={containerRef} aria-hidden="true" />
    );
  },
);

GiftPreview.displayName = "GiftPreview";

export default GiftPreview;
