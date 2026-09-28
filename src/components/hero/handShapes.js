// Simple pointing-hand silhouette (relaxed pose, index finger extended), drawn in a
// 400 × 240 box pointing RIGHT with the fingertip at FINGERTIP. Used as the placeholder
// when a hand image is missing, and by the static HTML fallback.

export const HAND_BOX = { w: 400, h: 240 };
export const FINGERTIP = { x: 392, y: 95 };

export const HAND_PATH = [
  'M0,96',
  'L150,90',
  'C175,88 195,80 215,78',
  'L250,76',
  'C265,74 280,78 290,80',
  'L370,82',
  'C385,83 392,88 392,95',
  'C392,102 385,106 372,106',
  'L292,108',
  'C285,109 282,112 282,118',
  'C290,120 292,130 284,136',
  'C292,140 290,152 280,156',
  'C286,162 282,172 270,174',
  'C258,178 240,176 228,170',
  'C215,168 200,160 180,155',
  'L150,150',
  'L0,160',
  'Z',
].join(' ');

/** Thumb lying over the curled fingers — drawn slightly darker for a bit of shape. */
export const THUMB_PATH = [
  'M232,110',
  'C250,104 270,108 279,116',
  'C283,122 277,129 266,127',
  'C252,125 240,121 232,119',
  'Z',
].join(' ');
