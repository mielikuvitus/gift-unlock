import { lazy, Suspense, useId } from "react";
import "./CircleButton.css";

const SonarRingsLazy = lazy(() =>
  import("../../../animations/SonarRings/SonarRings.jsx"),
);

function CircleButton({
  onStart,
  label,
  content,
  labelClassName = "",
  className = "",
  size = "md",
  showSonarRings = false,
  ...buttonProps
}) {
  const fillGradientId = `circle-btn-fill-${useId().replace(/:/g, "")}`;
  const hasContent = content != null;
  const inner = hasContent ? content : label;
  const showInner = !(inner == null || inner === "");
  const innerMods = hasContent
    ? ["circle-button__content", labelClassName]
    : ["circle-button__label", labelClassName];
  const innerClass = innerMods.filter(Boolean).join(" ");
  const rootClass = [
    "circle-button",
    "u-circle-button--active",
    size === "sm" ? "circle-button--sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      className={rootClass}
      onClick={onStart}
      {...buttonProps}
    >
      {showSonarRings ? (
        <Suspense fallback={null}>
          <SonarRingsLazy />
        </Suspense>
      ) : null}
      <svg
        className="circle-button__circle"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient
            id={fillGradientId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#40a6ff" />
            <stop offset="100%" stopColor="#0047e0" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="12" fill={`url(#${fillGradientId})`} />
      </svg>
      {showInner ? <span className={innerClass}>{inner}</span> : null}
    </button>
  );
}

export default CircleButton;
