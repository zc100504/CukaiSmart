import { useId } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';

/**
 * trailing: element shown inside the right edge of the input (e.g. a show/hide button).
 * labelAction: element shown at the right of the label row (e.g. "Forgot password?").
 * warning: non-blocking amber message (ignored while an error is shown).
 * hideLabel: keeps the label for screen readers only (e.g. search boxes).
 */
export default function Input({
  label,
  helper,
  error,
  warning,
  hideLabel = false,
  required = false,
  icon: Icon,
  trailing,
  labelAction,
  id,
  className = '',
  ...rest
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const warningId = `${inputId}-warning`;
  const showWarning = warning && !error;
  const describedBy =
    [error && errorId, showWarning && warningId, helper && helperId].filter(Boolean).join(' ') || undefined;
  const inputClasses = ['input', Icon && 'input--with-icon', trailing && 'input--with-trailing'].filter(Boolean).join(' ');
  const fieldState = error ? 'field--error' : showWarning ? 'field--warning' : '';

  const labelEl = label && (
    <label className={hideLabel ? 'sr-only' : 'field__label'} htmlFor={inputId}>
      {label}
      {required && <span className="field__required" aria-hidden="true">*</span>}
    </label>
  );

  return (
    <div className={`field ${fieldState} ${className}`}>
      {labelAction ? (
        <div className="field__label-row">
          {labelEl}
          {labelAction}
        </div>
      ) : (
        labelEl
      )}
      <div className="field__control">
        {Icon && <Icon size={18} className="field__icon" aria-hidden="true" />}
        <input
          id={inputId}
          className={inputClasses}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          {...rest}
        />
        {trailing && <span className="field__trailing">{trailing}</span>}
      </div>
      {error && (
        <p className="field__error" id={errorId}>
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </p>
      )}
      {showWarning && (
        <p className="field__warning" id={warningId}>
          <AlertTriangle size={14} aria-hidden="true" />
          {warning}
        </p>
      )}
      {helper && (
        <div className="field__helper" id={helperId}>
          {helper}
        </div>
      )}
    </div>
  );
}
