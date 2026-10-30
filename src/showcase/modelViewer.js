import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function addStudioLights(scene, camera) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  scene.add(camera);
  const lights = [
    [1.8, [2, 3.5, 2]],
    [0.9, [-3.5, 1.5, 0.5]],
    [0.9, [3.5, 1.5, 0.5]],
  ];
  for (const [intensity, position] of lights) {
    const light = new THREE.DirectionalLight(0xffffff, intensity);
    light.position.set(...position);
    camera.add(light);
  }
}

export function installModelViewer(
  canvas,
  {
    url,
    unlit = false,
    viewDirection = [0, 0, 1],
    distance = 2,
    maxPolarAngle = Math.PI,
    zoom = true,
    reducedMotion = false,
  },
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (!unlit) renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 200);
  if (!unlit) addStudioLights(scene, camera);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = zoom;
  controls.maxPolarAngle = maxPolarAngle;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 0.6;
  controls.addEventListener("start", () => (controls.autoRotate = false));

  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  let disposed = false;
  loadModel();

  return function dispose() {
    disposed = true;
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    controls.dispose();
    scene.traverse((child) => {
      if (!child.isMesh) return;
      child.geometry.dispose();
      child.material.map?.dispose();
      child.material.dispose();
    });
    renderer.dispose();
    renderer.forceContextLoss();
  };

  async function loadModel() {
    const gltf = await new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .loadAsync(url);
    if (disposed) return;
    const model = gltf.scene;
    if (unlit) {
      model.traverse((child) => {
        if (!child.isMesh) return;
        child.material = new THREE.MeshBasicMaterial({
          map: child.material.map,
        });
      });
    }

    const box = new THREE.Box3().setFromObject(model);
    model.position.sub(box.getCenter(new THREE.Vector3()));
    scene.add(model);

    const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
    camera.position
      .fromArray(viewDirection)
      .normalize()
      .multiplyScalar(radius * distance);
    controls.minDistance = radius * 0.6;
    controls.maxDistance = radius * 2.5;
    controls.update();

    renderer.setAnimationLoop(() => {
      if (!canvas.clientWidth) return;
      controls.update();
      renderer.render(scene, camera);
    });
  }
}
