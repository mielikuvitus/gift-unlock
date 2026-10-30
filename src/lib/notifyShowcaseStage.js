export function notifyShowcaseStage(stage, clue) {
  if (window.parent === window) return;
  window.parent.postMessage(
    { type: "gift-unlock:stage", stage, clue },
    window.location.origin,
  );
}
