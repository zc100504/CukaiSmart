import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Plus, Search, SearchX, User } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { getClientStats } from '../data/selectors.js';
import { formatNumber } from '../data/format.js';
import { useToast } from '../components/Toast.jsx';
import AddClientModal from '../components/AddClientModal.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Input from '../components/Input.jsx';
import PageHeader from '../components/PageHeader.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

function ClientCard({ client, stats, active, onOpen }) {
  const stat = (label, value, note) => (
    <span className="client-card__stat">
      <span className="client-card__value">{value}</span>
      <span className="text-caption">{label}</span>
      {note}
    </span>
  );

  return (
    <button
      type="button"
      className={`client-card ${active ? 'client-card--active' : ''}`}
      onClick={() => onOpen(client)}
      aria-current={active ? 'true' : undefined}
    >
      <span className="client-card__head">
        <span className="client-card__icon" aria-hidden="true">
          <Building2 size={20} />
        </span>
        <span className="client-card__title">
          <span className="text-h3">{client.name}</span>
          <span className="text-caption">TIN {client.tin}</span>
        </span>
        {active && <span className="chip chip--ai">Active</span>}
      </span>
      {client.contact && (
        <span className="client-card__contact text-caption">
          <User size={14} aria-hidden="true" /> {client.contact}
        </span>
      )}
      <span className="client-card__stats">
        {stat('Docs', stats.total)}
        {stat(
          'Needs Attention',
          stats.needsAttention,
          stats.errors > 0 && (
            <span className="client-card__error">
              {stats.errors} {stats.errors === 1 ? 'error' : 'errors'}
            </span>
          )
        )}
        {stat('Processing', stats.processing)}
        {stat('Completed', stats.completed)}
      </span>
      <span className="client-card__foot">
        {active ? 'Open dashboard' : 'Switch and open dashboard'}
        <ArrowRight size={16} aria-hidden="true" />
      </span>
    </button>
  );
}

export default function Clients() {
  const { clients, documents, activeClientId, switchClient, usage } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.tin, c.contact, c.industry].some((s) => s && s.toLowerCase().includes(q))
    );
  }, [clients, query]);

  const openClient = (client) => {
    if (client.id !== activeClientId) {
      switchClient(client.id);
      toast.success('Client switched', `Now working on ${client.name}.`);
    }
    navigate('/app/dashboard');
  };

  return (
    <div className="page stack-lg">
      <PageHeader
        title="Clients"
        description={`${clients.length} ${clients.length === 1 ? 'client' : 'clients'} managed by your firm.`}
        actions={
          <Button icon={Plus} onClick={() => setAddOpen(true)}>
            Add Client
          </Button>
        }
      />

      <Card>
        <div className="usage-row">
          <div>
            <p className="text-h3">Pooled document usage</p>
            <p className="text-caption">Shared across all clients this billing period.</p>
          </div>
          <div className="usage-row__bar">
            <ProgressBar
              label="Documents used"
              value={usage.used}
              max={usage.limit}
              valueText={`${formatNumber(usage.used)} / ${formatNumber(usage.limit)} docs`}
            />
          </div>
        </div>
      </Card>

      <div className="clients-toolbar">
        <Input
          label="Search clients"
          hideLabel
          type="search"
          icon={Search}
          placeholder="Search by name, TIN or contact"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="clients-toolbar__search"
        />
        <p className="text-caption" aria-live="polite">
          {query ? `${visible.length} of ${clients.length} clients` : `${clients.length} clients`}
        </p>
      </div>

      {visible.length === 0 ? (
        <Card>
          <div className="empty-state">
            <span className="empty-state__icon" aria-hidden="true">
              <SearchX size={20} />
            </span>
            <p className="empty-state__title">No clients match “{query}”</p>
            <p>Check the spelling or search by TIN.</p>
            <Button variant="secondary" onClick={() => setQuery('')}>
              Clear search
            </Button>
          </div>
        </Card>
      ) : (
        <ul className="client-grid">
          {visible.map((c) => (
            <li key={c.id}>
              <ClientCard
                client={c}
                stats={getClientStats(documents, c.id)}
                active={c.id === activeClientId}
                onOpen={openClient}
              />
            </li>
          ))}
        </ul>
      )}

      <AddClientModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
