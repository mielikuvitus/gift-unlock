import Tap1Icon from "../../assets/svg/tap 1.svg?react";
import TapIcon from "../../assets/svg/tap-icon.svg?react";
import "./TapHintLoop.css";

function TapHintLoop({ className = "" }) {
  const rootClass = className
    ? `tap-hint-loop ${className}`
    : "tap-hint-loop";
  return (
    <div className={rootClass}>
      <Tap1Icon
        className="tap-hint-loop__icon tap-hint-loop__icon--first"
        aria-hidden
      />
      <TapIcon
        className="tap-hint-loop__icon tap-hint-loop__icon--second"
        aria-hidden
      />
    </div>
  );
}

export default TapHintLoop;
