import focusUrl from "../../assets/svg/focus.svg?url";
import dashOuterUrl from "../../assets/svg/dash-outer.svg?url";
import dashInnerUrl from "../../assets/svg/dash-inner.svg?url";
import "./Focus.css";

/**
 * Three stacked SVGs (outer dashed ring, inner dashed ring, reticle), centered.
 * Ring rotation only — no translation of the screen background.
 */
function Focus({ className = "" }) {
  const rootClass = className
    ? `focus-animation ${className}`
    : "focus-animation";

  return (
    <div className={rootClass} aria-hidden="true">
      <div className="focus-animation__layout-wrap">
        <div className="focus-animation__viewport">
          <div className="focus-animation__stack">
            <img
              className="focus-animation__layer focus-animation__layer--outer"
              src={dashOuterUrl}
              alt=""
              decoding="async"
            />
            <img
              className="focus-animation__layer focus-animation__layer--inner"
              src={dashInnerUrl}
              alt=""
              decoding="async"
            />
            <img
              className="focus-animation__layer focus-animation__layer--focus"
              src={focusUrl}
              alt=""
              decoding="async"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Focus;
