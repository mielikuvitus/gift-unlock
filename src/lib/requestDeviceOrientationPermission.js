/**
 * Motion sensor gate for the AR gift reveal. Must run inside a user gesture (iOS 13+).
 *
 * Resolves to:
 * - "granted"     — sensor available and allowed → final stop uses the AR gift reveal.
 * - "denied"      — user refused the iOS prompt, or the prompt failed → tap-to-unlock fallback.
 * - "unsupported" — no DeviceOrientationEvent API, or not a touch device (laptops/desktops
 *                   have no motion sensor) → tap-to-unlock fallback.
 *
 * A "granted" device can still deliver no readings; ARGiftReveal covers that with its own
 * timeout fallback.
 */
export async function requestDeviceOrientationPermission() {
  if (typeof DeviceOrientationEvent === "undefined") {
    return "unsupported";
  }
  if (!window.matchMedia("(pointer: coarse)").matches) {
    return "unsupported";
  }
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    try {
      const state = await DeviceOrientationEvent.requestPermission();
      return state === "granted" ? "granted" : "denied";
    } catch {
      return "denied";
    }
  }
  return "granted";
}
