import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Download, FileQuestion, FileSearch, Info, Search } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { DOCUMENT_TYPES } from '../data/mock-data.js';
import { formatDate, formatDateTime, formatRM } from '../data/format.js';
import { DOCUMENT_TABS, SORT_KEYS, filterDocuments, getDocRoute, getDocSummary, getLastActivityMap, getValue, sortDocuments } from '../data/selectors.js';
import { downloadDocument } from '../data/export.js';
import AuditTrail from '../components/AuditTrail.jsx';
import Badge, { STATUSES } from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Input from '../components/Input.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Select from '../components/Select.jsx';
import Table from '../components/Table.jsx';
import Tabs, { TabPanel } from '../components/Tabs.jsx';
import { useToast } from '../components/Toast.jsx';
import '../styles/records.css';

const SORT_DEFAULTS = { document: 'asc', type: 'asc', uploaded: 'desc', lastEdited: 'desc', status: 'asc' };

export default function Records() {
  const { activeClient, clientDocuments, auditEvents, counts, getDocumentEvents } = useApp();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = DOCUMENT_TABS[params.get('tab')] ? params.get('tab') : 'all';
  const rawStatus = params.get('status') || '';
  const status = DOCUMENT_TABS[tab].includes(rawStatus) ? rawStatus : '';
  const type = ['sales', 'purchase'].includes(params.get('type')) ? params.get('type') : '';
  const query = params.get('q') || '';
  const sortKey = SORT_KEYS.includes(params.get('sort')) ? params.get('sort') : 'lastEdited';
  const sortDir = ['asc', 'desc'].includes(params.get('dir')) ? params.get('dir') : SORT_DEFAULTS[sortKey];
  const selectedId = params.get('doc');
  const selected = selectedId ? clientDocuments.find((doc) => doc.id === selectedId) : null;
  const detailTab = params.get('view') === 'details' ? 'details' : 'audit';
  const lastActivity = useMemo(() => getLastActivityMap(auditEvents), [auditEvents]);
  const filtered = useMemo(() => filterDocuments(clientDocuments, { tab, status, type, query }), [clientDocuments, tab, status, type, query]);
  const rows = useMemo(() => sortDocuments(filtered, { key: sortKey, dir: sortDir }, lastActivity), [filtered, sortKey, sortDir, lastActivity]);

  const update = (patch) => setParams((previous) => {
    const next = new URLSearchParams(previous);
    Object.entries(patch).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    return next;
  }, { replace: true });

  const changeTab = (next) => update({ tab: next === 'all' ? '' : next, status: DOCUMENT_TABS[next].includes(status) ? status : '' });
  const changeSort = (key) => {
    const dir = key === sortKey ? (sortDir === 'asc' ? 'desc' : 'asc') : SORT_DEFAULTS[key];
    update({ sort: key === 'lastEdited' ? '' : key, dir: dir === SORT_DEFAULTS[key] ? '' : dir });
  };
  const clearFilters = () => update({ tab: '', status: '', type: '', q: '' });
  const closeDetail = () => update({ doc: '', view: '' });
  const openDetail = (doc) => update({ doc: doc.id, view: 'details' });
  const reDownload = (doc, format) => {
    try { downloadDocument(doc, format); toast.success('Download started', `${getDocSummary(doc).number} ${format.toUpperCase()} is being saved.`); }
    catch (error) { toast.error('Download failed', error.message || 'Your browser could not save the file.'); }
  };

  const columns = [
    { key: 'document', header: 'Document', sortable: true, render: (doc) => <span className="doc-cell"><span className="text-label">{getDocSummary(doc).number}</span><span className="text-caption">{getDocSummary(doc).counterparty}</span></span> },
    { key: 'type', header: 'Type', sortable: true, render: (doc) => DOCUMENT_TYPES[doc.type] },
    { key: 'uploaded', header: 'Uploaded', sortable: true, render: (doc) => <span className="doc-cell"><span>{formatDateTime(doc.uploadedAt)}</span><span className="text-caption">by {doc.uploadedBy}</span></span> },
    { key: 'lastEdited', header: 'Last activity', sortable: true, render: (doc) => lastActivity[doc.id] ? <span className="doc-cell"><span>{formatDateTime(lastActivity[doc.id].at)}</span><span className="text-caption">by {lastActivity[doc.id].actor}</span></span> : '—' },
    { key: 'total', header: 'Total', align: 'right', render: (doc) => formatRM(getDocSummary(doc).total) },
    { key: 'status', header: 'Status', sortable: true, render: (doc) => <Badge status={doc.status} /> },
  ];

  const timeline = selected ? [
    ['Uploaded', selected.uploadedAt], ['AI processed', selected.processedAt], ['Human reviewed', selected.approvedAt],
    ['Marked ready', selected.readyAt], ['Submitted', selected.submittedAt], ['Exported', selected.exportedAt],
  ].filter(([, value]) => Boolean(value)) : [];

  return (
    <div className="page stack-lg records-page">
      <PageHeader title="Records & Audit Trail" description={`Search documents and inspect every recorded action for ${activeClient.name}.`} />
      <div className="records-stats"><Card><span>Total documents</span><strong>{counts.total}</strong></Card><Card><span>Completed</span><strong>{counts.completed}</strong></Card><Card><span>Pending</span><strong>{counts.pending}</strong></Card></div>
      {selectedId && !selected && <div className="alert alert--info" role="status"><Info size={18} aria-hidden="true" /><span>That record is not available for the active client. You can continue using the filters below.</span><Button size="sm" variant="ghost" onClick={closeDetail}>Dismiss</Button></div>}

      <Card className="records-list" flush>
        <div className="records-toolbar"><Tabs tabs={[{ value: 'all', label: 'All', count: counts.total }, { value: 'pending', label: 'Pending', count: counts.pending }, { value: 'completed', label: 'Completed', count: counts.completed }]} value={tab} onChange={changeTab} label="Filter records by progress" idPrefix="records" />
          <div className="records-toolbar__filters"><Input label="Search records" hideLabel type="search" icon={Search} placeholder="Number, company or filename" value={query} onChange={(event) => update({ q: event.target.value })} /><Select label="Status" hideLabel value={status} options={[{ value: '', label: 'All statuses' }, ...DOCUMENT_TABS[tab].map((item) => ({ value: item, label: STATUSES[item] }))]} onChange={(event) => update({ status: event.target.value })} /><Select label="Document type" hideLabel value={type} options={[{ value: '', label: 'All types' }, { value: 'sales', label: 'Sales e-Invoice' }, { value: 'purchase', label: 'Purchase' }]} onChange={(event) => update({ type: event.target.value })} /></div>
          <div className="records-toolbar__foot"><span className="text-caption" aria-live="polite">Showing {rows.length} of {counts.total} documents</span>{(tab !== 'all' || status || type || query) && <Button size="sm" variant="ghost" onClick={clearFilters}>Clear Filters</Button>}</div>
        </div>
        <TabPanel idPrefix="records" value={tab}>
          {clientDocuments.length === 0 ? <div className="empty-state"><span className="empty-state__icon" aria-hidden="true"><FileQuestion size={20} /></span><p className="empty-state__title">No records yet</p><p>Upload a document for {activeClient.name} to begin an audit history.</p><Button to="/app/upload">Upload Document</Button></div>
            : rows.length === 0 ? <div className="empty-state"><span className="empty-state__icon" aria-hidden="true"><FileSearch size={20} /></span><p className="empty-state__title">No records match</p><p>Try another search or clear the current filters.</p><Button variant="secondary" onClick={clearFilters}>Clear Filters</Button></div>
              : <Table columns={columns} rows={rows} caption={`Records for ${activeClient.name}`} sort={{ key: sortKey, dir: sortDir }} onSort={changeSort} onRowClick={openDetail} rowLabel={(doc) => `${getDocSummary(doc).number}, ${DOCUMENT_TYPES[doc.type]}, ${STATUSES[doc.status]}. Open record details.`} />}
        </TabPanel>
      </Card>

      <Modal open={Boolean(selected)} onClose={closeDetail} title={selected ? `Record ${getDocSummary(selected).number}` : 'Record details'} size="lg" footer={selected && <><Button variant="secondary" onClick={closeDetail}>Close</Button><Button to={getDocRoute(selected)} iconRight={ArrowRight}>Open document</Button></>}>
        {selected && <div className="records-detail"><div className="records-detail__head"><Badge status={selected.status} /><span className="text-caption">{DOCUMENT_TYPES[selected.type]} · {activeClient.name}</span></div>
          <Tabs tabs={[{ value: 'details', label: 'Details' }, { value: 'audit', label: 'Audit Trail' }]} value={detailTab} onChange={(value) => update({ view: value })} label="Record information" idPrefix="record-detail" />
          <TabPanel idPrefix="record-detail" value={detailTab} className="records-detail__panel">
            {detailTab === 'details' ? <div className="records-detail__content"><dl className="records-detail__facts"><div><dt>Document</dt><dd>{getDocSummary(selected).number}</dd></div><div><dt>Supplier</dt><dd>{getValue(selected, 'supplierName') || '—'}</dd></div><div><dt>Buyer</dt><dd>{getValue(selected, 'buyerName') || '—'}</dd></div><div><dt>Invoice date</dt><dd>{formatDate(getDocSummary(selected).date)}</dd></div><div><dt>Total</dt><dd>{formatRM(getDocSummary(selected).total)}</dd></div><div><dt>Destination</dt><dd>{selected.destination}</dd></div>{selected.submissionRef && <div><dt>Submission reference</dt><dd className="records-detail__reference">{selected.submissionRef}</dd></div>}</dl><div className="records-detail__dates"><h3 className="text-h3">Milestones</h3>{timeline.map(([label, at]) => <p key={label}><span>{label}</span><strong>{formatDateTime(at)}</strong></p>)}</div>{(['submitted', 'exported'].includes(selected.status) || getDocumentEvents(selected.id).some((event) => event.action === 'exported')) && <div className="records-detail__downloads"><h3 className="text-h3">Download a copy</h3>{selected.type === 'sales' && <Button size="sm" variant="secondary" icon={Download} onClick={() => reDownload(selected, 'json')}>Prototype JSON</Button>}<Button size="sm" variant="secondary" icon={Download} onClick={() => reDownload(selected, 'csv')}>CSV copy</Button></div>}</div> : <AuditTrail events={getDocumentEvents(selected.id)} />}
          </TabPanel>
        </div>}
      </Modal>
    </div>
  );
}
