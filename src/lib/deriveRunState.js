/**
 * @typedef {object} HuntCheckpoint
 * @property {string} id
 * @property {string} title
 * @property {string} type
 * @property {number} orderIndex
 * @property {{ x: number, y: number, z: number } | undefined} [position]
 * @property {string | undefined} [checkpointQr]
 * @property {number} [discAtCheckpoint]
 * @property {string | undefined} [checkpointClue]
 */

/**
 * @param {object} params
 * @param {HuntCheckpoint[]} params.checkpoints
 * @param {string[]} params.claimedCheckpointIds
 */
export function deriveRunState({ checkpoints, claimedCheckpointIds }) {
  const ordered = [...checkpoints].sort((a, b) => a.orderIndex - b.orderIndex);
  const len = ordered.length;
  const claimedCount = claimedCheckpointIds.length;

  const scanTargetCheckpoint =
    claimedCount < len ? ordered[claimedCount] ?? null : null;

  const highlightIndex = Math.min(
    Math.max(0, claimedCount),
    Math.max(0, len - 1),
  );
  const mapHighlightCheckpoint =
    len > 0 ? ordered[highlightIndex] ?? null : null;

  const mapPinPlacements =
    mapHighlightCheckpoint?.position != null
      ? [
          {
            checkpointId: mapHighlightCheckpoint.id,
            position: mapHighlightCheckpoint.position,
          },
        ]
      : [];

  const checkpointsRemaining = Math.max(0, len - claimedCount);
  const nextClueText =
    checkpointsRemaining > 0
      ? ordered[claimedCount]?.checkpointClue ?? null
      : null;

  return {
    checkpointsOrdered: ordered,
    scanTargetCheckpoint,
    mapHighlightCheckpoint,
    mapPinPlacements,
    nextClueText,
  };
}

export function discMilestoneForCheckpointClaim(liveDiscPoints, checkpoint) {
  const earned = Number(checkpoint?.discAtCheckpoint ?? 0);
  return {
    baseline: liveDiscPoints,
    target: liveDiscPoints + earned,
  };
}

export function completedStopDisplayNumber(checkpointsOrdered, claimedCheckpointIds) {
  if (
    !Array.isArray(checkpointsOrdered) ||
    checkpointsOrdered.length === 0 ||
    !Array.isArray(claimedCheckpointIds) ||
    claimedCheckpointIds.length === 0
  ) {
    return null;
  }
  const lastId = claimedCheckpointIds[claimedCheckpointIds.length - 1];
  const cp = checkpointsOrdered.find((c) => c.id === lastId);
  if (!cp) {
    return null;
  }
  if (typeof cp.orderIndex === "number" && Number.isFinite(cp.orderIndex)) {
    return Math.trunc(cp.orderIndex);
  }
  const idx = checkpointsOrdered.findIndex((c) => c.id === cp.id);
  return idx >= 0 ? idx + 1 : 1;
}
