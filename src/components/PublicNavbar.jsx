import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo.jsx';
import Button from './Button.jsx';

const SECTION_LINKS = [
  { to: '/#how-it-works', label: 'How It Works' },
  { to: '/#pricing', label: 'Pricing' },
  { to: '/#about', label: 'About' },
];

export default function PublicNavbar() {
  return (
    <header className="navbar">
      <Logo to="/" />
      <nav aria-label="Primary">
        <ul className="navbar__links">
          <li>
            <NavLink to="/" end className="navbar__link">
              Home
            </NavLink>
          </li>
          {SECTION_LINKS.map((l) => (
            <li key={l.label}>
              <Link to={l.to} className="navbar__link">
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
        <Button to="/login">Get Started</Button>
      </div>
    </header>
  );
}
