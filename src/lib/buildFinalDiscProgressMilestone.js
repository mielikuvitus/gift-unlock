import { getProfile } from "../api/index.js";

/**
 * Builds `{ baseline, target }` for the final `DiscPointsProgress` animation:
 * hunt-start DISC → latest total from `/getProfile`, or `fallbackTotal` if the profile
 * call fails or has no `discPoints`.
 *
 * @param {number} huntStartDiscPoints — DISC total when the hunt began (`getProfile` at start).
 * @param {number} fallbackTotal — client-known total before refresh when profile is unavailable.
 * @returns {Promise<{ baseline: number, target: number }>}
 */
export async function buildFinalDiscProgressMilestone(
  huntStartDiscPoints,
  fallbackTotal,
) {
  let target = fallbackTotal;
  try {
    const profile = await getProfile();
    if (
      profile &&
      profile.error == null &&
      typeof profile.discPoints === "number"
    ) {
      target = profile.discPoints;
    }
  } catch {
    /* keep fallback */
  }
  return { baseline: huntStartDiscPoints, target };
}
