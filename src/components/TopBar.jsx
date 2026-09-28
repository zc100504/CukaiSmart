import { Link, useNavigate } from 'react-router-dom';
import { Bell, Building2, Check, ChevronDown, LogOut, Palette, Settings, Users } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { formatDateTime, initials } from '../data/format.js';
import { getDocRoute } from '../data/selectors.js';
import { useToast } from './Toast.jsx';
import useDropdown from './useDropdown.js';

function NotificationsMenu() {
  const { notifications, unreadCount, markNotificationsRead, getDocument, activeClientId, switchClient } = useApp();
  const navigate = useNavigate();
  const dd = useDropdown();

  const openNotification = (n) => {
    markNotificationsRead([n.id]);
    dd.close();
    const doc = n.docId && getDocument(n.docId);
    if (!doc) return;
    if (doc.clientId !== activeClientId) switchClient(doc.clientId);
    navigate(getDocRoute(doc));
  };

  return (
    <div className="dropdown" ref={dd.rootRef}>
      <button
        type="button"
        className="icon-btn"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        {...dd.triggerProps}
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 && <span className="topbar__dot" aria-hidden="true" />}
      </button>
      {dd.open && (
        <div className="dropdown__menu notif-menu" {...dd.menuProps}>
          <div className="notif-menu__head">
            <p className="text-h3">Notifications</p>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => markNotificationsRead()}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="notif-menu__empty text-caption">You're all caught up.</p>
          ) : (
            <ul className="notif-menu__list">
              {notifications.slice(0, 8).map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`notif-item ${n.read ? '' : 'notif-item--unread'}`}
                    onClick={() => openNotification(n)}
                  >
                    <span className="notif-item__dot" aria-hidden="true" />
                    <span className="notif-item__body">
                      <span className="notif-item__title">
                        {n.title}
                        {!n.read && <span className="sr-only"> (unread)</span>}
                      </span>
                      <span className="text-caption">{n.message}</span>
                      <span className="text-caption-sm">{formatDateTime(n.at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ClientSwitcher() {
  const { clients, activeClient, switchClient } = useApp();
  const toast = useToast();
  const dd = useDropdown();

  const choose = (client) => {
    dd.close();
    if (client.id === activeClient.id) return;
    switchClient(client.id);
    toast.success('Client switched', `Now working on ${client.name}.`);
  };

  return (
    <div className="dropdown" ref={dd.rootRef}>
      <button type="button" className="client-switcher" {...dd.triggerProps}>
        <Building2 size={20} aria-hidden="true" className="client-switcher__icon" />
        <span className="client-switcher__text">
          <span className="text-caption-sm">Active client</span>
          <span className="client-switcher__name">{activeClient.name}</span>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {dd.open && (
        <div className="dropdown__menu client-menu" {...dd.menuProps}>
          <p className="dropdown__label">Switch client</p>
          <ul className="plain-list">
            {clients.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="dropdown__item"
                  aria-current={c.id === activeClient.id ? 'true' : undefined}
                  onClick={() => choose(c)}
                >
                  <span className="dropdown__item-main">
                    <span>{c.name}</span>
                    <span className="text-caption-sm">TIN {c.tin}</span>
                  </span>
                  {c.id === activeClient.id && <Check size={18} className="dropdown__check" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
          <div className="dropdown__divider" />
          <Link to="/app/clients" className="dropdown__item" onClick={dd.close}>
            <Users size={18} aria-hidden="true" />
            Manage clients
          </Link>
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const { user, business, logout } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const dd = useDropdown();

  const handleLogout = () => {
    dd.close();
    logout();
    navigate('/login');
    toast.info('Signed out', 'Your demo data is kept on this device.');
  };

  return (
    <div className="dropdown" ref={dd.rootRef}>
      <button type="button" className="profile-trigger" aria-label={`Account menu for ${user.name}`} {...dd.triggerProps}>
        <span className="avatar" aria-hidden="true">
          {initials(user.name)}
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {dd.open && (
        <div className="dropdown__menu" {...dd.menuProps}>
          <div className="profile-menu__head">
            <p className="text-label">{user.name}</p>
            <p className="text-caption">{user.role}</p>
            <p className="text-caption-sm">{business.name}</p>
          </div>
          <div className="dropdown__divider" />
          <Link to="/app/settings" className="dropdown__item" onClick={dd.close}>
            <Settings size={18} aria-hidden="true" />
            Settings
          </Link>
          <Link to="/style-guide" className="dropdown__item" onClick={dd.close}>
            <Palette size={18} aria-hidden="true" />
            UI style guide
          </Link>
          <div className="dropdown__divider" />
          <button type="button" className="dropdown__item" onClick={handleLogout}>
            <LogOut size={18} aria-hidden="true" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function TopBar() {
  const { business } = useApp();
  return (
    <header className="topbar">
      <div className="topbar__context">
        <p className="text-label">{business.name}</p>
        <p className="text-caption-sm">Accounting firm workspace</p>
      </div>
      <div className="topbar__actions">
        <NotificationsMenu />
        <ClientSwitcher />
        <ProfileMenu />
      </div>
    </header>
  );
}
