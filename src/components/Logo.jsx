import { Link } from 'react-router-dom';

function LogoMark({ size }) {
  return (
    <span className="logo__mark" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M6 12.5l4 4 8-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function Logo({ to = '/', size = 'md' }) {
  const content = (
    <>
      <LogoMark size={size === 'lg' ? 26 : 16} />
      <span className="logo__word">
        Cukai<span>Smart</span>
      </span>
    </>
  );
  const className = `logo ${size === 'lg' ? 'logo--lg' : ''}`;

  if (!to) return <span className={className}>{content}</span>;
  return (
    <Link to={to} className={className} aria-label="CukaiSmart home">
      {content}
    </Link>
  );
}
