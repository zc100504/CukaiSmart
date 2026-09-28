import { Link, NavLink, useLocation } from 'react-router-dom';
import Logo from './Logo.jsx';
import Button from './Button.jsx';

export const SECTION_LINKS = [
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'about', label: 'About' },
];

/** Section links go to "/#id"; the landing page scrolls to the section (smoothly unless reduced motion). */
export default function PublicNavbar({ sticky = false }) {
  const { pathname, hash } = useLocation();
  const onHome = pathname === '/';

  return (
    <header className={`navbar ${sticky ? 'navbar--sticky' : ''}`}>
      <Logo to="/" />
      <nav aria-label="Primary">
        <ul className="navbar__links">
          <li>
            <NavLink to="/" end className={() => `navbar__link ${onHome && !hash ? 'active' : ''}`}>
              Home
            </NavLink>
          </li>
          {SECTION_LINKS.map((l) => (
            <li key={l.id}>
              <Link
                to={{ pathname: '/', hash: `#${l.id}` }}
                className={`navbar__link ${onHome && hash === `#${l.id}` ? 'active' : ''}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <NavLink to="/login" className="navbar__link">
              Log In
            </NavLink>
          </li>
        </ul>
      </nav>
      <div className="navbar__actions">
        <Button to="/signup">Get Started</Button>
      </div>
    </header>
  );
}
