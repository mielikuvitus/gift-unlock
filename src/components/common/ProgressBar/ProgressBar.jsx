import "./ProgressBar.css";

/**
 * @param {object} props
 * @param {number} [props.percentage] — 0–100 track fill (derive from e.g. `(discPoints / cap) * 100`)
 * @param {boolean} [props.fillAnimated] — striped fill; thick border while true when using default shell
 * @param {boolean} [props.trackPulse] — pulse-shell DOM for border/glow (scoped in parent CSS)
 * @param {string} [props.ariaValueText] — e.g. points total for screen readers
 */
function ProgressBar({
  percentage = 0,
  fillAnimated = false,
  trackPulse = false,
  ariaValueText,
}) {
  const clamped = Math.min(100, Math.max(0, percentage));

  const fill = (
    <div
      className="progress-bar__fill"
      data-animated={fillAnimated ? "true" : undefined}
      style={{ width: `${clamped}%` }}
    />
  );

  const a11y = {
    "aria-valuemax": 100,
    "aria-valuemin": 0,
    "aria-valuenow": clamped,
    ...(ariaValueText ? { "aria-valuetext": ariaValueText } : {}),
  };

  if (trackPulse) {
    return (
      <div
        className="progress-bar progress-bar--pulse-shell"
        data-fill-animating={fillAnimated ? "true" : undefined}
        role="progressbar"
        {...a11y}
      >
        <div className="progress-bar__track">{fill}</div>
      </div>
    );
  }

  return (
    <div className="progress-bar" role="progressbar" {...a11y}>
      {fill}
    </div>
  );
}

export default ProgressBar;
