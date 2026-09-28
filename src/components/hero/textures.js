// Canvas-drawn textures for the hero scene. Colours come from tokens.css at runtime,
// and icons are drawn as paths so nothing depends on glyph support in a fallback font.
// Only call these after Inter has loaded (see useFontsReady).
import * as THREE from 'three';

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
  navyPale: '--navy-pale',
  success: '--success',
  successPale: '--success-pale',
  successText: '--success-text',
  warning: '--warning',
  warningPale: '--warning-pale',
  warningText: '--warning-text',
};

/** Reads brand colours from the CSS custom properties in tokens.css. */
export function readPalette() {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(Object.entries(TOKENS).map(([k, v]) => [k, style.getPropertyValue(v).trim()]));
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'alphabetic';
  return { canvas, ctx };
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

function bar(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
}

function text(ctx, str, x, y, { size, weight = 400, color, align = 'left' }) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(str, x, y);
}

function line(ctx, x1, y1, x2, y2, color, width = 2, dash = []) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function checkIcon(ctx, cx, cy, r, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = r * 0.24;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.42, cy + r * 0.02);
  ctx.lineTo(cx - r * 0.1, cy + r * 0.34);
  ctx.lineTo(cx + r * 0.44, cy - r * 0.3);
  ctx.stroke();
  ctx.restore();
}

function warningIcon(ctx, cx, cy, r, fill, stroke) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = fill;
  ctx.lineWidth = r * 0.2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.95);
  ctx.lineTo(cx + r * 1.0, cy + r * 0.8);
  ctx.lineTo(cx - r * 1.0, cy + r * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = stroke;
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.35);
  ctx.lineTo(cx, cy + r * 0.2);
  ctx.stroke();
  ctx.fillStyle = stroke;
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.52, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function toTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ---------------------------------------------------------------------------
// Documents (transparent background — the lit paper panel shows through)
// ---------------------------------------------------------------------------

/** Sales invoice, 720 × 960 (matches a 1.8 × 2.4 panel). */
function drawInvoice(p) {
  const W = 720;
  const H = 960;
  const pad = 56;
  const { canvas, ctx } = makeCanvas(W, H);

  text(ctx, 'INVOICE', pad, 100, { size: 44, weight: 700, color: p.navy });
  text(ctx, 'INV-2026-0412', W - pad, 80, { size: 22, weight: 600, color: p.text, align: 'right' });
  text(ctx, '28 Sep 2026', W - pad, 110, { size: 20, color: p.textSecondary, align: 'right' });
  line(ctx, pad, 140, W - pad, 140, p.navy, 3);

  // Supplier (chip 1 lifts from here) and TIN (chip 2)
  text(ctx, 'Ali Trading Sdn Bhd', pad, 180, { size: 25, weight: 600, color: p.text });
  bar(ctx, pad, 198, 250, 10, p.border);
  bar(ctx, pad, 218, 190, 10, p.border);
  text(ctx, 'TIN', pad, 288, { size: 20, weight: 600, color: p.textSecondary });
  text(ctx, 'C2088014502', pad + 52, 288, { size: 22, weight: 500, color: p.text });

  // Buyer
  text(ctx, 'Bill to', 420, 180, { size: 18, color: p.textSecondary });
  text(ctx, 'Teh Tarik Enterprise', 420, 208, { size: 21, weight: 600, color: p.text });
  bar(ctx, 420, 224, 200, 10, p.border);
  bar(ctx, 420, 244, 150, 10, p.border);

  // Line items
  ctx.fillStyle = p.surfaceMuted;
  roundRect(ctx, pad, 330, W - pad * 2, 44, 8);
  ctx.fill();
  text(ctx, 'Description', pad + 16, 359, { size: 18, weight: 600, color: p.textSecondary });
  text(ctx, 'Qty', 470, 359, { size: 18, weight: 600, color: p.textSecondary, align: 'right' });
  text(ctx, 'Amount', W - pad - 16, 359, { size: 18, weight: 600, color: p.textSecondary, align: 'right' });
  const rows = [
    [260, 30, 110],
    [200, 22, 96],
    [240, 30, 104],
    [170, 22, 90],
  ];
  rows.forEach(([desc, qty, amt], i) => {
    const y = 404 + i * 52;
    bar(ctx, pad + 16, y, desc, 12, p.border);
    bar(ctx, 470 - qty, y, qty, 12, p.border);
    bar(ctx, W - pad - 16 - amt, y, amt, 12, p.border);
    line(ctx, pad, y + 32, W - pad, y + 32, p.surfaceMuted, 2);
  });

  // Totals (chip 3 lifts from "Total")
  text(ctx, 'Subtotal', 400, 654, { size: 19, color: p.textSecondary });
  bar(ctx, W - pad - 120, 642, 120, 12, p.border);
  text(ctx, 'SST 8%', 400, 694, { size: 19, color: p.textSecondary });
  bar(ctx, W - pad - 90, 682, 90, 12, p.border);
  line(ctx, 380, 750, W - pad, 750, p.navy, 2);
  text(ctx, 'Total', 400, 822, { size: 24, weight: 700, color: p.text });
  text(ctx, 'RM 1,240.00', W - pad, 822, { size: 30, weight: 700, color: p.navy, align: 'right' });

  bar(ctx, pad, 870, 220, 10, p.border);
  return toTexture(canvas);
}

/** Thermal receipt, 420 × 880 (matches a 1.05 × 2.2 panel). */
function drawReceipt(p) {
  const W = 420;
  const pad = 36;
  const { canvas, ctx } = makeCanvas(W, 880);
  const dash = [10, 8];

  text(ctx, 'KEDAI RUNCIT MAJU', W / 2, 72, { size: 24, weight: 700, color: p.text, align: 'center' });
  bar(ctx, W / 2 - 110, 92, 220, 9, p.border);
  bar(ctx, W / 2 - 80, 110, 160, 9, p.border);
  line(ctx, pad, 150, W - pad, 150, p.textSecondary, 2, dash);

  [150, 120, 170, 100, 140].forEach((w, i) => {
    const y = 186 + i * 50;
    bar(ctx, pad, y, w, 11, p.border);
    bar(ctx, W - pad - 64, y, 64, 11, p.border);
  });

  line(ctx, pad, 460, W - pad, 460, p.textSecondary, 2, dash);
  text(ctx, 'TOTAL', pad, 510, { size: 24, weight: 700, color: p.text });
  text(ctx, 'RM 86.40', W - pad, 510, { size: 24, weight: 700, color: p.navy, align: 'right' });
  line(ctx, pad, 556, W - pad, 556, p.textSecondary, 2, dash);
  text(ctx, 'TERIMA KASIH', W / 2, 606, { size: 18, weight: 600, color: p.textSecondary, align: 'center' });

  // Barcode
  ctx.fillStyle = p.navy;
  let x = 80;
  [3, 6, 2, 4, 8, 2, 3, 5, 2, 7, 3, 2, 6, 4, 2, 3, 8, 2, 5, 3, 2, 6, 3, 4, 2].forEach((w, i) => {
    if (i % 2 === 0) ctx.fillRect(x, 660, w, 90);
    x += w + 4;
  });
  return toTexture(canvas);
}

// ---------------------------------------------------------------------------
// Field chips and result card
// ---------------------------------------------------------------------------

export const CHIP_SIZE = { w: 460, h: 120 };

/** Pill chip: pale fill, hue border, icon, dark same-hue label. */
function drawChip(p, label, state) {
  const { w, h } = CHIP_SIZE;
  const { canvas, ctx } = makeCanvas(w, h);
  const ok = state === 'ok';
  const hue = ok ? p.success : p.warning;

  ctx.fillStyle = ok ? p.successPale : p.warningPale;
  roundRect(ctx, 4, 4, w - 8, h - 8, (h - 8) / 2);
  ctx.fill();
  ctx.strokeStyle = hue;
  ctx.lineWidth = 4;
  ctx.stroke();

  if (ok) checkIcon(ctx, 64, 60, 30, hue, p.card);
  else warningIcon(ctx, 64, 62, 30, hue, p.card);

  text(ctx, label, 112, 74, { size: 38, weight: 600, color: ok ? p.successText : p.warningText });
  text(ctx, ok ? 'Verified' : 'Check', w - 40, 72, {
    size: 24,
    weight: 500,
    color: ok ? p.successText : p.warningText,
    align: 'right',
  });
  return toTexture(canvas);
}

/** Card face, 580 × 640 (matches a 1.45 × 1.6 panel); slots align with CARD_SLOTS in HeroScene. */
function drawCard(p) {
  const W = 580;
  const { canvas, ctx } = makeCanvas(W, 640);

  checkIcon(ctx, 62, 78, 24, p.teal, p.card);
  text(ctx, 'MyInvois-ready', 100, 90, { size: 34, weight: 600, color: p.navy });
  text(ctx, '3 of 3 fields verified', 100, 124, { size: 20, color: p.textSecondary });

  [208, 352, 496].forEach((cy) => {
    ctx.save();
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = p.border;
    ctx.lineWidth = 3;
    roundRect(ctx, W / 2 - CHIP_SIZE.w / 2, cy - CHIP_SIZE.h / 2, CHIP_SIZE.w, CHIP_SIZE.h, CHIP_SIZE.h / 2);
    ctx.stroke();
    ctx.restore();
  });

  text(ctx, 'Validated · Ready to submit', W / 2, 604, { size: 20, weight: 500, color: p.tealText, align: 'center' });
  return toTexture(canvas);
}

/** Soft vertical teal band for the scan beam. */
function drawBeam(p) {
  const { canvas, ctx } = makeCanvas(32, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.5, p.teal);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 256);
  ctx.globalAlpha = 1;
  ctx.fillStyle = p.teal;
  ctx.fillRect(0, 126, 32, 4);
  return toTexture(canvas);
}

export function createHeroTextures(palette) {
  return {
    invoice: drawInvoice(palette),
    receipt: drawReceipt(palette),
    card: drawCard(palette),
    beam: drawBeam(palette),
    supplierOk: drawChip(palette, 'Supplier', 'ok'),
    tinWarn: drawChip(palette, 'TIN', 'warn'),
    tinOk: drawChip(palette, 'TIN', 'ok'),
    totalOk: drawChip(palette, 'Total', 'ok'),
  };
}
