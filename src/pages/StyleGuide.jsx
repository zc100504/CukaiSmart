import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Download,
  Mail,
  Plus,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react';
import Logo from '../components/Logo.jsx';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import Select from '../components/Select.jsx';
import Checkbox from '../components/Checkbox.jsx';
import Card from '../components/Card.jsx';
import Badge, { STATUSES } from '../components/Badge.jsx';
import Table from '../components/Table.jsx';
import Modal from '../components/Modal.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import ProgressSteps from '../components/ProgressSteps.jsx';
import Sidebar from '../components/Sidebar.jsx';
import PublicNavbar from '../components/PublicNavbar.jsx';
import { useToast } from '../components/Toast.jsx';
import { useApp } from '../state/AppContext.jsx';
import { formatDate, formatRM } from '../data/format.js';
import { getDocSummary } from '../data/selectors.js';
import { DOCUMENT_TYPES } from '../data/mock-data.js';

const SECTIONS = [
  ['logo', 'Logo'],
  ['colours', 'Colours'],
  ['typography', 'Typography'],
  ['buttons', 'Buttons'],
  ['inputs', 'Inputs'],
  ['cards', 'Cards'],
  ['badges', 'Status badges'],
  ['progress', 'Progress'],
  ['feedback', 'Modal & toast'],
  ['sidebar', 'Sidebar'],
  ['navbar', 'Public navbar'],
  ['table', 'Table'],
  ['review', 'Review layout'],
];

const COLOURS = [
  { token: '--navy', hex: '#003787', use: 'Primary buttons, headings, navigation' },
  { token: '--teal', hex: '#02A1A2', use: 'Active states, AI elements, highlights' },
  { token: '--gold', hex: '#DDAE42', use: 'Small attention indicators only' },
  { token: '--bg', hex: '#F8FAFC', use: 'App background' },
  { token: '--card', hex: '#FFFFFF', use: 'Cards and forms' },
  { token: '--text', hex: '#0F172A', use: 'Body text and headings' },
  { token: '--text-secondary', hex: '#64748B', use: 'Descriptions, helper text' },
  { token: '--border', hex: '#D2E4EC', use: 'Tables, cards' },
  { token: '--success', hex: '#15803D', use: 'Approved / ready' },
  { token: '--warning', hex: '#D97706', use: 'Requires review' },
  { token: '--error', hex: '#DC2626', use: 'Missing / invalid' },
];

const ACCESSIBLE_COLOURS = [
  { token: '--teal-text', hex: '#017A7B', use: 'Small teal text' },
  { token: '--warning-text', hex: '#92400E', use: 'Small amber text' },
  { token: '--gold-text', hex: '#7A5A0F', use: 'Small gold text' },
  { token: '--border-input', hex: '#A9C3CF', use: 'Input borders' },
];

const TYPE_SCALE = [
  { cls: 'text-display', name: 'Landing headline', spec: '48px Bold', sample: 'e-Invoicing, done right' },
  { cls: 'text-h1', name: 'Page title', spec: '32px Bold', sample: 'Review Queue' },
  { cls: 'text-h2', name: 'Section heading', spec: '22px Semi-Bold', sample: 'Extracted fields' },
  { cls: 'text-h3', name: 'Card heading', spec: '16px Semi-Bold', sample: 'Documents processed' },
  { cls: 'text-body-lg', name: 'Body', spec: '16px Regular', sample: 'Upload a sales invoice and CukaiSmart prepares MyInvois-ready data.' },
  { cls: 'text-body', name: 'Body (compact)', spec: '15px Regular', sample: 'Every low-confidence field needs a human check before approval.' },
  { cls: 'text-label', name: 'Button / label', spec: '14px Semi-Bold', sample: 'Supplier TIN' },
  { cls: 'text-caption', name: 'Caption / helper', spec: '13px Regular', sample: 'Format: C followed by 10–11 digits' },
  { cls: 'text-caption-sm', name: 'Caption (small)', spec: '12px Regular', sample: 'Updated 28 Sep 2026, 10:14' },
];

const REVIEW_FIELDS = [
  { id: 'supplier', label: 'Supplier name', value: 'Ali Trading Sdn Bhd', confidence: 'high', score: 98 },
  { id: 'invoiceNo', label: 'Invoice no.', value: 'INV-2026-0412', confidence: 'high', score: 97 },
  { id: 'date', label: 'Invoice date', value: '28 Sep 2026', confidence: 'medium', score: 84 },
  { id: 'tin', label: 'Supplier TIN', value: 'C2088014502', confidence: 'low', score: 52, reason: 'TIN format invalid' },
  { id: 'total', label: 'Total', value: 'RM 1,240.00', confidence: 'low', score: 61, reason: 'Faded text' },
];

const CONFIDENCE_GROUPS = [
  { key: 'low', title: 'Low confidence — needs review', chip: 'Low' },
  { key: 'medium', title: 'Medium confidence', chip: 'Medium' },
  { key: 'high', title: 'High confidence', chip: 'High' },
];

function Section({ id, title, description, children }) {
  return (
    <section id={id} className="sg-section" aria-labelledby={`${id}-title`}>
      <div className="sg-section__head">
        <h2 id={`${id}-title`} className="text-h2">
          {title}
        </h2>
        {description && <p className="text-secondary">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Swatch({ token, hex, use }) {
  return (
    <div className="sg-swatch">
      <div className="sg-swatch__chip" style={{ background: `var(${token})` }} />
      <div className="sg-swatch__meta">
        <p className="text-label">{token}</p>
        <p className="text-caption text-mono">{hex}</p>
        <p className="text-caption-sm">{use}</p>
      </div>
    </div>
  );
}

function MiniReview() {
  const [activeId, setActiveId] = useState('tin');
  const [confirmed, setConfirmed] = useState({});
  const pendingLow = REVIEW_FIELDS.filter((f) => f.confidence === 'low' && !confirmed[f.id]).length;

  const region = (id, children, extra = '') => {
    const field = REVIEW_FIELDS.find((f) => f.id === id);
    const isLow = field.confidence === 'low' && !confirmed[id];
    return (
      <span
        role="button"
        tabIndex={0}
        className={`doc-region ${activeId === id ? 'doc-region--active' : ''} ${isLow ? 'doc-region--low' : ''} ${extra}`}
        onClick={() => setActiveId(id)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setActiveId(id))}
        aria-label={`Show extracted field: ${field.label}`}
      >
        {children}
      </span>
    );
  };

  return (
    <div className="sg-review">
      <div className="sg-review__doc">
        <div className="doc-preview">
          <div className="doc-preview__head">
            <div>
              <p className="text-label">{region('supplier', 'Ali Trading Sdn Bhd')}</p>
              <p>12, Jalan Perusahaan 3, 40150 Shah Alam</p>
              <p>TIN: {region('tin', 'C2088014502')}</p>
            </div>
            <div className="sg-review__doc-right">
              <p className="doc-preview__title">INVOICE</p>
              <p>No: {region('invoiceNo', 'INV-2026-0412')}</p>
              <p>Date: {region('date', '28/09/2026')}</p>
            </div>
          </div>
          <table className="sg-doc-lines">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Coffee machine servicing</td>
                <td>1</td>
                <td>960.00</td>
              </tr>
              <tr>
                <td>On-site call-out fee</td>
                <td>1</td>
                <td>188.15</td>
              </tr>
            </tbody>
          </table>
          <div className="sg-doc-sum">
            <span>Subtotal</span>
            <span>1,148.15</span>
          </div>
          <div className="sg-doc-sum">
            <span>Service Tax (8%)</span>
            <span>91.85</span>
          </div>
          <div className="sg-doc-total">
            <span>Total (incl. tax)</span>
            <strong>{region('total', 'RM 1,240.00', 'doc-region--faded')}</strong>
          </div>
        </div>
      </div>

      <div className="sg-review__fields">
        {pendingLow > 0 ? (
          <div className="alert alert--warning">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>
              {pendingLow} low-confidence {pendingLow === 1 ? 'field needs' : 'fields need'} your review.
            </span>
          </div>
        ) : (
          <div className="alert alert--success">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>All fields reviewed.</span>
          </div>
        )}
        {CONFIDENCE_GROUPS.map((group) => {
          const fields = REVIEW_FIELDS.filter((f) => f.confidence === group.key);
          return (
            <div key={group.key} className="stack-sm">
              <p className="group-heading">
                <span className={`chip chip--${group.key}`}>{group.chip}</span>
                {group.title}
              </p>
              {fields.map((f) => {
                const needsReview = f.confidence === 'low' && !confirmed[f.id];
                return (
                  <div
                    key={f.id}
                    className={`xfield ${activeId === f.id ? 'xfield--active' : ''} ${needsReview ? 'xfield--low' : ''}`}
                    tabIndex={0}
                    onClick={() => setActiveId(f.id)}
                    onFocus={() => setActiveId(f.id)}
                  >
                    <div className="xfield__head">
                      <span className="xfield__label">{f.label}</span>
                      <span className="text-caption-sm">{f.score}%</span>
                    </div>
                    <span className="xfield__value">{f.value}</span>
                    {needsReview && (
                      <div className="row-between">
                        <span className="xfield__reason">
                          <AlertTriangle size={14} aria-hidden="true" />
                          {f.reason}
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmed((c) => ({ ...c, [f.id]: true }));
                          }}
                        >
                          Confirm
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        <div className="row">
          <Button variant="secondary" onClick={() => setConfirmed({})}>
            Reset example
          </Button>
          <Button disabled={pendingLow > 0}>Approve</Button>
        </div>
      </div>
    </div>
  );
}

export default function StyleGuide() {
  const toast = useToast();
  const { clients, documents, user } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState(user.email);
  const [agree, setAgree] = useState(true);

  // One sample row per status.
  const sampleRows = ['processing', 'needs-review', 'ready', 'error', 'submitted', 'exported']
    .map((s) => documents.find((d) => d.status === s))
    .filter(Boolean);

  const tableColumns = [
    { key: 'number', header: 'Document', render: (d) => <span className="text-label">{getDocSummary(d).number}</span> },
    { key: 'client', header: 'Client', render: (d) => clients.find((c) => c.id === d.clientId)?.name },
    { key: 'type', header: 'Type', render: (d) => DOCUMENT_TYPES[d.type] },
    { key: 'date', header: 'Date', render: (d) => formatDate(getDocSummary(d).date) },
    { key: 'total', header: 'Amount', align: 'right', render: (d) => formatRM(getDocSummary(d).total) },
    { key: 'status', header: 'Status', render: (d) => <Badge status={d.status} /> },
  ];

  return (
    <div className="sg">
      <header className="sg-header">
        <Logo to={null} />
        <div>
          <h1 className="text-h1">UI Style Guide</h1>
          <p className="text-secondary">
            Tokens and shared components for the CukaiSmart prototype. Premium, trustworthy, minimal — with{' '}
            <span className="text-highlight">subtle AI</span> touches.
          </p>
        </div>
      </header>

      <div className="sg-layout">
        <nav className="sg-toc" aria-label="Style guide sections">
          <ul>
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="sg-main">
          <Section id="logo" title="Logo" description="Network icon with the CukaiSmart wordmark (public/LOGO.png). Large on auth pages, standard in the navbar and sidebar.">
            <Card>
              <div className="row sg-logo-row">
                <Logo to={null} size="lg" />
                <Logo to={null} />
              </div>
            </Card>
          </Section>

          <Section id="colours" title="Colours">
            <div className="sg-swatches">
              {COLOURS.map((c) => (
                <Swatch key={c.token} {...c} />
              ))}
            </div>
            <h3 className="text-h3">Accessibility shades</h3>
            <p className="text-caption">
              Teal, amber and gold fail 4.5:1 as small text on white. Use these darker shades for small text.
            </p>
            <div className="sg-swatches">
              {ACCESSIBLE_COLOURS.map((c) => (
                <Swatch key={c.token} {...c} />
              ))}
            </div>
            <h3 className="text-h3">AI gradient</h3>
            <p className="text-caption">Landing-page hero and AI-processing elements only.</p>
            <div className="sg-gradient">
              <Sparkles size={20} aria-hidden="true" />
              --gradient-ai
            </div>
          </Section>

          <Section id="typography" title="Typography" description="Inter. Headings navy, body text dark.">
            <Card flush>
              <div className="sg-type">
                {TYPE_SCALE.map((t) => (
                  <div key={t.cls} className="sg-type__row">
                    <div className="sg-type__meta">
                      <p className="text-label">{t.name}</p>
                      <p className="text-caption">{t.spec}</p>
                    </div>
                    <p className={t.cls}>{t.sample}</p>
                  </div>
                ))}
              </div>
            </Card>
          </Section>

          <Section id="buttons" title="Buttons">
            <Card>
              <div className="stack-lg">
                <div className="row">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button disabled>Disabled</Button>
                </div>
                <div className="row">
                  <Button icon={Upload}>Upload document</Button>
                  <Button variant="secondary" icon={Download}>
                    Export CSV
                  </Button>
                  <Button variant="ghost" iconRight={ArrowRight}>
                    View all
                  </Button>
                  <Button variant="danger">Reset demo data</Button>
                </div>
                <div className="row">
                  <Button size="sm">Small</Button>
                  <Button>Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
              </div>
            </Card>
          </Section>

          <Section id="inputs" title="Inputs" description="44px high, label above, helper or error text below.">
            <Card>
              <div className="grid-2">
                <Input
                  label="Email"
                  type="email"
                  icon={Mail}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  helper="We'll send export notifications here."
                />
                <Input label="Search" icon={Search} placeholder="Search documents…" />
                <Input label="Supplier TIN" defaultValue="C2088014502" required error="TIN format invalid — expected 12 characters." />
                <Input label="Invoice no." defaultValue="INV-2026-0412" disabled helper="Locked after approval." />
                <Select
                  label="Client"
                  defaultValue="c1"
                  options={clients.map((c) => ({ value: c.id, label: c.name }))}
                  helper="Documents are filed under this client."
                />
                <Select
                  label="Classification code"
                  defaultValue=""
                  placeholder="Select a code"
                  options={['001 — Breastfeeding equipment', '022 — Others', '008 — e-Commerce']}
                  error="Classification code is required."
                />
                <Checkbox
                  label="I confirm these details are correct"
                  description="Required before export or submission."
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                <Checkbox label="Disabled option" disabled />
              </div>
            </Card>
          </Section>

          <Section id="cards" title="Cards" description="White, 12px radius, 1px border, soft shadow.">
            <div className="grid-3">
              <Card>
                <p className="stat__label">Documents processed</p>
                <p className="stat__value">580</p>
                <p className="stat__meta">This month</p>
              </Card>
              <Card title="Kedai Runcit Maju" subtitle="TIN IG11938472050" actions={<Building2 size={20} aria-hidden="true" />}>
                <p className="text-secondary">Card with heading, subtitle and actions.</p>
              </Card>
              <Card
                variant="ai"
                title={
                  <span className="row-sm">
                    <Sparkles size={18} className="sg-teal" aria-hidden="true" /> AI suggestion
                  </span>
                }
                footer={
                  <>
                    <Button variant="ghost" size="sm">
                      Dismiss
                    </Button>
                    <Button size="sm">Apply</Button>
                  </>
                }
              >
                <p className="text-secondary">Classification code 022 matches similar invoices from this supplier.</p>
              </Card>
            </div>
          </Section>

          <Section id="badges" title="Status badges" description="Pale tinted background with dark same-hue text.">
            <Card>
              <div className="stack">
                <div className="row">
                  {Object.keys(STATUSES).map((s) => (
                    <Badge key={s} status={s} />
                  ))}
                </div>
                <div className="row">
                  <span className="chip chip--high">High 98%</span>
                  <span className="chip chip--medium">Medium 84%</span>
                  <span className="chip chip--low">Low 52%</span>
                  <span className="chip chip--ai">
                    <Sparkles size={12} aria-hidden="true" /> AI extracted
                  </span>
                  <span className="chip chip--gold">New</span>
                </div>
              </div>
            </Card>
          </Section>

          <Section id="progress" title="Progress">
            <Card>
              <div className="stack-lg">
                <ProgressSteps steps={['Uploaded', 'AI Extraction', 'Tax Validation', 'Ready for Review']} current={2} />
                <ProgressBar label="invoice-0412.pdf · 1.2 MB" value={64} />
                <ProgressBar label="AI extraction" value={80} variant="ai" />
                <ProgressBar label="Pooled usage" value={580} max={10000} valueText="580 / 10,000 docs" />
              </div>
            </Card>
          </Section>

          <Section id="feedback" title="Modal & toast">
            <Card>
              <div className="row">
                <Button variant="secondary" onClick={() => setModalOpen(true)}>
                  Open confirm modal
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => toast.success('Document approved', 'INV-2026-0412 is ready for compliance checks.')}
                >
                  Success toast
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => toast.error('Upload failed', 'File type not supported. Use PDF, JPG or PNG.')}
                >
                  Error toast
                </Button>
              </div>
            </Card>
            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Reset demo data?"
              footer={
                <>
                  <Button variant="secondary" onClick={() => setModalOpen(false)}>
                    Keep my data
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setModalOpen(false);
                      toast.info('Example only', 'Nothing was reset — this is the style guide.');
                    }}
                  >
                    Reset data
                  </Button>
                </>
              }
            >
              <p>All uploaded documents, edits and audit events will be replaced with the original sample data.</p>
            </Modal>
          </Section>

          <Section id="sidebar" title="Sidebar" description="Fixed, 240px. Active item uses teal.">
            <div className="sg-frame sg-frame--sidebar">
              <Sidebar fixed={false} counts={{ review: 4 }} />
              <div className="sg-frame__placeholder text-caption">Main content</div>
            </div>
          </Section>

          <Section id="navbar" title="Public navbar">
            <div className="sg-frame">
              <PublicNavbar />
            </div>
          </Section>

          <Section id="table" title="Table">
            <Card
              flush
              title="Sample documents"
              subtitle="One per status"
              actions={
                <Button size="sm" icon={Plus}>
                  Upload
                </Button>
              }
            >
              <div className="sg-table-gap" />
              <Table
                columns={tableColumns}
                rows={sampleRows}
                caption="Recent documents"
                onRowClick={(d) => toast.info(getDocSummary(d).number, 'Rows open the audit trail in Records.')}
              />
            </Card>
          </Section>

          <Section
            id="review"
            title="Document review layout"
            description="Click a field or a highlighted area of the invoice to link them. Approve unlocks once low-confidence fields are confirmed."
          >
            <Card>
              <MiniReview />
            </Card>
          </Section>
        </main>
      </div>

      <footer className="prototype-footer">Prototype — sample data only</footer>
    </div>
  );
}
