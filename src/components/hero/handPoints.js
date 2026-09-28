// Turns a hand image (bright hand on a pure black background) into a dot-matrix point cloud.
// Pixels are sampled on a grid; pixels brighter than the hand's threshold become dots.
// Brightness also sets each dot's size and depth, which gives the hand some volume.
import { FINGERTIP, HAND_BOX, HAND_PATH, THUMB_PATH } from './handShapes.js';

// ---------------------------------------------------------------------------
// Tuning — adjust these if you replace the hand images
// ---------------------------------------------------------------------------

/** 0–1 luminance. The white robot hand is bright; raise to drop dark metal parts and JPEG noise. */
export const AI_BRIGHTNESS_THRESHOLD = 0.16;
/** 0–1 luminance. Skin tones are darker than the robot's white plates, so this is lower. */
export const HUMAN_BRIGHTNESS_THRESHOLD = 0.1;

/**
 * Area of each image to sample, as fractions [left, top, right, bottom].
 * Both crops also leave out the generator watermark in the bottom-right corner.
 */
export const AI_CROP = [0.0, 0.2, 0.92, 0.82];
export const HUMAN_CROP = [0.05, 0.12, 1.0, 0.86];

/** Upper limit on dots per hand (the grid gets coarser until the hand fits). */
export const MAX_DOTS_PER_HAND = 12000;
/** Starting grid width in samples across the crop. */
export const SAMPLE_WIDTH = 260;
/** Width of the cropped image in scene units. Both hands use the same scale. */
export const HAND_WORLD_WIDTH = 2.4;
/** Front-to-back depth range created from brightness. */
export const DOT_DEPTH = 0.28;
/** Smallest dot, relative to the largest (darkest kept pixels get this size). */
export const MIN_DOT_SIZE = 0.45;
/** Dots within this distance of the fingertip brighten during the AI / review steps. */
export const FINGERTIP_RADIUS = 0.3;

export const HANDS = {
  ai: { src: '/hero/hand-ai.png', threshold: AI_BRIGHTNESS_THRESHOLD, crop: AI_CROP, pointsTo: 'right', tone: 1 },
  human: {
    src: '/hero/hand-human.png',
    threshold: HUMAN_BRIGHTNESS_THRESHOLD,
    crop: HUMAN_CROP,
    pointsTo: 'left',
    tone: 0.7,
  },
};

// ---------------------------------------------------------------------------

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Placeholder hand (used only if the image file is missing): lit from above for some volume. */
function placeholderCanvas(pointsTo, tone) {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = HAND_BOX.w * scale;
  canvas.height = HAND_BOX.h * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgb(0,0,0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  if (pointsTo === 'left') {
    ctx.translate(HAND_BOX.w, 0);
    ctx.scale(-1, 1);
  }
  const shade = (v) => {
    const c = Math.round(255 * tone * v);
    return `rgb(${c},${c},${c})`;
  };
  const gradient = ctx.createLinearGradient(0, 70, 0, 180);
  gradient.addColorStop(0, shade(1));
  gradient.addColorStop(1, shade(0.55));
  ctx.fillStyle = gradient;
  ctx.fill(new Path2D(HAND_PATH));
  ctx.fillStyle = shade(0.75);
  ctx.fill(new Path2D(THUMB_PATH));
  return canvas;
}

function sampleGrid(source, crop, width) {
  const sw = source.naturalWidth || source.width;
  const sh = source.naturalHeight || source.height;
  const sx = crop[0] * sw;
  const sy = crop[1] * sh;
  const cw = (crop[2] - crop[0]) * sw;
  const ch = (crop[3] - crop[1]) * sh;
  const w = Math.max(40, Math.round(width));
  const h = Math.max(20, Math.round((w * ch) / cw));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, sx, sy, cw, ch, 0, 0, w, h);
  return { w, h, data: ctx.getImageData(0, 0, w, h).data };
}

function collect({ w, h, data }, threshold) {
  const kept = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      if (lum > threshold) kept.push({ x, y, lum });
    }
  }
  return kept;
}

// Small seeded PRNG so the shuffle and jitter are the same on every load.
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {'ai'|'human'} key
 * @returns {Promise<{count, positions, sizes, shades, tips, spacing, placeholder}>}
 *   Positions are relative to the fingertip (fingertip = 0,0,0). Points are shuffled,
 *   so drawing only the first half still covers the whole hand evenly.
 */
export async function loadHandCloud(key, { maxDots = MAX_DOTS_PER_HAND } = {}) {
  const cfg = HANDS[key];
  const img = await loadImage(cfg.src);
  const placeholder = !img;
  const source = img || placeholderCanvas(cfg.pointsTo, cfg.tone);
  const crop = img ? cfg.crop : [0, 0, 1, 1];
  const threshold = img ? cfg.threshold : 0.08;

  let width = SAMPLE_WIDTH;
  let grid;
  let kept;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    grid = sampleGrid(source, crop, width);
    kept = collect(grid, threshold);
    if (kept.length <= maxDots) break;
    width *= Math.sqrt(maxDots / kept.length) * 0.97;
  }
  if (kept.length > maxDots) kept = kept.slice(0, maxDots);

  // Normalise brightness per hand so the darker human hand still gets the full size/depth range.
  const lums = kept.map((p) => p.lum).sort((a, b) => a - b);
  const high = Math.max(lums[Math.floor(lums.length * 0.95)] || 1, threshold + 0.05);

  const worldW = HAND_WORLD_WIDTH;
  const worldH = (worldW * grid.h) / grid.w;
  const spacing = worldW / grid.w;
  const rand = mulberry32(key === 'ai' ? 7 : 11);

  const pts = kept.map((p) => {
    const b = Math.min(1, Math.max(0, (p.lum - threshold) / (high - threshold)));
    return {
      x: ((p.x + 0.5) / grid.w - 0.5) * worldW,
      y: (0.5 - (p.y + 0.5) / grid.h) * worldH,
      z: (b - 0.5) * DOT_DEPTH + (rand() - 0.5) * spacing,
      b,
    };
  });

  // Fingertip = the furthest point in the pointing direction (averaged over a thin slice).
  const dir = cfg.pointsTo === 'right' ? 1 : -1;
  const extreme = pts.reduce((m, p) => (p.x * dir > m ? p.x * dir : m), -Infinity) * dir;
  const slice = pts.filter((p) => Math.abs(p.x - extreme) < spacing * 4);
  const tip = { x: extreme, y: slice.reduce((s, p) => s + p.y, 0) / Math.max(1, slice.length) };

  // Deterministic shuffle.
  for (let i = pts.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }

  const count = pts.length;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const shades = new Float32Array(count);
  const tips = new Float32Array(count);
  pts.forEach((p, i) => {
    const x = p.x - tip.x;
    const y = p.y - tip.y;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = p.z;
    sizes[i] = MIN_DOT_SIZE + (1 - MIN_DOT_SIZE) * p.b;
    shades[i] = p.b;
    const d = Math.hypot(x, y) / FINGERTIP_RADIUS;
    tips[i] = d < 1 ? (1 - d) * (1 - d) : 0;
  });

  return { count, positions, sizes, shades, tips, spacing, placeholder };
}

