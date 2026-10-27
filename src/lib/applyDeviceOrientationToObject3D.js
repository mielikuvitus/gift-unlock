import * as THREE from "three";

export const DEFAULT_ABSOLUTE_BETA_MAX = 70;

const pitchEulerScratch = new THREE.Euler();
const rollEulerScratch = new THREE.Euler();
const rollTargetQuatScratch = new THREE.Quaternion();

export function applyDeviceOrientationToObject3D(
  event,
  pitchGroup,
  rollGroup,
  options = {},
) {
  const baselineBeta = options.baselineBeta;
  const baselineGamma = options.baselineGamma;
  const deltaBetaMin = options.deltaBetaMin ?? 0;
  const deltaBetaMax = options.deltaBetaMax ?? 70;
  const deltaGammaMin = options.deltaGammaMin ?? -58;
  const deltaGammaMax = options.deltaGammaMax ?? 58;
  const slerpGammaAlpha = options.slerpGammaAlpha ?? 0.22;
  const deltaBetaSnapReleaseBelowMax =
    options.deltaBetaSnapReleaseBelowMax ?? 4;
  const absoluteBetaMax = options.absoluteBetaMax ?? DEFAULT_ABSOLUTE_BETA_MAX;
  const tiltScaleLegacy = options.tiltScale;
  const tiltScalePitch =
    options.tiltScalePitch ?? tiltScaleLegacy ?? 1.45;
  const tiltScaleRoll =
    options.tiltScaleRoll ?? tiltScaleLegacy ?? 1.25;

  if (
    event.beta == null ||
    event.gamma == null ||
    Number.isNaN(event.beta) ||
    Number.isNaN(event.gamma)
  ) {
    return { ok: false };
  }
  if (
    baselineBeta == null ||
    baselineGamma == null ||
    Number.isNaN(baselineBeta) ||
    Number.isNaN(baselineGamma)
  ) {
    return { ok: false };
  }
  if (!pitchGroup || !rollGroup) {
    return { ok: false };
  }

  const betaForPitch =
    absoluteBetaMax != null && !Number.isNaN(absoluteBetaMax)
      ? Math.min(event.beta, absoluteBetaMax)
      : event.beta;
  const rawDeltaBeta = betaForPitch - baselineBeta;
  let deltaBeta;
  const pinned = pitchGroup.userData.betaPinnedAtMax === true;
  if (!pinned) {
    if (rawDeltaBeta >= deltaBetaMax) {
      pitchGroup.userData.betaPinnedAtMax = true;
      deltaBeta = deltaBetaMax;
    } else {
      deltaBeta = THREE.MathUtils.clamp(
        rawDeltaBeta,
        deltaBetaMin,
        deltaBetaMax,
      );
    }
  } else if (rawDeltaBeta <= deltaBetaMax - deltaBetaSnapReleaseBelowMax) {
    pitchGroup.userData.betaPinnedAtMax = false;
    deltaBeta = THREE.MathUtils.clamp(
      rawDeltaBeta,
      deltaBetaMin,
      deltaBetaMax,
    );
  } else {
    deltaBeta = deltaBetaMax;
  }

  const deltaGamma = THREE.MathUtils.clamp(
    event.gamma - baselineGamma,
    deltaGammaMin,
    deltaGammaMax,
  );

  const freezeGamma = event.beta >= DEFAULT_ABSOLUTE_BETA_MAX;

  const deltaBetaVis = deltaBeta * tiltScalePitch;
  const deltaGammaVis = deltaGamma * tiltScaleRoll;

  pitchEulerScratch.set(
    THREE.MathUtils.degToRad(deltaBetaVis),
    0,
    0,
    "YXZ",
  );
  pitchGroup.quaternion.setFromEuler(pitchEulerScratch);

  if (!freezeGamma) {
    rollEulerScratch.set(
      0,
      THREE.MathUtils.degToRad(deltaGammaVis),
      0,
      "YXZ",
    );
    rollTargetQuatScratch.setFromEuler(rollEulerScratch);
    rollGroup.quaternion.slerp(rollTargetQuatScratch, slerpGammaAlpha);
  }

  return { ok: true };
}
