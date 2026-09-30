import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  FileImage,
  FileText,
  Info,
  Receipt,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { SAMPLE_DOCUMENTS, getSampleClient } from '../data/mock-data.js';
import { formatFileSize } from '../data/format.js';
import { useToast } from '../components/Toast.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import FileDropzone from '../components/FileDropzone.jsx';
import PageHeader from '../components/PageHeader.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import Select from '../components/Select.jsx';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const EXT_PATTERN = /\.(pdf|jpe?g|png)$/i;

const DOC_TYPES = [
  {
    value: 'sales',
    label: 'Sales Invoice',
    description: 'Prepares MyInvois-ready e-Invoice data from invoices you issued.',
    icon: FileText,
  },
  {
    value: 'purchase',
    label: 'Purchase Invoice / Receipt',
    description: 'Records supplier invoices and receipts into your accounting records.',
    icon: Receipt,
  },
];
const TYPE_SHORT = { sales: 'Sales', purchase: 'Purchase' };

const fileKind = (name) => (/\.pdf$/i.test(name) ? 'PDF' : /\.png$/i.test(name) ? 'PNG' : 'JPG');

let queueId = 0;

export default function Upload() {
  const { clients, activeClientId, usage, uploadDocument, switchClient } = useApp();
  const toast = useToast();
  const navigate = useNavigate();

  const [clientId, setClientId] = useState(activeClientId);
  const [type, setType] = useState('sales');
  const [queue, setQueue] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [notice, setNotice] = useState('');
  const timers = useRef({});

  // Stop every simulated upload when leaving the page.
  useEffect(() => () => Object.values(timers.current).forEach(clearInterval), []);

  const client = clients.find((c) => c.id === clientId) || clients[0];
  const salesSampleQueued = queue.some((q) => q.sample && q.type === 'sales');
  const sampleClient = getSampleClient(clients);
  const uploaded = queue.filter((q) => q.status === 'uploaded');
  const stillUploading = queue.length - uploaded.length;
  const remaining = usage.limit - usage.used;

  // ---------------------------------------------------------------------------
  // Simulated upload progress (≈ 0.9–2.5 s depending on size)
  // ---------------------------------------------------------------------------
  const startUpload = (id, size) => {
    const duration = Math.min(2500, Math.max(900, 900 + (size / (5 * 1024 * 1024)) * 1600));
    const step = (100 / duration) * 100;
    timers.current[id] = setInterval(() => {
      setQueue((list) =>
        list.map((item) => {
          if (item.id !== id) return item;
          const progress = Math.min(100, item.progress + step * (0.7 + Math.random() * 0.6));
          if (progress >= 100) {
            clearInterval(timers.current[id]);
            delete timers.current[id];
            return { ...item, progress: 100, status: 'uploaded' };
          }
          return { ...item, progress };
        })
      );
    }, 100);
  };

  const enqueue = (items) => {
    const withIds = items.map((item) => ({ ...item, id: `q${++queueId}`, progress: 0, status: 'uploading' }));
    setQueue((list) => [...list, ...withIds]);
    withIds.forEach((item) => startUpload(item.id, item.size));
  };

  // ---------------------------------------------------------------------------
  // Adding files
  // ---------------------------------------------------------------------------
  const addFiles = (files) => {
    if (queue.length > 0 && files.length === 1 && queue.some((q) => q.name === files[0].name && q.size === files[0].size)) {
      setRejected([{ name: files[0].name, reason: 'Already in the queue.' }]);
      return;
    }
    if (queue.length > 0 || files.length > 1) {
      toast.info('One document at a time', 'This prototype processes one document per session. Complete or remove the current document before adding another.');
      return;
    }
    const accepted = [];
    const problems = [];
    let slots = remaining - queue.length;

    files.forEach((file) => {
      const reason = (() => {
        if (!EXT_PATTERN.test(file.name) || (file.type && !ALLOWED_MIME.includes(file.type))) {
          return 'File type not supported. Use PDF, JPG or PNG.';
        }
        if (file.size === 0) return 'File is empty.';
        if (file.size > MAX_BYTES) return `${formatFileSize(file.size)} is over the 10 MB limit.`;
        const dup = [...queue, ...accepted].some((q) => q.name === file.name && q.size === file.size);
        if (dup) return 'Already in the queue.';
        if (slots <= 0) return 'Pooled document limit reached for this billing period.';
        return null;
      })();
      if (reason) {
        problems.push({ name: file.name, reason });
      } else {
        slots -= 1;
        accepted.push({ name: file.name, size: file.size, kind: fileKind(file.name), type, sample: false });
      }
    });

    setRejected(problems);
    if (accepted.length) enqueue(accepted);
  };

  const addSample = () => {
    const sample = SAMPLE_DOCUMENTS[type];
    if (queue.some((q) => q.sample && q.type === type)) {
      setRejected([{ name: sample.fileName, reason: 'Already in the queue.' }]);
      return;
    }
    if (queue.length > 0) {
      toast.info('One document at a time', 'This prototype processes one document per session. Complete or remove the current document before adding another.');
      return;
    }
    if (remaining - queue.length <= 0) {
      setRejected([{ name: sample.fileName, reason: 'Pooled document limit reached for this billing period.' }]);
      return;
    }
    setRejected([]);
    if (sample.clientId && sample.clientId !== clientId) {
      setClientId(sample.clientId);
      setNotice(`Client set to ${sampleClient?.name}, because the sample invoice was issued by this company.`);
    }
    enqueue([
      { name: sample.fileName, size: sample.fileSize, kind: 'PNG', type, sample: true, src: sample.src },
    ]);
  };

  const remove = (id) => {
    clearInterval(timers.current[id]);
    delete timers.current[id];
    if (queue.find((q) => q.id === id)?.sample) setNotice('');
    setQueue((list) => list.filter((q) => q.id !== id));
  };

  // ---------------------------------------------------------------------------
  // Process
  // ---------------------------------------------------------------------------
  const process = () => {
    if (uploaded.length === 0) return;
    const result = uploadDocument(
      uploaded.map((q) => ({ clientId, type: q.type, fileName: q.name, fileSize: q.size, sample: q.sample }))
    );
    if (!result.ok) {
      toast.error('Could not process document', result.message);
      return;
    }
    const switched = clientId !== activeClientId;
    if (switched) switchClient(clientId);
    const n = result.ids.length;
    toast.success(
      `${n} ${n === 1 ? 'document' : 'documents'} sent for AI processing`,
      switched ? `Active client switched to ${client.name}.` : `Filed under ${client.name}.`
    );
    navigate(`/app/documents/${result.id}/processing`);
  };

  return (
    <div className="page stack-lg upload-page">
      <PageHeader
        title="Upload documents"
        description="Add sales invoices or purchase receipts. CukaiSmart extracts the data for you to review."
      />

      {/* ---------- 1. Client and type ---------- */}
      <Card title="1. Client and document type">
        <div className="stack">
          <Select
            label="Client"
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setNotice('');
            }}
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            disabled={salesSampleQueued}
            helper={
              salesSampleQueued
                ? `Locked to ${sampleClient?.name} while the sample sales invoice is in the queue. Remove it to change client.`
                : 'Documents are filed under this client.'
            }
          />
          {notice && (
            <div className="alert alert--info" role="status">
              <Info size={18} aria-hidden="true" />
              <span>{notice}</span>
            </div>
          )}

          <fieldset className="field choice-group">
            <legend className="field__label">Document type</legend>
            <div className="choice-group__options">
              {DOC_TYPES.map(({ value, label, description, icon: Icon }) => (
                <label key={value} className={`choice choice--tall ${type === value ? 'choice--selected' : ''}`}>
                  <input
                    type="radio"
                    name="docType"
                    value={value}
                    checked={type === value}
                    onChange={() => setType(value)}
                    className="choice__input"
                  />
                  <Icon size={20} className="choice__icon" aria-hidden="true" />
                  <span className="choice__text">
                    <span className="text-label">{label}</span>
                    <span className="text-caption">{description}</span>
                  </span>
                </label>
              ))}
            </div>
            {queue.length > 0 && (
              <p className="field__helper">Applies to files you add next. Each file in the queue keeps its own type.</p>
            )}
          </fieldset>
        </div>
      </Card>

      {/* ---------- 2. Files ---------- */}
      <Card title="2. Add files" subtitle="PDF, JPG or PNG · up to 10 MB each">
        <div className="stack">
          <FileDropzone
            onFiles={addFiles}
            accept={ACCEPT}
            hint={`Files will be added as ${TYPE_SHORT[type]} documents.`}
            footer={
              <p className="dropzone__note">
                <Info size={14} aria-hidden="true" />
                Uploaded files aren’t read in this prototype; use a sample document for an accurate demo.
              </p>
            }
          >
            <Button variant="ghost" icon={Sparkles} onClick={addSample}>
              Try with a sample document
            </Button>
          </FileDropzone>

          {rejected.length > 0 && (
            <div className="alert alert--warning" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              <div className="alert__body">
                <p className="text-label">
                  {rejected.length === 1 ? '1 file was not added' : `${rejected.length} files were not added`}
                </p>
                <ul className="alert__list">
                  {rejected.map((r, i) => (
                    <li key={`${r.name}-${i}`}>
                      <strong>{r.name}</strong> — {r.reason}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                className="icon-btn icon-btn--sm"
                onClick={() => setRejected([])}
                aria-label="Dismiss file errors"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* ---------- 3. Queue ---------- */}
      <Card
        title="3. Upload queue"
        subtitle={
          queue.length
            ? `${queue.length} ${queue.length === 1 ? 'file' : 'files'} · ${uploaded.length} uploaded`
            : 'No files yet'
        }
        flush
      >
        {queue.length === 0 ? (
          <p className="upload-queue__empty text-caption">Files you add will appear here with their upload progress.</p>
        ) : (
          <ul className="upload-queue" aria-live="polite">
            {queue.map((item) => {
              const Icon = item.kind === 'PDF' ? FileText : FileImage;
              const done = item.status === 'uploaded';
              return (
                <li key={item.id} className="upload-item">
                  {item.sample ? (
                    <img src={item.src} alt="" className="upload-item__thumb" />
                  ) : (
                    <span className="upload-item__icon" aria-hidden="true">
                      <Icon size={20} />
                    </span>
                  )}
                  <div className="upload-item__main">
                    <div className="upload-item__head">
                      <span className="upload-item__name" title={item.name}>
                        {item.name}
                      </span>
                      <span className="row-sm">
                        <span className="chip chip--type">{TYPE_SHORT[item.type]}</span>
                        {item.sample && <span className="chip chip--ai">Demo sample</span>}
                      </span>
                    </div>
                    <p className="text-caption">
                      {formatFileSize(item.size)} · {item.kind}
                    </p>
                    {done ? (
                      <p className="upload-item__done">
                        <CheckCircle2 size={16} aria-hidden="true" /> Uploaded
                      </p>
                    ) : (
                      <ProgressBar
                        size="sm"
                        value={Math.round(item.progress)}
                        label={`Uploading ${item.name}`}
                        hideLabel
                        showValue={false}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => remove(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="card__footer upload-footer">
          <p className="text-caption">
            {uploaded.length === 0
              ? 'Process Document unlocks once a file has finished uploading.'
              : stillUploading > 0
                ? 'Files still uploading won’t be included.'
                : `Ready to process for ${client.name}.`}
          </p>
          <Button onClick={process} disabled={uploaded.length === 0}>
            Process Document
          </Button>
        </div>
      </Card>
    </div>
  );
}
