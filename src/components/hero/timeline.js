// 8-second hero loop, as a pure function of time so it can be sampled at any moment.
//
// 0.3–2.1s  teal scan beam passes over the invoice
// 2.0–4.0s  Supplier, TIN, Total chips lift off the page and float beside it
// 4.3–4.7s  TIN chip is confirmed: amber ⚠ → green ✓
// 4.6–5.2s  "MyInvois-ready" card fades in
// 5.0–6.3s  chips settle into the card
// 6.3–7.2s  hold
// 7.2–7.8s  chips and card fade out, loop restarts softly

export const LOOP = 8;
/** Paused frame for reduced motion — everything settled, all chips green. */
export const FINAL_T = 6.8;
/** The loop starts during the hold so the first frame matches the static fallback. */
export const START_T = 6.4;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
export const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

export const TIN_CONFIRM_T = 4.3;

export function timeline(t) {
  const fadeOut = seg(t, 7.2, 7.8);

  const beamP = seg(t, 0.3, 2.1);
  const beam = {
    visible: beamP > 0 && beamP < 1,
    progress: ease(beamP),
    opacity: Math.sin(beamP * Math.PI) * 0.9,
  };

  const chips = [0, 1, 2].map((i) => {
    const lift = ease(seg(t, 2.0 + i * 0.35, 3.1 + i * 0.35));
    const settle = ease(seg(t, 5.0 + i * 0.15, 6.0 + i * 0.15));
    const pulse = i === 1 ? Math.sin(seg(t, TIN_CONFIRM_T, TIN_CONFIRM_T + 0.4) * Math.PI) * 0.08 : 0;
    return {
      lift,
      settle,
      arc: Math.sin(lift * Math.PI) * 0.25,
      opacity: Math.min(1, lift * 3) * (1 - fadeOut),
      scale: (0.55 + 0.45 * lift) * (1 + pulse),
      confirmed: i !== 1 || t >= TIN_CONFIRM_T,
    };
  });

  const appear = ease(seg(t, 4.6, 5.2));
  const card = {
    opacity: appear * (1 - fadeOut),
    scale: 0.94 + 0.06 * appear,
  };

  return { beam, chips, card };
}
