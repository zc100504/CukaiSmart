// Loads the hero hand images (transparent PNGs) once and shares them between the 3D scene
// and the static fallback. If an image is missing, fails, or is not transparent, a neutral
// light-grey silhouette is used instead and a console warning names the file.
import { FINGERTIP, HAND_BOX, HAND_PATH, THUMB_PATH } from './handShapes.js';
import { AI_TIP, HUMAN_TIP } from './stage.js';

export const HAND_SOURCES = {
  ai: { src: '/hero/hand-ai.png', tip: AI_TIP, pointsTo: 'right' },
  human: { src: '/hero/hand-human.png', tip: HUMAN_TIP, pointsTo: 'left' },
};

/** Shadow: blur radius and opacity (the offset is applied where the shadow is drawn). */
export const SHADOW_BLUR = 14;
export const SHADOW_OPACITY = 0.18;

const cache = {};

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** True when the image has a see-through background (checked on its corners and edges). */
function isTransparent(img) {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, 32, 32);
  const { data } = ctx.getImageData(0, 0, 32, 32);
  const alphaAt = (x, y) => data[(y * 32 + x) * 4 + 3];
  const border = [];
  for (let i = 0; i < 32; i += 1) border.push(alphaAt(i, 0), alphaAt(i, 31));
  return border.some((a) => a < 200);
}

/** Neutral light-grey pointing hand, used when an image can't be shown. */
function silhouette(pointsTo) {
  const scale = 3;
  const c = document.createElement('canvas');
  c.width = HAND_BOX.w * scale;
  c.height = HAND_BOX.h * scale;
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  if (pointsTo === 'left') {
    ctx.translate(HAND_BOX.w, 0);
    ctx.scale(-1, 1);
  }
  ctx.fillStyle = cssVar('--border');
  ctx.fill(new Path2D(HAND_PATH));
  ctx.fillStyle = cssVar('--surface-muted');
  ctx.fill(new Path2D(THUMB_PATH));
  return c;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * @param {'ai'|'human'} key
 * @returns {Promise<{ source, url, width, height, tip, fallback }>}
 *   source: HTMLImageElement or canvas (for textures); url: for <image>/<img> elements.
 */
export function loadHandImage(key) {
  if (!cache[key]) {
    const cfg = HAND_SOURCES[key];
    cache[key] = loadImage(cfg.src).then((img) => {
      if (img && isTransparent(img)) {
        return { source: img, url: cfg.src, width: img.naturalWidth, height: img.naturalHeight, tip: cfg.tip, fallback: false };
      }
      // eslint-disable-next-line no-console
      console.warn(
        img
          ? `[CukaiSmart hero] ${cfg.src} has no transparent background — showing a placeholder hand instead.`
          : `[CukaiSmart hero] Could not load ${cfg.src} — showing a placeholder hand instead.`
      );
      const canvas = silhouette(cfg.pointsTo);
      const tipX = cfg.pointsTo === 'right' ? FINGERTIP.x / HAND_BOX.w : 1 - FINGERTIP.x / HAND_BOX.w;
      return {
        source: canvas,
        url: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
        tip: { x: tipX, y: FINGERTIP.y / HAND_BOX.h },
        fallback: true,
      };
    });
  }
  return cache[key];
}

/** Soft navy shadow from the hand's alpha: a blurred silhouette on a padded canvas. */
export function makeShadowCanvas(source, width, height) {
  const scale = Math.min(1, 512 / width); // shadows don't need full resolution
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const pad = Math.ceil(SHADOW_BLUR * 2 * scale) + 4;
  const c = document.createElement('canvas');
  c.width = w + pad * 2;
  c.height = h + pad * 2;
  const ctx = c.getContext('2d');
  ctx.filter = `blur(${Math.max(1, SHADOW_BLUR * scale)}px)`;
  ctx.drawImage(source, pad, pad, w, h);
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = cssVar('--navy');
  ctx.fillRect(0, 0, c.width, c.height);
  return { canvas: c, padX: pad / scale, padY: pad / scale };
}
