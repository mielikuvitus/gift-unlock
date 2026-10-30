import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import GiftPreview from "../../components/ar-gift-unlock/GiftPreview/GiftPreview.jsx";
import DropZone from "../../components/common/DropZone/DropZone.jsx";
import ConfettiBlast from "../../animations/ConfettiBlast/ConfettiBlast.jsx";
import LogoSparkles from "../../animations/LogoSparkles/LogoSparkles.jsx";
import { buildFinalDiscProgressMilestone } from "../../lib/buildFinalDiscProgressMilestone.js";
import { useDropZoneHighlight } from "../../hooks/useDropZoneHighlight.js";
import DiscPointsProgress from "../DiscPointsProgress/DiscPointsProgress.jsx";
import { avoidOrphanLastLine } from "./utils";
import "../GiftUnlock/GiftUnlock.css";
import "./TapToUnlock.css";

gsap.registerPlugin(useGSAP);

const UNLOCK_CONFETTI_DELAY_MS = 900;
const UNLOCK_LABEL_DELAY_MS = UNLOCK_CONFETTI_DELAY_MS + 300;

const LABEL_SECONDARY_LOCKED = "Gift Waiting";

function TapToUnlock({
  brandLogo,
  brandName = "Brand",
  giftProductName = "",
  huntStartDiscPoints = 0,
  initialDiscPoints = 0,
}) {
  /** Vite URLs may include hashes/query; still treat as SVG for white treatment on dark UI */
  const brandLogoIsSvg = /\.svg(\?|#|$)/i.test(brandLogo);

  const containerRef = useRef(null);
  const giftPreviewRef = useRef(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [dropSuccess, setDropSuccess] = useState(false);
  const [discMilestone, setDiscMilestone] = useState(null);
  const [discPoints] = useState(initialDiscPoints);
  const { dropZoneRef, dragProps, dropZoneProps, resetDropZoneHighlight } =
    useDropZoneHighlight();
  /** Sync guard: React state updates async — prevents double taps / rapid clicks from stacking timeouts */
  const unlockStartedRef = useRef(false);
  const dropCompletedRef = useRef(false);
  const beginUnlock = () => {
    if (unlockStartedRef.current) {
      return;
    }
    unlockStartedRef.current = true;
    setTimeout(() => {
      setShowConfetti(true);
    }, UNLOCK_CONFETTI_DELAY_MS);
    setTimeout(() => {
      setIsUnlocked(true);
    }, UNLOCK_LABEL_DELAY_MS);
    giftPreviewRef.current?.triggerUnlock();
  };

  const handleDrop = async () => {
    if (dropCompletedRef.current) return false;
    dropCompletedRef.current = true;

    try {
      setDiscMilestone(
        await buildFinalDiscProgressMilestone(huntStartDiscPoints, discPoints),
      );
      resetDropZoneHighlight();
      setDropSuccess(true);
      return true;
    } catch (err) {
      console.error("[tapToUnlock] milestone error", err);
      dropCompletedRef.current = false;
      resetDropZoneHighlight();
      return false;
    }
  };

  useGSAP(
    () => {
      if (dropSuccess) {
        return undefined;
      }

      const labelTween = gsap.from(".tap-to-unlock__label", {
        opacity: 0,
        y: 20,
        duration: 0.4,
        ease: "power2.out",
      });
      const ctaTween = gsap.from(".tap-to-unlock__cta", {
        opacity: 0,
        scale: 0.85,
        duration: 0.5,
        ease: "back.out(1.4)",
        delay: 0.1,
      });
      const ctaTextTween = gsap.from(".tap-to-unlock__cta-text", {
        opacity: 0,
        y: 24,
        duration: 0.4,
        ease: "power2.out",
        delay: 0.25,
      });

      return () => {
        labelTween.kill();
        ctaTween.kill();
        ctaTextTween.kill();
      };
    },
    { scope: containerRef, dependencies: [dropSuccess] },
  );

  if (dropSuccess && discMilestone) {
    return (
      <div className="gift-run-screen gift-run-screen--disc-points">
        <DiscPointsProgress
          baseline={discMilestone.baseline}
          deferAnimation={false}
          footerExtra={
            <button
              className="u-btn-primary tap-to-unlock__view-drops-btn"
              type="button"
              onClick={() => window.location.reload()}
            >
              Restart
            </button>
          }
          target={discMilestone.target}
          variant="final"
        />
      </div>
    );
  }

  return (
    <>
      <main className="tap-to-unlock" ref={containerRef}>
        <div
          className="tap-to-unlock__scrim u-dark-overlay u-dark-overlay--fill u-dark-overlay--non-interactive"
          aria-hidden="true"
        />
        <div className="tap-to-unlock__model-glass-mount" aria-hidden="true">
          <div className="tap-to-unlock__model-glass u-glass-card" />
        </div>
        {showConfetti ? (
          <div className="tap-to-unlock__confetti" aria-hidden="true">
            <ConfettiBlast startDelaysMs={[0, 300]} />
          </div>
        ) : null}
        <div
          className="tap-to-unlock__model"
          aria-hidden="true"
          onClick={beginUnlock}
        >
          <GiftPreview
            ref={giftPreviewRef}
            dropZoneRef={dropZoneRef}
            {...dragProps}
            onDrop={handleDrop}
          />
        </div>

        <section className="tap-to-unlock__content">
          <p className="tap-to-unlock__label">
            <span
              className="tap-to-unlock__label-primary tap-to-unlock__label-logo"
              role="img"
              aria-label={brandName}
            >
              <span className="tap-to-unlock__label-logo-slot">
                <span className="tap-to-unlock__label-logo-stack">
                  <img
                    className={`tap-to-unlock__label-logo-img${brandLogoIsSvg ? " tap-to-unlock__label-logo-img--white" : ""}`}
                    src={brandLogo}
                    alt=""
                    decoding="async"
                  />
                  <LogoSparkles />
                </span>
              </span>
            </span>
            <span className="tap-to-unlock__label-secondary">
              {avoidOrphanLastLine(
                isUnlocked ? giftProductName : LABEL_SECONDARY_LOCKED,
              )}
            </span>
          </p>

          <div className="tap-to-unlock__cta-stack">
            <button
              className="tap-to-unlock__cta tap-to-unlock__cta-button"
              type="button"
              onClick={beginUnlock}
              aria-label={isUnlocked ? "Drag down to claim" : "Tap to unlock"}
            >
              <span className="tap-to-unlock__cta-text">
                {isUnlocked ? "Drag down to claim" : "Tap to Unlock"}
              </span>
            </button>
          </div>
        </section>
      </main>

      <DropZone
        ref={dropZoneRef}
        className="drop-zone--tap-to-unlock"
        isActive={isUnlocked || dropZoneProps.isActive}
        isOver={dropZoneProps.isOver}
      />
    </>
  );
}

export default TapToUnlock;
