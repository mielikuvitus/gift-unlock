import brightBellUrl from "../assets/sounds/bright-bell.mp3";

const BELL_GAIN = 0.05;

let audioContext;
let masterGain;
let bellBuffer;
let decodePromise;

async function ensureReady() {
  if (!audioContext) {
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
  }
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  if (!decodePromise) {
    decodePromise = fetch(brightBellUrl)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        bellBuffer = buffer;
      });
  }
  await decodePromise;
}

export function primeSuccessSound() {
  void ensureReady().catch(() => {});
}

async function playBrightBell() {
  await ensureReady();
  if (!bellBuffer) {
    return;
  }
  masterGain.gain.setValueAtTime(BELL_GAIN, audioContext.currentTime);
  const source = audioContext.createBufferSource();
  source.buffer = bellBuffer;
  source.connect(masterGain);
  source.start(0);
}

export function triggerDropSuccess() {
  try {
    void playBrightBell().catch(() => {});
  } catch (_) {}
}
