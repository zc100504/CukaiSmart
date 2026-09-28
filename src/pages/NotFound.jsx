import { FileQuestion } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import Button from '../components/Button.jsx';

export default function NotFound() {
  const { isLoggedIn } = useApp();
  return (
    <div className="auth-page">
      <div className="empty-state">
        <span className="empty-state__icon" aria-hidden="true">
          <FileQuestion size={20} />
        </span>
        <h1 className="empty-state__title">Page not found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <Button to={isLoggedIn ? '/app/dashboard' : '/'}>{isLoggedIn ? 'Go to dashboard' : 'Go to home'}</Button>
      </div>
    </div>
  );
}
