import { useEffect, useLayoutEffect, useRef, useState } from "react";
import DiscCoinGlView from "../../ar-gift-unlock/DiscCoinGlView/DiscCoinGlView.jsx";
import "./DotCarousel.css";

function ClueSlide({ checkpointClue, clueNumber, discPerStop }) {
  return (
    <div className="dot-carousel__slide-inner u-text-pretty-center">
      <p className="dot-carousel__clue-label">Clue {clueNumber}</p>
      <div className="dot-carousel__clue-body">
        <div className="u-glass-card-layout u-glass-card-layout--fluid u-glass-card-layout--content-sized">
          <div
            className="u-glass-card u-glass-card--absolute-fill"
            aria-hidden="true"
          />
          <div className="u-glass-card-layout__stage">
            <div className="u-glass-card-layout__main">
              <p className="dot-carousel__clue-text">{checkpointClue}</p>
            </div>
          </div>
        </div>
        <div className="dot-carousel__disc-row">
          <DiscCoinGlView />
          <div className="dot-carousel__disc">
            <p className="dot-carousel__disc-text">
              {discPerStop} DISC at this stop
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DotCarousel({
  checkpoints,
  claimedCheckpointCount,
  swipeEnabled = false,
  className = "",
  onVisibleSlideIndexChange,
}) {
  const viewportRef = useRef(null);
  const onSlideChangeRef = useRef(onVisibleSlideIndexChange);
  onSlideChangeRef.current = onVisibleSlideIndexChange;
  const totalStops = checkpoints.length;
  const progressIndex = Math.min(
    Math.max(0, claimedCheckpointCount),
    Math.max(0, totalStops - 1),
  );
  const slideCount = swipeEnabled
    ? Math.min(claimedCheckpointCount + 1, totalStops)
    : 1;
  const lastSlideIndex = swipeEnabled ? Math.max(0, slideCount - 1) : 0;

  const [visibleSlideIndex, setVisibleSlideIndex] = useState(() =>
    Math.min(progressIndex, lastSlideIndex),
  );

  const dotActiveIndex = swipeEnabled ? visibleSlideIndex : progressIndex;
  const currentStop = dotActiveIndex + 1;

  useEffect(() => {
    onSlideChangeRef.current?.(dotActiveIndex);
  }, [dotActiveIndex]);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!swipeEnabled || !el) return;
    const target = Math.min(progressIndex, lastSlideIndex);
    setVisibleSlideIndex(target);
    const run = () => {
      const w = el.offsetWidth;
      if (w > 0) el.scrollTo({ left: target * w, behavior: "auto" });
    };
    run();
    requestAnimationFrame(run);
  }, [swipeEnabled, progressIndex, lastSlideIndex]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!swipeEnabled || !el) return;
    const onScroll = () => {
      const w = el.offsetWidth;
      if (w <= 0) return;
      const i = Math.round(el.scrollLeft / w);
      const next = Math.max(0, Math.min(i, lastSlideIndex));
      setVisibleSlideIndex((prev) => (prev === next ? prev : next));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [swipeEnabled, lastSlideIndex]);

  const rootClass = ["dot-carousel", className].filter(Boolean).join(" ");
  const viewportClass = [
    "dot-carousel__viewport",
    swipeEnabled ? "dot-carousel__viewport--snap" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const renderSlide = (slideIndex) => {
    const cp = checkpoints[slideIndex];
    const discPerStop = cp?.discAtCheckpoint ?? 0;
    return (
      <ClueSlide
        checkpointClue={cp?.checkpointClue ?? ""}
        clueNumber={slideIndex + 1}
        discPerStop={discPerStop}
      />
    );
  };

  return (
    <div className={rootClass}>
      <ul className="dot-carousel__dots" aria-label="Stops">
        {checkpoints.map((cp, i) => (
          <li
            key={cp.id}
            className={
              i === dotActiveIndex
                ? "dot-carousel__dot dot-carousel__dot--active"
                : "dot-carousel__dot"
            }
            aria-label={
              i === dotActiveIndex
                ? `Stop ${i + 1} of ${totalStops}, current`
                : `Stop ${i + 1} of ${totalStops}`
            }
            aria-current={i === dotActiveIndex ? "step" : undefined}
          />
        ))}
      </ul>
      <p className="dot-carousel__stop-line">
        Stop {currentStop} of {totalStops}
      </p>
      {swipeEnabled ? (
        <div ref={viewportRef} className={viewportClass}>
          <div className="dot-carousel__track">
            {Array.from({ length: slideCount }, (_, slideIndex) => (
              <div
                key={checkpoints[slideIndex].id}
                className="dot-carousel__slide"
              >
                {renderSlide(slideIndex)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="dot-carousel__panel">{renderSlide(progressIndex)}</div>
      )}
    </div>
  );
}

export default DotCarousel;
