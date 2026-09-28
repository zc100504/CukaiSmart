import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import Logo from './Logo.jsx';
import Button from './Button.jsx';

export const SECTION_LINKS = [
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'about', label: 'About' },
];

/**
 * Public top bar: logo left, section links centred in a pill, Log In + Get Started right.
 * fixed: pinned to the viewport with a translucent blurred background (landing page);
 * the bottom border appears once the page is scrolled.
 * Section links go to "/#id"; the landing page scrolls to the section.
 */
export default function PublicNavbar({ fixed = false }) {
  const { pathname, hash } = useLocation();
  const onHome = pathname === '/';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!fixed) return undefined;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [fixed]);

  return (
    <header className={`navbar ${fixed ? 'navbar--fixed' : ''} ${fixed && scrolled ? 'is-scrolled' : ''}`}>
      <div className="navbar__brand">
        <Logo to="/" />
      </div>
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
        </ul>
      </nav>
      <div className="navbar__actions">
        <NavLink to="/login" className="navbar__link">
          Log In
        </NavLink>
        <Button to="/signup" pill>
          Get Started
        </Button>
      </div>
    </header>
  );
}
