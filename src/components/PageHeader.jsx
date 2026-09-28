/** Page title row: title, optional description and right-aligned actions. */
export default function PageHeader({ title, description, actions, children }) {
  return (
    <div className="page-header">
      <div className="page-header__text">
        {children}
        <h1 className="text-h1">{title}</h1>
        {description && <p className="text-secondary">{description}</p>}
      </div>
      {actions && <div className="row-sm">{actions}</div>}
    </div>
  );
}
