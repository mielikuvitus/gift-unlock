import * as apiMock from "../data/mocks/apiMock.js";

const JSON_HEADERS = { "Content-Type": "application/json" };
const useMock = import.meta.env.VITE_MOCK !== "false";

/**
 * POST /getHunt — on non-200 or JSON `{ error }`, returns `getMockHuntPayload()` instead.
 * @param {string} eventId
 * @returns {Promise<{ data: object, usedMockHunt: boolean, status?: number }>}
 */
export async function getHunt(eventId) {
  if (useMock) {
    const data = await apiMock.getHunt();
    return { data, usedMockHunt: true, status: 200 };
  }
  const response = await fetch("/getHunt", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ eventId }),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 200 && data && !data.error) {
    return { data, usedMockHunt: false, status: response.status };
  }
  return {
    data: apiMock.getMockHuntPayload(),
    usedMockHunt: true,
    status: response.status,
  };
}

/**
 * POST /getProfile — on non-200, delegates to `apiMock.getProfile()` and sets `_profileUsedMock: true`.
 * @returns {Promise<object>}
 */
export async function getProfile() {
  if (useMock) {
    return {
      ...(await apiMock.getProfile()),
      _profileUsedMock: true,
    };
  }
  const response = await fetch("/getProfile", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({}),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 200) {
    return { ...data, _profileUsedMock: false };
  }
  return {
    ...(await apiMock.getProfile()),
    _profileUsedMock: true,
  };
}

/**
 * POST /checkIn — on non-200, delegates to `apiMock.checkIn` and sets `_checkInUsedMock: true`.
 * @param {object} body
 * @returns {Promise<object>}
 */
export async function checkIn(body) {
  if (useMock) {
    return {
      ...(await apiMock.checkIn(body)),
      _checkInUsedMock: true,
    };
  }
  const response = await fetch("/checkIn", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 200) {
    return { ...data, _checkInUsedMock: false };
  }
  return {
    ...(await apiMock.checkIn(body)),
    _checkInUsedMock: true,
  };
}

/**
 * POST /claimCheckpoint — on non-200, delegates to mock `claimCheckpoint` and sets `_claimUsedMock: true`.
 * @param {object} body
 * @returns {Promise<object>}
 */
export async function claimCheckpoint(body) {
  if (useMock) {
    return {
      ...(await apiMock.claimCheckpoint(body)),
      _claimUsedMock: true,
    };
  }
  const response = await fetch("/claimCheckpoint", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 200) {
    return { ...data, _claimUsedMock: false };
  }
  return {
    ...(await apiMock.claimCheckpoint(body)),
    _claimUsedMock: true,
  };
}

window.__api = { getHunt, getProfile, checkIn, claimCheckpoint };
