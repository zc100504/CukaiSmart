import { useId, useMemo } from 'react';
import { FINGERTIP, HAND_PATH, THUMB_PATH } from './handShapes.js';
import { CUBE, buildInvoiceVoxels } from './voxelInvoice.js';

// SVG view box matches the panel's 1.1 : 1 aspect; ~100 px per scene unit, centred like the 3D camera.
const VIEW = { w: 460, h: 418 };
const UNIT = 100;
const CENTER = { x: VIEW.w / 2, y: 211 };
const HAND_SCALE = 0.58;
const TIP_GAP = 78; // px from centre, matches the 3D fingertip gap
const TIP_Y = 189;

const FILL = {
  paper: 'var(--card)',
  paperShade: 'var(--surface-muted)',
  flap: 'var(--border)',
  ink: 'var(--navy)',
  review: 'var(--success)', // final state: the flagged row has been confirmed
  check: 'var(--success)',
};

/**
 * Static final state of the hero scene: both hands as dot patterns, the voxel invoice
 * with its confirmed row, and the green checkmark. Shown while the 3D scene loads,
 * without WebGL, and below 1024px.
 */
export default function HeroFallback() {
  const id = useId().replace(/:/g, '');
  const cubes = useMemo(buildInvoiceVoxels, []);
  const size = CUBE * UNIT;

  const handTransform = (side) => {
    const tipX = CENTER.x + (side === 'left' ? -TIP_GAP : TIP_GAP);
    const dx = side === 'left' ? tipX - FINGERTIP.x * HAND_SCALE : tipX + FINGERTIP.x * HAND_SCALE;
    const sx = side === 'left' ? HAND_SCALE : -HAND_SCALE;
    return `translate(${dx} ${TIP_Y - FINGERTIP.y * HAND_SCALE}) scale(${sx} ${HAND_SCALE})`;
  };

  const hand = (side, pattern) => (
    <g transform={handTransform(side)}>
      <path d={HAND_PATH} fill={`url(#${pattern})`} />
      <path d={THUMB_PATH} fill={`url(#${pattern})`} opacity="0.7" />
    </g>
  );

  return (
    <div className="hero-fallback" aria-hidden="true">
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="hero-fallback__svg" focusable="false">
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

        <ellipse cx={CENTER.x} cy={CENTER.y + 108} rx="70" ry="7" style={{ fill: 'var(--navy)' }} opacity="0.08" />

        {cubes.map((c, i) => {
          const w = size * c.sx;
          const h = size * c.sy;
          return (
            <rect
              key={i}
              x={CENTER.x + c.x * UNIT - w / 2}
              y={CENTER.y - c.y * UNIT - h / 2}
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
