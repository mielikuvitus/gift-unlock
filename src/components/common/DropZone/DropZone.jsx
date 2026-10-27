import { forwardRef } from "react";
import GiftIcon from "../../../assets/svg/gift.svg?react";
import "./DropZone.css";

const DropZone = forwardRef(({ isActive, isOver, className = "" }, ref) => {
  const rootClass = [
    "drop-zone",
    isActive ? "is-active" : "",
    isActive && isOver ? "is-over" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={rootClass} data-drop-target="true">
      <div className="drop-zone__inner">
        <span className="drop-zone__label">DROPS</span>
        <GiftIcon className="drop-zone__icon" aria-hidden />
      </div>
    </div>
  );
});

DropZone.displayName = "DropZone";

export default DropZone;
