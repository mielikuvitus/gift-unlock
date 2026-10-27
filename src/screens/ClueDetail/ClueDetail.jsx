import { useEffect, useMemo, useState } from "react";
import DotCarousel from "../../components/common/DotCarousel/DotCarousel.jsx";
import WediscovrTopHeader from "../../components/common/WediscovrTopHeader/WediscovrTopHeader.jsx";
import MapInteractiveCard from "../../components/ar-gift-unlock/MapInteractiveCard/MapInteractiveCard.jsx";
import "./ClueDetail.css";

function ClueDetail({
  checkpointsOrdered = [],
  claimedCheckpointCount = 0,
  footerExtra = null,
  showHeader = true,
  className = "",
}) {
  const totalStops = checkpointsOrdered.length;
  const progressIndex = Math.min(
    Math.max(0, claimedCheckpointCount),
    Math.max(0, totalStops - 1),
  );
  const slideCount =
    claimedCheckpointCount > 0
      ? Math.min(claimedCheckpointCount + 1, totalStops)
      : 1;
  const lastSlideIndex =
    claimedCheckpointCount > 0 ? Math.max(0, slideCount - 1) : 0;

  const [mapSlideIndex, setMapSlideIndex] = useState(() =>
    Math.min(progressIndex, lastSlideIndex),
  );

  useEffect(() => {
    setMapSlideIndex(Math.min(progressIndex, lastSlideIndex));
  }, [progressIndex, lastSlideIndex]);

  const { mapActiveCheckpointId, mapPinPlacements } = useMemo(() => {
    const cp = checkpointsOrdered[mapSlideIndex];
    if (!cp?.id) {
      return { mapActiveCheckpointId: "", mapPinPlacements: [] };
    }
    if (cp.position == null) {
      return { mapActiveCheckpointId: cp.id, mapPinPlacements: [] };
    }
    return {
      mapActiveCheckpointId: cp.id,
      mapPinPlacements: [
        { checkpointId: cp.id, position: cp.position },
      ],
    };
  }, [checkpointsOrdered, mapSlideIndex]);

  const rootClass = ["clue-detail", className].filter(Boolean).join(" ");
  return (
    <div className={rootClass}>
      {showHeader ? <WediscovrTopHeader /> : null}
      <div className="u-gift-run-shell__main">
        <div className="u-gift-run-shell__main-inner clue-detail__main-inner">
          <DotCarousel
            checkpoints={checkpointsOrdered}
            claimedCheckpointCount={claimedCheckpointCount}
            onVisibleSlideIndexChange={setMapSlideIndex}
            swipeEnabled={claimedCheckpointCount > 0}
          />
        </div>
      </div>
      <div className="u-gift-run-shell__nav clue-detail__foot">
        <div className="clue-detail__map-embed">
          <MapInteractiveCard
            activeCheckpointId={mapActiveCheckpointId}
            mapPinPlacements={mapPinPlacements}
          />
        </div>
        {footerExtra}
      </div>
    </div>
  );
}

export default ClueDetail;
