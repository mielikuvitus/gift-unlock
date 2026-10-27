const COARSE_POINTER_QUERY = /pointer:\s*coarse/;

function matchingMediaQueryList(media) {
  return {
    matches: true,
    media,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  };
}

/**
 * Makes the embedded app behave as if it runs on an iPhone with a motion sensor:
 * reports a touch pointer, grants motion permission, and lets the showcase feed
 * deviceorientation readings. Without this, a laptop would always take the app's
 * tap-to-unlock fallback (see requestDeviceOrientationPermission).
 */
export function installDeviceSimulator(win) {
  const matchMedia = win.matchMedia.bind(win);
  win.matchMedia = (query) =>
    COARSE_POINTER_QUERY.test(query)
      ? matchingMediaQueryList(query)
      : matchMedia(query);

  if (typeof win.DeviceOrientationEvent === "undefined") {
    win.DeviceOrientationEvent = class extends win.Event {
      constructor(type, init = {}) {
        super(type, init);
        this.alpha = init.alpha ?? null;
        this.beta = init.beta ?? null;
        this.gamma = init.gamma ?? null;
        this.absolute = init.absolute ?? false;
      }
    };
  }
  win.DeviceOrientationEvent.requestPermission = () =>
    Promise.resolve("granted");

  return {
    dispatchOrientation({ beta, gamma }) {
      win.dispatchEvent(
        new win.DeviceOrientationEvent("deviceorientation", {
          alpha: 0,
          beta,
          gamma,
          absolute: false,
        }),
      );
    },
  };
}
