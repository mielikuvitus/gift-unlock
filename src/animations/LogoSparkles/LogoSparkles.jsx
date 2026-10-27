import "./LogoSparkles.css";

/**
 * Three white cross sparkles around a logo. Renders a single grouped overlay
 * (`<span class="logo-sparkles">`); parent should be `position: relative` (e.g. logo wrapper).
 * To move all sparkles together, translate `.logo-sparkles` or pass `className`
 * and target that hook in CSS.
 */
function LogoSparkles({ className = "" }) {
  return (
    <span
      className={className ? `logo-sparkles ${className}` : "logo-sparkles"}
      aria-hidden="true"
    >
      <span className="logo-sparkles__sparkle logo-sparkles__sparkle--tr">
        <span className="logo-sparkles__sparkle-core" />
      </span>
      <span className="logo-sparkles__sparkle logo-sparkles__sparkle--bl">
        <span className="logo-sparkles__sparkle-core logo-sparkles__sparkle-core--delay" />
      </span>
      <span className="logo-sparkles__sparkle logo-sparkles__sparkle--mr">
        <span className="logo-sparkles__sparkle-core logo-sparkles__sparkle-core--delay-2s" />
      </span>
    </span>
  );
}

export default LogoSparkles;
