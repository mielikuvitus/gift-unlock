import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import {
  CSS3DObject,
  CSS3DRenderer,
} from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { installDeviceSimulator } from "./deviceSimulator.js";
import { installModelViewer } from "./modelViewer.js";
import "./showcase.css";

const MODEL_URL = `${import.meta.env.BASE_URL}3DModels/iphone_16_pro_max-optimized.glb`;
const APP_URL = import.meta.env.BASE_URL;
const SCREEN_MATERIAL_NAME = "screen.001";
const GLASS_MATERIAL_NAME = "glass.002";
const SCREEN_CSS_WIDTH = 440;
const SAFE_AREA_INSETS = { top: "62px", bottom: "34px", left: "0px", right: "0px" };
const MAX_YAW = THREE.MathUtils.degToRad(25);
const MAX_PITCH = THREE.MathUtils.degToRad(15);
const REST_BETA = 45;
const SENSOR_GAIN = 2;
const SAFE_AREA_ENV = /env\(\s*safe-area-inset-(top|bottom|left|right)\s*(?:,[^)]*)?\)/g;
const LEFT_CARDS = {
  demoarea: {
    label: "Demo space",
    caption: "Drag to orbit, scroll to zoom",
    description: "3D scan of the demo space",
    url: `${import.meta.env.BASE_URL}3DModels/demoarea-optimized.glb`,
    unlit: true,
    viewDirection: [0.9, 1.1, 1.3],
    distance: 1.93,
    maxPolarAngle: THREE.MathUtils.degToRad(80),
  },
  coin: {
    label: "DISC coin",
    caption: "Drag to orbit",
    description: "3D DISC coin",
    url: `${import.meta.env.BASE_URL}3DModels/coin-new2-optimized.glb`,
    distance: 2.4,
    zoom: false,
  },
  pin: {
    label: "Location pin",
    caption: "Drag to orbit",
    description: "3D location pin",
    url: `${import.meta.env.BASE_URL}3DModels/location-optimized.glb`,
    distance: 2.4,
    zoom: false,
  },
  "camera-access": {},
};
const STAGE_LEFT_CARDS = {
  intro2: "demoarea",
  camera: null,
  "camera-2": "camera-access",
  "camera-clue": null,
  "disc-checkpoint": "coin",
  "disc-checkpoint-3": null,
  "clue-detail-3": "pin",
  "clue-detail": null,
};

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const sideCardsHidden = window.matchMedia("(max-aspect-ratio: 23/20)");

const stage = document.querySelector(".showcase__stage");
const canvas = document.querySelector(".showcase__canvas");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const cssRenderer = new CSS3DRenderer();
cssRenderer.domElement.classList.add("showcase__css-layer");
stage.prepend(cssRenderer.domElement);

const scene = new THREE.Scene();
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
pmremGenerator.dispose();

const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
camera.position.set(0, 0, 4);

const phone = new THREE.Group();
scene.add(phone);

const pointer = { x: 0, y: 0, active: false };
const screenPoint = new THREE.Vector3();
let followAmount = 0;
let screen = null;
let simulator = null;
let wantedLeftCard = null;
let shownLeftCard = null;
let disposeModelViewer = null;

function trackPointer(clientX, clientY) {
  pointer.x = THREE.MathUtils.clamp((clientX / stage.clientWidth) * 2 - 1, -1, 1);
  pointer.y = THREE.MathUtils.clamp((clientY / stage.clientHeight) * 2 - 1, -1, 1);
  pointer.active = true;
}

function trackScreenPointer(event) {
  const { width, height } = screen.element;
  screenPoint.set(event.clientX - width / 2, height / 2 - event.clientY, 0);
  screen.localToWorld(screenPoint).project(camera);
  trackPointer(
    ((screenPoint.x + 1) / 2) * stage.clientWidth,
    ((1 - screenPoint.y) / 2) * stage.clientHeight,
  );
}

function emulateSafeArea(doc) {
  const patchRules = (rules) => {
    for (const rule of rules) {
      if (rule.cssRules) patchRules(rule.cssRules);
      if (rule.style?.cssText.includes("safe-area-inset")) {
        rule.style.cssText = rule.style.cssText.replace(
          SAFE_AREA_ENV,
          (_, side) => SAFE_AREA_INSETS[side],
        );
      }
    }
  };
  const patchSheets = () => {
    for (const sheet of doc.styleSheets) {
      try {
        patchRules(sheet.cssRules);
      } catch {}
    }
  };
  patchSheets();
  new MutationObserver(patchSheets).observe(doc.head, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function createScreen() {
  const iframe = document.createElement("iframe");
  iframe.className = "showcase__screen";
  iframe.src = APP_URL;
  iframe.title = "weDISCOVR Gift Unlock";
  iframe.width = SCREEN_CSS_WIDTH;
  iframe.height = SCREEN_CSS_WIDTH * 2;
  iframe.allow = "camera; accelerometer; gyroscope; fullscreen";
  iframe.addEventListener("load", () => {
    try {
      const win = iframe.contentWindow;
      emulateSafeArea(win.document);
      simulator = installDeviceSimulator(win);
      win.addEventListener("pointermove", trackScreenPointer);
    } catch {}
  });
  return iframe;
}

function screenBoundsInPhoneSpace(mesh) {
  phone.updateWorldMatrix(true, true);
  const toPhone = phone.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
  mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox.clone().applyMatrix4(toPhone);
}

async function init() {
  const gltf = await new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(MODEL_URL);

  const model = gltf.scene;
  model.rotation.y = Math.PI / 2;

  const box = new THREE.Box3().setFromObject(model);
  const height = box.getSize(new THREE.Vector3()).y;
  model.scale.setScalar(2 / height);
  box.setFromObject(model);
  model.position.sub(box.getCenter(new THREE.Vector3()));
  phone.add(model);

  let screenMesh;
  model.traverse((child) => {
    if (!child.isMesh) return;
    if (child.material.name === GLASS_MATERIAL_NAME) {
      child.material.opacity = 0.08;
      child.material.depthWrite = false;
    }
    if (child.material.name === SCREEN_MATERIAL_NAME) screenMesh = child;
  });

  screenMesh.material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0,
    blending: THREE.NoBlending,
    side: THREE.DoubleSide,
  });

  const bounds = screenBoundsInPhoneSpace(screenMesh);
  const size = bounds.getSize(new THREE.Vector3());
  screen.element.height = Math.round(SCREEN_CSS_WIDTH * (size.y / size.x));
  bounds.getCenter(screen.position);
  screen.position.z = bounds.max.z;
  screen.scale.setScalar(size.x / SCREEN_CSS_WIDTH);
  phone.add(screen);

  document.querySelector(".showcase").dataset.state = "ready";
}

function showInfoStep(keys) {
  const steps = [...document.querySelectorAll(".showcase__info-step")];
  const name = keys.find((key) =>
    steps.some((step) => step.dataset.step === key),
  );
  if (!name) return;
  steps.forEach((step) => (step.hidden = step.dataset.step !== name));
}

function syncLeftCard() {
  const name = sideCardsHidden.matches ? null : wantedLeftCard;
  if (name === shownLeftCard) return;
  disposeModelViewer?.();
  disposeModelViewer = null;
  shownLeftCard = name;

  const showcase = document.querySelector(".showcase");
  if (!name) {
    delete showcase.dataset.leftCard;
    return;
  }

  const card = LEFT_CARDS[name];
  if (!card.url) {
    showcase.dataset.leftCard = name;
    return;
  }

  const oldCanvas = document.querySelector(".showcase__map-canvas");
  const canvas = oldCanvas.cloneNode(false);
  canvas.setAttribute("aria-label", card.description);
  oldCanvas.replaceWith(canvas);
  document.querySelector(".showcase__map-label").textContent = card.label;
  document.querySelector(".showcase__map-caption").textContent = card.caption;
  showcase.dataset.leftCard = "model";
  disposeModelViewer = installModelViewer(canvas, {
    ...card,
    reducedMotion: prefersReducedMotion,
  });
}

function resize() {
  const { clientWidth: width, clientHeight: height } = stage;
  renderer.setSize(width, height, false);
  cssRenderer.setSize(width, height);
  camera.aspect = width / height;
  camera.position.setLength(width / height < 0.8 ? 5.6 : 4.8);
  camera.updateProjectionMatrix();
}

const clock = new THREE.Clock();

function render() {
  const elapsed = clock.getElapsedTime();
  const idleAmount = prefersReducedMotion ? 0 : 1 - followAmount;
  followAmount = THREE.MathUtils.lerp(
    followAmount,
    pointer.active && !prefersReducedMotion ? 1 : 0,
    0.06,
  );
  const targetYaw =
    pointer.x * MAX_YAW * followAmount +
    Math.sin(elapsed * 0.4) * 0.2 * idleAmount;
  const targetPitch = pointer.y * MAX_PITCH * followAmount;
  phone.rotation.y = THREE.MathUtils.lerp(phone.rotation.y, targetYaw, 0.1);
  phone.rotation.x = THREE.MathUtils.lerp(phone.rotation.x, targetPitch, 0.1);
  phone.position.y = Math.sin(elapsed * 0.8) * 0.03 * idleAmount;

  simulator?.dispatchOrientation({
    beta: REST_BETA + THREE.MathUtils.radToDeg(phone.rotation.x) * SENSOR_GAIN,
    gamma: THREE.MathUtils.radToDeg(phone.rotation.y) * SENSOR_GAIN,
  });

  renderer.render(scene, camera);
  cssRenderer.render(scene, camera);
}

window.addEventListener("pointermove", (event) => {
  if (event.target.closest?.(".showcase__map")) {
    pointer.active = false;
    return;
  }
  trackPointer(event.clientX, event.clientY);
});
document.documentElement.addEventListener(
  "mouseleave",
  () => (pointer.active = false),
);
window.addEventListener("resize", resize);
sideCardsHidden.addEventListener("change", syncLeftCard);
window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type !== "gift-unlock:stage") return;
  const { stage, clue } = event.data;
  const keys = clue ? [`${stage}-${clue}`, stage] : [stage];
  showInfoStep(keys);
  const leftCardKey = keys.find((key) => key in STAGE_LEFT_CARDS);
  if (leftCardKey) {
    wantedLeftCard = STAGE_LEFT_CARDS[leftCardKey];
    syncLeftCard();
  }
});
screen = new CSS3DObject(createScreen());
scene.add(screen);
resize();
renderer.setAnimationLoop(render);
init();
