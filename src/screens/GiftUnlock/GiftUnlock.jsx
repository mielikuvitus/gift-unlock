import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import CameraView from "../CameraView/CameraView.jsx";
import ClueDetail from "../ClueDetail/ClueDetail.jsx";
import IntroView from "../IntroView/IntroView.jsx";
import TapToUnlock from "../TapToUnlock/TapToUnlock.jsx";
import ARGiftReveal from "../ARGiftReveal/ARGiftReveal.jsx";
import DiscPointsProgress from "../DiscPointsProgress/DiscPointsProgress.jsx";
import {
  checkIn,
  claimCheckpoint,
  getHunt,
  getProfile,
} from "../../api/index.js";
import { getCheckpointDisplayNumber } from "../CameraView/utils";
import {
  buildCheckInRequest,
  mockRun,
  mockClaimCheckpointRequest,
} from "../../data/mocks/apiMock.js";
import {
  deriveRunState,
  discMilestoneForCheckpointClaim,
} from "../../lib/deriveRunState.js";
import amazingyLogoUrl from "../../assets/amazingy-logo.svg?url";
import { FLAGS } from "../../config/flags.js";
import { notifyShowcaseStage } from "../../lib/notifyShowcaseStage.js";
import { requestDeviceOrientationPermission } from "../../lib/requestDeviceOrientationPermission.js";
import "../TapToUnlock/TapToUnlock.css";
import "./GiftUnlock.css";

function GiftUnlock() {
  const [stage, setStage] = useState("intro");
  const [motionPermission, setMotionPermission] = useState(null);
  /** Live `/getHunt` payload or mock fallback — same shape as API. */
  const [hunt, setHunt] = useState(null);
  const [claimedCheckpointIds, setClaimedCheckpointIds] = useState([]);
  const [liveDiscPoints, setLiveDiscPoints] = useState(0);
  /** DISC total from `/getProfile` when the hunt starts — used as the “from” value for the final progress animation. */
  const [huntStartDiscPoints, setHuntStartDiscPoints] = useState(0);
  const [checkpointDiscMilestone, setCheckpointDiscMilestone] = useState(null);
  const [arFinalDiscMilestone, setArFinalDiscMilestone] = useState(null);
  /** Last `claimCheckpoint`: mock fallback — drives checkpoint DISC UI to use `runDerived` vs `runState`. */
  const [lastClaimUsedMock, setLastClaimUsedMock] = useState(false);
  const huntLoadStartedRef = useRef(false);

  const clueNumber = claimedCheckpointIds.length + 1;

  useEffect(() => {
    notifyShowcaseStage(stage, clueNumber);
  }, [stage, clueNumber]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await checkIn(buildCheckInRequest());
        if (cancelled) return;
        if (res?.ok) {
          console.log("[checkIn] ok", res.checkedInAt);
        } else {
          console.warn("[checkIn] failed", res?.error ?? res);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("[checkIn] error", err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStart() {
    const data = await getProfile();
    if (data && data.error == null && typeof data.discPoints === "number") {
      setHuntStartDiscPoints(data.discPoints);
      setLiveDiscPoints(data.discPoints);
    }
    flushSync(() => {
      setStage("camera");
    });
    void requestDeviceOrientationPermission().then((outcome) => {
      setMotionPermission(outcome);
    });
  }

  useEffect(() => {
    if (stage !== "intro2") {
      return undefined;
    }
    if (huntLoadStartedRef.current) {
      return undefined;
    }
    huntLoadStartedRef.current = true;
    let cancelled = false;
    void (async () => {
      const r = await getHunt(mockRun.event.id);
      if (cancelled) {
        return;
      }
      setHunt(r.data);
      setClaimedCheckpointIds(r.data.userProgress?.claimedCheckpointIds ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [stage]);

  const runState = useMemo(
    () =>
      deriveRunState({
        checkpoints: hunt?.checkpoints ?? [],
        claimedCheckpointIds,
      }),
    [hunt, claimedCheckpointIds],
  );

  const runDerived = useMemo(
    () =>
      deriveRunState({
        checkpoints: mockRun.checkpoints,
        claimedCheckpointIds,
      }),
    [claimedCheckpointIds],
  );

  const currentCheckpoint = runState.scanTargetCheckpoint;

  async function handleQrMatch(checkpoint) {
    const scannedQrString = checkpoint.checkpointQr;
    const requestBody = mockClaimCheckpointRequest(
      scannedQrString,
      hunt?.event?.id ?? mockRun.event.id,
    );

    console.log("[claimCheckpoint] request", requestBody);
    const raw = await claimCheckpoint(requestBody);
    console.log("[claimCheckpoint] response", raw);

    const claimUsedMock = raw._claimUsedMock === true;
    const response = { ...raw };
    delete response._claimUsedMock;

    if (!response?.ok) {
      return;
    }

    setLastClaimUsedMock(claimUsedMock);

    const priorDisc = liveDiscPoints;
    const earned =
      typeof response.discPointsEarned === "number"
        ? response.discPointsEarned
        : Number(checkpoint?.discAtCheckpoint ?? 0);

    const nextClaimedIds = Array.isArray(
      response.progress?.claimedCheckpointIds,
    )
      ? response.progress.claimedCheckpointIds
      : [...claimedCheckpointIds, checkpoint.id];

    const { baseline, target } = discMilestoneForCheckpointClaim(priorDisc, {
      ...checkpoint,
      discAtCheckpoint: earned,
    });

    setClaimedCheckpointIds(nextClaimedIds);
    setLiveDiscPoints(priorDisc + earned);

    if (response.newlyUnlockedReward) {
      setArFinalDiscMilestone(null);
      /** Motion fallback: AR reveal needs the motion sensor. Devices without one, or where permission was denied, unlock by tapping instead. */
      if (FLAGS.AR_GIFT_REVEAL && motionPermission === "granted") {
        setStage("ar-gift-reveal");
      } else {
        setStage("tap-to-unlock");
      }
      return;
    }

    setCheckpointDiscMilestone({
      baseline,
      target,
      earnedDiscPoints: earned,
    });
    setStage("disc-checkpoint");
  }

  function handleDiscCheckpointContinue() {
    setCheckpointDiscMilestone(null);
    setStage("clue-detail");
  }

  function handleClueDetailContinue() {
    setStage("camera");
  }

  if (stage === "intro") {
    return (
      <IntroView variant="gift-unlock" onStartHunt={() => setStage("intro2")} />
    );
  }

  if (stage === "intro2") {
    return (
      <IntroView
        variant="detail"
        checkpointsOrdered={runState.checkpointsOrdered}
        claimedCheckpointCount={claimedCheckpointIds.length}
        startDisabled={!hunt}
        onStart={handleStart}
      />
    );
  }

  if (stage === "camera") {
    const currentStopNumber = runState.scanTargetCheckpoint
      ? getCheckpointDisplayNumber(
          runState.scanTargetCheckpoint,
          runState.checkpointsOrdered,
        )
      : undefined;
    return (
      <CameraView
        currentStopNumber={currentStopNumber}
        checkpointsOrdered={runState.checkpointsOrdered}
        claimedCheckpointIds={claimedCheckpointIds}
        expectedCheckpoint={currentCheckpoint}
        onCheckpointScanned={handleQrMatch}
      />
    );
  }

  if (stage === "disc-checkpoint") {
    const m = checkpointDiscMilestone;
    if (!m) {
      return null;
    }
    return (
      <div className="gift-run-screen gift-run-screen--disc-points">
        <DiscPointsProgress
          baseline={m.baseline}
          earnedDiscPoints={m.earnedDiscPoints}
          checkpointsOrdered={
            lastClaimUsedMock
              ? runDerived.checkpointsOrdered
              : runState.checkpointsOrdered
          }
          claimedCheckpointIds={claimedCheckpointIds}
          footerExtra={
            <button
              className="u-btn-primary gift-run-screen__btn"
              type="button"
              onClick={handleDiscCheckpointContinue}
            >
              Continue
            </button>
          }
          target={m.target}
          variant="checkpoint"
        />
      </div>
    );
  }

  if (stage === "clue-detail") {
    return (
      <div className="u-gift-run-shell">
        <ClueDetail
          checkpointsOrdered={runState.checkpointsOrdered}
          claimedCheckpointCount={claimedCheckpointIds.length}
          footerExtra={
            <button
              className="u-btn-primary gift-run-screen__btn"
              type="button"
              onClick={handleClueDetailContinue}
            >
              Continue
            </button>
          }
        />
      </div>
    );
  }

  if (stage === "ar-gift-reveal") {
    if (arFinalDiscMilestone) {
      return (
        <div className="gift-run-screen gift-run-screen--disc-points">
          <DiscPointsProgress
            baseline={arFinalDiscMilestone.baseline}
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
            target={arFinalDiscMilestone.target}
            variant="final"
          />
        </div>
      );
    }
    return (
      <ARGiftReveal
        brandLogo={amazingyLogoUrl}
        brandName={hunt?.brand?.name ?? mockRun.brand.name}
        giftProductName={hunt?.giftProduct?.name ?? mockRun.giftProduct.name}
        huntStartDiscPoints={huntStartDiscPoints}
        initialDiscPoints={liveDiscPoints}
        onFlowComplete={(milestone) => {
          setArFinalDiscMilestone(milestone);
          setLiveDiscPoints(milestone.target);
        }}
        /** Motion fallback: permission was granted but no sensor readings arrived, so switch to tap-to-unlock. */
        onMotionUnavailable={() => setStage("tap-to-unlock")}
      />
    );
  }

  if (stage === "tap-to-unlock") {
    return (
      <TapToUnlock
        brandLogo={amazingyLogoUrl}
        brandName={hunt?.brand?.name ?? mockRun.brand.name}
        giftProductName={hunt?.giftProduct?.name ?? mockRun.giftProduct.name}
        huntStartDiscPoints={huntStartDiscPoints}
        initialDiscPoints={liveDiscPoints}
      />
    );
  }

  return null;
}

export default GiftUnlock;
