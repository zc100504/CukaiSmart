import { Link } from 'react-router-dom';

// Brand logo (icon + "CukaiSmart" wordmark) from public/LOGO.png.
// The PNG has transparent padding around the artwork; .logo crops it in CSS.
const LOGO_SRC = '/LOGO.png';

/** size: 'md' (navbar, sidebar) | 'lg' (auth pages, style guide) */
export default function Logo({ to = '/', size = 'md' }) {
  const className = `logo ${size === 'lg' ? 'logo--lg' : ''}`;
  const img = <img src={LOGO_SRC} alt="CukaiSmart" className="logo__img" />;

  if (!to) return <span className={className}>{img}</span>;
  return (
    <Link to={to} className={className} aria-label="CukaiSmart home">
      {img}
    </Link>
  );
}
