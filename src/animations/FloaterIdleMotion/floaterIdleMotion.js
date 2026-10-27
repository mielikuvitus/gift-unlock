export const FLOATER_IDLE_DEFAULTS = {
  rotationSpeed: 0.85,
  bobFrequency: 1.15,
  bobAmplitudeIdle: 0.034,
  bobAmplitudeHover: 0.078,
};

export function applyFloaterIdleMotion(object3D, params) {
  const {
    delta,
    elapsed,
    hoverActive,
    reduceMotion,
    basePosition,
    rotationSpeed = FLOATER_IDLE_DEFAULTS.rotationSpeed,
    bobFrequency = FLOATER_IDLE_DEFAULTS.bobFrequency,
    bobAmplitudeIdle = FLOATER_IDLE_DEFAULTS.bobAmplitudeIdle,
    bobAmplitudeHover = FLOATER_IDLE_DEFAULTS.bobAmplitudeHover,
  } = params;

  if (reduceMotion || !object3D) {
    return;
  }

  const amp = hoverActive ? bobAmplitudeHover : bobAmplitudeIdle;
  object3D.rotation.y += delta * rotationSpeed;
  object3D.position.set(
    basePosition.x,
    basePosition.y + Math.sin(elapsed * bobFrequency) * amp,
    basePosition.z,
  );
}
