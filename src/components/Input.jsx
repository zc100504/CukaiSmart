import { useId } from 'react';
import { AlertCircle } from 'lucide-react';

export default function Input({
  label,
  helper,
  error,
  required = false,
  icon: Icon,
  id,
  className = '',
  ...rest
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const describedBy = [error && errorId, helper && helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      {label && (
        <label className="field__label" htmlFor={inputId}>
          {label}
          {required && <span className="field__required" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="field__control">
        {Icon && <Icon size={18} className="field__icon" aria-hidden="true" />}
        <input
          id={inputId}
          className={`input ${Icon ? 'input--with-icon' : ''}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        />
      </div>
      {error && (
        <p className="field__error" id={errorId}>
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </p>
      )}
      {helper && (
        <p className="field__helper" id={helperId}>
          {helper}
        </p>
      )}
    </div>
  );
}
