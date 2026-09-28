import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileSearch, FileText, Plus, Search, Upload } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { DOCUMENT_TABS, SORT_KEYS, filterDocuments } from '../data/selectors.js';
import { formatNumber } from '../data/format.js';
import { STATUSES } from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import DocumentTable from '../components/DocumentTable.jsx';
import Input from '../components/Input.jsx';
import PageHeader from '../components/PageHeader.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import Select from '../components/Select.jsx';
import Tabs, { TabPanel } from '../components/Tabs.jsx';

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'sales', label: 'Sales e-Invoice' },
  { value: 'purchase', label: 'Purchase' },
];

// Dates default to newest first; text columns to A–Z.
const DEFAULT_DIR = { document: 'asc', type: 'asc', status: 'asc', uploaded: 'desc', lastEdited: 'desc' };

/** Filters and sort live in the URL so "back" from a document restores the same view. */
function useDashboardParams() {
  const [params, setParams] = useSearchParams();
  const tab = DOCUMENT_TABS[params.get('tab')] ? params.get('tab') : 'all';
  const rawStatus = params.get('status') || '';
  const status = DOCUMENT_TABS[tab].includes(rawStatus) ? rawStatus : '';
  const type = ['sales', 'purchase'].includes(params.get('type')) ? params.get('type') : '';
  const query = params.get('q') || '';
  const sortKey = SORT_KEYS.includes(params.get('sort')) ? params.get('sort') : 'lastEdited';
  const sortDir = ['asc', 'desc'].includes(params.get('dir')) ? params.get('dir') : DEFAULT_DIR[sortKey];

  const update = (patch) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
        return next;
      },
      { replace: true }
    );

  return { tab, status, type, query, sortKey, sortDir, update };
}

export default function Dashboard() {
  const { activeClient, clientDocuments, counts, usage } = useApp();
  const { tab, status, type, query, sortKey, sortDir, update } = useDashboardParams();
  const sort = useMemo(() => ({ key: sortKey, dir: sortDir }), [sortKey, sortDir]);

  const filtered = useMemo(
    () => filterDocuments(clientDocuments, { tab, status, type, query }),
    [clientDocuments, tab, status, type, query]
  );

  const hasFilters = tab !== 'all' || Boolean(status || type || query);
  const usagePct = (usage.used / usage.limit) * 100;

  const tabs = [
    { value: 'all', label: 'All', count: counts.total },
    { value: 'pending', label: 'Pending', count: counts.pending },
    { value: 'completed', label: 'Completed', count: counts.completed },
  ];

  const statusOptions = [
    { value: '', label: 'All statuses' },
    ...DOCUMENT_TABS[tab].map((s) => ({ value: s, label: STATUSES[s] })),
  ];

  const changeTab = (next) =>
    update({ tab: next === 'all' ? '' : next, status: DOCUMENT_TABS[next].includes(status) ? status : '' });

  const changeSort = (key) => {
    const dir = key === sortKey ? (sortDir === 'asc' ? 'desc' : 'asc') : DEFAULT_DIR[key];
    update({ sort: key === 'lastEdited' ? '' : key, dir: dir === DEFAULT_DIR[key] ? '' : dir });
  };

  const clearFilters = () => update({ tab: '', status: '', type: '', q: '' });

  let body;
  if (clientDocuments.length === 0) {
    body = (
      <div className="empty-state">
        <span className="empty-state__icon" aria-hidden="true">
          <FileText size={20} />
        </span>
        <p className="empty-state__title">No documents yet</p>
        <p>Upload a sales invoice or purchase receipt for {activeClient.name} to get started.</p>
        <Button to="/app/upload" icon={Upload}>
          Upload document
        </Button>
      </div>
    );
  } else if (filtered.length === 0) {
    body = (
      <div className="empty-state">
        <span className="empty-state__icon" aria-hidden="true">
          <FileSearch size={20} />
        </span>
        <p className="empty-state__title">No documents match</p>
        <p>Try a different search, or clear the filters to see all {counts.total} documents.</p>
        <Button variant="secondary" onClick={clearFilters}>
          Clear filters
        </Button>
      </div>
    );
  } else {
    body = <DocumentTable documents={filtered} sort={sort} onSort={changeSort} caption={`Documents for ${activeClient.name}`} />;
  }

  return (
    <div className="page stack-lg">
      <PageHeader
        title="Dashboard"
        description={`e-Invoicing overview for ${activeClient.name}.`}
        actions={
          <Button to="/app/upload" icon={Plus}>
            Upload
          </Button>
        }
      />

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
          <p className="stat__value">{usagePct.toFixed(1)}%</p>
          <ProgressBar
            size="sm"
            value={usage.used}
            max={usage.limit}
            label="Pooled usage"
            showValue={false}
          />
          <p className="stat__meta">
            {formatNumber(usage.used)} / {formatNumber(usage.limit)} documents across all clients
          </p>
        </Card>
      </div>

      <Card flush>
        <div className="doc-toolbar">
          <Tabs tabs={tabs} value={tab} onChange={changeTab} label="Filter documents by progress" idPrefix="dash" />
          <div className="doc-toolbar__filters">
            <Input
              label="Search documents"
              hideLabel
              icon={Search}
              type="search"
              placeholder="Search by number, company or file name"
              value={query}
              onChange={(e) => update({ q: e.target.value })}
              className="doc-toolbar__search"
            />
            <Select
              label="Status"
              hideLabel
              value={status}
              options={statusOptions}
              onChange={(e) => update({ status: e.target.value })}
            />
            <Select
              label="Document type"
              hideLabel
              value={type}
              options={TYPE_OPTIONS}
              onChange={(e) => update({ type: e.target.value })}
            />
          </div>
          <p className="text-caption" aria-live="polite">
            {hasFilters
              ? `Showing ${filtered.length} of ${counts.total} documents`
              : `${counts.total} documents`}
          </p>
        </div>
        <TabPanel idPrefix="dash" value={tab}>
          {body}
        </TabPanel>
      </Card>
    </div>
  );
}
