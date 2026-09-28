// Fictional sample data only. No real businesses, people or tax numbers.
// Amounts are computed from line items so every document reconciles.
import { formatDate, formatRM, round2 } from './format.js';

export const STATE_VERSION = 1;
export const AI_ACTOR = 'CukaiSmart AI';
export const SYSTEM_ACTOR = 'System';

// ---------------------------------------------------------------------------
// Reference lists
// ---------------------------------------------------------------------------

// Sample subset for the prototype.
export const CLASSIFICATION_CODES = [
  { value: '022', label: '022 — Others' },
  { value: '004', label: '004 — Consolidated e-Invoice' },
  { value: '008', label: '008 — e-Commerce' },
];

export const EXPENSE_CATEGORIES = [
  'Cost of sales — ingredients',
  'Cost of sales — stock',
  'Printing & stationery',
  'Repairs & maintenance',
  'Pantry supplies',
];

export const DOCUMENT_TYPES = {
  sales: 'Sales e-Invoice',
  purchase: 'Purchase invoice / receipt',
};

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export const defaultUser = {
  name: 'Razak Ismail',
  displayName: 'Razak',
  email: 'razak.ismail@example.my',
  role: 'Senior Accountant',
  phone: '012-345 6789',
};

export const defaultBusiness = {
  name: 'Razak & Rakan Accounting',
  brn: '201801098765',
  tin: 'C24681357900',
  address: '3A, Jalan SS 15/4, 47500 Subang Jaya, Selangor',
};

const TEAMMATE = 'Mei Ling';

// ---------------------------------------------------------------------------
// Clients (the SMEs the firm manages)
// ---------------------------------------------------------------------------

export const seedClients = [
  {
    id: 'c1',
    name: 'Ali Trading Sdn Bhd',
    tin: 'C20880145020',
    brn: '201901034567',
    sst: 'W10-1908-32000123',
    industry: 'Wholesale — dry goods',
    contact: 'Ali Hassan',
    email: 'accounts@alitrading.example.my',
    address: '12, Jalan Perusahaan 3, 40150 Shah Alam, Selangor',
  },
  {
    id: 'c2',
    name: 'Nasi Kandar Cafe',
    tin: 'IG21475839010',
    brn: '202003012345',
    sst: 'B16-2003-32000456',
    industry: 'Food & beverage',
    contact: 'Mohamed Ibrahim',
    email: 'owner@nasikandarcafe.example.my',
    address: '45, Lebuh Chulia, 10200 George Town, Pulau Pinang',
  },
  {
    id: 'c3',
    name: 'Teh Tarik Enterprise',
    tin: 'IG30582716040',
    brn: '202103045678',
    sst: '',
    industry: 'Beverage supplies',
    contact: 'Tan Siew Lan',
    email: 'hello@tehtarik.example.my',
    address: '7, Jalan Pasar Baru, 41400 Klang, Selangor',
  },
  {
    id: 'c4',
    name: 'Kedai Runcit Maju',
    tin: 'IG11938472050',
    brn: '201803067890',
    sst: '',
    industry: 'Retail — groceries',
    contact: 'Muthu Rajan',
    email: 'kedaimaju@example.my',
    address: '88, Jalan Besar, 43000 Kajang, Selangor',
  },
];

// Other fictional businesses that appear as suppliers or buyers.
const parties = {
  majuJaya: {
    name: 'Syarikat Maju Jaya Sdn Bhd',
    tin: 'C10293847560',
    brn: '201501012345',
    sst: 'B16-1809-22000456',
    address: '8, Jalan Industri 2, 47100 Puchong, Selangor',
  },
  rotiBestari: {
    name: 'Kilang Roti Bestari Sdn Bhd',
    tin: 'C23847561090',
    brn: '201701023456',
    sst: 'W10-1808-31000789',
    address: 'Lot 5, Kawasan Perindustrian Batu Caves, 68100 Selangor',
  },
  ayamSegar: {
    name: 'Pembekal Ayam Segar Enterprise',
    tin: 'IG40918273050',
    brn: '202201056789',
    sst: '',
    address: '21, Jalan Pasar Borong, 52000 Kuala Lumpur',
  },
  kopiTanahTinggi: {
    name: 'Kopi Tanah Tinggi Trading',
    tin: 'C31928374650',
    brn: '201801045678',
    sst: 'W10-1810-32001234',
    address: '3, Jalan Besar, 39000 Tanah Rata, Pahang',
  },
  percetakan: {
    name: 'Percetakan Pantas Sdn Bhd',
    tin: 'C27364518290',
    brn: '201601067890',
    sst: 'W10-1809-31002345',
    address: '12, Jalan Klang Lama, 58000 Kuala Lumpur',
  },
  seriMurni: {
    name: 'Seri Murni Catering Sdn Bhd',
    tin: 'C19283746510',
    brn: '201401078901',
    sst: 'W10-1809-32003456',
    address: '19, Jalan 14/22, 46100 Petaling Jaya, Selangor',
  },
  sayurBorong: {
    name: 'Hijau Segar Sayur Borong',
    tin: 'IG52837461020',
    brn: '202001089012',
    sst: '',
    address: 'Pasar Borong Selayang, 68100 Batu Caves, Selangor',
  },
  elektrik: {
    name: 'Kedai Elektrik Cahaya',
    tin: 'IG28374651030',
    brn: '201901090123',
    sst: '',
    address: '5, Jalan Tengku Kelana, 41000 Klang, Selangor',
  },
};

const toParty = (c) => ({ name: c.name, tin: c.tin, brn: c.brn, sst: c.sst, address: c.address });
const clientParty = (clientId) => toParty(seedClients.find((x) => x.id === clientId));

// ---------------------------------------------------------------------------
// Extracted field definitions
// ---------------------------------------------------------------------------

const F = (key, label, group, format = 'text') => ({ key, label, group, format });

export const FIELD_DEFS = {
  sales: [
    F('supplierName', 'Supplier name', 'Supplier'),
    F('supplierTin', 'Supplier TIN', 'Supplier'),
    F('supplierBrn', 'Supplier BRN', 'Supplier'),
    F('supplierSst', 'SST registration no.', 'Supplier'),
    F('buyerName', 'Buyer name', 'Buyer'),
    F('buyerTin', 'Buyer TIN', 'Buyer'),
    F('buyerBrn', 'Buyer BRN', 'Buyer'),
    F('invoiceNo', 'Invoice no.', 'Invoice'),
    F('invoiceDate', 'Invoice date', 'Invoice', 'date'),
    F('classificationCode', 'Classification code', 'Invoice', 'classification'),
    F('subtotal', 'Subtotal', 'Amounts', 'money'),
    F('sstAmount', 'SST amount', 'Amounts', 'money'),
    F('total', 'Total', 'Amounts', 'money'),
  ],
  purchase: [
    F('supplierName', 'Supplier name', 'Supplier'),
    F('supplierTin', 'Supplier TIN', 'Supplier'),
    F('supplierBrn', 'Supplier BRN', 'Supplier'),
    F('supplierSst', 'SST registration no.', 'Supplier'),
    F('buyerName', 'Buyer name', 'Buyer'),
    F('buyerTin', 'Buyer TIN', 'Buyer'),
    F('invoiceNo', 'Invoice / receipt no.', 'Invoice'),
    F('invoiceDate', 'Invoice date', 'Invoice', 'date'),
    F('expenseCategory', 'Expense category', 'Invoice'),
    F('subtotal', 'Subtotal', 'Amounts', 'money'),
    F('sstAmount', 'SST amount', 'Amounts', 'money'),
    F('total', 'Total', 'Amounts', 'money'),
  ],
};

/** Formats a field value for display and for audit before → after text. */
export function formatFieldValue(format, value) {
  if (value === '' || value === null || value === undefined) return '(empty)';
  if (format === 'money') return formatRM(value);
  if (format === 'classification') {
    return CLASSIFICATION_CODES.find((c) => c.value === value)?.label || value;
  }
  if (format === 'date') return formatDate(value);
  return String(value);
}

// Deterministic "high" confidence (91–99) so the seed never changes between loads.
function stableConfidence(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return 91 + (h % 9);
}

const REVIEWED_STATUSES = ['ready', 'submitted', 'exported', 'error'];

const STAGE_BY_STATUS = {
  processing: 'processing',
  'needs-review': 'review',
  error: 'compliance',
  ready: 'finish',
  submitted: 'done',
  exported: 'done',
};

function addMinutes(iso, minutes) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

/**
 * Builds a full document record from a compact spec.
 * `source` = what is printed on the document (used by the preview).
 * `fields` = what the AI extracted (may differ from source when misread).
 *
 * Field overrides: { confidence, reason, value, edited }
 *  - value without edited: the AI extracted this (possibly wrong) value
 *  - value with edited: the AI extracted this, a human later corrected it to the source value
 */
export function buildDocument(spec) {
  const own = spec.own || clientParty(spec.clientId);
  const counterparty = spec.party;
  const supplier = spec.type === 'sales' ? own : counterparty;
  const buyer = spec.type === 'sales' ? counterparty : own;

  const lines = spec.lines.map(([description, qty, unitPrice]) => ({
    description,
    qty,
    unitPrice,
    amount: round2(qty * unitPrice),
  }));
  const subtotal = round2(lines.reduce((sum, l) => sum + l.amount, 0));
  const sstRate = spec.sstRate || 0;
  const sstAmount = round2(subtotal * sstRate);
  const total = round2(subtotal + sstAmount);

  const source = {
    supplier,
    buyer,
    invoiceNo: spec.number,
    date: spec.date,
    lines,
    subtotal,
    sstRate,
    sstAmount,
    total,
  };

  const truth = {
    supplierName: supplier.name,
    supplierTin: supplier.tin,
    supplierBrn: supplier.brn,
    supplierSst: supplier.sst,
    buyerName: buyer.name,
    buyerTin: buyer.tin,
    buyerBrn: buyer.brn,
    invoiceNo: spec.number,
    invoiceDate: spec.date,
    classificationCode: spec.classification ?? '022',
    expenseCategory: spec.category ?? EXPENSE_CATEGORIES[1],
    subtotal,
    sstAmount,
    total,
  };

  const reviewed = REVIEWED_STATUSES.includes(spec.status);
  const overrides = spec.overrides || {};

  const fields = FIELD_DEFS[spec.type].map((def) => {
    const o = overrides[def.key] || {};
    const confidence = o.confidence ?? stableConfidence(`${spec.id}:${def.key}`);
    const hasValue = Object.prototype.hasOwnProperty.call(o, 'value');
    const isLow = confidence < 75;
    return {
      ...def,
      value: hasValue && !o.edited ? o.value : truth[def.key],
      originalValue: hasValue ? o.value : truth[def.key],
      confidence,
      reason: o.reason || null,
      confirmed: reviewed && isLow,
      edited: Boolean(o.edited),
    };
  });

  const uploadedAt = spec.uploadedAt;
  const doc = {
    id: spec.id,
    clientId: spec.clientId,
    type: spec.type,
    status: spec.status,
    stage: STAGE_BY_STATUS[spec.status],
    preview: spec.preview || 'invoice',
    fileName: spec.fileName,
    fileSize: spec.fileSize,
    fileType: spec.fileName.split('.').pop().toLowerCase(),
    uploadedAt,
    uploadedBy: spec.uploadedBy || defaultUser.displayName,
    dueDate: spec.dueDate || addMinutes(uploadedAt, 3 * 24 * 60).slice(0, 10),
    source,
    fields,
    processedAt: spec.status === 'processing' ? null : addMinutes(uploadedAt, 1),
    approvedAt: reviewed ? addMinutes(uploadedAt, 125) : null,
    readyAt: ['ready', 'submitted', 'exported'].includes(spec.status) ? addMinutes(uploadedAt, 130) : null,
    exportedAt: spec.status === 'exported' ? spec.doneAt : null,
    submittedAt: spec.status === 'submitted' ? spec.doneAt : null,
    submissionRef: spec.submissionRef || null,
    destination: spec.type === 'sales' ? 'MyInvois (sandbox — simulated)' : 'Accounting records (CSV export)',
    // Set for demo sample files so the review screen can show the real image.
    sampleImage: spec.sampleImage || null,
  };
  return doc;
}

// ---------------------------------------------------------------------------
// Documents — 20 total
// Status: Processing 2 · Needs Review 6 · Ready 4 · Error 2 · Submitted 3 · Exported 3
// Type:   Sales 11 · Purchase 9
// Client: Ali Trading 6 · Nasi Kandar 5 · Teh Tarik 5 · Kedai Runcit 4
// ---------------------------------------------------------------------------

const documentSpecs = [
  // ----- Ali Trading Sdn Bhd (c1) -----
  {
    id: 'd1001',
    clientId: 'c1',
    type: 'sales',
    status: 'needs-review',
    number: 'INV-2026-0412',
    date: '2026-09-28',
    party: clientParty('c3'),
    lines: [
      ['Teh tarik premix (carton)', 20, 48.0],
      ['Delivery charge', 1, 188.15],
    ],
    sstRate: 0.08,
    fileName: 'INV-2026-0412.pdf',
    fileSize: 253952,
    uploadedAt: '2026-09-28T09:12:00',
    overrides: {
      supplierTin: { value: 'C2088014502', confidence: 52, reason: 'TIN format invalid' },
      total: { value: 1204, confidence: 61, reason: 'Faded text' },
      invoiceDate: { confidence: 84 },
    },
  },
  {
    id: 'd1002',
    clientId: 'c1',
    type: 'purchase',
    status: 'processing',
    number: 'RCP-88213',
    date: '2026-09-27',
    party: clientParty('c4'),
    lines: [
      ['Gula pasir 1kg', 10, 2.85],
      ['Minyak masak 5kg', 1, 29.9],
      ['Serbuk pencuci 2kg', 2, 14.0],
    ],
    category: 'Pantry supplies',
    preview: 'receipt',
    fileName: 'receipt-runcit-0927.jpg',
    fileSize: 1468006,
    uploadedAt: '2026-09-28T10:02:00',
    overrides: {
      supplierTin: { value: '', confidence: 38, reason: 'Not printed on receipt' },
      invoiceDate: { confidence: 82 },
    },
  },
  {
    id: 'd1003',
    clientId: 'c1',
    type: 'sales',
    status: 'ready',
    number: 'INV-2026-0409',
    date: '2026-09-25',
    party: parties.seriMurni,
    lines: [
      ['Beras wangi 10kg (bag)', 60, 42.0],
      ['Minyak masak 5kg', 20, 31.5],
    ],
    sstRate: 0.08,
    fileName: 'INV-2026-0409.pdf',
    fileSize: 231424,
    uploadedAt: '2026-09-25T14:30:00',
    overrides: {
      total: { value: 3042, confidence: 58, reason: 'Digits unclear', edited: true },
    },
  },
  {
    id: 'd1004',
    clientId: 'c1',
    type: 'sales',
    status: 'submitted',
    number: 'INV-2026-0401',
    date: '2026-09-18',
    party: clientParty('c2'),
    lines: [
      ['Beras basmathi 5kg', 30, 38.0],
      ['Rempah kari 1kg', 25, 22.0],
    ],
    sstRate: 0.08,
    fileName: 'INV-2026-0401.pdf',
    fileSize: 219136,
    uploadedAt: '2026-09-18T09:05:00',
    doneAt: '2026-09-18T11:40:00',
    submissionRef: 'f3b9c2e1-7a4d-4c8e-9b21-5d6e8a0c4f17',
  },
  {
    id: 'd1005',
    clientId: 'c1',
    type: 'purchase',
    status: 'exported',
    number: 'PP-2026-1187',
    date: '2026-09-15',
    party: parties.percetakan,
    lines: [
      ['Delivery order books, 3-ply', 10, 18.5],
      ['Company letterhead A4 (ream)', 4, 32.0],
    ],
    sstRate: 0.08,
    category: 'Printing & stationery',
    fileName: 'percetakan-PP-2026-1187.pdf',
    fileSize: 180224,
    uploadedAt: '2026-09-15T16:20:00',
    doneAt: '2026-09-15T18:45:00',
  },
  {
    id: 'd1006',
    clientId: 'c1',
    type: 'sales',
    status: 'error',
    number: 'INV-2026-0406',
    date: '2026-09-22',
    party: parties.majuJaya,
    lines: [['Tepung gandum 25kg (bag)', 40, 58.0]],
    sstRate: 0.08,
    fileName: 'INV-2026-0406.pdf',
    fileSize: 204800,
    uploadedAt: '2026-09-22T11:15:00',
    overrides: {
      buyerTin: { value: '', confidence: 0, reason: 'Not found on document' },
    },
  },

  // ----- Nasi Kandar Cafe (c2) -----
  {
    id: 'd1007',
    clientId: 'c2',
    type: 'sales',
    status: 'needs-review',
    number: 'NKC-0098',
    date: '2026-09-26',
    party: parties.majuJaya,
    lines: [
      ['Catering — nasi kandar set (pax)', 120, 14.5],
      ['Teh tarik (jug)', 30, 18.0],
    ],
    sstRate: 0.06,
    fileName: 'NKC-0098.pdf',
    fileSize: 196608,
    uploadedAt: '2026-09-26T17:45:00',
    overrides: {
      buyerTin: { value: 'C1O293847560', confidence: 57, reason: 'Possible O / 0 mix-up' },
      classificationCode: { confidence: 79 },
    },
  },
  {
    id: 'd1008',
    clientId: 'c2',
    type: 'purchase',
    status: 'needs-review',
    number: 'AS-55120',
    date: '2026-09-27',
    party: parties.ayamSegar,
    lines: [
      ['Ayam segar (kg)', 45, 9.8],
      ['Telur gred A (papan)', 6, 13.5],
    ],
    category: 'Cost of sales — ingredients',
    preview: 'receipt',
    fileName: 'ayam-segar-receipt.jpg',
    fileSize: 1782579,
    uploadedAt: '2026-09-27T08:10:00',
    overrides: {
      invoiceDate: { confidence: 58, reason: 'Handwritten date' },
      total: { confidence: 63, reason: 'Faded text' },
    },
  },
  {
    id: 'd1009',
    clientId: 'c2',
    type: 'sales',
    status: 'submitted',
    number: 'NKC-0095',
    date: '2026-09-16',
    party: clientParty('c1'),
    lines: [
      ['Catering — staff lunch (pax)', 45, 13.0],
      ['Air sirap bandung (jug)', 10, 16.0],
    ],
    sstRate: 0.06,
    fileName: 'NKC-0095.pdf',
    fileSize: 188416,
    uploadedAt: '2026-09-16T15:00:00',
    uploadedBy: TEAMMATE,
    doneAt: '2026-09-16T17:25:00',
    submissionRef: '8d2e4f6a-1b3c-4d5e-8f70-9a1b2c3d4e5f',
  },
  {
    id: 'd1010',
    clientId: 'c2',
    type: 'purchase',
    status: 'ready',
    number: 'KTT-3310',
    date: '2026-09-24',
    party: parties.kopiTanahTinggi,
    lines: [
      ['Serbuk kopi 1kg', 12, 26.0],
      ['Teh serbuk 1kg', 10, 19.5],
    ],
    sstRate: 0.1,
    category: 'Cost of sales — ingredients',
    fileName: 'KTT-3310.pdf',
    fileSize: 172032,
    uploadedAt: '2026-09-24T10:40:00',
    uploadedBy: TEAMMATE,
    overrides: {
      supplierSst: { value: 'W10-1810-3200124', confidence: 66, reason: 'Last digit cut off', edited: true },
    },
  },
  {
    id: 'd1011',
    clientId: 'c2',
    type: 'purchase',
    status: 'exported',
    number: 'HSB-7781',
    date: '2026-09-12',
    party: parties.sayurBorong,
    lines: [
      ['Bawang merah 10kg', 3, 38.0],
      ['Cili kering 1kg', 5, 21.0],
      ['Sayur campur (kg)', 20, 4.5],
    ],
    category: 'Cost of sales — ingredients',
    preview: 'receipt',
    fileName: 'sayur-borong-0912.png',
    fileSize: 942080,
    uploadedAt: '2026-09-12T09:30:00',
    doneAt: '2026-09-12T12:05:00',
  },

  // ----- Teh Tarik Enterprise (c3) -----
  {
    id: 'd1012',
    clientId: 'c3',
    type: 'sales',
    status: 'needs-review',
    number: 'TTE-2026-031',
    date: '2026-09-27',
    party: parties.seriMurni,
    lines: [
      ['Teh tarik premix 1kg', 50, 17.5],
      ['Susu pekat manis (carton)', 8, 96.0],
    ],
    fileName: 'TTE-2026-031.pdf',
    fileSize: 208896,
    uploadedAt: '2026-09-27T13:20:00',
    overrides: {
      supplierBrn: { value: '20210304567', confidence: 55, reason: 'Missing digit' },
      buyerName: { value: 'Seri Murni Catering Sdn Bh', confidence: 68, reason: 'Text cut off at edge' },
      classificationCode: { confidence: 81 },
    },
  },
  {
    id: 'd1014',
    clientId: 'c3',
    type: 'sales',
    status: 'ready',
    number: 'TTE-2026-029',
    date: '2026-09-23',
    party: clientParty('c2'),
    lines: [
      ['Teh tarik premix 1kg', 30, 17.5],
      ['Kopi O premix 1kg', 20, 19.0],
    ],
    fileName: 'TTE-2026-029.pdf',
    fileSize: 200704,
    uploadedAt: '2026-09-23T10:00:00',
  },
  {
    id: 'd1015',
    clientId: 'c3',
    type: 'purchase',
    status: 'error',
    number: 'MJ-7747',
    date: '2026-09-26',
    party: parties.majuJaya,
    lines: [['Gula pasir 50kg (bag)', 4, 142.0]],
    sstRate: 0.05,
    category: 'Cost of sales — stock',
    fileName: 'maju-jaya-MJ-7747.pdf',
    fileSize: 165888,
    uploadedAt: '2026-09-27T15:50:00',
    overrides: {
      // Printed "MJ-7747" but read as "MJ-7741" — clashes with an exported record.
      invoiceNo: { value: 'MJ-7741', confidence: 86 },
    },
  },
  {
    id: 'd1016',
    clientId: 'c3',
    type: 'sales',
    status: 'submitted',
    number: 'TTE-2026-027',
    date: '2026-09-17',
    party: clientParty('c4'),
    lines: [
      ['Teh tarik premix 1kg', 24, 18.0],
      ['Kopi O premix 1kg', 12, 19.5],
    ],
    fileName: 'TTE-2026-027.pdf',
    fileSize: 192512,
    uploadedAt: '2026-09-17T11:10:00',
    doneAt: '2026-09-17T14:30:00',
    submissionRef: '2c7a9e14-5b3d-4f8a-a6c2-0e9d7b1f3a58',
  },
  {
    id: 'd1020',
    clientId: 'c3',
    type: 'purchase',
    status: 'exported',
    number: 'MJ-7741',
    date: '2026-09-19',
    party: parties.majuJaya,
    lines: [['Susu pekat manis (carton)', 5, 92.0]],
    sstRate: 0.05,
    category: 'Cost of sales — stock',
    fileName: 'maju-jaya-MJ-7741.pdf',
    fileSize: 161792,
    uploadedAt: '2026-09-20T09:15:00',
    doneAt: '2026-09-20T11:00:00',
  },

  // ----- Kedai Runcit Maju (c4) -----
  {
    id: 'd1013',
    clientId: 'c4',
    type: 'purchase',
    status: 'processing',
    number: 'KRB-44812',
    date: '2026-09-28',
    party: parties.rotiBestari,
    lines: [
      ['Roti putih (loaf)', 40, 3.2],
      ['Roti bun kaya (pack)', 30, 2.6],
    ],
    category: 'Cost of sales — stock',
    fileName: 'roti-bestari-KRB-44812.pdf',
    fileSize: 157696,
    uploadedAt: '2026-09-28T10:20:00',
  },
  {
    id: 'd1017',
    clientId: 'c4',
    type: 'purchase',
    status: 'needs-review',
    number: 'KEC-2291',
    date: '2026-09-26',
    party: parties.elektrik,
    lines: [
      ['Lampu LED 18W', 6, 12.9],
      ['Suis soket 13A', 4, 8.5],
    ],
    category: 'Repairs & maintenance',
    preview: 'receipt',
    fileName: 'elektrik-cahaya-receipt.jpg',
    fileSize: 1205862,
    uploadedAt: '2026-09-26T16:35:00',
    overrides: {
      supplierName: { value: 'Kedai Elektrik Cahay', confidence: 64, reason: 'Text cut off at edge' },
      total: { confidence: 66, reason: 'Faded text' },
    },
  },
  {
    id: 'd1018',
    clientId: 'c4',
    type: 'sales',
    status: 'needs-review',
    number: 'KRM-0231',
    date: '2026-09-27',
    party: clientParty('c3'),
    lines: [
      ['Susu cair (tin)', 48, 3.1],
      ['Gula pasir 1kg', 30, 2.85],
    ],
    fileName: 'KRM-0231.jpg',
    fileSize: 1363148,
    uploadedAt: '2026-09-27T18:05:00',
    overrides: {
      classificationCode: { value: '', confidence: 0, reason: 'No code on document — select one' },
      buyerTin: { confidence: 72, reason: 'Low image quality' },
    },
  },
  {
    id: 'd1019',
    clientId: 'c4',
    type: 'sales',
    status: 'ready',
    number: 'KRM-0228',
    date: '2026-09-24',
    party: clientParty('c2'),
    lines: [
      ['Beras 10kg', 5, 32.0],
      ['Minyak masak 5kg', 3, 29.9],
    ],
    fileName: 'KRM-0228.pdf',
    fileSize: 147456,
    uploadedAt: '2026-09-24T12:45:00',
    uploadedBy: TEAMMATE,
  },
];

// ---------------------------------------------------------------------------
// Audit events — derived from each seeded document's history
// ---------------------------------------------------------------------------

let seedEventCounter = 0;
const seedEvent = (event) => {
  seedEventCounter += 1;
  return { id: `e${String(seedEventCounter).padStart(4, '0')}`, before: null, after: null, field: null, ...event };
};

function eventsForDocument(doc) {
  const base = { docId: doc.id, clientId: doc.clientId };
  const number = doc.source.invoiceNo;
  const lowFields = doc.fields.filter((f) => f.confidence < 75);
  const events = [
    seedEvent({
      ...base,
      at: doc.uploadedAt,
      actor: doc.uploadedBy,
      action: 'uploaded',
      message: `Uploaded ${doc.fileName} as ${DOCUMENT_TYPES[doc.type]}`,
    }),
  ];

  if (doc.status === 'processing') return events;

  events.push(
    seedEvent({
      ...base,
      at: doc.processedAt,
      actor: AI_ACTOR,
      action: 'extracted',
      message: `AI extracted ${doc.fields.length} fields${lowFields.length ? ` — ${lowFields.length} need attention` : ''}`,
    })
  );

  if (!doc.approvedAt) return events;

  lowFields.forEach((f, i) => {
    const at = addMinutes(doc.uploadedAt, 110 + i * 3);
    if (f.edited) {
      const before = formatFieldValue(f.format, f.originalValue);
      const after = formatFieldValue(f.format, f.value);
      events.push(
        seedEvent({
          ...base,
          at,
          actor: defaultUser.displayName,
          action: 'field_edited',
          field: f.label,
          before,
          after,
          message: `${f.label} edited from ${before} to ${after}`,
        })
      );
    } else {
      events.push(
        seedEvent({
          ...base,
          at,
          actor: defaultUser.displayName,
          action: 'field_confirmed',
          field: f.label,
          message: `${f.label} confirmed as ${formatFieldValue(f.format, f.value)}`,
        })
      );
    }
  });

  events.push(
    seedEvent({
      ...base,
      at: doc.approvedAt,
      actor: defaultUser.displayName,
      action: 'approved',
      message: `Approved extracted data for ${number}`,
    })
  );

  if (doc.status === 'error') {
    events.push(
      seedEvent({
        ...base,
        at: addMinutes(doc.approvedAt, 1),
        actor: SYSTEM_ACTOR,
        action: 'compliance_failed',
        message: 'Compliance checks found blocking issues',
      })
    );
    return events;
  }

  events.push(
    seedEvent({
      ...base,
      at: doc.readyAt,
      actor: defaultUser.displayName,
      action: 'marked_ready',
      message: 'Marked ready — all blocking compliance checks passed',
    })
  );

  if (doc.status === 'submitted') {
    events.push(
      seedEvent({
        ...base,
        at: doc.submittedAt,
        actor: defaultUser.displayName,
        action: 'submitted',
        message: `Submitted to MyInvois (sandbox — simulated). Ref ${doc.submissionRef}`,
      })
    );
  }
  if (doc.status === 'exported') {
    events.push(
      seedEvent({
        ...base,
        at: doc.exportedAt,
        actor: defaultUser.displayName,
        action: 'exported',
        message: 'Exported CSV for accounting software',
      })
    );
  }
  return events;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

const seedNotifications = [
  {
    id: 'n0004',
    at: '2026-09-28T09:13:00',
    title: 'INV-2026-0412 ready for review',
    message: 'Ali Trading Sdn Bhd · 2 fields need attention.',
    docId: 'd1001',
    read: false,
  },
  {
    id: 'n0003',
    at: '2026-09-27T17:56:00',
    title: 'Possible duplicate invoice',
    message: 'MJ-7741 (Teh Tarik Enterprise) matches a record exported on 20 Sep 2026.',
    docId: 'd1015',
    read: false,
  },
  {
    id: 'n0002',
    at: '2026-09-22T13:21:00',
    title: 'Buyer TIN missing',
    message: 'INV-2026-0406 (Ali Trading Sdn Bhd) cannot be marked ready.',
    docId: 'd1006',
    read: false,
  },
  {
    id: 'n0001',
    at: '2026-09-18T11:40:00',
    title: 'Submitted to MyInvois (simulated)',
    message: 'INV-2026-0401 accepted in sandbox. Not sent to LHDN.',
    docId: 'd1004',
    read: true,
  },
];

// ---------------------------------------------------------------------------
// Seed state
// ---------------------------------------------------------------------------

/** Returns a fresh copy of the full demo state. */
export function createSeedState() {
  seedEventCounter = 0;
  const documents = documentSpecs.map(buildDocument).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  const auditEvents = documents
    .flatMap(eventsForDocument)
    .sort((a, b) => b.at.localeCompare(a.at));

  return {
    version: STATE_VERSION,
    auth: { loggedIn: false },
    user: { ...defaultUser },
    business: { ...defaultBusiness },
    clients: seedClients.map((c) => ({ ...c })),
    activeClientId: 'c1',
    documents,
    auditEvents,
    notifications: seedNotifications.map((n) => ({ ...n })),
    // Pooled plan usage for the billing period (includes earlier months).
    usage: { used: 580, limit: 10000 },
  };
}

// ---------------------------------------------------------------------------
// Simulated upload — builds a new document for the "AI" to process
// ---------------------------------------------------------------------------

const UPLOAD_TEMPLATES = {
  sales: [
    {
      party: parties.seriMurni,
      lines: [
        ['Beras wangi 10kg (bag)', 25, 42.0],
        ['Gula pasir 1kg', 40, 2.85],
      ],
    },
    {
      party: parties.majuJaya,
      lines: [
        ['Minyak masak 5kg', 18, 31.5],
        ['Delivery charge', 1, 45.0],
      ],
    },
  ],
  purchase: [
    {
      party: parties.majuJaya,
      lines: [['Gula pasir 50kg (bag)', 2, 142.0]],
      category: 'Cost of sales — stock',
    },
    {
      party: parties.percetakan,
      lines: [['Invoice books, 2-ply', 6, 16.0]],
      category: 'Printing & stationery',
    },
  ],
};

// ---------------------------------------------------------------------------
// Demo sample files (public/samples/*.png)
// Each PNG is rendered from buildSampleDocument() by scripts/render-samples.mjs,
// so the image and the extracted data always match exactly.
// Built on the first template of each type, with a fixed number and date.
// ---------------------------------------------------------------------------

export const SAMPLE_DOCUMENTS = {
  sales: {
    key: 'sales',
    label: 'Sample sales invoice',
    fileName: 'sample-sales-invoice-INV-2026-0418.png',
    src: '/samples/sample-sales-invoice.png',
    fileSize: 95141, // bytes — update after re-running scripts/render-samples.mjs
    // A sales invoice is issued by the client, so this sample belongs to Ali Trading.
    clientId: 'c1',
    number: 'INV-2026-0418',
    date: '2026-09-28',
    template: UPLOAD_TEMPLATES.sales[0],
    classification: '022',
    preview: 'invoice',
    // Buyer TIN is printed faded on the image, which is why it is low confidence.
    overrides: {
      buyerTin: { confidence: 62, reason: 'Faded text' },
      invoiceDate: { confidence: 83 },
    },
  },
  purchase: {
    key: 'purchase',
    label: 'Sample thermal receipt',
    fileName: 'sample-receipt-MJ-7802.png',
    src: '/samples/sample-receipt.png',
    fileSize: 49725, // bytes — update after re-running scripts/render-samples.mjs
    // Receipts don't name the buyer, so any client can record this purchase.
    clientId: null,
    number: 'MJ-7802',
    date: '2026-09-28',
    time: '10:42',
    template: UPLOAD_TEMPLATES.purchase[0],
    preview: 'receipt',
    // The total is printed faded on the thermal receipt.
    overrides: {
      total: { confidence: 66, reason: 'Faded thermal print' },
      invoiceDate: { confidence: 80 },
    },
  },
};

/** Builds the exact document a sample file represents (also used to render the PNG). */
export function buildSampleDocument(type, { id, client, uploadedAt, uploadedBy, status = 'processing' }) {
  const s = SAMPLE_DOCUMENTS[type];
  const t = s.template;
  return buildDocument({
    id,
    clientId: client.id,
    own: toParty(client),
    type,
    status,
    number: s.number,
    date: s.date,
    party: t.party,
    lines: t.lines,
    sstRate: (type === 'sales' ? client.sst : t.party.sst) ? 0.08 : 0,
    category: t.category,
    classification: s.classification,
    preview: s.preview,
    fileName: s.fileName,
    fileSize: s.fileSize,
    uploadedAt,
    uploadedBy,
    sampleImage: s.src,
    overrides: s.overrides,
  });
}

export const getSampleClient = (clients) => clients.find((c) => c.id === SAMPLE_DOCUMENTS.sales.clientId);

/**
 * @param {{ id, client, type, fileName, fileSize, uploadedAt, uploadedBy, sequence, sample? }} meta
 * sample: true = one of SAMPLE_DOCUMENTS; its data matches the PNG exactly.
 */
export function buildUploadedDocument(meta) {
  if (meta.sample) {
    return buildSampleDocument(meta.type, meta);
  }
  const templates = UPLOAD_TEMPLATES[meta.type];
  const t = templates[meta.sequence % templates.length];
  const { client } = meta;
  const isImage = /\.(jpe?g|png)$/i.test(meta.fileName);
  const number =
    meta.type === 'sales'
      ? `INV-2026-${String(500 + meta.sequence).padStart(4, '0')}`
      : `RCP-${90000 + meta.sequence}`;

  return buildDocument({
    id: meta.id,
    clientId: client.id,
    own: toParty(client),
    type: meta.type,
    status: 'processing',
    number,
    date: meta.uploadedAt.slice(0, 10),
    party: t.party,
    lines: t.lines,
    sstRate: (meta.type === 'sales' ? client.sst : t.party.sst) ? 0.08 : 0,
    category: t.category,
    preview: meta.type === 'purchase' && isImage ? 'receipt' : 'invoice',
    fileName: meta.fileName,
    fileSize: meta.fileSize,
    uploadedAt: meta.uploadedAt,
    uploadedBy: meta.uploadedBy,
    overrides: {
      buyerTin: { confidence: 62, reason: 'Low image quality' },
      sstAmount: { confidence: 69, reason: 'Faded text' },
      invoiceDate: { confidence: 83 },
    },
  });
}
