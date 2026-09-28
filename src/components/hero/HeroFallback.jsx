import { useEffect, useId, useState } from 'react';
import { loadHandImage } from './handImages.js';
import { FIELDS, FOLD, INVOICE_DATA, TEX_H, TEX_W } from './invoiceLayout.js';
import { REF_H, REF_W, handPlacement, referenceLayout } from './stage.js';

// Same 1440 × 900 reference frame as the 3D scene; "meet" scales it exactly like the stage.
const LAYOUT = referenceLayout();
/** Small screens: a tighter crop so the invoice stays the focus. */
const COMPACT_VIEWBOX = '380 420 680 440';
const SHADOW = { blur: 10, offsetY: 12, opacity: 0.18 };

/**
 * Static final state of the hero scene, matching the 3D composition: the real hand images
 * facing each other horizontally (AI left, human right), the paper invoice with its confirmed
 * TIN row, and the green check badge. The invoice appears instantly; the hands fade in once
 * loaded (or show a light-grey placeholder if an image is missing).
 * heroWidth / heroHeight: actual hero size, so the arms reach its edges (desktop only).
 */
export default function HeroFallback({ compact = false, heroWidth, heroHeight }) {
  const id = useId().replace(/:/g, '');
  const [hands, setHands] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadHandImage('ai'), loadHandImage('human')]).then(([ai, human]) => {
      if (!cancelled) setHands({ ai, human });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const { invoice, badgeRadius: r } = LAYOUT;
  const { w, h } = invoice;
  const f = (FOLD / TEX_W) * w;
  const tx = (x) => (x / TEX_W - 0.5) * w; // texture px → paper-local
  const ty = (y) => (y / TEX_H - 0.5) * h;

  const hand = (side) => {
    const data = hands?.[side];
    if (!data) return null;
    const P = handPlacement(side, data, heroWidth || REF_W, heroHeight || REF_H);
    const deg = (P.rotation * 180) / Math.PI;
    return (
      <image
        key={side}
        href={data.url}
        x={P.x}
        y={P.y}
        width={P.width}
        height={P.height}
        preserveAspectRatio="none"
        transform={deg ? `rotate(${deg} ${P.tip.x} ${P.tip.y})` : undefined}
        filter={`url(#${id}-hand-shadow)`}
        className="hero-fallback__hand"
      />
    );
  };

  const paperPath = `M${-w / 2},${-h / 2} L${w / 2 - f},${-h / 2} L${w / 2},${-h / 2 + f} L${w / 2},${h / 2} L${-w / 2},${h / 2} Z`;
  const [tinX0, tinY0, tinX1, tinY1] = FIELDS.tin;
  const badge = { x: w / 2 - r * 0.35, y: -h / 2 + r * 0.35 };

  return (
    <div className="hero-fallback" aria-hidden="true">
      <svg
        viewBox={compact ? COMPACT_VIEWBOX : `0 0 ${REF_W} ${REF_H}`}
        preserveAspectRatio={compact ? 'xMidYMid slice' : 'xMidYMid meet'}
        className="hero-fallback__svg"
        focusable="false"
      >
        <defs>
          {/* Soft navy shadow from each hand's alpha, offset slightly down */}
          <filter id={`${id}-hand-shadow`} x="-10%" y="-20%" width="120%" height="150%">
            <feGaussianBlur in="SourceAlpha" stdDeviation={SHADOW.blur} result="blur" />
            <feOffset in="blur" dy={SHADOW.offsetY} result="offset" />
            <feFlood style={{ floodColor: 'var(--navy)', floodOpacity: SHADOW.opacity }} result="tint" />
            <feComposite in="tint" in2="offset" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <clipPath id={`${id}-paper`}>
            <path d={paperPath} />
          </clipPath>
        </defs>

        {hand('ai')}
        {hand('human')}

        <g transform={`translate(${invoice.cx} ${invoice.cy})`}>
          <path d={paperPath} transform="translate(8 14)" style={{ fill: 'var(--navy)' }} opacity="0.16" filter={`url(#${id}-shadow)`} />
          <path d={paperPath} style={{ fill: 'var(--card)', stroke: 'var(--border)', strokeWidth: 1 }} />

          <g clipPath={`url(#${id}-paper)`}>
            <rect x={-w / 2} y={-h / 2} width={w} height={ty(140) + h / 2} style={{ fill: 'var(--navy)' }} />
            <rect x={-w / 2} y={ty(140)} width={w} height={(8 / TEX_H) * h} style={{ fill: 'var(--teal)' }} />
          </g>
          <text x={tx(72)} y={ty(94)} fontSize={(54 / TEX_W) * w} fontWeight="700" style={{ fill: 'var(--card)' }}>
            INVOICE
          </text>

          {/* Supplier, buyer and line items as text bars */}
          {[
            [72, 330, 300],
            [72, 372, 240],
            [540, 330, 330],
            [540, 372, 250],
            [72, 676, 520],
            [72, 748, 380],
            [72, 820, 440],
          ].map(([x, y, len]) => (
            <rect key={`${x}-${y}`} x={tx(x)} y={ty(y)} width={(len / TEX_W) * w} height={(14 / TEX_H) * h} rx="1.5" style={{ fill: 'var(--border)' }} />
          ))}

          {/* Confirmed TIN row */}
          <rect
            x={tx(tinX0)}
            y={ty(tinY0)}
            width={tx(tinX1) - tx(tinX0)}
            height={ty(tinY1) - ty(tinY0)}
            rx="3"
            style={{ fill: 'var(--success-pale)', stroke: 'var(--success)', strokeWidth: 1.2 }}
          />
          <circle cx={tx(tinX1 - 40)} cy={ty((tinY0 + tinY1) / 2)} r={(16 / TEX_H) * h} style={{ fill: 'var(--success)' }} />

          {/* Total */}
          <line x1={tx(530)} y1={ty(1004)} x2={tx(TEX_W - 72)} y2={ty(1004)} style={{ stroke: 'var(--navy)', strokeWidth: 1 }} />
          <text x={tx(TEX_W - 88)} y={ty(1074)} fontSize={(38 / TEX_W) * w} fontWeight="700" textAnchor="end" style={{ fill: 'var(--navy)' }}>
            {INVOICE_DATA.total}
          </text>

          {/* Folded corner */}
          <path d={`M${w / 2 - f},${-h / 2} L${w / 2},${-h / 2 + f} L${w / 2 - f},${-h / 2 + f} Z`} style={{ fill: 'var(--border)' }} />

          {/* MyInvois-ready badge */}
          <circle cx={badge.x} cy={badge.y} r={r} style={{ fill: 'var(--success)' }} />
          <path
            d={`M${badge.x - r * 0.45},${badge.y} L${badge.x - r * 0.12},${badge.y + r * 0.32} L${badge.x + r * 0.46},${badge.y - r * 0.32}`}
            style={{ fill: 'none', stroke: 'var(--card)', strokeWidth: r * 0.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}
          />
        </g>
      </svg>
    </div>
  );
}
