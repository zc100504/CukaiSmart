/** variant: default (teal) | ai (navy→teal gradient) | success */
export default function ProgressBar({ value = 0, max = 100, label, showValue = true, variant = 'default', size, valueText }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const classes = ['progress', variant !== 'default' && `progress--${variant}`, size === 'sm' && 'progress--sm']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {(label || showValue) && (
        <div className="progress__meta">
          <span>{label}</span>
          {showValue && <span>{valueText || `${Math.round(pct)}%`}</span>}
        </div>
      )}
      <div
        className="progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText}
        aria-label={label || 'Progress'}
      >
        <div className="progress__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
