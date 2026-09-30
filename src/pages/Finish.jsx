import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Download, FileJson2, FileQuestion, FileSpreadsheet, Send, ShieldCheck } from 'lucide-react';
import { useApp, useDocument } from '../state/AppContext.jsx';
import { DOCUMENT_TYPES } from '../data/mock-data.js';
import { formatDate, formatDateTime, formatRM } from '../data/format.js';
import { getDocSummary, getValue } from '../data/selectors.js';
import { downloadDocument } from '../data/export.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Checkbox from '../components/Checkbox.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useToast } from '../components/Toast.jsx';
import AiActivityMark from '../components/AiActivityMark.jsx';
import '../styles/finish.css';

const STEPS = ['Uploaded', 'AI Processed', 'Reviewed', 'Compliance Ready'];

function Guard({ title, message, to, action }) {
  return <div className="page finish-page"><Card><div className="empty-state"><span className="empty-state__icon" aria-hidden="true"><FileQuestion size={20} /></span><p className="empty-state__title">{title}</p><p>{message}</p><Button to={to} iconRight={ArrowRight}>{action}</Button></div></Card></div>;
}

function FinishWorkspace({ doc, events, client, exportDocument, submitDocument }) {
  const toast = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const exportedFormats = useRef(new Set());
  const submissionRequested = useRef(false);
  const submitTimer = useRef(null);
  useEffect(() => () => clearTimeout(submitTimer.current), []);

  const summary = getDocSummary(doc);
  const sales = doc.type === 'sales';
  const completed = doc.status === 'submitted' || doc.status === 'exported';
  const ready = doc.status === 'ready';

  const hasExportEvent = (format) => events.some((event) => event.action === 'exported' && (
    format === 'json' ? event.message.includes('JSON') : event.message.includes('CSV')
  ));

  const download = (format) => {
    if (actionLock.current || busy) return;
    if (!ready && !completed) { toast.error('Document is not ready', 'Complete compliance checks first.'); return; }
    if (format === 'json' && !sales) { toast.error('Unsupported export', 'MyInvois prototype JSON is only for sales invoices.'); return; }
    if (!confirmed && !completed) { toast.error('Confirmation required', 'Confirm the reviewed information before downloading.'); return; }
    actionLock.current = true;
    setBusy(true);
    try {
      // A second download of the same format is a copy, not a new workflow event.
      if (!completed && !hasExportEvent(format) && !exportedFormats.current.has(format)) {
        const result = exportDocument(doc.id, format);
        if (!result.ok) { toast.error('Could not export', result.message); return; }
        exportedFormats.current.add(format);
      }
      downloadDocument(doc, format);
      toast.success('Download started', `${summary.number} ${format.toUpperCase()} is being saved.`);
    } catch (error) {
      toast.error('Download failed', error.message || 'Your browser could not save the file. Please try again.');
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  const beginSubmit = () => {
    if (actionLock.current || submissionRequested.current || !ready || !confirmed) return;
    actionLock.current = true;
    submissionRequested.current = true;
    setConfirmOpen(false);
    setSending(true);
    submitTimer.current = setTimeout(() => {
      const result = submitDocument(doc.id);
      setSending(false);
      actionLock.current = false;
      if (!result.ok) { submissionRequested.current = false; toast.error('Submission could not be completed', result.message); return; }
      toast.success('Submitted successfully (simulated)', 'Prototype only — no information was sent to LHDN.');
    }, 3400);
  };

  if (sending) return (
    <div className="page finish-page finish-page--sending">
      <PageHeader title="Preparing MyInvois submission" description="CukaiSmart is packaging the reviewed e-Invoice in this simulated portal workflow." />
      <Card className="finish-transit"><div className="finish-transit__stage" role="status" aria-live="polite"><AiActivityMark light /><span className="chip chip--ai">CukaiSmart AI</span><span className="finish-transit__eyebrow">MyInvois submission</span><h2 className="text-h2">Securely preparing your e-Invoice</h2><p>Validating the final payload and creating a simulated submission reference…</p><div className="finish-transit__progress" aria-hidden="true"><span /></div><small>MyInvois portal · sandbox simulation · no data sent to LHDN</small></div></Card>
    </div>
  );

  if (doc.status === 'submitted') return (
    <div className="page stack-lg finish-page finish-page--submitted">
      <PageHeader title="Submitted successfully" description="Your simulated MyInvois submission is complete." actions={<Badge status={doc.status} />} />
      <Card className="finish-receipt"><div className="finish-receipt__emblem"><CheckCircle2 size={34} aria-hidden="true" /></div><p className="text-caption">MyInvois portal · sandbox simulation</p><h2>{summary.number}</h2><p className="finish-receipt__lead">The reviewed sales e-Invoice is recorded as submitted in this prototype.</p><dl><div><dt>Submission reference</dt><dd><code>{doc.submissionRef || 'Reference unavailable'}</code></dd></div><div><dt>Submitted at</dt><dd>{doc.submittedAt ? formatDateTime(doc.submittedAt) : '—'}</dd></div><div><dt>Document total</dt><dd>{formatRM(summary.total)}</dd></div><div><dt>Destination</dt><dd>MyInvois sandbox — simulated</dd></div></dl><p className="finish-receipt__disclaimer">Prototype only — no information was sent to LHDN. Submitted records cannot be cancelled here; use the audit trail to inspect what happened.</p><div className="finish-receipt__actions"><Button to={`/app/records?doc=${doc.id}`} iconRight={ArrowRight}>View Record & Audit Trail</Button><Button variant="secondary" icon={Download} onClick={() => download('json')} disabled={busy}>Download prototype JSON</Button></div></Card>
    </div>
  );

  return (
    <div className="page stack-lg finish-page">
      <PageHeader title="Submit or Export" description="Review the final document summary and choose its destination." actions={<Badge status={doc.status} />} />
      <ol className="finish-steps" aria-label="Completed document workflow">{STEPS.map((step) => <li key={step}><Check size={15} aria-hidden="true" /><span>{step}</span></li>)}</ol>

      <Card className="finish-summary" title="Final document summary" subtitle={`${DOCUMENT_TYPES[doc.type]} · ${client?.name || 'Unknown client'}`} actions={<Badge status={doc.status} />}>
        <div className="finish-summary__hero"><div><span className="text-caption">Invoice / receipt number</span><strong>{summary.number}</strong><span className="text-caption">{summary.counterparty}</span></div><div><span className="text-caption">Total</span><strong>{formatRM(summary.total)}</strong></div></div>
        <dl className="finish-summary__facts"><div><dt>Supplier</dt><dd>{getValue(doc, 'supplierName') || '—'}</dd></div><div><dt>Buyer</dt><dd>{getValue(doc, 'buyerName') || '—'}</dd></div><div><dt>Invoice date</dt><dd>{formatDate(summary.date)}</dd></div><div><dt>Subtotal</dt><dd>{formatRM(getValue(doc, 'subtotal'))}</dd></div><div><dt>SST amount</dt><dd>{formatRM(getValue(doc, 'sstAmount'))}</dd></div><div><dt>Destination</dt><dd>{doc.destination}</dd></div></dl>
      </Card>

      {!completed && <div className="finish-destination"><span className="text-caption">Selected destination</span><strong>{sales ? 'MyInvois portal (sandbox simulation)' : 'Accounting records (CSV export)'}</strong><span>{sales ? 'A demonstration submission only. Nothing is transmitted to LHDN.' : 'Export a CSV for your accounting system; no MyInvois submission is offered for purchases.'}</span></div>}

      {completed && <Card className="finish-success"><div className="finish-success__icon"><CheckCircle2 size={28} aria-hidden="true" /></div><div><h2 className="text-h2">{sales ? 'Submitted successfully' : 'Exported successfully'}</h2><p>{sales ? 'MyInvois sandbox — simulated' : 'Accounting records (CSV export)'}</p><p className="finish-success__number">{summary.number}</p>{sales && doc.submissionRef && <p className="finish-success__reference">Reference: <code>{doc.submissionRef}</code></p>}<p className="text-caption">{formatDateTime(sales ? doc.submittedAt : doc.exportedAt)}</p>{sales && <p className="finish-success__note">Prototype only — no information was sent to LHDN.</p>}<Button to={`/app/records?doc=${doc.id}`} iconRight={ArrowRight}>View Record & Audit Trail</Button></div></Card>}

      {ready && <div className="finish-confirm"><Checkbox label="I confirm that the reviewed information is correct." checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={sending || busy} /><p className="text-caption">Required before submission or export.</p></div>}

      {sales ? (
        <div className="finish-actions">
          {!completed && <Card className="finish-action finish-action--primary"><span className="finish-action__icon"><ShieldCheck size={26} aria-hidden="true" /></span><span className="finish-action__eyebrow">Portal destination</span><h2 className="text-h2">Submit to MyInvois</h2><p>Simulated MyInvois Submission. CukaiSmart will prepare this reviewed sales e-Invoice and generate a prototype reference. No data is sent to LHDN.</p><Button iconRight={ArrowRight} disabled={!ready || !confirmed || busy || sending} onClick={() => setConfirmOpen(true)}>Submit to MyInvois (simulated)</Button></Card>}
          <Card className="finish-action"><span className="finish-action__icon"><FileJson2 size={26} aria-hidden="true" /></span><span className="finish-action__eyebrow">Download destination</span><h2 className="text-h2">Export a copy</h2><p>Save MyInvois-ready prototype JSON or a CSV copy of the reviewed values.</p><div className="finish-action__downloads"><Button variant="secondary" icon={Download} disabled={busy || sending || (!ready && !completed) || (!confirmed && !completed)} onClick={() => download('json')}>MyInvois JSON</Button><Button variant="secondary" icon={Download} disabled={busy || sending || (!ready && !completed) || (!confirmed && !completed)} onClick={() => download('csv')}>CSV copy</Button></div></Card>
        </div>
      ) : (
        <Card className="finish-action finish-action--purchase"><span className="finish-action__icon"><FileSpreadsheet size={26} aria-hidden="true" /></span><h2 className="text-h2">Export to Accounting CSV</h2><p>Prepare this purchase invoice or receipt for import into accounting software. No MyInvois submission is needed.</p><Button icon={Download} disabled={busy || sending || (!ready && !completed) || (!confirmed && !completed)} onClick={() => download('csv')}>{completed ? 'Download CSV again' : 'Export to Accounting CSV'}</Button></Card>
      )}

      {!completed && <Button className="finish-back" to={`/app/documents/${doc.id}/compliance`} variant="ghost" icon={ArrowLeft}>Back to Compliance</Button>}

      <Modal open={confirmOpen} onClose={() => { if (!sending) setConfirmOpen(false); }} title="Confirm simulated submission" footer={<><Button variant="secondary" disabled={sending} onClick={() => setConfirmOpen(false)}>Keep reviewing</Button><Button disabled={sending || !confirmed} icon={Send} onClick={beginSubmit}>{sending ? 'Sending…' : 'Submit (simulated)'}</Button></>}>
        <div className="stack"><div className="alert alert--info"><ShieldCheck size={18} aria-hidden="true" /><span>This is a prototype simulation. No information will be sent to LHDN.</span></div><p><strong>{summary.number}</strong> · {formatRM(summary.total)}</p><p className="text-caption">Destination: MyInvois portal (sandbox simulation)</p></div>
      </Modal>
    </div>
  );
}

export default function Finish() {
  const { id } = useParams();
  const found = useDocument(id);
  const { clients, exportDocument, submitDocument } = useApp();
  if (!found) return <Guard title="Document not found" message="This document may have been removed when demo data was reset." to="/app/dashboard" action="Back to Dashboard" />;
  const { doc, events } = found;
  if (doc.stage === 'processing') return <Guard title="Processing comes first" message="Finish AI processing before this document can be exported." to={`/app/documents/${id}/processing`} action="View Processing" />;
  if (doc.stage === 'review') return <Guard title="Human review comes first" message="Approve the extracted data before continuing." to={`/app/documents/${id}/review`} action="Open Review" />;
  if (doc.stage === 'compliance') return <Guard title="Compliance checks are not complete" message="Resolve blocking issues and mark this document ready." to={`/app/documents/${id}/compliance`} action="Open Compliance" />;
  const client = clients.find((item) => item.id === doc.clientId);
  return <FinishWorkspace key={id} doc={doc} events={events} client={client} exportDocument={exportDocument} submitDocument={submitDocument} />;
}
