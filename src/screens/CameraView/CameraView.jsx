import { useEffect, useRef, useState } from "react";
import CircleButton from "../../components/common/CircleButton/CircleButton.jsx";
import { WediscovrHeaderLogo } from "../../components/common/WediscovrTopHeader/WediscovrTopHeader.jsx";
import WarningGlassCard from "../../components/common/WarningGlassCard/WarningGlassCard.jsx";
import {
  useCamera,
  CAMERA_BATTERY_WARNING_RESUME,
  CAMERA_BATTERY_WARNING_TITLE,
} from "../../hooks/useCamera.js";
import LocationGlyph from "../../assets/svg/location.svg?react";
import LocationPinGlyph from "../../assets/svg/location-icon.svg?react";
import ClueDetail from "../ClueDetail/ClueDetail.jsx";
import { formatCheckpointLabelForUser } from "./utils";
import "./CameraView.css";

function CameraView({
  currentStopNumber,
  checkpointsOrdered = [],
  claimedCheckpointIds = [],
  expectedCheckpoint,
  onCheckpointScanned,
}) {
  const {
    videoRef,
    canvasRef,
    streamRef,
    scanActiveRef,
    error,
    batteryCameraOff,
    startCamera,
    releaseCameraMedia,
    startScanLoop,
  } = useCamera();

  const qrRejectLogKeyRef = useRef("");
  const [checkpointError, setCheckpointError] = useState(null);
  const [clueOverlayOpen, setClueOverlayOpen] = useState(false);

  function handleQrDetected(payload) {
    const [checkpointId] = payload.split(":");
    const checkpoint = checkpointsOrdered.find((c) => c.id === checkpointId);

    if (!checkpoint) {
      const key = `unknown:${payload}`;
      if (qrRejectLogKeyRef.current !== key) {
        qrRejectLogKeyRef.current = key;
        console.warn("QR does not match any checkpoint:", payload);
      }
      return true;
    }

    if (expectedCheckpoint && checkpoint.id !== expectedCheckpoint.id) {
      const key = `wrong:${checkpoint.id}:${expectedCheckpoint.id}`;
      if (qrRejectLogKeyRef.current !== key) {
        qrRejectLogKeyRef.current = key;
        console.warn(
          "QR matched a checkpoint but not the expected one:",
          checkpoint.id,
          "expected:",
          expectedCheckpoint.id,
        );
      }
      const errorType =
        checkpoint.orderIndex < expectedCheckpoint.orderIndex
          ? "already-scanned"
          : "wrong-order";
      setCheckpointError(errorType);
      return false;
    }

    console.log(
      "CameraView: checkpoint matched —",
      checkpoint.title,
      "· scan stopped",
    );
    releaseCameraMedia();
    onCheckpointScanned?.(checkpoint);
    return false;
  }

  function dismissCheckpointError() {
    setCheckpointError(null);
    qrRejectLogKeyRef.current = "";
    if (clueOverlayOpen) {
      return;
    }
    if (streamRef.current?.active) {
      scanActiveRef.current = true;
      startScanLoop(handleQrDetected);
    } else {
      startCamera(handleQrDetected);
    }
  }

  useEffect(() => {
    if (batteryCameraOff) {
      setCheckpointError(null);
    }
  }, [batteryCameraOff]);

  useEffect(() => {
    qrRejectLogKeyRef.current = "";
    if (clueOverlayOpen) {
      releaseCameraMedia();
      return () => {
        releaseCameraMedia();
      };
    }
    startCamera(handleQrDetected);
    return () => {
      releaseCameraMedia();
    };
  }, [startCamera, releaseCameraMedia, checkpointsOrdered, clueOverlayOpen]);

  const isPermissionError = error === "NotAllowedError";
  const isReadableError = error === "NotReadableError";
  const showCard = isPermissionError || isReadableError;

  const nextCheckpointPhrase = expectedCheckpoint
    ? formatCheckpointLabelForUser(expectedCheckpoint, checkpointsOrdered)
    : "the next checkpoint";

  const fakeQrButton = expectedCheckpoint?.checkpointQr ? (
    <button
      type="button"
      className="u-btn-primary camera-view__fake-qr"
      onClick={() => handleQrDetected(expectedCheckpoint.checkpointQr)}
    >
      DEMO only: use fake QR
    </button>
  ) : null;

  if (showCard) {
    return (
      <div className="camera-view camera-view--blocked">
        <WarningGlassCard
          variant={isPermissionError ? "camera-access" : "default"}
          warningText="Camera access needed"
          description={
            isReadableError
              ? "The camera is currently unavailable — it may be in use by another app. Close any other apps using the camera then tap Try Again below."
              : undefined
          }
          buttonLabel="Try Again"
          onButtonClick={() => {
            qrRejectLogKeyRef.current = "";
            startCamera(handleQrDetected);
          }}
        />
        {fakeQrButton}
      </div>
    );
  }

  const showRunBanner =
    typeof currentStopNumber === "number" &&
    Number.isFinite(currentStopNumber);

  return (
    <div className="camera-view">
      <video
        ref={videoRef}
        className="camera-view__feed"
        autoPlay
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="camera-view__scan-canvas"
        aria-hidden="true"
      />
      {showRunBanner ? (
        <p className="camera-view__run-banner u-text-pretty-center">
          Stop {currentStopNumber}
        </p>
      ) : null}
      <div className="camera-view__scan-indicator" aria-hidden="true">
        <span className="camera-view__bracket camera-view__bracket--tl" />
        <span className="camera-view__bracket camera-view__bracket--tr" />
        <span className="camera-view__bracket camera-view__bracket--bl" />
        <span className="camera-view__bracket camera-view__bracket--br" />
        <p className="camera-view__scan-hint">Scan QR to unlock</p>
        {fakeQrButton}
      </div>
      {clueOverlayOpen ? (
        <div className="camera-view__clue-overlay u-gift-run-shell">
          <ClueDetail
            className="camera-view__clue-detail"
            checkpointsOrdered={checkpointsOrdered}
            claimedCheckpointCount={claimedCheckpointIds.length}
            footerExtra={
              <div className="clue-detail__footer-circle">
                <CircleButton
                  className="circle-button--in-bar"
                  size="sm"
                  onStart={() => setClueOverlayOpen(false)}
                  content={<LocationPinGlyph aria-hidden />}
                  aria-label="Close clue details"
                />
              </div>
            }
          />
        </div>
      ) : null}
      {clueOverlayOpen ? null : (
        <div className="camera-view__bottom-bar">
          <WediscovrHeaderLogo className="camera-view__bottom-logo" />
          <CircleButton
            className="circle-button--in-bar"
            size="sm"
            onStart={() => setClueOverlayOpen(true)}
            content={<LocationGlyph aria-hidden />}
            aria-label="Open clue details"
          />
        </div>
      )}
      {checkpointError ? (
        <div
          className="camera-view__checkpoint-error u-dark-overlay u-dark-overlay--fill u-dark-overlay--center"
          role="alert"
        >
          <WarningGlassCard
            warningText={
              checkpointError === "already-scanned"
                ? "You've already scanned this stop."
                : "Head to the correct stop first."
            }
            description={
              checkpointError === "already-scanned"
                ? `Go to ${nextCheckpointPhrase} next. Please check the map for more information.`
                : `Your next stop is ${nextCheckpointPhrase}.`
            }
            buttonLabel="Ok"
            onButtonClick={dismissCheckpointError}
          />
        </div>
      ) : null}
      {batteryCameraOff ? (
        <div
          className="camera-view__checkpoint-error camera-view__battery-idle u-dark-overlay u-dark-overlay--fill u-dark-overlay--center"
          role="button"
          tabIndex={0}
          aria-label={`${CAMERA_BATTERY_WARNING_TITLE} ${CAMERA_BATTERY_WARNING_RESUME}`}
          onClick={() => {
            qrRejectLogKeyRef.current = "";
            if (!clueOverlayOpen) {
              startCamera(handleQrDetected);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              qrRejectLogKeyRef.current = "";
              if (!clueOverlayOpen) {
                startCamera(handleQrDetected);
              }
            }
          }}
        >
          <WarningGlassCard variant="camera-battery" />
        </div>
      ) : null}
    </div>
  );
}

export default CameraView;
