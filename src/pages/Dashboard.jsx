import { Upload } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { STATUS_ORDER } from '../data/selectors.js';
import { formatNumber } from '../data/format.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import PagePlaceholder from '../components/PagePlaceholder.jsx';

export default function Dashboard() {
  const { activeClient, counts, usage } = useApp();
  const usagePct = ((usage.used / usage.limit) * 100).toFixed(1);

  return (
    <PagePlaceholder
      title="Dashboard"
      description={`Overview for ${activeClient.name}.`}
      actions={
        <Button to="/app/upload" icon={Upload}>
          Upload
        </Button>
      }
    >
      <div className="grid-3">
        <Card>
          <p className="stat__label">Completed</p>
          <p className="stat__value">{counts.completed}</p>
          <p className="stat__meta">Ready, submitted or exported</p>
        </Card>
        <Card>
          <p className="stat__label">Pending</p>
          <p className="stat__value">{counts.pending}</p>
          <p className="stat__meta">Processing, needs review or error</p>
        </Card>
        <Card>
          <p className="stat__label">Pooled usage</p>
          <p className="stat__value">{usagePct}%</p>
          <p className="stat__meta">
            {formatNumber(usage.used)} / {formatNumber(usage.limit)} documents
          </p>
        </Card>
      </div>
      <Card title="Documents by status" subtitle={`${counts.total} documents for this client`}>
        <div className="row">
          {STATUS_ORDER.map((s) => (
            <span key={s} className="row-sm">
              <Badge status={s} />
              <span className="text-label">{counts[s]}</span>
            </span>
          ))}
        </div>
      </Card>
    </PagePlaceholder>
  );
}
