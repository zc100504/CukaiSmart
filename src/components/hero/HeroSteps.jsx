import { useRef } from 'react';
import { BadgeCheck, ScanText, Upload, UserCheck } from 'lucide-react';
import { STAGES } from './timeline.js';

const ICONS = { upload: Upload, extract: ScanText, review: UserCheck, ready: BadgeCheck };

/**
 * Control dock at the bottom centre of the hero: the 4 loop steps.
 * interactive: icon buttons with tooltips; clicking jumps to a step and holds it (this also
 * stops the loop). Arrow keys move across the buttons.
 * Otherwise a static legend with visible labels (while the static fallback is showing).
 */
export default function HeroSteps({ stage, interactive, onSelect }) {
  const refs = useRef([]);

  if (!interactive) {
    return (
      <ol className="dock dock--legend" aria-label="How CukaiSmart works">
        {STAGES.map((s, i) => {
          const Icon = ICONS[s.key];
          return (
            <li key={s.key} className={`dock__legend ${i === stage ? 'is-active' : ''}`} aria-current={i === stage ? 'step' : undefined}>
              <Icon size={16} aria-hidden="true" />
              <span>{s.label}</span>
            </li>
          );
        })}
      </ol>
    );
  }

  const onKeyDown = (e, i) => {
    let next = null;
    if (e.key === 'ArrowRight') next = (i + 1) % STAGES.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + STAGES.length) % STAGES.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = STAGES.length - 1;
    if (next === null) return;
    e.preventDefault();
    refs.current[next]?.focus();
  };

  return (
    <div className="dock">
      <ol className="dock__steps" aria-label="How CukaiSmart works — choose a step to show it">
        {STAGES.map((s, i) => {
          const Icon = ICONS[s.key];
          const active = i === stage;
          return (
            <li key={s.key} className="dock__item">
              <button
                ref={(el) => (refs.current[i] = el)}
                type="button"
                className={`dock__btn ${active ? 'is-active' : ''}`}
                aria-label={s.label}
                aria-current={active ? 'step' : undefined}
                onClick={() => onSelect(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                <Icon size={18} aria-hidden="true" />
              </button>
              <span className="dock__tip" aria-hidden="true">
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
