import { useLayoutEffect, useState } from "react";
import gsap from "gsap";
import CoinFall from "../../animations/CoinFall/CoinFall.jsx";
import DiscCoinGlView from "../../components/ar-gift-unlock/DiscCoinGlView/DiscCoinGlView.jsx";
import { WediscovrHeaderLogo } from "../../components/common/WediscovrTopHeader/WediscovrTopHeader.jsx";
import Pill from "../../components/common/Pill/Pill.jsx";
import ProgressBar from "../../components/common/ProgressBar/ProgressBar.jsx";
import { completedStopDisplayNumber } from "../../lib/deriveRunState.js";
import "./DiscPointsProgress.css";

const DISC_PROGRESS_CAP = 700;
const DISC_COUNT_UP_DURATION_S = 6;

function DiscPointsProgress({
  baseline,
  target,
  variant = "final",
  deferAnimation = false,
  checkpointsOrdered = null,
  claimedCheckpointIds = null,
  footerExtra = null,
  earnedDiscPoints = 0,
}) {
  const [displayPoints, setDisplayPoints] = useState(null);
  const [fillAnimated, setFillAnimated] = useState(false);
  const isFinal = variant === "final";
  const stopComplete =
    !isFinal && checkpointsOrdered && claimedCheckpointIds
      ? completedStopDisplayNumber(checkpointsOrdered, claimedCheckpointIds)
      : null;
  useLayoutEffect(() => {
    if (!isFinal || deferAnimation) {
      return undefined;
    }

    setDisplayPoints(Math.round(baseline));
    setFillAnimated(false);

    if (Math.round(target) <= Math.round(baseline)) {
      return undefined;
    }

    const counter = { value: baseline };
    setFillAnimated(true);
    const countTween = gsap.to(counter, {
      value: target,
      duration: DISC_COUNT_UP_DURATION_S,
      ease: "power2.out",
      onUpdate: () => {
        setDisplayPoints(Math.round(counter.value));
      },
      onComplete: () => {
        setFillAnimated(false);
      },
    });

    return () => {
      countTween.kill();
      gsap.killTweensOf(counter);
      setFillAnimated(false);
    };
  }, [baseline, deferAnimation, isFinal, target]);

  const pointsShown =
    displayPoints !== null ? displayPoints : Math.round(baseline);
  const progressPct = Math.min(100, (pointsShown / DISC_PROGRESS_CAP) * 100);
  const pointsUntilNextReward = Math.max(0, DISC_PROGRESS_CAP - pointsShown);
  const untilNextRewardText =
    pointsUntilNextReward === 1
      ? "1 point until the next reward"
      : `${pointsUntilNextReward} points to go until the next reward`;

  return (
    <section
      className="disc-points-progress disc-points-progress--coin-fall"
      role="status"
      aria-live="polite"
    >
      <header className="disc-points-progress__header">
        <WediscovrHeaderLogo />
      </header>
      <div
        className="disc-points-progress__coin-slot disc-points-progress__coin-slot--fall disc-points-progress__coin-fall-layer"
        aria-hidden="true"
      >
        <CoinFall />
      </div>
      <div className="disc-points-progress__middle">
        {isFinal ? (
          <div className="disc-points-progress__body">
            <p className="disc-points-progress__earned-label">You earned</p>
            <p className="disc-points-progress__points">{pointsShown}</p>
            <div className="disc-points-progress__disc-line-row">
              <DiscCoinGlView className="disc-points-progress__disc-line-coin" />
              <p className="disc-points-progress__disc-line">DISC points</p>
            </div>
          </div>
        ) : (
          <div className="disc-points-progress__checkpoint-block">
            <p className="disc-points-progress__checkpoint-points">
              {`+${Math.round(Number(earnedDiscPoints))}`}
            </p>
            <div className="disc-points-progress__checkpoint-disc-row">
              <DiscCoinGlView className="disc-points-progress__checkpoint-disc-coin" />
              <p className="disc-points-progress__checkpoint-disc-label">
                DISC Points earned
              </p>
            </div>
            {stopComplete !== null ? (
              <Pill
                color="var(--color-green)"
                size="md"
                text={`Stop ${stopComplete} Complete`}
                textColor="var(--color-green)"
                showDot={false}
              />
            ) : null}
          </div>
        )}
        {isFinal ? (
          <div className="disc-points-progress__bar-wrap">
            <ProgressBar
              ariaValueText={`${pointsShown} of ${DISC_PROGRESS_CAP} DISC points`}
              fillAnimated={fillAnimated}
              percentage={progressPct}
              trackPulse
            />
          </div>
        ) : null}
        {isFinal ? (
          <p className="disc-points-progress__until">{untilNextRewardText}</p>
        ) : null}
      </div>
      {footerExtra ? (
        <div className="disc-points-progress__footer">{footerExtra}</div>
      ) : null}
    </section>
  );
}

export default DiscPointsProgress;
