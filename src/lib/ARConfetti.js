import * as THREE from "three";
import { AR_CONFETTI_CONFIG } from "./ARConfettiConfig.js";

function randomRange(a, b) {
  return a + Math.random() * (b - a);
}

function disposeObject3D(obj) {
  obj.traverse((child) => {
    if (child.isMesh) {
      child.geometry?.dispose();
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      mats.forEach((mat) => mat?.dispose());
    }
  });
}

function applyConfettiRenderFlags(root, config) {
  const ro = config.renderOrder;
  const dt = config.depthTest;
  root.traverse((child) => {
    if (!child.isMesh) {
      return;
    }
    child.renderOrder = ro;
    const mats = Array.isArray(child.material)
      ? child.material
      : [child.material];
    mats.forEach((mat) => {
      if (!mat) {
        return;
      }
      mat.depthTest = dt;
      mat.depthWrite = false;
    });
  });
}

function buildTemplateFromGltf(gltf, unit) {
  const root = gltf.scene.clone(true);
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const s = unit / maxDim;
  root.scale.setScalar(s);
  root.updateWorldMatrix(true, true);
  const box2 = new THREE.Box3().setFromObject(root);
  const center = box2.getCenter(new THREE.Vector3());
  root.position.sub(center);
  return root;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

function buildBalancedModelTemplateSchedule(particleCount, templateCount) {
  if (templateCount <= 0 || particleCount <= 0) {
    return [];
  }
  const schedule = [];
  const base = Math.floor(particleCount / templateCount);
  const extra = particleCount % templateCount;
  for (let t = 0; t < templateCount; t += 1) {
    const n = base + (t < extra ? 1 : 0);
    for (let j = 0; j < n; j += 1) {
      schedule.push(t);
    }
  }
  shuffleInPlace(schedule);
  return schedule;
}

function modelRotationOptsAt(config, modelIndex) {
  const list = config.modelRotationConfigs;
  if (!Array.isArray(list) || modelIndex < 0 || modelIndex >= list.length) {
    return {};
  }
  const entry = list[modelIndex];
  return entry && typeof entry === "object" ? entry : {};
}

function applyModelInitialRotation(groupMesh, opts) {
  const ed = opts.eulerDeg;
  if (!ed) {
    return;
  }
  const order = opts.eulerOrder ?? "XYZ";
  groupMesh.rotation.set(
    THREE.MathUtils.degToRad(ed.x ?? 0),
    THREE.MathUtils.degToRad(ed.y ?? 0),
    THREE.MathUtils.degToRad(ed.z ?? 0),
    order,
  );
}

function readSwayOpts(rotOpts) {
  const box = rotOpts.sway;
  const src = box && typeof box === "object" ? box : rotOpts;
  return {
    swayAmp: src.swayAmplitude,
    swayOmega: src.swayOmega,
    swayAmpSpread: src.swayAmplitudeSpread,
    swayOmegaSpread: src.swayOmegaSpread,
  };
}

function pickSpinAxis(mode) {
  if (mode === "x") {
    return new THREE.Vector3(1, 0, 0);
  }
  if (mode === "y") {
    return new THREE.Vector3(0, 1, 0);
  }
  if (mode === "z") {
    return new THREE.Vector3(0, 0, 1);
  }
  if (mode === "randomPerParticle") {
    const axes = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
    ];
    return axes[Math.floor(Math.random() * 3)];
  }
  const v = new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5,
  );
  if (v.lengthSq() < 1e-6) {
    return new THREE.Vector3(0, 1, 0);
  }
  return v.normalize();
}

export function createARConfetti({
  parent,
  loader,
  config = AR_CONFETTI_CONFIG,
}) {
  const rootGroup = new THREE.Group();
  rootGroup.name = "ARConfettiRoot";
  parent.add(rootGroup);

  let templates = [];
  let loadPromise = null;
  let disposed = false;
  let bursting = false;
  let burstStartMs = 0;
  let pendingSpawnCount = 0;
  let modelTemplateSchedule = null;
  const particles = [];
  const spawnTimeouts = [];

  function loadTemplates() {
    if (loadPromise) {
      return loadPromise;
    }
    loadPromise = Promise.all(
      config.modelPaths.map(
        (path) =>
          new Promise((resolve, reject) => {
            loader.load(path, resolve, undefined, reject);
          }),
      ),
    )
      .then((gltfs) => {
        if (disposed) {
          return;
        }
        templates = gltfs.map((gltf) =>
          buildTemplateFromGltf(gltf, config.templateUnit),
        );
        templates.forEach((t) => applyConfettiRenderFlags(t, config));
      })
      .catch((err) => {
        if (!disposed) {
          templates = [];
        }
        throw err;
      });
    return loadPromise;
  }

  function clearSpawnTimeouts() {
    spawnTimeouts.forEach((id) => window.clearTimeout(id));
    spawnTimeouts.length = 0;
  }

  function removeParticle(entry) {
    rootGroup.remove(entry.group);
    disposeObject3D(entry.group);
    const i = particles.indexOf(entry);
    if (i >= 0) {
      particles.splice(i, 1);
    }
  }

  function pickTemplateIndex(spawnSlotIndex) {
    const n = config.onlyModelIndex;
    if (
      typeof n === "number" &&
      Number.isFinite(n) &&
      templates.length > 0
    ) {
      return THREE.MathUtils.clamp(
        Math.floor(n),
        0,
        templates.length - 1,
      );
    }
    if (
      config.modelTemplateSelection === "balanced" &&
      modelTemplateSchedule &&
      typeof spawnSlotIndex === "number" &&
      spawnSlotIndex >= 0 &&
      spawnSlotIndex < modelTemplateSchedule.length
    ) {
      return modelTemplateSchedule[spawnSlotIndex];
    }
    return Math.floor(Math.random() * templates.length);
  }

  function spawnOne(spawnSlotIndex) {
    if (!templates.length) {
      return;
    }
    const ti = pickTemplateIndex(spawnSlotIndex);
    const groupMesh = templates[ti].clone(true);
    const rotOpts = modelRotationOptsAt(config, ti);
    applyModelInitialRotation(groupMesh, rotOpts);
    const useRx = config.spawnRandomizeX !== false;
    const useRy = config.spawnRandomizeY !== false;
    const useRz = config.spawnRandomizeZ !== false;
    const xSpread = useRx
      ? randomRange(config.spreadXMin, config.spreadXMax)
      : (config.spreadXMin + config.spreadXMax) * 0.5;
    const ySpread = useRy
      ? randomRange(config.spawnYMin, config.spawnYMax)
      : (config.spawnYMin + config.spawnYMax) * 0.5;
    const zDepth = useRz
      ? randomRange(config.depthZMin, config.depthZMax)
      : (config.depthZMin + config.depthZMax) * 0.5;
    const denom = config.depthZMax - config.depthZMin || 1;
    const t = (zDepth - config.depthZMin) / denom;
    const depthMul = THREE.MathUtils.lerp(
      config.scaleAtMax,
      config.scaleAtMin,
      t,
    );
    groupMesh.scale.multiplyScalar(depthMul);
    const sm = config.spawnScaleMultiplier;
    if (typeof sm === "number" && Number.isFinite(sm)) {
      groupMesh.scale.multiplyScalar(sm);
    }
    const ox = config.spawnOffsetX ?? 0;
    const oy = config.spawnOffsetY ?? 0;
    const oz = config.spawnOffsetZ ?? 0;
    groupMesh.position.set(xSpread + ox, ySpread + oy, zDepth + oz);

    const spinDirection =
      rotOpts.spinDirection !== undefined
        ? rotOpts.spinDirection
        : config.spinDirection;
    const spinAxisMode =
      rotOpts.spinAxisMode !== undefined
        ? rotOpts.spinAxisMode
        : config.spinAxisMode;
    const spinSpeedMin =
      rotOpts.spinSpeedMin !== undefined
        ? rotOpts.spinSpeedMin
        : config.spinSpeedMin;
    const spinSpeedMax =
      rotOpts.spinSpeedMax !== undefined
        ? rotOpts.spinSpeedMax
        : config.spinSpeedMax;
    let spinMult = 1;
    if (spinDirection === "random") {
      spinMult = Math.random() < 0.5 ? -1 : 1;
    } else if (spinDirection === -1) {
      spinMult = -1;
    }
    const spinAxis = pickSpinAxis(spinAxisMode).normalize();
    const spinSpeed = randomRange(spinSpeedMin, spinSpeedMax) * spinMult;
    const fallSpeedMin =
      rotOpts.fallSpeedMin !== undefined
        ? rotOpts.fallSpeedMin
        : config.fallSpeedMin;
    const fallSpeedMax =
      rotOpts.fallSpeedMax !== undefined
        ? rotOpts.fallSpeedMax
        : config.fallSpeedMax;
    const vy = randomRange(fallSpeedMin, fallSpeedMax);

    rootGroup.add(groupMesh);
    const entry = { group: groupMesh, vy, spinAxis, spinSpeed };
    const {
      swayAmp: rawAmp,
      swayOmega: rawOmega,
      swayAmpSpread,
      swayOmegaSpread,
    } = readSwayOpts(rotOpts);
    let swayAmp = rawAmp;
    let swayOmega = rawOmega;
    if (
      typeof swayAmp === "number" &&
      Number.isFinite(swayAmp) &&
      typeof swayOmega === "number" &&
      Number.isFinite(swayOmega)
    ) {
      if (
        typeof swayAmpSpread === "number" &&
        Number.isFinite(swayAmpSpread) &&
        swayAmpSpread > 0
      ) {
        swayAmp = randomRange(swayAmp - swayAmpSpread, swayAmp + swayAmpSpread);
      }
      if (
        typeof swayOmegaSpread === "number" &&
        Number.isFinite(swayOmegaSpread) &&
        swayOmegaSpread > 0
      ) {
        swayOmega = randomRange(
          swayOmega - swayOmegaSpread,
          swayOmega + swayOmegaSpread,
        );
      }
      swayAmp = Math.max(1e-6, swayAmp);
      swayOmega = Math.max(1e-6, swayOmega);
      entry.swayBaseX = groupMesh.position.x;
      entry.swayAmp = swayAmp;
      entry.swayOmega = swayOmega;
      entry.swayPhase = Math.random() * Math.PI * 2;
      entry.swayAge = 0;
    }
    particles.push(entry);
  }

  function startBurst() {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    if (!templates.length) {
      return;
    }
    if (bursting) {
      return;
    }
    const { particleCount } = config;
    bursting = true;
    burstStartMs = performance.now();
    clearSpawnTimeouts();
    pendingSpawnCount = particleCount;
    if (config.modelTemplateSelection === "balanced" && templates.length > 0) {
      modelTemplateSchedule = buildBalancedModelTemplateSchedule(
        particleCount,
        templates.length,
      );
    } else {
      modelTemplateSchedule = null;
    }
    for (let i = 0; i < particleCount; i += 1) {
      const delay =
        config.spawnBaseDelayMs +
        i * config.spawnSpacingMs +
        Math.random() * config.spawnJitterMs;
      const id = window.setTimeout(() => {
        spawnOne(i);
        pendingSpawnCount -= 1;
      }, delay);
      spawnTimeouts.push(id);
    }
  }

  function update(delta) {
    if (bursting && burstStartMs > 0) {
      const elapsed = performance.now() - burstStartMs;
      if (elapsed > config.maxDurationMs) {
        clearSpawnTimeouts();
        pendingSpawnCount = 0;
        const copy = particles.slice();
        copy.forEach((p) => removeParticle(p));
        bursting = false;
        burstStartMs = 0;
        return;
      }
    }
    if (bursting && pendingSpawnCount === 0 && particles.length === 0) {
      bursting = false;
      burstStartMs = 0;
    }
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.group.position.y -= p.vy * delta;
      if (p.swayAmp !== undefined && p.swayOmega !== undefined) {
        p.swayAge += delta;
        p.group.position.x =
          p.swayBaseX + p.swayAmp * Math.sin(p.swayOmega * p.swayAge + p.swayPhase);
      }
      p.group.rotateOnAxis(p.spinAxis, p.spinSpeed * delta);
      if (p.group.position.y < config.despawnBelowY) {
        removeParticle(p);
      }
    }
  }

  function dispose() {
    disposed = true;
    clearSpawnTimeouts();
    pendingSpawnCount = 0;
    while (particles.length) {
      removeParticle(particles[particles.length - 1]);
    }
    bursting = false;
    burstStartMs = 0;
    if (rootGroup.parent) {
      rootGroup.parent.remove(rootGroup);
    }
    templates.forEach((t) => disposeObject3D(t));
    templates = [];
    loadPromise = null;
  }

  return {
    loadTemplates,
    startBurst,
    update,
    dispose,
  };
}
