// Invoice content and layout shared by the 3D paper texture (paperInvoice.js) and the static
// fallback. Kept free of three.js so the fallback doesn't pull the 3D bundle into the page.

/** Texture size — A4 proportions at high resolution. */
export const TEX_W = 1024;
export const TEX_H = 1448;
/** Folded top-right corner, in texture pixels (the paper shape is cut along this diagonal). */
export const FOLD = 150;
/** Page margin in texture pixels. */
export const MARGIN = 72;

export const INVOICE_DATA = {
  number: 'INV-2026-0418',
  date: '28 Sep 2026',
  supplier: { name: 'Ali Trading Sdn Bhd', address: '12, Jalan Perusahaan 3, Shah Alam' },
  buyer: { name: 'Seri Murni Catering Sdn Bhd', address: '19, Jalan 14/22, Petaling Jaya' },
  tin: 'C20880145020',
  items: [
    ['Accounting software setup', 1, '600.00', '600.00'],
    ['Monthly support', 2, '232.00', '464.00'],
    ['Staff training session', 1, '100.00', '100.00'],
  ],
  subtotal: '1,164.00',
  taxLabel: 'Service Tax (8%)',
  tax: '93.12',
  total: 'RM 1,257.12',
};

/**
 * Field areas in texture pixels [x0, y0, x1, y1], top to bottom.
 * The scan beam highlights each as it passes; "tin" is the row flagged during review.
 */
export const FIELDS = {
  meta: [MARGIN - 12, 180, TEX_W - MARGIN + 12, 236],
  supplier: [MARGIN - 12, 268, 512, 420],
  buyer: [528, 268, TEX_W - MARGIN + 12, 420],
  tin: [MARGIN - 12, 452, TEX_W - MARGIN + 12, 520],
  items: [MARGIN - 12, 640, TEX_W - MARGIN + 12, 866],
  total: [520, 1016, TEX_W - MARGIN + 12, 1096],
};
