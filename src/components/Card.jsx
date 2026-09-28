export default function Card({
  title,
  subtitle,
  actions,
  footer,
  flush = false,
  variant,
  as: Tag = 'section',
  className = '',
  children,
  ...rest
}) {
  const classes = ['card', flush && 'card--flush', variant && `card--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} {...rest}>
      {(title || actions) && (
        <div className="card__header">
          <div>
            {title && <h3 className="card__title">{title}</h3>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="row-sm">{actions}</div>}
        </div>
      )}
      {children ? <div className="card__body">{children}</div> : <div className="card__spacer" />}
      {footer && <div className="card__footer">{footer}</div>}
    </Tag>
  );
}
