import { useId, useMemo } from 'react';
import { FINGERTIP, HAND_PATH, THUMB_PATH } from './handShapes.js';
import { COLS, CUBE, PITCH, buildInvoiceVoxels } from './voxelInvoice.js';

// Coordinates: 100 SVG units per scene unit, origin at the invoice centre (y down).
// The view box frames the invoice + checkmark; the hands are drawn outside it
// (overflow visible) and get cropped by the hero edges, like the 3D arms.
const UNIT = 100;
const VIEWBOX = '-170 -140 340 260';
const TIP_X = ((COLS * PITCH) / 2 + 0.2) * UNIT; // invoice half-width + fingertip gap
const TIP_Y = -12; // fingertips point at the upper-middle of the invoice
const HAND_ANGLE = 22; // degrees, matches the 3D hands
const HAND_SCALE = 1.3;
const ARM_LENGTH = 1600; // long forearm so it always leaves the frame at the lower corners

const FILL = {
  paper: 'var(--card)',
  paperShade: 'var(--surface-muted)',
  flap: 'var(--border)',
  ink: 'var(--navy)',
  review: 'var(--success)', // final state: the flagged row has been confirmed
  check: 'var(--success)',
};

/**
 * Static final state of the hero scene: hands as dot patterns reaching in from the lower
 * corners, the voxel invoice with its confirmed row, and the green checkmark.
 * Shown while the 3D scene loads, without WebGL, and below 1024px.
 */
export default function HeroFallback() {
  const id = useId().replace(/:/g, '');
  const cubes = useMemo(buildInvoiceVoxels, []);
  const size = CUBE * UNIT;

  // Rotate about the fingertip: AI hand tilts up to the right; human hand mirrors it.
  const handTransform = (side) =>
    side === 'left'
      ? `translate(${-TIP_X} ${TIP_Y}) rotate(${-HAND_ANGLE}) scale(${HAND_SCALE}) translate(${-FINGERTIP.x} ${-FINGERTIP.y})`
      : `translate(${TIP_X} ${TIP_Y}) rotate(${HAND_ANGLE}) scale(${-HAND_SCALE} ${HAND_SCALE}) translate(${-FINGERTIP.x} ${-FINGERTIP.y})`;

  const hand = (side, pattern) => (
    <g transform={handTransform(side)}>
      <path d={HAND_PATH} fill={`url(#${pattern})`} />
      <rect x={-ARM_LENGTH} y="96" width={ARM_LENGTH} height="64" fill={`url(#${pattern})`} />
      <path d={THUMB_PATH} fill={`url(#${pattern})`} opacity="0.7" />
    </g>
  );

  return (
    <div className="hero-fallback" aria-hidden="true">
      <svg viewBox={VIEWBOX} className="hero-fallback__svg" focusable="false">
        <defs>
          <pattern id={`${id}-navy`} width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="2.1" style={{ fill: 'var(--navy)' }} />
          </pattern>
          <pattern id={`${id}-teal`} width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="2.1" style={{ fill: 'var(--teal)' }} />
          </pattern>
        </defs>

        {hand('left', `${id}-navy`)}
        {hand('right', `${id}-teal`)}

        <ellipse cx="0" cy="104" rx="70" ry="7" style={{ fill: 'var(--navy)' }} opacity="0.08" />

        {cubes.map((c, i) => {
          const w = size * c.sx;
          const h = size * c.sy;
          return (
            <rect
              key={i}
              x={c.x * UNIT - w / 2}
              y={-c.y * UNIT - h / 2}
              width={w}
              height={h}
              rx="1"
              style={{
                fill: FILL[c.role],
                stroke: c.role.startsWith('paper') || c.role === 'flap' ? 'var(--border)' : 'none',
                strokeWidth: 0.6,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}
