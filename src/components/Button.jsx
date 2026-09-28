import { Link } from 'react-router-dom';

/**
 * variant: primary | secondary | ghost | danger
 * size: sm | md | lg
 * Pass `to` to render a router Link styled as a button.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  block = false,
  pill = false,
  to,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size !== 'md' && `btn--${size}`,
    block && 'btn--block',
    pill && 'btn--pill',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {Icon && <Icon size={size === 'sm' ? 16 : 18} aria-hidden="true" />}
      {children}
      {IconRight && <IconRight size={size === 'sm' ? 16 : 18} aria-hidden="true" />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...rest}>
      {content}
    </button>
  );
}
