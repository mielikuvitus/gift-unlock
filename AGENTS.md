# weDISCOVR · AR Gift Unlock Demo — Agent Context

> Read this before touching any file. Last updated: 2026-10-27.

---

## What this is

A browser-based AR Gift Unlock demo for weDISCOVR's Explorer user type. Demo persona **Emma** does a **Gift Run Berlin** — scanning QR codes at physical stops, collecting coins/XP, and unlocking a **skincare gift** at the final stop.

Originally built for an in-person investor demo on **7th April 2026**, run on **iPhone 16 Pro** (Safari only). It is now used as a showcase on Suvi's portfolio. All specs below still apply.

---

## Team

| Person   | Role             | Touchpoint for                               |
| -------- | ---------------- | -------------------------------------------- |
| Devonte  | Founder / CEO    | Demo owner, final sign-off                   |
| Sarannya | CTO              | Base44 architecture, auth, hosting, entities |
| Tamir    | Product Designer | Figma specs, asset delivery                  |
| Suvi     | Contractor       | All frontend + AR implementation             |

---

## Tech stack

- **Framework**: React + Vite
- **Styling**: Vanilla CSS — CUBE CSS methodology (no Tailwind, no CSS-in-JS)
- **AR layer**: Three.js WebGL canvas composited over `getUserMedia` camera feed
- **Orientation**: `DeviceOrientationEvent` for scene rotation
- **Animations**: GSAP (screen transitions and unlock animations)
- **QR scanning**: jsQR — the primary checkpoint claim mechanism
- **Sound**: `src/behaviours/sound.js` — Web Audio API. `primeSuccessSound()` must run inside a user gesture: in `GiftPreview.jsx` on `onPointerDown` on the 3D gift (drag start), and in `ARGiftReveal.jsx` on `pointerdown` when starting the unlock timeline. That unlocks the AudioContext on Safari. `triggerDropSuccess()` plays the bell after a successful drop.

---

## Main Screens

1. **Tap to Unlock**
2. **Gift Reveal / Drops**
3. **Gift Run**
4. **AR camera layer**

---

## File / folder structure (Only covers AR Gift Unlock related files)

```
src/
  App.jsx
  main.jsx
  api/index.js                        ← real API calls (wraps mock in dev)
  animations/                          ← partial list; not exhaustive — see `src/animations/`
    CoinFall/
    ConfettiBlast/
    FloaterIdleMotion/
    Focus/
    LogoSparkles/
    MapTapHint/
    SonarRings/
    TapHintLoop/
    VerticalBobMotion/
    confetti-long.svg
    confetti-rec.svg confetti-rec2.svg confetti-sm.svg
  assets/
    amazingy-logo.svg
    pictures/Product BG.png
    sounds/bright-bell.mp3
    svg/
      help-circle.svg
      map.svg
      tap-icon.svg
      tick.svg
      warning-triangle.svg
      coin.svg
      gift.svg
      focus.svg
      location.svg
      location-icon.svg
      dash-inner.svg
      dash-outer.svg
      tap 1.svg
  behaviours/sound.js                 ← Web Audio API bell sound
  components/
    ar-gift-unlock/
      DiscCoinGlView/
      GiftDropSuccess/
      GiftPreview/
      MapInteractiveCard/
    common/
      DotCarousel/
      DropZone/
      ProgressBar/
      Pill/
      WediscovrTopHeader/
      CircleButton/
      WarningGlassCard/
  config/flags.js                     ← feature flags (e.g. AR_GIFT_REVEAL)
  data/
    mocks/apiMock.js                   ← single mock data source + mock API handlers
  hooks/
    useCamera.js
    useDropZoneHighlight.js
  lib/
    ARConfetti.js
    ARConfettiConfig.js
    applyDeviceOrientationToObject3D.js
    deriveRunState.js                  ← deriveRunState({ checkpoints, claimedCheckpointIds })
    giftBoxMaterials.js
    giftRevealTimeline.js
    gsap-react-shim.js                 ← @gsap/react alias (do not change)
    requestDeviceOrientationPermission.js
  screens/
    ARGiftReveal/
    CameraView/
    ClueDetail/
    DiscPointsProgress/
    GiftUnlock/
    IntroView/
    TapToUnlock/
  styles/
    global.css                         ← reset, all CSS custom properties (tokens)
    utilities/
      background-scrim.css
      buttons.css
      dark-overlay.css
      glass.css
      glass-card-layout.css            ← u-glass-card-layout + sub-elements
      shell-layout.css                 ← u-gift-run-shell + overlay variants + text utilities
```

---

## File / folder conventions

- All screens in `src/screens/`, reusable components in `src/components/`
- CSS co-located with component: `TapToUnlock/TapToUnlock.css`
- Global tokens in `src/styles/global.css`, shared utilities in `src/styles/utilities/`
- Hooks in `src/hooks/` — one hook per file, named `useThing.js`. Search here before writing new hook logic. Screen-only hooks may live next to their screen.
- Before building new UI (cards, overlays, repeated patterns), search `src/components/` and reuse what exists — e.g. `WarningGlassCard` for gold-border alerts, `u-glass-card` for glass surfaces, `u-gift-run-shell` for full-screen layouts
- SVGs imported as React components: `import Icon from './icon.svg?react'`
- Asset URLs imported as strings: `import url from './asset.jpg?url'`

---

## Mock data

**Single source of truth: `src/data/mocks/apiMock.js`**

All components import mock data from here. **`mockRun.checkpoints`** match the **`getHunt`** API checkpoint shape (`id`, `title`, `type`, `orderIndex`, `checkpointQr`, `discAtCheckpoint`, `position`, `checkpointClue`). For ordered scan/clue state, pass **`mockRun.checkpoints`** (or **`getHunt`** payload checkpoints) and **`claimedCheckpointIds`** into **`deriveRunState`** (`src/lib/deriveRunState.js`); it sorts by **`orderIndex`**, and **`scanTargetCheckpoint`** is the next unclaimed stop: **`ordered[claimedCheckpointIds.length]`** (null when all claimed).

**Naming — hunt vs run:**

Only the real backend contract keeps “hunt” in the API surface (e.g. `GET /getHunt`, mock handler `getHunt()`). In `apiMock.js`, `huntPayload()` is allowed: it builds the `getHunt` response shape and mirrors that contract.

Everywhere else in the frontend codebase and mock **data** naming, use **run** (e.g. `mockRun`, `GiftRun`, `gift-run` tokens), not “hunt”. Do not introduce other identifiers, routes, or file names that say “hunt” unless they directly mirror that backend API naming (same exception class as `getHunt` and `huntPayload`).

Key exports:

```js
mockProfile; // POST /getProfile shape — { userId, email, discPoints, dropsToRedeem }
mockRun; // POST /getHunt payload shape — event, brand, giftProduct, checkpoints[], rewardRule, userProgress
mockClaimCheckpointRequest(scannedQrString);
mockClaimCheckpointResponse(claimedCheckpointIds, discPointsEarned?);
mockClaimCheckpointResponseUnlocked(claimedCheckpointIds, discPointsEarned?);
// Mock async handlers in apiMock.js (src/api/index.js wires getProfile, getHunt, checkIn, claimCheckpoint):
getProfile();
getHunt();
checkIn(body);
claimCheckpoint(body);
```

Demo event: **Berlin Gift Run**, 3 QR checkpoints (c1 Entrance, c2 Mid-run, c3 Final), gift product: mock **Product Name** by **Brand Name**, 50 DISC points value per checkpoint.

**Clue + QR strings**

Clue copy lives in **`checkpointClue`**; QR strings in **`checkpointQr`** on **`mockRun.checkpoints`**. Physical QR payloads use **`checkpointId:hash`** strings. Update hashes for Sarannya’s secrets and regenerate PNGs. Parse with: `const [checkpointId, payload] = scannedQrString.split(":")`.

`checkIn` and `claimCheckpoint` require `clientNonce`. For local demo calls, use `mockClientNonce()` from `apiMock.js` — handles non-secure origin fallback.

---

### Shared utility classes

**Glass surface — `u-glass-card`** (`src/styles/utilities/glass.css`)
Use for any glass surface. Modifiers:

- `u-glass-card--absolute-fill` — inset layer behind content inside `position: relative`
- `u-glass-card--warning` — swaps border to `--color-gold`. Pair with `WarningGlassCard` component.

**Glass card layout — `u-glass-card-layout`** (`src/styles/utilities/glass-card-layout.css`)
Sized container for DISC points card and similar tall glass cards. Sub-elements:

- `u-glass-card-layout__column` — flex column, constrains width to `--disc-points-card-inline-max`
- `u-glass-card-layout__stage` — grid interior (header / main / footer rows), handles padding
- `u-glass-card-layout__head` — centred logo + title area
- `u-glass-card-layout__logo-wrap` / `u-glass-card-layout__logo` — logo sizing (150px inline)
- `u-glass-card-layout__main` — centred flex column, fills available space
- `u-glass-card-layout__foot` — centred footer row

Modifier:

- `u-glass-card-layout--fluid` — overrides width constraint to `100%`

**Shell layout — `u-gift-run-shell`** (`src/styles/utilities/shell-layout.css`)
Full-screen flex column for standard screens (safe-area-aware padding on all sides). Sub-elements:

- `u-gift-run-shell__header` — flex-shrink: 0 header slot
- `u-gift-run-shell__main` — flex: 1, scrollable, vertically centred content via flex spacers
- `u-gift-run-shell__main-inner` — actual content column inside main; modifier `--align-center`
- `u-gift-run-shell__nav` — flex-shrink: 0 nav slot, reserves `--gift-run-nav-stack` height

**Shell overlay variant — `u-gift-run-shell--overlay`** (same file)
Use inside a positioned overlay host instead of the full shell. Pairs with `u-gift-run-overlay-host`:

- `u-gift-run-overlay-host` — flex column, 100% height, horizontal padding
- `u-gift-run-shell--overlay` — flex: 1 column, pads top for safe area, pads bottom for nav stack

**Dark overlay — `u-dark-overlay`** (`src/styles/utilities/dark-overlay.css`)
Full-bleed dim + backdrop blur. Modifiers:

- `u-dark-overlay--fill` — absolute inset, fills positioned parent
- `u-dark-overlay--non-interactive` — `pointer-events: none`
- `u-dark-overlay--center` — flex, horizontally padded, centres a card inside overlay

**Text utilities** (`src/styles/utilities/shell-layout.css`)

- `u-text-pretty-center` — centred, `text-wrap: pretty`, prevents overflow
- `u-text-card-title` — applies `--text-card-title-size` + `--text-card-title-weight`

### CSS rules

- **Never use inline styles** for anything in the design system
- **Never write `color: #fff`, `color: white`, or `color: var(--color-white)`** — body sets `color: #fff` globally. Only write a `color` rule to deviate: `var(--text-secondary)`, `var(--color-gold)`, etc.
- **`--text-primary` does not exist.** Only `--text-secondary` is defined (`#8b8b8b`).
- CSS custom properties are the source of truth — all tokens in `:root` in `global.css`
- Never hardcode colours or spacing — always use CSS custom properties
- Never install Tailwind, styled-components, or any CSS-in-JS library
- Class names: `[block]__[element]` for blocks, `u-[utility-name]` for utilities
- Compositions handle layout only — no colour, no typography
- Exceptions use data attributes: `[data-state="locked"]`, `[data-variant="glass"]`
- Prefer `clamp()`, `aspect-ratio`, `gap`, `grid`, `flex` over JS layout solutions
- Use `env(safe-area-inset-top/bottom)` in component styles — never hardcode 59px/34px outside token definitions
- Use `-webkit-backdrop-filter` alongside `backdrop-filter` — Safari requires the prefix
- Never use `100vh` — use `100dvh` instead
- `@media (prefers-reduced-motion: reduce)` must wrap all GSAP animations

---

## Design tokens

All tokens are CSS custom properties defined in `src/styles/global.css`. Never hardcode these values.

### Viewport

```css
--viewport-width: 402px;
--viewport-height: 874px;
--safe-area-top: 59px;
--safe-area-bottom: 34px;
```

### Spacing

```css
--space-margin-sm: 8px;
--space-margin: 16px;
--space-padding: 20px;
```

### Colours

```css
--color-blue: #0066ff;
--color-dark: #222222;
--color-background: #050a14;
--color-purple: #6968cb;
--color-orange: #ff5501;
--color-sky: #2c9ce4;
--color-gold: #fac938;
--color-green: #7ed957;
--text-secondary: #8b8b8b;
```

`--text-primary` does NOT exist. Body sets `color: #fff` globally — white text is inherited by default.

### Typography

```css
--font-family: "Nunito", sans-serif;

--text-hero: 28px; /* ExtraBold 800 */
--text-screen-title: 22px; /* ExtraBold 800 */
--text-card-title: 16px; /* Bold 700 */
--text-section-label: 14px; /* Bold 700 */
--text-body: 12px; /* Regular 400 */
--text-small: 11px; /* Regular 400 */
--text-xsmall: 10px; /* SemiBold 600 */
--text-tiny: 9px; /* Regular 400 */
--text-micro: 8px; /* Bold 700 */
```

Each scale has paired `-size` and `-weight` vars (e.g. `--text-hero-size`, `--text-hero-weight`).

### Glass

```css
--glass-fill: rgba(255, 255, 255, 0.06);
--glass-stroke: rgba(255, 255, 255, 0.08);
--glass-blur: 20px;
--glass-radius: 30px;
--glass-shadow: 0 8px 24px rgba(0, 0, 0, 0.26);
```

### Buttons

```css
--button-primary-height: 52px;
--button-primary-radius: 26px;
--button-primary-bg: var(--color-blue);
--button-primary-color: #ffffff;

--button-glass-height: 52px;
--button-glass-radius: 26px;
--button-glass-bg: var(--glass-fill);
--button-glass-border: var(--glass-stroke);
--button-glass-color: #ffffff;

--button-small-height: 36px;
--button-small-radius: 18px;
--button-small-bg: var(--color-blue);
--button-small-color: #ffffff;

--button-ghost-height: 30px;
--button-ghost-radius: 14px;
--button-ghost-bg: rgba(255, 255, 255, 0.18);
--button-ghost-border: rgba(255, 255, 255, 0.3);
--button-ghost-color: #ffffff;
```

Shared button internals (do not override per-component):

```css
--button-border-width: 1px;
--button-inline-padding: var(--space-padding);
--button-gap: var(--space-margin);
--button-font-size: var(--text-body-size);
--button-font-weight: var(--text-card-title-weight);
--button-transition-duration: 150ms;
--button-transition-timing: ease;
```

### Overlays

```css
--dark-overlay-bg: rgba(5, 10, 20, 0.38);
--dark-overlay-blur: 6px;
```

### Component-level tokens

```css
--tap-to-unlock-cta-size: 260px;
--tap-to-unlock-model-width: 220px;
--tap-to-unlock-model-height: 120px;

--disc-points-card-inline-max: 22rem;
--disc-points-card-min-block: min(52dvh, 36rem);

--gift-run-nav-stack: max(
  calc(
    env(safe-area-inset-bottom) + var(--space-margin) + 2 *
      var(--space-margin) +
      max(
        44px,
        2.5rem + var(--space-margin-sm) + calc(var(--text-body-size) * 1.2)
      )
  ),
  calc(5.5rem + var(--space-margin-sm))
);
```

---

## Safari iOS — hard rules

This app runs **exclusively on Safari on iPhone 16 Pro**. If something works in Chrome but not Safari, Safari wins.

### APIs that do NOT exist on Safari iOS — never suggest these

- `navigator.vibrate`
- Web Bluetooth (`navigator.bluetooth`)
- Web NFC (`navigator.nfc`)
- `navigator.geolocation` — not used in this demo at all

### Required patterns

- Viewport meta: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
- Safe area: always `env(safe-area-inset-top/bottom)` in component styles, never hardcoded px
- Never `100vh` — always `100dvh`
- `-webkit-backdrop-filter` required alongside `backdrop-filter`
- `DeviceOrientationEvent.requestPermission()` must be called inside a user gesture (iOS 13+)
- `getUserMedia` requires HTTPS + user gesture — always wrap in try/catch with graceful fallback UI
- Audio (`sound.js`) requires user gesture — `primeSuccessSound()` is called in `GiftPreview.jsx` on `onPointerDown` on the 3D gift and in `ARGiftReveal.jsx` on `pointerdown` at unlock start.
- WebGL context: `{ powerPreference: 'high-performance', antialias: true }`
- All tap targets minimum 44×44px
- No `:hover` states for interactive feedback — use `:active` with short transition

### HTTPS in dev

Served via `@vitejs/plugin-basic-ssl`. Set `DEV_HTTPS_SAN=192.168.x.x` in `.env.local`. Never commit `.env.local`.

---

## What agents must never do

- **Write comments** in any file (JS, JSX, TSX, CSS) unless explicitly asked in the current request
- Install Tailwind, styled-components, or any CSS-in-JS library
- Hardcode colours, spacing, or safe area values — use CSS custom properties
- Use `navigator.vibrate`, Web Bluetooth, or Web NFC
- Use `100vh` — use `100dvh`
- Use `--text-primary` — it does not exist
- Write `color: #fff` or `color: white` — body already sets this globally
- Skip `-webkit-backdrop-filter` when using `backdrop-filter`
- Attach `deviceorientation` listeners without requesting permission first
- Use `getUserMedia` without try/catch and a fallback UI
- Skip `prefers-reduced-motion` guards on GSAP animations
- Skip safe area insets on full-screen views
- Use GPS or proximity APIs — QR scanning is the only checkpoint mechanism
- Import clue data from `apiMock.js`
