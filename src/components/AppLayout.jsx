import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../state/AppContext.jsx';
import { formatNumber } from '../data/format.js';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import ProgressBar from './ProgressBar.jsx';

/** Signed-in shell: fixed sidebar, top bar, page outlet, prototype footer. */
export default function AppLayout() {
  const { isLoggedIn, reviewQueue, usage } = useApp();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const usageFooter = (
    <ProgressBar
      size="sm"
      label="Pooled usage"
      value={usage.used}
      max={usage.limit}
      valueText={`${formatNumber(usage.used)} / ${formatNumber(usage.limit)}`}
    />
  );

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Sidebar counts={{ review: reviewQueue.length }} footer={usageFooter} />
      <div className="app-shell__main">
        <TopBar />
        <main id="main-content" className="app-shell__content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="prototype-footer">Prototype — sample data only</footer>
      </div>
    </div>
  );
}
