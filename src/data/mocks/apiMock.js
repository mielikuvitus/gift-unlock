// src/data/mocks/apiMock.js
// ─── AUTH NOTE ────────────────────────────────────────────
// All POST endpoints (claimCheckpoint, checkIn) require a valid auth token sent in the
// request header. The backend reads userId from that token —
// it is never passed in the POST body.
//
// In dev mode (import.meta.env.DEV) these mock functions bypass
// auth entirely and return hardcoded responses. When the real
// backend API is wired in, the auth token is handled automatically
// by the backend SDK / session layer — no changes needed in the
// request shape below.
// ──────────────────────────────────────────────────────────

// Mock data + API handlers for demo mode. Shapes mirror real API contracts.
// Replace exports with real fetch calls when wiring the backend — component imports stay stable.

import amazingyLogoUrl from "../../assets/amazingy-logo.svg?url";

/** Non-secure origins (e.g. http://192.168.x.x) have no crypto.randomUUID — use a safe fallback */
export function mockClientNonce() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    try {
      return crypto.randomUUID();
    } catch {
      /* ignore — treat like unsupported */
    }
  }
  return `nonce_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

/**
 * Must match the event's entrance QR secret on the backend for `/checkIn` to succeed.
 * Plain-string demo entrance payload (QR or virtual scan).
 */
export const DEMO_ENTRANCE_QR_SECRET = "demo-entrance";

/**
 * POST /checkIn body — mirrors the backend `checkIn` contract.
 */
export function buildCheckInRequest(
  eventId = mockRun.event.id,
  payload = DEMO_ENTRANCE_QR_SECRET,
) {
  return {
    eventId,
    proof: { type: "qr", payload },
    clientNonce: mockClientNonce(),
  };
}

/** Placeholder until the backend exposes live concurrent explorer count. */
export const mockConcurrentExplorersCount = 47;

// ─── POST /getProfile
export const mockProfile = {
  userId: "demo-user-emma",
  email: "emma@example.com",
  discPoints: 240,
  dropsToRedeem: [],
};

// ─── POST /getHunt
export const mockRun = {
  event: {
    id: "demo-event-berlin",
    name: "Berlin Gift Unlock",
    startsAt: "2026-03-27T09:00:00Z",
    endsAt: "2026-03-27T18:00:00Z",
    status: "active",
  },
  brand: {
    id: "demo-brand",
    name: "Brand Name",
    logoUrl: amazingyLogoUrl,
  },
  giftProduct: {
    id: "demo-product",
    name: "Product Name",
    modelUrl: `${import.meta.env.BASE_URL}3DModels/amazingy01-optimized.glb`,
    descriptionShort: "Short product description.",
  },
  upsellProducts: [],
  checkpoints: [
    {
      id: "demo-checkpoint-entrance",
      title: "Entrance scan",
      type: "qr",
      orderIndex: 1,
      checkpointQr: "demo-checkpoint-entrance:demo-event-berlin", //checkpointId:eventId
      discAtCheckpoint: 50,
      position: { x: -2, y: 2, z: 3 },
      checkpointClue: "Head toward the corner with the neon sign and look up.",
    },
    {
      id: "demo-checkpoint-midrun",
      title: "Mid-run scan",
      type: "qr",
      orderIndex: 2,
      checkpointQr: "demo-checkpoint-midrun:demo-event-berlin",
      discAtCheckpoint: 50,
      position: { x: 1.5, y: 1, z: 0 },
      checkpointClue:
        "Find the staircase near the entrance and look to the right.",
    },
    {
      id: "demo-checkpoint-final",
      title: "Final scan",
      type: "qr",
      orderIndex: 3,
      checkpointQr: "demo-checkpoint-final:demo-event-berlin",
      discAtCheckpoint: 50,
      position: { x: 2, y: 1, z: -1.8 },
      checkpointClue:
        "Look for the Brand display near the entrance and scan it.",
    },
  ],
  rewardRule: {
    rewardId: "demo-reward",
    requiredCheckpointCount: 3,
  },
  userProgress: {
    checkedInAt: "2026-03-27T10:00:00Z",
    claimedCheckpointIds: [],
    rewardUnlocked: false,
    redeemed: false,
  },
};

/** Claimed checkpoint ids for the mock session (updated by `claimCheckpoint`); order follows `orderIndex`. */
let mockClaimedCheckpointIdsSession = [
  ...mockRun.userProgress.claimedCheckpointIds,
];

function sortClaimedCheckpointIdsByOrder(ids) {
  const order = new Map(
    mockRun.checkpoints.map((c) => [c.id, c.orderIndex ?? 0]),
  );
  return [...ids].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}

function appendDropToRedeemIfNew() {
  const rewardId = mockRun.rewardRule.rewardId;
  if (mockProfile.dropsToRedeem.includes(rewardId)) {
    return;
  }
  mockProfile.dropsToRedeem.push(rewardId);
}

/** Subset of `mockRun.giftProduct` as returned by `getHunt` (no `modelUrl`). */
function buildHuntGiftProduct() {
  const p = mockRun.giftProduct;
  return {
    id: p.id,
    name: p.name,
    imageUrl: p.imageUrl ?? null,
    descriptionShort: p.descriptionShort ?? null,
    upsellUrl: p.upsellUrl ?? null,
  };
}

/** Checkpoints as returned by `getHunt`. */
function buildHuntCheckpointsForPayload() {
  return [...mockRun.checkpoints]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((cp) => ({
      id: cp.id,
      title: cp.title,
      type: cp.type,
      orderIndex: cp.orderIndex,
      checkpointQr: cp.checkpointQr ?? null,
      discAtCheckpoint: cp.discAtCheckpoint ?? null,
      position: cp.position ?? null,
      checkpointClue: cp.checkpointClue ?? null,
    }));
}

/**
 * Build POST /claimCheckpoint body from a demo QR payload `checkpointId:eventId`.
 * `proof.payload` is the full scanned string so it can match `proofConfig.expectedQr`
 * on the Checkpoint entity (not only the segment after `:`).
 */
export const mockClaimCheckpointRequest = (
  scannedQrString,
  fallbackEventId = mockRun.event.id,
) => {
  const parts = scannedQrString.split(":", 2);
  const checkpointId = parts[0] ?? "";
  const eventIdFromQr = parts.length > 1 ? parts[1] : null;
  return {
    eventId: eventIdFromQr ?? fallbackEventId,
    checkpointId,
    proof: { type: "qr", payload: scannedQrString },
    clientNonce: mockClientNonce(),
  };
};

// In-progress scan — reward not yet unlocked
export const mockClaimCheckpointResponse = (
  claimedCheckpointIds,
  discPointsEarned = 50,
) => ({
  ok: true,
  progress: {
    claimedCheckpointIds,
    rewardUnlocked: false,
  },
  newlyUnlockedReward: null,
  discPointsEarned,
});

// Final scan — reward unlocked
export const mockClaimCheckpointResponseUnlocked = (
  claimedCheckpointIds,
  discPointsEarned = 50,
) => ({
  ok: true,
  progress: {
    claimedCheckpointIds,
    rewardUnlocked: true,
  },
  newlyUnlockedReward: {
    rewardId: mockRun.rewardRule.rewardId,
    giftProduct: mockRun.giftProduct,
  },
  discPointsEarned,
});

// ─── Mock API handlers (used by src/api/index.js when mock mode) ───

function huntPayload() {
  return {
    event: mockRun.event,
    brand: mockRun.brand,
    giftProduct: buildHuntGiftProduct(),
    upsellProducts: mockRun.upsellProducts,
    checkpoints: buildHuntCheckpointsForPayload(),
    rewardRule: mockRun.rewardRule,
    userProgress: { ...mockRun.userProgress },
  };
}

/** Same shape as `getHunt` / live API — used when HTTP getHunt is not 200 OK. */
export function getMockHuntPayload() {
  return huntPayload();
}

export async function getProfile() {
  return { ...mockProfile };
}

export async function getHunt() {
  return huntPayload();
}

export async function checkIn(body) {
  const eventId = body?.eventId;
  const nonce = body?.clientNonce;
  const proof = body?.proof;
  if (!eventId || !nonce) {
    return { ok: false, error: "BAD_REQUEST" };
  }
  if (proof?.type !== "qr" || proof?.payload !== DEMO_ENTRANCE_QR_SECRET) {
    return { ok: false, error: "INVALID_PROOF" };
  }
  const checkedInAt = new Date().toISOString();
  mockRun.userProgress = {
    ...mockRun.userProgress,
    checkedInAt,
  };
  return {
    ok: true,
    checkedInAt,
    progress: { ...mockRun.userProgress },
  };
}

export async function claimCheckpoint(body) {
  const checkpointId =
    body != null && typeof body.checkpointId === "string"
      ? body.checkpointId
      : null;
  const cp = checkpointId
    ? mockRun.checkpoints.find((c) => c.id === checkpointId)
    : null;
  const pointsToAward = Number(cp?.discAtCheckpoint ?? 50);

  const requiredCount = mockRun.rewardRule.requiredCheckpointCount ?? 0;
  const wasRewardUnlocked =
    mockClaimedCheckpointIdsSession.length >= requiredCount;

  const alreadyClaimed =
    checkpointId != null &&
    mockClaimedCheckpointIdsSession.includes(checkpointId);

  let discPointsEarned = 0;
  if (checkpointId && !alreadyClaimed) {
    mockClaimedCheckpointIdsSession.push(checkpointId);
    mockProfile.discPoints += pointsToAward;
    discPointsEarned = pointsToAward;
  }

  const claimedCheckpointIds = sortClaimedCheckpointIdsByOrder(
    mockClaimedCheckpointIdsSession,
  );
  const rewardUnlocked = claimedCheckpointIds.length >= requiredCount;
  const newlyUnlockedReward =
    !wasRewardUnlocked && rewardUnlocked
      ? {
          rewardId: mockRun.rewardRule.rewardId,
          giftProduct: mockRun.giftProduct,
        }
      : null;

  if (newlyUnlockedReward) {
    appendDropToRedeemIfNew();
  }

  return {
    ok: true,
    progress: {
      claimedCheckpointIds,
      rewardUnlocked,
    },
    newlyUnlockedReward,
    discPointsEarned,
  };
}
