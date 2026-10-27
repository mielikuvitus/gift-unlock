export const VERTICAL_BOB_DEFAULTS = {
  bobFrequency: 1.9,
  bobAmplitudeIdle: 0.085,
  bobAmplitudeHover: 0.3,
};

export function applyVerticalBobMotion(object3D, params) {
  const {
    elapsed,
    hoverActive,
    reduceMotion,
    basePosition,
    bobFrequency = VERTICAL_BOB_DEFAULTS.bobFrequency,
    bobAmplitudeIdle = VERTICAL_BOB_DEFAULTS.bobAmplitudeIdle,
    bobAmplitudeHover = VERTICAL_BOB_DEFAULTS.bobAmplitudeHover,
  } = params;

  if (reduceMotion || !object3D) {
    return;
  }

  const amp = hoverActive ? bobAmplitudeHover : bobAmplitudeIdle;
  object3D.position.set(
    basePosition.x,
    basePosition.y + Math.sin(elapsed * bobFrequency) * amp,
    basePosition.z,
  );
}
