export const STATUSES = {
  processing: 'Processing',
  'needs-review': 'Needs Review',
  ready: 'Ready',
  error: 'Error',
  submitted: 'Submitted',
  exported: 'Exported',
};

/** status: processing | needs-review | ready | error | submitted | exported */
export default function Badge({ status, children }) {
  return (
    <span className={`badge badge--${status}`}>
      <span className="badge__dot" aria-hidden="true" />
      {children || STATUSES[status]}
    </span>
  );
}
