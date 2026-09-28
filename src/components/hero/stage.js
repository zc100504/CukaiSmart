// The hero composition is designed once on a 1440 × 900 reference frame and scaled
// uniformly with the hero (scale = min(heroWidth / 1440, heroHeight / 900)), so the
// proportions are identical on every screen. Used by the 3D scene, the static fallback
// and the drag area, so all three line up.

export const REF_W = 1440;
export const REF_H = 900;

// ---- Invoice (tune here) ----
/** Invoice height as a share of the reference height (324px at 1440 × 900). */
export const INVOICE_HEIGHT = 0.36;
/** Invoice width / height — an A4 page. */
export const INVOICE_ASPECT = 1 / Math.SQRT2;
/** Invoice centre as a share of the reference frame. */
export const INVOICE_CENTER = { x: 0.5, y: 0.716 };
/** Checkmark badge radius, share of the reference height. */
export const BADGE_RADIUS = 0.032;

// ---- Hands (tune here) ----
/** Fingertip inside each image, as a fraction of the image (x from left, y from top). */
export const AI_TIP = { x: 0.994, y: 0.184 };
export const HUMAN_TIP = { x: 0.005, y: 0.1 };
/** Gap between each fingertip and the invoice edge, share of the reference width. */
export const TIP_GAP = 0.048;
/**
 * Minimum visible hand length (fingertip → arm end), share of the reference width.
 * Hands grow beyond this when needed so the arm always reaches past the hero edge.
 */
export const HAND_LENGTH = 0.38;
/** How far the arm continues past the hero edge (reference px), so it is always cropped. */
export const HAND_OVERFLOW = 24;
/** Optional tilt of both hands in degrees (AI hand tilts up with positive values; human mirrors). */
export const HAND_TILT_DEG = 0;
/** Hands sit this far behind the invoice (reference px) so mouse parallax shows depth. */
export const HAND_DEPTH = 60;

/** Hero minimum height (CSS keeps the same value); shorter screens scroll. */
export const HERO_MIN_HEIGHT = 760;

/** Uniform scale and offset that fit the reference frame into the hero (centred). */
export function stageTransform(width, height) {
  const s = Math.min(width / REF_W, height / REF_H);
  return { s, offX: (width - REF_W * s) / 2, offY: (height - REF_H * s) / 2 };
}

/** Composition in reference pixels (y grows downward, like the screen). */
export function referenceLayout() {
  const h = INVOICE_HEIGHT * REF_H;
  const w = h * INVOICE_ASPECT;
  const cx = INVOICE_CENTER.x * REF_W;
  const cy = INVOICE_CENTER.y * REF_H;
  const gap = TIP_GAP * REF_W;
  return {
    invoice: { cx, cy, w, h },
    // Fingertips level with the invoice centre, one on each side.
    aiTip: { x: cx - w / 2 - gap, y: cy },
    humanTip: { x: cx + w / 2 + gap, y: cy },
    badgeRadius: BADGE_RADIUS * REF_H,
    tipGap: gap,
    tilt: (HAND_TILT_DEG * Math.PI) / 180,
  };
}

/**
 * Where to draw a hand image, in reference px (screen y-down), so its fingertip lands on the
 * layout's fingertip and its arm runs past the hero edge.
 * @param side 'ai' (left, points right) | 'human' (right, points left)
 * @param image { width, height, tip: { x, y } } — tip as a fraction of the image
 * @param heroWidth, heroHeight — actual hero size (arm must reach its edge)
 */
export function handPlacement(side, image, heroWidth = REF_W, heroHeight = REF_H) {
  const L = referenceLayout();
  const t = stageTransform(heroWidth, heroHeight);
  const tip = side === 'ai' ? L.aiTip : L.humanTip;
  const sideMargin = t.offX / t.s; // hero area outside the stage, in reference px
  const toEdge = side === 'ai' ? tip.x + sideMargin : REF_W - tip.x + sideMargin;
  const share = side === 'ai' ? image.tip.x : 1 - image.tip.x; // image width between tip and arm end
  const length = Math.max(HAND_LENGTH * REF_W, toEdge + HAND_OVERFLOW);
  const width = length / Math.max(share, 0.05);
  const height = (width * image.height) / image.width;
  return {
    tip,
    width,
    height,
    x: tip.x - image.tip.x * width,
    y: tip.y - image.tip.y * height,
    visibleLength: toEdge,
    rotation: side === 'ai' ? -L.tilt : L.tilt, // radians, screen y-down (applied about the fingertip)
  };
}

/** Reference point → hero pixel. */
export function toScreen(point, transform) {
  return { x: transform.offX + point.x * transform.s, y: transform.offY + point.y * transform.s };
}
