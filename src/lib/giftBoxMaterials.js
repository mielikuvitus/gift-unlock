import * as THREE from "three";

const GIFT_RIBBON_MATERIAL_NAME = "Color - Red Grad-ribbon";

function readCssColorVar(varName, fallbackHex) {
  if (typeof document === "undefined") {
    return fallbackHex;
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return raw || fallbackHex;
}

function styleGiftRibbonMaterial(mat, options) {
  if (!mat || mat.name !== GIFT_RIBBON_MATERIAL_NAME) {
    return;
  }
  const forAr = options?.variant === "ar";
  const hex = readCssColorVar("--color-blue", "#0066ff");
  const base = new THREE.Color().setStyle(hex);
  mat.color.copy(base);
  mat.emissive.copy(base);
  if (forAr) {
    mat.emissiveIntensity = 0.08;
    if ("metalness" in mat) {
      mat.metalness = 0.8;
    }
    if ("roughness" in mat) {
      mat.roughness = 0.24;
    }
    if ("envMapIntensity" in mat) {
      mat.envMapIntensity = 1.2;
    }
  } else {
    mat.emissiveIntensity = 0.14;
    if ("metalness" in mat) {
      mat.metalness = 0.78;
    }
    if ("roughness" in mat) {
      mat.roughness = 0.88;
    }
  }
}

export function applyGiftBoxMaterialsFromCss(root, options) {
  root.traverse((child) => {
    if (child.isMesh) {
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      mats.forEach((mat) => {
        styleGiftRibbonMaterial(mat, options);
        mat.transparent = true;
      });
    }
  });
}

export function applyArRevealProductPbrMaterials(root) {
  root.traverse((child) => {
    if (!child.isMesh) {
      return;
    }
    const mats = Array.isArray(child.material)
      ? child.material
      : [child.material];
    mats.forEach((mat) => {
      if (!mat || !("metalness" in mat) || !("roughness" in mat)) {
        return;
      }
      const m0 =
        typeof mat.metalness === "number" ? mat.metalness : 0;
      const r0 =
        typeof mat.roughness === "number" ? mat.roughness : 0.65;
      mat.metalness = THREE.MathUtils.clamp(m0 + 0.32, 0, 1);
      mat.roughness = THREE.MathUtils.clamp(r0 * 0.62, 0.15, 1);
      if ("envMapIntensity" in mat) {
        const e0 =
          typeof mat.envMapIntensity === "number"
            ? mat.envMapIntensity
            : 1;
        mat.envMapIntensity = THREE.MathUtils.clamp(e0 * 1.22, 0.5, 2.5);
      }
    });
  });
}
