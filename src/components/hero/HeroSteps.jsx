import { useRef } from 'react';
import { BadgeCheck, Pause, Play, RotateCcw, ScanText, Upload, UserCheck } from 'lucide-react';
import { STAGES } from './timeline.js';

const ICONS = { upload: Upload, extract: ScanText, review: UserCheck, ready: BadgeCheck };

function DockButton({ label, icon: Icon, active, disabled, pressed, onClick, onKeyDown, buttonRef }) {
  return (
    <span className="dock__item">
      <button
        ref={buttonRef}
        type="button"
        className={`dock__btn ${active ? 'is-active' : ''}`}
        aria-label={label}
        aria-current={active ? 'step' : undefined}
        aria-pressed={pressed}
        aria-disabled={disabled || undefined}
        onClick={disabled ? undefined : onClick}
        onKeyDown={onKeyDown}
      >
        <Icon size={18} aria-hidden="true" />
      </button>
      <span className="dock__tip" aria-hidden="true">
        {label}
      </span>
    </span>
  );
}

/**
 * Control dock at the bottom centre of the hero.
 * interactive: icon buttons (4 steps | Pause/Play, Reset view) with tooltips; arrow keys move across them.
 * Otherwise a static legend with visible labels (while the static fallback is showing).
 */
export default function HeroSteps({ stage, interactive, paused, canReset, onSelect, onTogglePause, onReset }) {
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

  // Arrow keys move focus across the dock (Reset view stays focusable while unavailable).
  const onKeyDown = (e) => {
    const buttons = refs.current.filter(Boolean);
    const i = buttons.indexOf(e.currentTarget);
    let next = null;
    if (e.key === 'ArrowRight') next = (i + 1) % buttons.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + buttons.length) % buttons.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    if (next === null) return;
    e.preventDefault();
    buttons[next].focus();
  };

  return (
    <div className="dock" role="toolbar" aria-label="Hero animation controls">
      <ol className="dock__steps" aria-label="How CukaiSmart works">
        {STAGES.map((s, i) => (
          <li key={s.key}>
            <DockButton
              buttonRef={(el) => (refs.current[i] = el)}
              label={s.label}
              icon={ICONS[s.key]}
              active={i === stage}
              onClick={() => onSelect(i)}
              onKeyDown={onKeyDown}
            />
          </li>
        ))}
      </ol>
      <span className="dock__divider" aria-hidden="true" />
      <DockButton
        buttonRef={(el) => (refs.current[STAGES.length] = el)}
        label={paused ? 'Play animation' : 'Pause animation'}
        icon={paused ? Play : Pause}
        onClick={onTogglePause}
        onKeyDown={onKeyDown}
      />
      <DockButton
        buttonRef={(el) => (refs.current[STAGES.length + 1] = el)}
        label="Reset view"
        icon={RotateCcw}
        disabled={!canReset}
        onClick={onReset}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
