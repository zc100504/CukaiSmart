import { NavLink } from 'react-router-dom';
import { FileText, LayoutDashboard, ListChecks, Settings, Upload, Users } from 'lucide-react';
import Logo from './Logo.jsx';

export const NAV_ITEMS = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/clients', label: 'Clients', icon: Users },
  { to: '/app/upload', label: 'Upload Document', icon: Upload },
  { to: '/app/review-queue', label: 'Review Queue', icon: ListChecks, countKey: 'review' },
  { to: '/app/records', label: 'Records', icon: FileText },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

/** fixed: position fixed to the viewport (app shell). Off for inline previews. */
export default function Sidebar({ fixed = true, counts = {}, footer = 'Prototype — sample data only' }) {
  return (
    <aside className={`sidebar ${fixed ? 'sidebar--fixed' : ''}`} aria-label="Main navigation">
      <div className="sidebar__brand">
        <Logo to={fixed ? '/app/dashboard' : null} />
      </div>
      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, countKey }) => (
          <NavLink key={to} to={to} className="sidebar__link">
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
            {countKey && counts[countKey] > 0 && (
              <span className="sidebar__count" aria-label={`${counts[countKey]} waiting`}>
                {counts[countKey]}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__footer">{footer}</div>
    </aside>
  );
}
