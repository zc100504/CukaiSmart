// Voxel invoice layout: a grid of paper cubes with a folded top-right corner, navy "text"
// rows, a small block-font "RM" total row, and a voxel checkmark above it.
// Shared by the 3D scene and the static fallback so both show the same invoice.

export const COLS = 11;
export const ROWS = 15;
export const PITCH = 0.1; // distance between cube centres (scene units)
export const CUBE = 0.092; // cube size (small gap between cubes)

/** Row that gets flagged amber, then confirmed green, during "You review". */
export const REVIEW_ROW = 8;

// Folded corner: these cells are cut away, and the flap cells sit forward in a darker grey.
const CUT = new Set(['9,0', '10,0', '10,1']);
const FLAP = new Set(['8,0', '9,1', '10,2', '9,2']);

/** Text rows: [row, firstCol, lastCol]. */
const INK_ROWS = [
  [1, 1, 4], // "INVOICE"
  [3, 1, 5], // supplier
  [4, 1, 3],
  [6, 1, 8], // line items
  [7, 1, 6],
  [REVIEW_ROW, 1, 7],
  [9, 1, 5],
  [11, 5, 9], // divider above total
  [13, 6, 9], // total amount
];

// 5 × 5 block glyphs for the "RM" label on the total row (half-pitch cubes).
const GLYPHS = {
  R: ['XXXX.', 'X...X', 'XXXX.', 'X..X.', 'X...X'],
  M: ['X...X', 'XX.XX', 'X.X.X', 'X...X', 'X...X'],
};

const CHECK = ['....X', '...X.', 'X.X..', '.X...'];

const cellX = (col) => (col - (COLS - 1) / 2) * PITCH;
const cellY = (row) => ((ROWS - 1) / 2 - row) * PITCH;

/**
 * Every cube with its target position (invoice-local), size and colour role.
 * role: 'paper' | 'paperShade' | 'flap' | 'ink' | 'review' | 'check'
 */
export function buildInvoiceVoxels() {
  const cubes = [];
  const add = (x, y, z, role, sx = 1, sy = 1, sz = 1, extra = {}) =>
    cubes.push({ x, y, z, role, sx, sy, sz, ...extra });

  // Paper
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const key = `${col},${row}`;
      if (CUT.has(key)) continue;
      if (FLAP.has(key)) {
        add(cellX(col), cellY(row), CUBE * 0.45, 'flap', 1, 1, 0.6, { row, col });
      } else {
        // A light checker of two paper tones reads as voxels without looking busy.
        add(cellX(col), cellY(row), 0, (row * 7 + col * 3) % 5 === 0 ? 'paperShade' : 'paper', 1, 1, 1, { row, col });
      }
    }
  }

  // Ink rows sit on the front face as thin tiles.
  INK_ROWS.forEach(([row, c0, c1]) => {
    for (let col = c0; col <= c1; col += 1) {
      add(cellX(col), cellY(row), CUBE * 0.62, row === REVIEW_ROW ? 'review' : 'ink', 0.86, 0.5, 0.3, { row, col });
    }
  });

  // "RM" in half-size cubes, left of the total amount.
  const half = PITCH / 2;
  let gx = cellX(1) - PITCH * 0.35;
  ['R', 'M'].forEach((ch) => {
    GLYPHS[ch].forEach((line, r) => {
      [...line].forEach((c, k) => {
        if (c === 'X') add(gx + k * half, cellY(12.9) - (r - 2) * half, CUBE * 0.62, 'ink', 0.45, 0.45, 0.3, { row: 13 });
      });
    });
    gx += 6 * half;
  });

  // Checkmark above the top edge (hidden until "MyInvois-ready").
  CHECK.forEach((line, r) => {
    [...line].forEach((c, k) => {
      if (c === 'X') add((k - 2) * PITCH * 1.1, cellY(0) + PITCH * (4.6 - r) * 1.1, CUBE * 0.5, 'check', 1.05, 1.05, 1.05);
    });
  });

  return cubes;
}

/** Grid description for the static fallback (SVG). */
export const FALLBACK_GRID = { COLS, ROWS, CUT, FLAP, INK_ROWS, REVIEW_ROW, CHECK };
