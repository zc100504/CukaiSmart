import { useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileQuestion,
  FileText,
  Pencil,
  ScanSearch,
  Save,
} from 'lucide-react';
import { useApp, useDocument } from '../state/AppContext.jsx';
import { CLASSIFICATION_CODES, DOCUMENT_TYPES, EXPENSE_CATEGORIES, formatFieldValue } from '../data/mock-data.js';
import { formatDate, formatFileSize, formatRM } from '../data/format.js';
import { getDocRoute, getDocSummary, getLevel, getPendingFields } from '../data/selectors.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import DocumentPreview, { FIELD_REGIONS } from '../components/DocumentPreview.jsx';
import Input from '../components/Input.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Select from '../components/Select.jsx';
import { useToast } from '../components/Toast.jsx';
import '../styles/review.css';

const GROUPS = [
  { level: 'low', label: 'Low-confidence fields', note: 'Low confidence' },
  { level: 'medium', label: 'Worth a second look', note: 'Medium confidence' },
  { level: 'high', label: 'Read with confidence', note: 'High confidence' },
];

const SOURCE_AREAS = [
  { key: 'supplier', label: 'Supplier' },
  { key: 'meta', label: 'Invoice details' },
  { key: 'buyer', label: 'Buyer' },
  { key: 'buyerTin', label: 'Buyer TIN' },
  { key: 'classification', label: 'Classification' },
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'tax', label: 'Tax' },
  { key: 'total', label: 'Total' },
];

function sourceRegionFromClick(target) {
  const element = target.closest('.docp-region');
  if (!element) return null;
  if (element.closest('.docp__totals')) {
    const index = [...element.parentElement.children].indexOf(element);
    return ['subtotal', 'tax', 'total'][index] || null;
  }
  if (element.classList.contains('docp__class')) return 'classification';
  if (element.classList.contains('docp__meta')) return 'meta';
  if (element.closest('.docp__head')) return 'supplier';
  if (element.closest('.docp__bill')) return element.tagName === 'P' ? 'buyerTin' : 'buyer';
  return null;
}

function editValue(field, draft) {
  const value = draft.trim();
  if (field.format === 'money') {
    const amount = value.replace(/^RM\s*/i, '').replace(/,/g, '');
    if (amount && !/^\d+(?:\.\d{1,2})?$/.test(amount)) {
      return { error: 'Enter a valid amount with up to two decimal places.' };
    }
    return { value: amount === '' ? '' : Number(amount) };
  }
  if (field.format === 'date' && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: 'Enter a valid date.' };
  }
  if (field.key.toLowerCase().includes('tin') || field.key === 'supplierSst') {
    return { value: value.toUpperCase() };
  }
  return { value };
}

function ReviewWorkspace({ doc, client, updateField, confirmField, saveDraft, approveDocument, initialField }) {
  const navigate = useNavigate();
  const toast = useToast();
  const pending = getPendingFields(doc);
  const editable = doc.stage === 'review' || doc.stage === 'compliance';
  const [activeKey, setActiveKey] = useState(
    doc.fields.some((field) => field.key === initialField) ? initialField : pending[0]?.key || doc.fields[0]?.key
  );
  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState('');
  const [editError, setEditError] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);

  const summary = getDocSummary(doc);
  const selectedField = doc.fields.find((field) => field.key === activeKey);
  const selectedRegion = FIELD_REGIONS[activeKey];
  const highlights = selectedRegion
    ? { [selectedRegion]: selectedField?.confirmed ? 'ok' : getLevel(selectedField?.confidence ?? 100) === 'low' ? 'warn' : 'scan' }
    : {};
  const faded = doc.fields
    .filter((field) => /faded/i.test(field.reason || ''))
    .map((field) => FIELD_REGIONS[field.key])
    .filter(Boolean);

  const selectSourceArea = (region) => {
    const matches = doc.fields.filter((field) => FIELD_REGIONS[field.key] === region);
    if (!matches.length) return;
    const field = matches.find((item) => item.key === activeKey)
      || matches.find((item) => getLevel(item.confidence) === 'low' && !item.confirmed)
      || matches[0];
    setActiveKey(field.key);
    setShowOriginal(false);
  };

  const startEdit = (field) => {
    setActiveKey(field.key);
    setEditingKey(field.key);
    setDraft(field.value === '' || field.value == null ? '' : String(field.value));
    setEditError('');
  };

  const saveCorrection = (event, field) => {
    event.preventDefault();
    const parsed = editValue(field, draft);
    if (parsed.error) {
      setEditError(parsed.error);
      return;
    }
    const unchanged = String(parsed.value) === String(field.value);
    const result = unchanged
      ? field.confirmed ? { ok: true } : confirmField(doc.id, field.key)
      : updateField(doc.id, field.key, parsed.value);
    if (!result.ok) {
      toast.error('Could not save correction', result.message);
      return;
    }
    setEditingKey(null);
    setEditError('');
    if (!unchanged) toast.success('Correction saved', `${field.label} was updated in the audit trail.`);
  };

  const confirm = (field) => {
    const result = confirmField(doc.id, field.key);
    if (!result.ok) toast.error('Could not confirm field', result.message);
  };

  const saveProgress = () => {
    const result = saveDraft(doc.id);
    if (result.ok) toast.success('Review draft saved', 'Your confirmed fields and corrections are kept on this device.');
    else toast.error('Could not save draft', result.message);
  };

  const approve = () => {
    const result = approveDocument(doc.id);
    if (!result.ok) {
      toast.error('Could not approve document', result.message);
      return;
    }
    toast.success('Extracted data approved', 'Continue with the compliance checks.');
    navigate(`/app/documents/${doc.id}/compliance`);
  };

  return (
    <div className="page stack-lg review-page">
      <PageHeader
        title="Review extracted data"
        description="Compare the document with CukaiSmart’s extracted fields, then confirm anything uncertain."
        actions={<Badge status={doc.status} />}
      />

      <Card className="review-summary">
        <div className="review-summary__icon" aria-hidden="true"><FileText size={22} /></div>
        <div className="review-summary__identity">
          <span className="text-caption">{DOCUMENT_TYPES[doc.type]} · {client?.name || 'Unknown client'}</span>
          <strong>{summary.number}</strong>
          <span className="text-caption">{doc.fileName} · {formatFileSize(doc.fileSize)}</span>
        </div>
        <dl className="review-summary__facts">
          <div><dt>{doc.type === 'sales' ? 'Buyer' : 'Supplier'}</dt><dd>{summary.counterparty}</dd></div>
          <div><dt>Invoice date</dt><dd>{formatDate(summary.date)}</dd></div>
          <div><dt>Total</dt><dd>{formatRM(summary.total)}</dd></div>
        </dl>
      </Card>

      <div className="review-grid">
        <Card
          className="review-source"
          title="Source document"
          subtitle={doc.sampleImage ? 'Original sample or reconstructed preview' : 'Reconstructed preview from demo data'}
          actions={doc.sampleImage && (
            <Button size="sm" variant="ghost" onClick={() => setShowOriginal((value) => !value)}>
              {showOriginal ? 'Show highlights' : 'Original sample'}
            </Button>
          )}
        >
          <div
            className="review-source__frame"
            onClick={(event) => {
              if (showOriginal) return;
              const region = sourceRegionFromClick(event.target);
              if (region) selectSourceArea(region);
            }}
          >
            {showOriginal && doc.sampleImage ? (
              <img src={doc.sampleImage} alt={`Original ${doc.type === 'sales' ? 'sales invoice' : 'purchase receipt'} sample`} className="review-source__image" />
            ) : (
              <DocumentPreview doc={doc} highlights={highlights} faded={faded} />
            )}
          </div>
          <div className="review-source__areas" role="group" aria-label="Select an area of the source document">
            {SOURCE_AREAS.filter((area) => doc.fields.some((field) => FIELD_REGIONS[field.key] === area.key)).map((area) => (
              <button
                key={area.key}
                type="button"
                className="review-source__area"
                aria-pressed={selectedRegion === area.key}
                onClick={() => selectSourceArea(area.key)}
              >
                {area.label}
              </button>
            ))}
          </div>
          <div className="review-source__selection" aria-live="polite">
            <ScanSearch size={18} aria-hidden="true" />
            <span>
              <strong>{selectedField?.label || 'Select a field'}</strong>
              <span>{showOriginal ? 'Switch to highlights to locate this value.' : selectedRegion ? 'Matching source area highlighted above.' : 'This category is assigned during review, not printed on the document.'}</span>
            </span>
          </div>
        </Card>

        <Card className="review-fields" title="Extracted fields" subtitle={`${doc.fields.length} values read by CukaiSmart AI`}>
          <div className={`review-banner ${pending.length ? 'review-banner--attention' : 'review-banner--clear'}`} role="status">
            {pending.length ? <AlertTriangle size={20} aria-hidden="true" /> : <CheckCircle2 size={20} aria-hidden="true" />}
            <div>
              <strong>{pending.length ? `${pending.length} ${pending.length === 1 ? 'field needs' : 'fields need'} your review` : 'All low-confidence fields reviewed'}</strong>
              <p>{pending.length ? 'Confirm the AI value or save a correction before approval.' : doc.stage === 'review' ? 'The extracted data is ready for your approval.' : 'You can still inspect the source and correct values here.'}</p>
            </div>
          </div>

          <div className="review-fields__list">
            {GROUPS.map((group) => {
              const fields = doc.fields.filter((field) => getLevel(field.confidence) === group.level);
              if (fields.length === 0) return null;
              return (
                <section className="review-group" key={group.level} aria-label={group.label}>
                  <div className="review-group__heading">
                    <div><span className={`chip chip--${group.level}`}>{group.note}</span><h3>{group.label}</h3></div>
                    <span className="text-caption">{fields.length} {fields.length === 1 ? 'field' : 'fields'}</span>
                  </div>
                  <div className="review-group__rows">
                    {fields.map((field, index) => {
                      const needsReview = group.level === 'low' && !field.confirmed;
                      const editing = editingKey === field.key;
                      return (
                        <article
                          key={field.key}
                          id={`review-field-${field.key}`}
                          className={`review-field ${activeKey === field.key ? 'review-field--active' : ''} ${needsReview ? 'review-field--needs-review' : ''}`}
                          style={{ animationDelay: `${Math.min(index * 35, 210)}ms` }}
                        >
                          <button
                            type="button"
                            className="review-field__select"
                            aria-pressed={activeKey === field.key}
                            aria-label={`Show source for ${field.label}`}
                            onClick={() => setActiveKey(field.key)}
                          >
                            <span className="review-field__label">{field.label}<span className="review-field__group">{field.group}</span></span>
                            <span className="review-field__confidence">{field.confidence}% confidence</span>
                          </button>

                          {editing ? (
                            <form className="review-field__editor" onSubmit={(event) => saveCorrection(event, field)}>
                              {field.format === 'classification' || field.key === 'expenseCategory' ? (
                                <Select
                                  label={`Correct ${field.label}`}
                                  value={draft}
                                  onChange={(event) => { setDraft(event.target.value); setEditError(''); }}
                                  options={field.format === 'classification' ? [{ value: '', label: 'No code selected' }, ...CLASSIFICATION_CODES] : [{ value: '', label: 'No category selected' }, ...EXPENSE_CATEGORIES]}
                                  error={editError}
                                />
                              ) : (
                                <Input
                                  label={`Correct ${field.label}`}
                                  type={field.format === 'date' ? 'date' : 'text'}
                                  inputMode={field.format === 'money' ? 'decimal' : undefined}
                                  value={draft}
                                  onChange={(event) => { setDraft(event.target.value); setEditError(''); }}
                                  error={editError}
                                  autoFocus
                                />
                              )}
                              <div className="review-field__editor-actions">
                                <Button size="sm" variant="ghost" onClick={() => { setEditingKey(null); setEditError(''); }}>Cancel</Button>
                                <Button size="sm" type="submit" icon={Save}>Save correction</Button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="review-field__value-row">
                                <span className={`review-field__value ${field.value === '' ? 'review-field__value--empty' : ''}`}>
                                  {field.value === '' ? 'Not found' : formatFieldValue(field.format, field.value)}
                                </span>
                                {field.confirmed && <span className="review-field__confirmed"><Check size={14} aria-hidden="true" /> Confirmed</span>}
                              </div>
                              {needsReview && <p className="review-field__reason"><AlertTriangle size={15} aria-hidden="true" />{field.reason || 'The AI could not read this value confidently.'}</p>}
                              {editable && (
                                <div className="review-field__actions">
                                  {needsReview && <Button size="sm" variant="secondary" icon={Check} onClick={() => confirm(field)}>Confirm value</Button>}
                                  <Button size="sm" variant="ghost" icon={Pencil} disabled={Boolean(editingKey)} onClick={() => startEdit(field)}>Edit</Button>
                                </div>
                              )}
                            </>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="review-fields__footer">
            {doc.stage === 'review' ? (
              <>
                <Button variant="secondary" icon={Save} disabled={Boolean(editingKey)} onClick={saveProgress}>Save draft</Button>
                <Button iconRight={ArrowRight} disabled={pending.length > 0 || Boolean(editingKey)} onClick={approve}>Approve extracted data</Button>
              </>
            ) : (
              <Button
                to={getDocRoute(doc)}
                iconRight={ArrowRight}
                aria-disabled={Boolean(editingKey)}
                tabIndex={editingKey ? -1 : undefined}
                onClick={editingKey ? (event) => event.preventDefault() : undefined}
              >
                {doc.stage === 'compliance' ? 'Return to compliance' : 'Continue to current stage'}
              </Button>
            )}
          </div>
          {doc.stage === 'review' && pending.length > 0 && (
            <p className="review-fields__footer-note">Approval unlocks after every low-confidence field is confirmed or corrected.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function Review() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const found = useDocument(id);
  const { clients, updateField, confirmField, saveDraft, approveDocument } = useApp();

  if (!found) {
    return (
      <div className="page">
        <Card>
          <div className="empty-state">
            <span className="empty-state__icon" aria-hidden="true"><FileQuestion size={20} /></span>
            <p className="empty-state__title">Document not found</p>
            <p>No document with ID “{id}”. It may have been removed when the demo data was reset.</p>
            <Button to="/app/dashboard" variant="secondary" icon={ArrowLeft}>Back to dashboard</Button>
          </div>
        </Card>
      </div>
    );
  }

  const { doc } = found;
  if (doc.stage === 'processing') return <Navigate to={`/app/documents/${doc.id}/processing`} replace />;
  const client = clients.find((item) => item.id === doc.clientId);
  return (
    <ReviewWorkspace
      key={doc.id}
      doc={doc}
      client={client}
      updateField={updateField}
      confirmField={confirmField}
      saveDraft={saveDraft}
      approveDocument={approveDocument}
      initialField={searchParams.get('field')}
    />
  );
}
