import { useRef } from 'react';
import { BadgeCheck, Pause, Play, ScanText, Upload, UserCheck } from 'lucide-react';
import { STAGES } from './timeline.js';

const ICONS = { upload: Upload, extract: ScanText, review: UserCheck, ready: BadgeCheck };

/**
 * Step indicator under the hero scene.
 * interactive: buttons that jump the animation + Pause/Play. Otherwise a static legend
 * (used while the static fallback is showing, where clicking could do nothing).
 */
export default function HeroSteps({ stage, interactive, paused, onSelect, onTogglePause }) {
  const refs = useRef([]);

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
    <div className="hero-steps">
      <ol className="hero-steps__list" aria-label="How CukaiSmart works">
        {STAGES.map((s, i) => {
          const Icon = ICONS[s.key];
          const active = i === stage;
          const content = (
            <>
              <span className="hero-steps__icon" aria-hidden="true">
                <Icon size={16} />
              </span>
              <span className="hero-steps__label">{s.label}</span>
            </>
          );
          return (
            <li key={s.key}>
              {interactive ? (
                <button
                  ref={(el) => (refs.current[i] = el)}
                  type="button"
                  className={`hero-steps__step ${active ? 'is-active' : ''}`}
                  aria-current={active ? 'step' : undefined}
                  onClick={() => onSelect(i)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                >
                  {content}
                </button>
              ) : (
                <span className={`hero-steps__step ${active ? 'is-active' : ''}`} aria-current={active ? 'step' : undefined}>
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {interactive && (
        <button
          type="button"
          className="icon-btn hero-steps__pause"
          onClick={onTogglePause}
          aria-label={paused ? 'Play animation' : 'Pause animation'}
        >
          {paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}
