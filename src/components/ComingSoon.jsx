import { Hourglass } from 'lucide-react';

/** Friendly state for anything outside this phase / PoC scope. Never a silent button. */
export default function ComingSoon({ title = 'Coming in a later version', message, children }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        <Hourglass size={20} />
      </span>
      <p className="empty-state__title">{title}</p>
      {message && <p>{message}</p>}
      {children}
    </div>
  );
}
