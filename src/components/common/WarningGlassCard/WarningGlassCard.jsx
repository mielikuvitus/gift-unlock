import WarningTriangleIcon from "../../../assets/svg/warning-triangle.svg?react";
import {
  CAMERA_BATTERY_WARNING_LEAD,
  CAMERA_BATTERY_WARNING_RESUME,
  CAMERA_BATTERY_WARNING_TITLE,
} from "../../../hooks/useCamera.js";

const CAMERA_ACCESS_STEPS = [
  "Open your phone's Settings",
  "Find your browser (Chrome or Safari) →  Camera",
  "Set to Allow, then come back and tap Try Again",
];

/**
 * @param {object} props
 * @param {"default" | "camera-access" | "camera-battery"} [props.variant]
 */
function WarningGlassCard({
  warningText,
  description,
  buttonLabel,
  onButtonClick,
  variant = "default",
}) {
  const showCameraSteps = variant === "camera-access";
  const showCameraBattery = variant === "camera-battery";
  const resolvedTitle = showCameraBattery
    ? CAMERA_BATTERY_WARNING_TITLE
    : warningText;
  const showButton = Boolean(buttonLabel && onButtonClick);

  return (
    <div className="u-glass-warning-card u-glass-card u-glass-card--warning">
      <div className="u-glass-warning-card__icon-wrap">
        <WarningTriangleIcon
          className="u-glass-warning-card__icon"
          aria-hidden
        />
      </div>
      <p className="u-glass-warning-card__title">{resolvedTitle}</p>
      {showCameraSteps ? (
        <ol className="u-glass-warning-card__steps">
          {CAMERA_ACCESS_STEPS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      ) : showCameraBattery ? (
        <p className="u-glass-warning-card__warning">
          {CAMERA_BATTERY_WARNING_LEAD}
          <span className="u-glass-warning-card__battery-resume">
            {CAMERA_BATTERY_WARNING_RESUME}
          </span>
        </p>
      ) : description ? (
        <p className="u-glass-warning-card__warning">{description}</p>
      ) : null}
      {showButton ? (
        <button
          className="u-btn-glass u-glass-warning-card__btn"
          type="button"
          onClick={onButtonClick}
        >
          {buttonLabel}
        </button>
      ) : null}
    </div>
  );
}

export default WarningGlassCard;
