import { useCallback, useRef, useState } from "react";
import jsQR from "jsqr";

const BATTERY_IDLE_MS = 120_000;

export const CAMERA_BATTERY_WARNING_TITLE = "Your camera has been turned off";

export const CAMERA_BATTERY_WARNING_LEAD =
  "We respect your battery and have turned the camera off for now.";

export const CAMERA_BATTERY_WARNING_RESUME = "Tap the screen to resume.";

/**
 * startCamera (below) waits two animation frames before getUserMedia only when
 * import.meta.env.DEV is true. React StrictMode in development runs effect
 * mount → cleanup → mount in quick succession; spacing release and acquire
 * reduces Safari/iOS churn from overlapping MediaStream lifecycles.
 * (The churn made my iPhone camera crash previously) Vite
 * builds set DEV to false, so production keeps the original immediate path.
 */
export function useCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanActiveRef = useRef(false);
  const cameraSessionRef = useRef(0);
  const rafRef = useRef(null);
  const idleTimerRef = useRef(null);
  const [error, setError] = useState(null);
  const [batteryCameraOff, setBatteryCameraOff] = useState(false);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current != null) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const releaseCameraMedia = useCallback(
    (options = {}) => {
      const markBatteryIdle = options.markBatteryIdle === true;
      clearIdleTimer();
      cameraSessionRef.current += 1;
      scanActiveRef.current = false;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (markBatteryIdle) {
        setBatteryCameraOff(true);
      } else {
        setBatteryCameraOff(false);
      }
    },
    [clearIdleTimer],
  );

  const startScanLoop = useCallback((onQrDetected) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    scanActiveRef.current = true;
    console.log("CameraView: QR scan loop started");

    function tick() {
      if (!scanActiveRef.current) {
        return;
      }
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height);
      const payload = result?.data?.trim();

      if (payload) {
        scanActiveRef.current = false;
        const resume = onQrDetected(payload);
        if (resume) {
          scanActiveRef.current = true;
          rafRef.current = requestAnimationFrame(tick);
        }
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startCamera = useCallback(
    async (onQrDetected) => {
      setError(null);
      releaseCameraMedia();
      const session = cameraSessionRef.current;
      try {
        if (import.meta.env.DEV) {
          await new Promise((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(resolve);
            });
          });
          if (session !== cameraSessionRef.current) {
            return;
          }
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (session !== cameraSessionRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          const tryPlay = () => {
            video.play().catch((err) => {
              if (err?.name !== "AbortError") {
                console.warn(err);
              }
            });
          };
          tryPlay();
          video.addEventListener(
            "loadeddata",
            () => {
              tryPlay();
            },
            { once: true },
          );
          startScanLoop(onQrDetected);
        }

        clearIdleTimer();
        idleTimerRef.current = window.setTimeout(() => {
          releaseCameraMedia({ markBatteryIdle: true });
        }, BATTERY_IDLE_MS);
      } catch (err) {
        setError(err.name);
      }
    },
    [clearIdleTimer, releaseCameraMedia, startScanLoop],
  );

  return {
    videoRef,
    canvasRef,
    streamRef,
    scanActiveRef,
    error,
    setError,
    batteryCameraOff,
    startCamera,
    releaseCameraMedia,
    startScanLoop,
  };
}
