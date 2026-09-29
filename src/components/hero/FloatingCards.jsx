import { CheckCircle2, Sparkles } from 'lucide-react';

/** Depth of each card toward the viewer (px) inside the window's 3D space. */
export const CARD_DEPTH = { confidence: 110, audit: 120 };
/** Gentle float amplitude (px). */
const FLOAT = 4;

const RING_R = 16;
const RING_C = 2 * Math.PI * RING_R;

/**
 * Two small product cards that sit partly outside the window and appear in sync with the story:
 * "AI confidence" during extraction, and an audit note after the TIN is confirmed.
 * Rendered in a layer that shares the window's transform (so they follow its tilt and parallax),
 * stacked above the 3D objects. Decorative — the parent is aria-hidden.
 * clock: continuous story seconds (stops when the story rests, so the float stops too).
 */
export default function FloatingCards({ cards, clock, contentOpacity }) {
  const float = (phase) => Math.sin(clock * 1.1 + phase) * FLOAT;
  const pct = Math.round(96 * cards.confidence.ring);
  const fields = Math.round(7 * cards.confidence.ring);
  const conf = cards.confidence.opacity * contentOpacity;
  const audit = cards.audit.opacity;

  return (
    <>
      <div
        className="pw-card pw-card--confidence"
        style={{
          opacity: conf,
          visibility: conf > 0.01 ? 'visible' : 'hidden',
          transform: `translate3d(0, ${float(0)}px, ${CARD_DEPTH.confidence}px)`,
        }}
      >
        <svg className="pw-card__ring" width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r={RING_R} className="pw-card__ring-track" />
          <circle
            cx="22"
            cy="22"
            r={RING_R}
            className="pw-card__ring-fill"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - pct / 100)}
          />
        </svg>
        <span className="pw-card__text">
          <span className="pw-card__title">
            <Sparkles size={13} /> AI confidence <strong>{pct}%</strong>
          </span>
          <span className="pw-card__sub">{fields} fields extracted</span>
        </span>
      </div>

      <div
        className="pw-card pw-card--audit"
        style={{
          opacity: audit,
          visibility: audit > 0.01 ? 'visible' : 'hidden',
          transform: `translate3d(0, ${float(1.7)}px, ${CARD_DEPTH.audit}px)`,
        }}
      >
        <span className="pw-card__check">
          <CheckCircle2 size={18} />
        </span>
        <span className="pw-card__text">
          <span className="pw-card__title">Buyer TIN confirmed</span>
          <span className="pw-card__sub">by Aisyah · just now</span>
        </span>
      </div>
    </>
  );
}
