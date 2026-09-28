// 10-second hero loop as a pure function of time, so any moment can be shown (step jumps, reduced motion).
//
// Upload          0.0–2.0s  invoice assembles from scattered cubes
// AI extracts     2.0–4.2s  teal scan beam sweeps it; AI fingertip brightens
// You review      4.2–7.0s  one row turns amber, human fingertip brightens, row turns green
// MyInvois-ready  7.0–10s   green voxel checkmark pops in, holds, then everything softly resets

export const LOOP = 10;

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
const easeOutBack = (x) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return x <= 0 ? 0 : 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};
/** 0 → 1 over [a, b], back to 0 over [c, d]. */
const pulse = (t, a, b, c, d) => ease(seg(t, a, b)) * (1 - ease(seg(t, c, d)));

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
    /** 0 → 1 while cubes fly in (each cube adds its own delay). */
    assemble: seg(t, 0.05, 1.9),
    /** Invoice + checkmark opacity: fades in at the start, out during the reset. */
    opacity: Math.min(ease(seg(t, 0, 0.5)), 1 - fade),
    /** Cubes drift apart slightly while fading out. */
    scatter: fade,
    beam: { visible: beamP > 0 && beamP < 1, progress: ease(beamP), opacity: Math.sin(beamP * Math.PI) },
    aiTip: pulse(t, 2.0, 2.5, 4.0, 4.7),
    humanTip: pulse(t, 5.1, 5.6, 6.6, 7.3),
    /** Flagged row: 0 = navy, amber mixes in, then green replaces it. */
    amber: ease(seg(t, 4.4, 4.8)),
    green: ease(seg(t, 5.9, 6.3)),
    check: easeOutBack(seg(t, 7.0, 7.6)),
  };
}
