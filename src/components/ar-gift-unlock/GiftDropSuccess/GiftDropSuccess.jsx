import TickIcon from "../../../assets/svg/tick.svg?react";
import "./GiftDropSuccess.css";

export const GIFT_DROP_TICK_DRAW_MS = 1900;

const DEFAULT_SUCCESS_TEXT = "Your gift has been added to the drops!";

function GiftDropSuccess({ text }) {
  return (
    <div
      className="gift-drop-success"
      role="status"
      aria-live="polite"
      style={{
        "--gift-drop-tick-draw-ms": `${GIFT_DROP_TICK_DRAW_MS}ms`,
      }}
    >
      <div className="gift-drop-success__icon" aria-hidden="true">
        <TickIcon className="gift-drop-success__check" />
      </div>
      <p className="gift-drop-success__text">{text ?? DEFAULT_SUCCESS_TEXT}</p>
    </div>
  );
}

export default GiftDropSuccess;
