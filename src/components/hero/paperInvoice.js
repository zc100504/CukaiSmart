// Paper invoice for the hero: canvas textures drawn in Inter with brand colours from tokens.css.
// Call only after Inter has loaded (HeroVisual waits for it before mounting the scene).
import * as THREE from 'three';

import { FIELDS, FOLD, INVOICE_DATA, MARGIN as M, TEX_H, TEX_W } from './invoiceLayout.js';

export { FIELDS, FOLD, INVOICE_DATA, TEX_H, TEX_W };

const FONT = '"Inter", system-ui, sans-serif';

const TOKENS = {
  navy: '--navy',
  teal: '--teal',
  tealText: '--teal-text',
  card: '--card',
  text: '--text',
  textSecondary: '--text-secondary',
  border: '--border',
  surfaceMuted: '--surface-muted',
  warning: '--warning',
  warningPale: '--warning-pale',
  success: '--success',
  successPale: '--success-pale',
};

export function readCssPalette() {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(Object.entries(TOKENS).map(([k, v]) => [k, style.getPropertyValue(v).trim()]));
}

// ---------------------------------------------------------------------------

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d') };
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function text(ctx, str, x, y, { size, weight = 400, color, align = 'left' }) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(str, x, y);
}

function toTexture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function drawCheck(ctx, cx, cy, r, color, width) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.45, cy + r * 0.02);
  ctx.lineTo(cx - r * 0.12, cy + r * 0.34);
  ctx.lineTo(cx + r * 0.46, cy - r * 0.32);
  ctx.stroke();
  ctx.restore();
}

function drawWarning(ctx, cx, cy, r, fill, mark) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = fill;
  ctx.lineJoin = 'round';
  ctx.lineWidth = r * 0.25;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 1.05, cy + r * 0.8);
  ctx.lineTo(cx - r * 1.05, cy + r * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = mark;
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.22;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.38);
  ctx.lineTo(cx, cy + r * 0.2);
  ctx.stroke();
  ctx.fillStyle = mark;
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.52, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------

/** Front face of the invoice. White page; the folded corner area is cut by the paper shape. */
function drawFace(p) {
  const { c, ctx } = canvas(TEX_W, TEX_H);
  const d = INVOICE_DATA;
  ctx.fillStyle = p.card;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Header bar
  ctx.fillStyle = p.navy;
  ctx.fillRect(0, 0, TEX_W, 140);
  ctx.fillStyle = p.teal;
  ctx.fillRect(0, 140, TEX_W, 8);
  text(ctx, 'INVOICE', M, 94, { size: 54, weight: 700, color: p.card });

  // Meta
  text(ctx, 'No.', M, 218, { size: 24, color: p.textSecondary });
  text(ctx, d.number, M + 52, 218, { size: 26, weight: 600, color: p.text });
  text(ctx, d.date, TEX_W - M, 218, { size: 26, weight: 600, color: p.text, align: 'right' });

  // Supplier / buyer
  text(ctx, 'FROM', M, 300, { size: 20, weight: 700, color: p.textSecondary });
  text(ctx, d.supplier.name, M, 342, { size: 30, weight: 600, color: p.navy });
  text(ctx, d.supplier.address, M, 382, { size: 22, color: p.textSecondary });
  text(ctx, 'BILL TO', 540, 300, { size: 20, weight: 700, color: p.textSecondary });
  text(ctx, d.buyer.name, 540, 342, { size: 26, weight: 600, color: p.navy });
  text(ctx, d.buyer.address, 540, 382, { size: 22, color: p.textSecondary });

  // TIN row (flagged during review)
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M, 444);
  ctx.lineTo(TEX_W - M, 444);
  ctx.stroke();
  text(ctx, 'Supplier TIN', M, 496, { size: 24, color: p.textSecondary });
  text(ctx, d.tin, M + 170, 496, { size: 28, weight: 600, color: p.text });

  // Items
  ctx.fillStyle = p.surfaceMuted;
  roundRect(ctx, M, 572, TEX_W - M * 2, 52, 10);
  ctx.fill();
  const cols = { qty: 610, unit: 780, amount: TEX_W - M - 16 };
  text(ctx, 'Description', M + 16, 606, { size: 21, weight: 600, color: p.textSecondary });
  text(ctx, 'Qty', cols.qty, 606, { size: 21, weight: 600, color: p.textSecondary, align: 'right' });
  text(ctx, 'Unit (RM)', cols.unit, 606, { size: 21, weight: 600, color: p.textSecondary, align: 'right' });
  text(ctx, 'Amount (RM)', cols.amount, 606, { size: 21, weight: 600, color: p.textSecondary, align: 'right' });
  d.items.forEach(([desc, qty, unit, amount], i) => {
    const y = 684 + i * 72;
    text(ctx, desc, M + 16, y, { size: 26, color: p.text });
    text(ctx, String(qty), cols.qty, y, { size: 26, color: p.text, align: 'right' });
    text(ctx, unit, cols.unit, y, { size: 26, color: p.text, align: 'right' });
    text(ctx, amount, cols.amount, y, { size: 26, weight: 600, color: p.text, align: 'right' });
    ctx.strokeStyle = p.border;
    ctx.beginPath();
    ctx.moveTo(M, y + 26);
    ctx.lineTo(TEX_W - M, y + 26);
    ctx.stroke();
  });

  // Totals
  text(ctx, 'Subtotal', 540, 924, { size: 24, color: p.textSecondary });
  text(ctx, d.subtotal, cols.amount, 924, { size: 26, color: p.text, align: 'right' });
  text(ctx, d.taxLabel, 540, 972, { size: 24, color: p.textSecondary });
  text(ctx, d.tax, cols.amount, 972, { size: 26, color: p.text, align: 'right' });
  ctx.strokeStyle = p.navy;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(530, 1004);
  ctx.lineTo(TEX_W - M, 1004);
  ctx.stroke();
  text(ctx, 'Total', 540, 1072, { size: 34, weight: 700, color: p.text });
  text(ctx, d.total, cols.amount, 1074, { size: 42, weight: 700, color: p.navy, align: 'right' });

  // Footer
  ctx.fillStyle = p.teal;
  ctx.fillRect(M, TEX_H - 150, 120, 6);
  text(ctx, 'Payment due within 30 days. Thank you for your business.', M, TEX_H - 104, {
    size: 22,
    color: p.textSecondary,
  });
  return toTexture(c);
}

/** Review overlay for the TIN row: 'warn' (amber box + warning icon) or 'ok' (green box + check). */
function drawTinOverlay(p, state) {
  const [x0, y0, x1, y1] = FIELDS.tin;
  const scale = 2;
  const w = (x1 - x0) * scale;
  const h = (y1 - y0) * scale;
  const { c, ctx } = canvas(w, h);
  const ok = state === 'ok';
  const hue = ok ? p.success : p.warning;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = ok ? p.successPale : p.warningPale;
  roundRect(ctx, 3, 3, w - 6, h - 6, 14);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = hue;
  ctx.lineWidth = 5;
  ctx.stroke();
  const r = h * 0.26;
  const cx = w - r * 2.2;
  const cy = h / 2;
  if (ok) {
    ctx.fillStyle = hue;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    drawCheck(ctx, cx, cy, r, p.card, r * 0.26);
  } else {
    drawWarning(ctx, cx, cy, r, hue, p.card);
  }
  return toTexture(c);
}

/** White check for the badge's front face (transparent background). */
function drawBadgeCheck(p) {
  const { c, ctx } = canvas(256, 256);
  drawCheck(ctx, 128, 132, 96, p.card, 26);
  return toTexture(c);
}

/** Soft drop shadow behind the paper (navy, very light). */
function drawShadow(p) {
  const { c, ctx } = canvas(256, 356);
  ctx.filter = 'blur(18px)';
  ctx.fillStyle = p.navy;
  ctx.globalAlpha = 0.5;
  roundRect(ctx, 40, 40, 176, 276, 12);
  ctx.fill();
  return toTexture(c);
}

export function createInvoiceTextures(palette) {
  return {
    face: drawFace(palette),
    tinWarn: drawTinOverlay(palette, 'warn'),
    tinOk: drawTinOverlay(palette, 'ok'),
    badgeCheck: drawBadgeCheck(palette),
    shadow: drawShadow(palette),
  };
}

/** Texture pixel → paper-local coordinates (paper centred at 0,0; width w, height h; y up). */
export function texToLocal(x, y, w, h) {
  return { x: (x / TEX_W - 0.5) * w, y: (0.5 - y / TEX_H) * h };
}
