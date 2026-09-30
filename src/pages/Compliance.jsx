import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, FileQuestion, Pencil } from 'lucide-react';
import { useApp, useDocument } from '../state/AppContext.jsx';
import { CLASSIFICATION_CODES, DOCUMENT_TYPES, EXPENSE_CATEGORIES, formatFieldValue } from '../data/mock-data.js';
import { getBlockers, getComplianceScore, getDocSummary, getDuplicateDocument, getValue } from '../data/selectors.js';
import { formatDate, formatRM } from '../data/format.js';
import AiActivityMark from '../components/AiActivityMark.jsx';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Input from '../components/Input.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Select from '../components/Select.jsx';
import { useToast } from '../components/Toast.jsx';
import '../styles/compliance.css';

const STEPS = ['Uploaded', 'AI Processed', 'Human Review', 'Compliance'];

function Guard({ title, message, to, action }) {
  return <div className="page compliance-page"><Card><div className="empty-state"><span className="empty-state__icon" aria-hidden="true"><FileQuestion size={20} /></span><p className="empty-state__title">{title}</p><p>{message}</p><Button to={to} iconRight={ArrowRight}>{action}</Button></div></Card></div>;
}

function ReadyRedirect({ id }) {
  const navigate = useNavigate();
  useEffect(() => {
    const timer = setTimeout(() => navigate(`/app/documents/${id}/finish`, { replace: true }), 3200);
    return () => clearTimeout(timer);
  }, [id, navigate]);
  return <div className="page compliance-page"><Card className="compliance-forward"><div className="compliance-forward__stage" role="status" aria-live="polite"><AiActivityMark light /><span className="chip chip--ai">CukaiSmart AI</span><span className="compliance-forward__eyebrow">Compliance complete</span><h1 className="text-h2">Preparing your final options</h1><p>All blocking checks passed. Setting up submission and export choices…</p><div className="compliance-forward__progress" aria-hidden="true"><span /></div></div></Card></div>;
}

function validateCorrection(field, draft) {
  const value = draft.trim();
  if (!value) return { error: `Enter ${field.label.toLowerCase()} before saving.` };
  if (field.format === 'money') {
    if (!/^\d+(?:\.\d{1,2})?$/.test(value) || !Number.isFinite(Number(value))) {
      return { error: 'Enter a non-negative amount with up to two decimal places.' };
    }
    return { value: Number(value) };
  }
  if (field.format === 'date') {
    const date = new Date(`${value}T00:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      return { error: 'Enter a valid invoice date.' };
    }
  }
  return { value: field.key.toLowerCase().includes('tin') || field.key === 'supplierSst' ? value.toUpperCase() : value };
}

function ComplianceWorkspace({ doc, checks, documents, client, updateField, clearDuplicate, markReady }) {
  const toast = useToast();
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [showDuplicateComparison, setShowDuplicateComparison] = useState(false);
  const actionLock = useRef(false);

  const summary = getDocSummary(doc);
  const duplicate = getDuplicateDocument(doc, documents);
  const blockers = getBlockers(doc, documents);
  const warnings = checks.filter((check) => check.status === 'warning');
  const passed = checks.filter((check) => check.status === 'pass');
  const score = getComplianceScore(checks);
  const readiness = blockers.length ? 'Action Required' : warnings.length ? 'Almost Ready' : 'Ready';
  const selectedCheck = checks.find((check) => check.id === editingId);
  const field = doc.fields.find((item) => item.key === selectedCheck?.fieldKey);

  const openEditor = (check) => {
    const affected = doc.fields.find((item) => item.key === check.fieldKey);
    if (!affected) return;
    setEditingId(check.id);
    setDraft(affected.value === '' || affected.value == null ? '' : String(affected.value));
    setError('');
  };

  const closeEditor = () => { if (!actionLock.current) { setEditingId(null); setError(''); } };

  const saveCorrection = (event) => {
    event.preventDefault();
    if (actionLock.current || !field) return;
    const parsed = validateCorrection(field, draft);
    if (parsed.error) { setError(parsed.error); toast.error('Check the correction', parsed.error); return; }
    if (String(parsed.value) === String(field.value)) { setError('Change the value before saving.'); return; }
    actionLock.current = true;
    const result = updateField(doc.id, field.key, parsed.value);
    if (!result.ok) {
      actionLock.current = false;
      setError(result.message);
      toast.error('Could not update field', result.message);
      return;
    }
    setEditingId(null);
    setError('');
    actionLock.current = false;
    toast.success(`${field.label} corrected`, 'Compliance checks have been recalculated.');
  };

  const handleReady = () => {
    if (actionLock.current || blockers.length) return;
    actionLock.current = true;
    const result = markReady(doc.id);
    if (!result.ok) { actionLock.current = false; toast.error('Could not mark ready', result.message); return; }
    toast.success('Document is ready', 'All blocking compliance checks passed.');
  };

  const handleClearDuplicate = () => {
    if (actionLock.current) return;
    actionLock.current = true;
    const result = clearDuplicate(doc.id);
    actionLock.current = false;
    if (!result.ok) { toast.error('Could not clear duplicate flag', result.message); return; }
    setShowDuplicateComparison(false);
    toast.success('Duplicate flag removed', 'The comparison was reviewed and recorded in the audit trail.');
  };

  return (
    <div className="page stack-lg compliance-page">
      <PageHeader title="Compliance Check" description="Confirm that the reviewed document meets the required e-Invoice or accounting checks." actions={<Badge status={doc.status} />} />
      <div className="compliance-context"><span>{summary.number}</span><span>{client?.name} · {summary.counterparty}</span><span>{DOCUMENT_TYPES[doc.type]}</span></div>
      <ol className="compliance-steps" aria-label="Document workflow">{STEPS.map((step, index) => <li key={step} className={index === 3 ? 'is-current' : 'is-done'}>{index < 3 ? <Check size={15} aria-hidden="true" /> : index + 1}<span>{step}</span></li>)}</ol>

      <Card className={`compliance-summary compliance-summary--${blockers.length ? 'blocked' : warnings.length ? 'warning' : 'ready'}`}>
        <div className="compliance-score" style={{ '--score-offset': 100 - score }} aria-label={`Readiness score ${score} out of 100`}>
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="compliance-score__track" cx="60" cy="60" r="50" pathLength="100" /><circle className="compliance-score__fill" cx="60" cy="60" r="50" pathLength="100" /></svg>
          <strong>{score}<small>/100</small></strong>
        </div>
        <div className="compliance-summary__main"><span className="text-caption">Readiness assessment</span><h2 className="text-h2">{readiness}</h2><p>{blockers.length ? `${blockers.length} blocking ${blockers.length === 1 ? 'issue must' : 'issues must'} be fixed before this document can be marked ready.` : warnings.length ? 'All required checks pass. Advisory warnings can remain.' : 'All compliance checks pass. This document can move to the final step.'}</p></div>
        <div className="compliance-summary__stats"><span><strong>{passed.length}</strong>Passed</span><span><strong>{warnings.length}</strong>Warnings</span><span><strong>{blockers.length}</strong>Blocking</span></div>
      </Card>

      <Card className="compliance-checklist" title="Compliance checklist" subtitle={`${checks.length} checks · blocking issues first`}>
        <div className="compliance-checklist__rows">
          {checks.map((check) => {
            const Icon = check.status === 'pass' ? CheckCircle2 : check.status === 'warning' ? AlertTriangle : AlertCircle;
            const canFix = check.status !== 'pass' && check.id !== 'duplicate' && check.fieldKey && doc.fields.some((item) => item.key === check.fieldKey);
            return <div className={`compliance-check compliance-check--${check.status}`} key={check.id}>
              <span className="compliance-check__icon" aria-hidden="true"><Icon size={20} /></span>
              <div className="compliance-check__body"><div className="compliance-check__heading"><strong>{check.label}</strong><span>{check.status === 'pass' ? 'Passed' : check.status === 'warning' ? 'Advisory' : 'Blocking issue'}</span></div><p>{check.message}</p>
                {check.id === 'duplicate' && duplicate && <div className="compliance-duplicate"><p><strong>Possible duplicate detected.</strong> Review recommended before submission.</p><div className="compliance-duplicate__actions"><Button size="sm" variant="secondary" aria-expanded={showDuplicateComparison} aria-controls="duplicate-comparison" onClick={() => setShowDuplicateComparison((value) => !value)}>{showDuplicateComparison ? 'Hide comparison' : 'Compare details'}</Button><Button size="sm" variant="secondary" icon={Check} onClick={handleClearDuplicate}>Remove duplicate</Button></div>{showDuplicateComparison && <div className="compliance-duplicate__compare" id="duplicate-comparison"><div className="compliance-duplicate__compare-head"><span>Field</span><strong>Current document</strong><strong>Existing record</strong></div>{[
                  ['Invoice number', summary.number, getDocSummary(duplicate).number],
                  ['Supplier', getValue(doc, 'supplierName') || '—', getValue(duplicate, 'supplierName') || '—'],
                  ['Invoice date', formatDate(summary.date), formatDate(getDocSummary(duplicate).date)],
                  ['Amount', formatRM(summary.total), formatRM(getDocSummary(duplicate).total)],
                ].map(([label, current, existing]) => <div className="compliance-duplicate__compare-row" key={label}><span>{label}</span><strong>{current}</strong><strong>{existing}</strong></div>)}</div>}</div>}
              </div>
              {canFix && <Button size="sm" variant="secondary" icon={Pencil} onClick={() => openEditor(check)}>Fix Issue</Button>}
            </div>;
          })}
        </div>
        <div className="compliance-checklist__footer"><Button to={`/app/documents/${doc.id}/review`} variant="secondary" icon={ArrowLeft}>Back to Review</Button><div>{blockers.length > 0 && <p className="text-caption">Resolve {blockers.length} blocking {blockers.length === 1 ? 'issue' : 'issues'} to continue.</p>}<Button onClick={handleReady} disabled={blockers.length > 0} iconRight={ArrowRight}>Mark Ready</Button></div></div>
      </Card>

      <Modal open={Boolean(selectedCheck && field)} onClose={closeEditor} title={`Fix ${field?.label || 'issue'}`} footer={<><Button variant="secondary" onClick={closeEditor}>Cancel</Button><Button type="submit" form="compliance-edit-form" disabled={actionLock.current}>Save correction</Button></>}>
        {selectedCheck && field && <form id="compliance-edit-form" className="stack" onSubmit={saveCorrection}>
          <div className="alert alert--warning"><AlertTriangle size={18} aria-hidden="true" /><span>{selectedCheck.message}</span></div>
          <p className="text-caption">Current value: {formatFieldValue(field.format, field.value)}</p>
          {field.format === 'classification' || field.key === 'expenseCategory' ? <Select label={field.label} value={draft} onChange={(event) => { setDraft(event.target.value); setError(''); }} options={field.format === 'classification' ? [{ value: '', label: 'Select classification' }, ...CLASSIFICATION_CODES] : [{ value: '', label: 'Select category' }, ...EXPENSE_CATEGORIES]} error={error} /> : <Input label={field.label} type={field.format === 'date' ? 'date' : field.format === 'money' ? 'number' : 'text'} step={field.format === 'money' ? '0.01' : undefined} min={field.format === 'money' ? '0' : undefined} value={draft} onChange={(event) => { setDraft(event.target.value); setError(''); }} error={error} autoFocus />}
        </form>}
      </Modal>
    </div>
  );
}

export default function Compliance() {
  const { id } = useParams();
  const found = useDocument(id);
  const { clients, documents, updateField, clearDuplicate, markReady } = useApp();
  if (!found) return <Guard title="Document not found" message="This document may have been removed when the demo data was reset." to="/app/dashboard" action="Back to Dashboard" />;
  const { doc, checks } = found;
  if (doc.stage === 'processing') return <Guard title="Processing is still underway" message="Complete AI processing before running compliance checks." to={`/app/documents/${id}/processing`} action="View Processing" />;
  if (doc.stage === 'review') return <Guard title="Human review comes first" message="Confirm or correct low-confidence fields and approve the extracted data." to={`/app/documents/${id}/review`} action="Open Review" />;
  if (doc.stage === 'finish') return <ReadyRedirect id={id} />;
  if (doc.stage === 'done') return <Guard title="This document is complete" message="Its completed record and audit events are available in Records." to={`/app/records?doc=${id}`} action="View in Records" />;
  const client = clients.find((item) => item.id === doc.clientId);
  return <ComplianceWorkspace key={id} doc={doc} checks={checks} documents={documents} client={client} updateField={updateField} clearDuplicate={clearDuplicate} markReady={markReady} />;
}
