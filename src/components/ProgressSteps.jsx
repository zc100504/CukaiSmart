import { Check } from 'lucide-react';

/** steps: array of labels; current: index of the active step (steps.length = all done) */
export default function ProgressSteps({ steps, current = 0 }) {
  return (
    <ol className="steps">
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'upcoming';
        return (
          <li
            key={label}
            className={`steps__item steps__item--${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="steps__marker">
              {state === 'done' ? <Check size={16} aria-hidden="true" /> : i + 1}
            </span>
            <span className="steps__label">
              {label}
              <span className="sr-only">
                {state === 'done' ? ' (completed)' : state === 'current' ? ' (in progress)' : ''}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
