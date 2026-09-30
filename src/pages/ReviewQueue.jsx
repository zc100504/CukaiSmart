import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, FileSearch, Search } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { DOCUMENT_TYPES } from '../data/mock-data.js';
import { formatDateTime } from '../data/format.js';
import { REVIEW_REASONS, getDocRoute, getDocSummary, getReviewQueueDetails } from '../data/selectors.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Input from '../components/Input.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Select from '../components/Select.jsx';
import Table from '../components/Table.jsx';
import '../styles/review-queue.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All queue statuses' },
  { value: 'error', label: 'Error' },
  { value: 'needs-review', label: 'Needs Review' },
];

const REASON_OPTIONS = [
  { value: '', label: 'All review reasons' },
  ...Object.entries(REVIEW_REASONS).map(([value, label]) => ({ value, label })),
];

const SORT_OPTIONS = [
  { value: 'urgency', label: 'Most urgent first' },
  { value: 'newest', label: 'Newest upload first' },
  { value: 'oldest', label: 'Oldest upload first' },
];

function Reason({ item }) {
  return (
    <span className="queue-reason">
      <span className={`queue-reason__label queue-reason__label--${item.reason}`}>{item.reasonLabel}</span>
      <span className="text-caption">{item.issue}</span>
    </span>
  );
}

export default function ReviewQueue() {
  const { activeClient, clientDocuments, reviewQueue } = useApp();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const reason = REVIEW_REASONS[params.get('reason')] ? params.get('reason') : '';
  const status = ['error', 'needs-review'].includes(params.get('status')) ? params.get('status') : '';
  const sort = ['urgency', 'newest', 'oldest'].includes(params.get('sort')) ? params.get('sort') : 'urgency';

  const update = (patch) => setParams((previous) => {
    const next = new URLSearchParams(previous);
    Object.entries(patch).forEach(([key, value]) => value && value !== 'urgency' ? next.set(key, value) : next.delete(key));
    return next;
  }, { replace: true });

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const next = getReviewQueueDetails(clientDocuments).filter((item) => {
      const summary = getDocSummary(item.doc);
      if (reason && item.reason !== reason) return false;
      if (status && item.doc.status !== status) return false;
      if (!q) return true;
      return [item.doc.id, item.doc.fileName, summary.number, summary.counterparty, activeClient.name]
        .some((value) => String(value || '').toLowerCase().includes(q));
    });
    if (sort === 'newest') return [...next].sort((a, b) => b.doc.uploadedAt.localeCompare(a.doc.uploadedAt));
    if (sort === 'oldest') return [...next].sort((a, b) => a.doc.uploadedAt.localeCompare(b.doc.uploadedAt));
    return next;
  }, [activeClient.name, clientDocuments, query, reason, sort, status]);

  const errorCount = reviewQueue.filter((doc) => doc.status === 'error').length;
  const reviewCount = reviewQueue.length - errorCount;
  const hasFilters = Boolean(query || reason || status || sort !== 'urgency');
  const clearFilters = () => setParams({}, { replace: true });

  const columns = [
    {
      key: 'document',
      header: 'Document',
      render: (item) => {
        const summary = getDocSummary(item.doc);
        return <span className="doc-cell"><strong>{summary.number}</strong><span className="text-caption">{item.doc.fileName} · {item.doc.id}</span></span>;
      },
    },
    { key: 'type', header: 'Type', render: (item) => <span className="doc-cell"><span>{DOCUMENT_TYPES[item.doc.type]}</span><span className="text-caption">{activeClient.name}</span></span> },
    { key: 'reason', header: 'Reason for review', render: (item) => <Reason item={item} /> },
    { key: 'status', header: 'Status', render: (item) => <Badge status={item.doc.status} /> },
    { key: 'received', header: 'Received', render: (item) => formatDateTime(item.doc.processedAt || item.doc.uploadedAt) },
    { key: 'action', header: <span className="sr-only">Action</span>, align: 'right', render: (item) => <Button size="sm" variant="secondary" to={getDocRoute(item.doc)} iconRight={ArrowRight}>Review document</Button> },
  ];

  return (
    <div className="page stack-lg review-queue-page">
      <PageHeader title="Review Queue" description={`Documents requiring staff attention for ${activeClient.name}.`} />

      <div className="review-queue-summary">
        <Card><span className="review-queue-summary__icon review-queue-summary__icon--total" aria-hidden="true"><ClipboardCheck size={20} /></span><span><strong>{reviewQueue.length}</strong><small>Require attention</small></span></Card>
        <Card><span className="review-queue-summary__icon review-queue-summary__icon--error" aria-hidden="true"><AlertTriangle size={20} /></span><span><strong>{errorCount}</strong><small>Blocking errors</small></span></Card>
        <Card><span className="review-queue-summary__icon review-queue-summary__icon--review" aria-hidden="true"><FileSearch size={20} /></span><span><strong>{reviewCount}</strong><small>Awaiting review</small></span></Card>
      </div>

      <Card className="review-queue-list" flush>
        <div className="review-queue-toolbar">
          <Input label="Search review queue" hideLabel type="search" icon={Search} placeholder="Search document, ID, client or file name" value={query} onChange={(event) => update({ q: event.target.value })} />
          <Select label="Review reason" hideLabel value={reason} options={REASON_OPTIONS} onChange={(event) => update({ reason: event.target.value })} />
          <Select label="Queue status" hideLabel value={status} options={STATUS_OPTIONS} onChange={(event) => update({ status: event.target.value })} />
          <Select label="Sort queue" hideLabel value={sort} options={SORT_OPTIONS} onChange={(event) => update({ sort: event.target.value })} />
          <div className="review-queue-toolbar__meta"><span className="text-caption" aria-live="polite">Showing {items.length} of {reviewQueue.length} unresolved documents</span>{hasFilters && <Button size="sm" variant="ghost" onClick={clearFilters}>Clear filters</Button>}</div>
        </div>

        {reviewQueue.length === 0 ? <div className="empty-state"><span className="empty-state__icon" aria-hidden="true"><CheckCircle2 size={20} /></span><p className="empty-state__title">Review queue is clear</p><p>There are no unresolved documents for {activeClient.name}.</p><Button to="/app/upload">Upload document</Button></div>
          : items.length === 0 ? <div className="empty-state"><span className="empty-state__icon" aria-hidden="true"><FileSearch size={20} /></span><p className="empty-state__title">No review items match</p><p>Try another search or clear the current filters.</p><Button variant="secondary" onClick={clearFilters}>Clear filters</Button></div>
            : <><div className="review-queue-table"><Table columns={columns} rows={items} caption={`Review queue for ${activeClient.name}`} /></div><ul className="review-queue-cards">{items.map((item) => { const summary = getDocSummary(item.doc); return <li key={item.doc.id}><Card><div className="review-queue-card__head"><span><strong>{summary.number}</strong><small>{item.doc.fileName} · {item.doc.id}</small></span><Badge status={item.doc.status} /></div><dl><div><dt>Type</dt><dd>{DOCUMENT_TYPES[item.doc.type]}</dd></div><div><dt>Client</dt><dd>{activeClient.name}</dd></div><div><dt>Received</dt><dd>{formatDateTime(item.doc.processedAt || item.doc.uploadedAt)}</dd></div></dl><Reason item={item} /><Button block to={getDocRoute(item.doc)} iconRight={ArrowRight}>Review document</Button></Card></li>; })}</ul></>}
      </Card>

      <p className="review-queue-flow text-caption">Problem detected → document enters Review Queue → staff reviews and corrects it → resolved documents leave automatically.</p>
    </div>
  );
}
