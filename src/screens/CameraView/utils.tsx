/**
 * Checkpoint copy helpers for CameraView QR mismatch messaging.
 */

export type CheckpointLike = {
  id: string;
  orderIndex?: number;
};

/**
 * 1-based index for display ("checkpoint 1", …).
 * Prefers API `orderIndex` when present; otherwise position in the ordered run list.
 */
export function getCheckpointDisplayNumber(
  checkpoint: CheckpointLike,
  checkpointsOrdered: CheckpointLike[],
): number {
  if (
    typeof checkpoint.orderIndex === "number" &&
    Number.isFinite(checkpoint.orderIndex)
  ) {
    return Math.trunc(checkpoint.orderIndex);
  }
  const idx = checkpointsOrdered.findIndex((c) => c.id === checkpoint.id);
  return idx >= 0 ? idx + 1 : 1;
}

/** User-facing phrase, e.g. "checkpoint 2" */
export function formatCheckpointLabelForUser(
  checkpoint: CheckpointLike,
  checkpointsOrdered: CheckpointLike[],
): string {
  const n = getCheckpointDisplayNumber(checkpoint, checkpointsOrdered);
  return `checkpoint ${n}`;
}
