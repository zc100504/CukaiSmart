export default function Checkbox({ label, description, className = '', ...rest }) {
  return (
    <label className={`checkbox ${className}`}>
      <input type="checkbox" className="checkbox__input" {...rest} />
      <span className="checkbox__text">
        <span>{label}</span>
        {description && <span className="text-caption">{description}</span>}
      </span>
    </label>
  );
}
