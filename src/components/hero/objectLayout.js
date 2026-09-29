// Placement of the three 3D brand objects, as fractions of the product window's on-screen box,
// so they stay correct at every screen size. Shared by the 3D canvas and layout checks.
//
// Rules: objects overlap the window's edges slightly for depth, but never reach the hero text,
// the buttons, the status chip, the flagged TIN row, Confirm/Approve or the badge.

/** Keep this many px between an object and the hero section's side edges. */
export const VIEWPORT_MARGIN = 8;

export const OBJECTS = {
  /** Thermal receipt — beside the left edge, high enough to be seen above the fold (in front, moves most with parallax). */
  receipt: { anchor: { x: -0.02, y: 0.22 }, width: 0.066, height: 0.15, depth: 1.4, tilt: -0.22 },
  /** RM coin — small, at the lower-right corner, beside the empty right end of the panel footer. */
  coin: { anchor: { x: 1.0, y: 0.95 }, offset: { x: 18, y: 0 }, size: 0.06, depth: 0.8 },
  /** Shield with check — beside the right edge, below the audit card and above the flagged TIN row. */
  shield: { anchor: { x: 1.0, y: 0.34 }, offset: { x: 10, y: 0 }, size: 0.08, depth: 1.2 },
};

/**
 * Screen boxes for each object (hero-section px): { cx, cy, w, h }.
 * rect: window box { left, top, width, height }; heroWidth: to keep objects inside the hero.
 */
export function objectBoxes(rect, heroWidth) {
  const W = rect.width;
  const H = rect.height;
  const at = (a, off = { x: 0, y: 0 }) => ({ x: rect.left + a.x * W + off.x * (W / 1120), y: rect.top + a.y * H + off.y * (W / 1120) });
  const clampX = (cx, halfW) => Math.min(heroWidth - VIEWPORT_MARGIN - halfW, Math.max(VIEWPORT_MARGIN + halfW, cx));

  const r = OBJECTS.receipt;
  const rp = at(r.anchor);
  const rw = r.width * W;
  const rh = r.height * W;

  const c = OBJECTS.coin;
  const cp = at(c.anchor, c.offset);
  const cs = c.size * W;

  const sh = OBJECTS.shield;
  const sp = at(sh.anchor, sh.offset);
  const ss = sh.size * W;

  return {
    receipt: { cx: clampX(rp.x, rw / 2), cy: rp.y, w: rw, h: rh },
    coin: { cx: clampX(cp.x, cs / 2), cy: cp.y, w: cs, h: cs },
    shield: { cx: clampX(sp.x, ss / 2), cy: sp.y, w: ss, h: ss * 1.15 },
  };
}
