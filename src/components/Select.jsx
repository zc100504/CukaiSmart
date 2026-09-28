import { useId } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

/** options: array of strings or { value, label } */
export default function Select({
  label,
  helper,
  error,
  options = [],
  placeholder,
  required = false,
  id,
  className = '',
  ...rest
}) {
  const autoId = useId();
  const selectId = id || autoId;
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;
  const describedBy = [error && errorId, helper && helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      {label && (
        <label className="field__label" htmlFor={selectId}>
          {label}
          {required && <span className="field__required" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="field__control">
        <select
          id={selectId}
          className="select"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => {
            const o = typeof opt === 'string' ? { value: opt, label: opt } : opt;
            return (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            );
          })}
        </select>
        <ChevronDown size={18} className="field__chevron" aria-hidden="true" />
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
