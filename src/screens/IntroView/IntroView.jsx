import Focus from "../../animations/Focus/Focus.jsx";
import { WediscovrHeaderLogo } from "../../components/common/WediscovrTopHeader/WediscovrTopHeader.jsx";
import Pill from "../../components/common/Pill/Pill.jsx";
import AmazingyLogo from "../../assets/amazingy-logo.svg?react";
import ClueDetail from "../ClueDetail/ClueDetail.jsx";
import {
  mockConcurrentExplorersCount,
  mockRun,
} from "../../data/mocks/apiMock.js";
import "./IntroView.css";

function IntroView({
  variant = "detail",
  checkpointsOrdered = [],
  claimedCheckpointCount = 0,
  onStart,
  onStartHunt,
  startDisabled = false,
}) {
  if (variant === "gift-unlock") {
    const checkpointCount = mockRun.checkpoints.length;
    const stopsPhrase =
      checkpointCount === 1 ? "1 stop" : `${checkpointCount} stops`;

    return (
      <div className="intro-view intro-view--gift-unlock u-gift-run-shell">
        <div className="intro-view__gift-unlock-bg" aria-hidden="true" />
        <div className="intro-view__gift-unlock-overlay" aria-hidden="true" />
        <p className="intro-view__gift-unlock-placeholder" aria-hidden="true">
          Product picture
        </p>
        <div className="intro-view__gift-unlock-focus-cluster">
          <p className="intro-view__gift-unlock-presented">Presented by</p>
          <AmazingyLogo
            className="intro-view__gift-unlock-amazingy"
            aria-label="Brand logo"
          />
          <Focus />
          <p
            className="intro-view__gift-unlock-title intro-view__gift-unlock-title--on-focus u-text-pretty-center"
            aria-label="Gift unlock"
          >
            GIFT UNLOCK
          </p>
        </div>
        <header className="intro-view__top-header u-gift-run-shell__header">
          <WediscovrHeaderLogo />
          <Pill
            className="intro-view__gift-unlock-pill"
            color="var(--color-blue)"
            text={`${mockConcurrentExplorersCount} Explorers are AR hunting with you`}
          />
        </header>
        <div className="u-gift-run-shell__nav">
          <p className="intro-view__gift-unlock-stops-hint u-text-pretty-center">
            {stopsPhrase} - Scan each QR code to unlock
          </p>
          <button
            type="button"
            className="u-btn-primary intro-view__start-hunt"
            onClick={onStartHunt}
          >
            Start Hunt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="intro-view intro-view--detail u-gift-run-shell">
      <ClueDetail
        checkpointsOrdered={checkpointsOrdered}
        claimedCheckpointCount={claimedCheckpointCount}
        footerExtra={
          <button
            type="button"
            className="u-btn-primary intro-view__open-camera"
            disabled={startDisabled}
            onClick={onStart}
          >
            Open Camera
          </button>
        }
      />
    </div>
  );
}

export default IntroView;
