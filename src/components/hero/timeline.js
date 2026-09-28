// 10-second hero loop as a pure function of time, so any moment can be shown (step jumps, reduced motion).
//
// Upload          0.0–2.0s  the paper slides and rotates up into place
// AI extracts     2.0–4.2s  teal scan beam sweeps down; each field lights up as it is read; AI fingertip ring
// You review      4.2–7.0s  TIN row turns amber with a warning, human fingertip ring, row turns green
// MyInvois-ready  7.0–10s   green check badge pops in at the top-right corner, holds, then a soft reset
//
// The loop plays LOOPS_BEFORE_REST times, then rests on the MyInvois-ready frame (WCAG 2.2.2).

export const LOOP = 10;
/** Full loops before the animation rests on the final frame. */
export const LOOPS_BEFORE_REST = 3;
/** Fingertip ring: seconds per ring (a new ring starts each period while the cue is active). */
export const RING_PERIOD = 1.1;

export const STAGES = [
  { key: 'upload', label: 'Upload', start: 0, still: 1.95 },
  { key: 'extract', label: 'AI extracts', start: 2.0, still: 3.3 },
  { key: 'review', label: 'You review', start: 4.2, still: 6.6 },
  { key: 'ready', label: 'MyInvois-ready', start: 7.0, still: 8.4 },
];

/** Settled final state: reduced motion and the static fallback show this. */
export const FINAL_T = 8.4;
/** The loop starts in the final state so the first frame matches the fallback it fades over. */
export const START_T = 8.2;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const seg = (t, a, b) => clamp01((t - a) / (b - a));
export const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const easeOut = (x) => 1 - (1 - x) ** 3;
const easeOutBack = (x) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return x <= 0 ? 0 : 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};
/** Expanding, fading ring from a fingertip while [a, b]: progress 0 → 1 per ring, 0 opacity outside. */
function ring(t, a, b) {
  if (t < a || t > b) return { progress: 0, opacity: 0 };
  const p = ((t - a) % RING_PERIOD) / RING_PERIOD;
  const edge = Math.min(seg(t, a, a + 0.2), 1 - seg(t, b - 0.2, b));
  return { progress: easeOut(p), opacity: (1 - p) * edge };
}

export function stageAt(t) {
  let index = 0;
  STAGES.forEach((s, i) => {
    if (t >= s.start) index = i;
  });
  return index;
}

export function timeline(t) {
  const fade = ease(seg(t, 9.2, 10));
  const beamP = seg(t, 2.1, 4.0);

  return {
    stage: stageAt(t),
    /** 0 → 1: paper slides/rotates up into place. */
    enter: easeOut(seg(t, 0.05, 1.8)),
    /** Paper + overlays opacity: fades in at the start, out during the reset. */
    opacity: Math.min(ease(seg(t, 0, 0.6)), 1 - fade),
    /** Soft reset: the page drifts down slightly while fading. */
    reset: fade,
    beam: { visible: beamP > 0 && beamP < 1, progress: ease(beamP), opacity: Math.sin(beamP * Math.PI) },
    /** Fingertip cues: AI during "AI extracts", human during "You review". */
    aiRing: ring(t, 2.1, 4.1),
    humanRing: ring(t, 5.0, 6.4),
    /** TIN row: amber warning appears, then the green confirmation replaces it. */
    tinWarn: ease(seg(t, 4.4, 4.8)) * (1 - ease(seg(t, 5.9, 6.3))),
    tinOk: ease(seg(t, 5.9, 6.3)),
    badge: easeOutBack(seg(t, 7.0, 7.6)),
  };
}
