// Pure helpers that derive everything shown on screen from state.
// Counts are never hard-coded — every screen uses these so numbers always match.
import { formatRM } from './format.js';

export const STATUS_ORDER = ['processing', 'needs-review', 'ready', 'error', 'submitted', 'exported'];
export const PENDING_STATUSES = ['processing', 'needs-review', 'error'];
export const COMPLETED_STATUSES = ['ready', 'submitted', 'exported'];

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

/** Confidence (0–100) -> 'high' | 'medium' | 'low' */
export function getLevel(confidence) {
  if (confidence >= 90) return 'high';
  if (confidence >= 75) return 'medium';
  return 'low';
}

export function getField(doc, key) {
  return doc.fields.find((f) => f.key === key);
}

export function getValue(doc, key) {
  return getField(doc, key)?.value ?? '';
}

/** Low-confidence fields a human has not yet confirmed or corrected. */
export function getPendingFields(doc) {
  return doc.fields.filter((f) => getLevel(f.confidence) === 'low' && !f.confirmed);
}

/** Row-level summary used by tables, cards and notifications. */
export function getDocSummary(doc) {
  const counterpartyKey = doc.type === 'sales' ? 'buyerName' : 'supplierName';
  return {
    number: getValue(doc, 'invoiceNo') || doc.fileName,
    counterparty: getValue(doc, counterpartyKey) || '—',
    date: getValue(doc, 'invoiceDate'),
    total: getValue(doc, 'total'),
  };
}

// ---------------------------------------------------------------------------
// Compliance checks (recomputed from current field values)
// ---------------------------------------------------------------------------

const TIN_PATTERN = /^(C|IG)\d{11}$/;
const BRN_PATTERN = /^\d{12}$/;

function check(id, label, passed, { blocking = true, fieldKey = null, pass, fail }) {
  return {
    id,
    label,
    status: passed ? 'pass' : blocking ? 'fail' : 'warning',
    blocking,
    fieldKey,
    message: passed ? pass : fail,
  };
}

function findDuplicate(doc, documents) {
  const invoiceNo = getValue(doc, 'invoiceNo');
  const supplierTin = getValue(doc, 'supplierTin');
  const supplierName = getValue(doc, 'supplierName');
  if (!invoiceNo) return null;
  return documents.find(
    (other) =>
      other.id !== doc.id &&
      other.clientId === doc.clientId &&
      other.type === doc.type &&
      other.uploadedAt < doc.uploadedAt &&
      getValue(other, 'invoiceNo') === invoiceNo &&
      (getValue(other, 'supplierTin') === supplierTin || getValue(other, 'supplierName') === supplierName)
  );
}

/**
 * Returns checks with blocking failures first, then warnings, then passes.
 * @param doc the document to check
 * @param documents all documents (for duplicate detection)
 */
export function getComplianceChecks(doc, documents = []) {
  const v = (key) => getValue(doc, key);
  const isSales = doc.type === 'sales';
  const checks = [];

  const supplierTin = v('supplierTin');
  if (isSales || supplierTin) {
    checks.push(
      check('supplier-tin', 'Supplier TIN format', TIN_PATTERN.test(supplierTin), {
        fieldKey: 'supplierTin',
        pass: `${supplierTin} is a valid TIN format.`,
        fail: supplierTin
          ? `"${supplierTin}" is not a valid TIN (C or IG followed by 11 digits).`
          : 'Supplier TIN is missing.',
      })
    );
  } else {
    checks.push(
      check('supplier-tin', 'Supplier TIN', false, {
        blocking: false,
        fieldKey: 'supplierTin',
        fail: 'Not shown on receipt. Common for small shops — record will use supplier name only.',
      })
    );
  }

  if (isSales) {
    const buyerTin = v('buyerTin');
    checks.push(
      check('buyer-tin', 'Buyer TIN', TIN_PATTERN.test(buyerTin), {
        fieldKey: 'buyerTin',
        pass: `${buyerTin} is a valid TIN format.`,
        fail: buyerTin
          ? `"${buyerTin}" is not a valid TIN (C or IG followed by 11 digits).`
          : 'Buyer TIN is missing — required for a MyInvois e-Invoice.',
      })
    );
    checks.push(
      check('classification', 'Classification code', Boolean(v('classificationCode')), {
        fieldKey: 'classificationCode',
        pass: 'Classification code present.',
        fail: 'Missing classification code — required for a MyInvois e-Invoice.',
      })
    );
  } else {
    checks.push(
      check('expense-category', 'Expense category', Boolean(v('expenseCategory')), {
        fieldKey: 'expenseCategory',
        pass: `Recorded under "${v('expenseCategory')}".`,
        fail: 'Choose an expense category for the accounting record.',
      })
    );
  }

  const subtotal = Number(v('subtotal')) || 0;
  const sst = Number(v('sstAmount')) || 0;
  const total = Number(v('total')) || 0;
  const expected = Math.round((subtotal + sst) * 100) / 100;
  checks.push(
    check('totals', 'Totals reconcile', Math.abs(expected - total) < 0.01, {
      fieldKey: 'total',
      pass: `${formatRM(subtotal)} + ${formatRM(sst)} SST = ${formatRM(total)}.`,
      fail: `Subtotal + SST = ${formatRM(expected)}, but total reads ${formatRM(total)}.`,
    })
  );

  const duplicate = findDuplicate(doc, documents);
  checks.push(
    check('duplicate', 'Duplicate invoice', !duplicate, {
      fieldKey: 'invoiceNo',
      pass: 'No matching invoice found in records.',
      fail: duplicate
        ? `Possible duplicate: ${getValue(duplicate, 'invoiceNo')} from ${getValue(duplicate, 'supplierName')} is already in records.`
        : '',
    })
  );

  const supplierSst = v('supplierSst');
  checks.push(
    check('sst-registration', 'SST registration no.', sst === 0 || Boolean(supplierSst), {
      blocking: false,
      fieldKey: 'supplierSst',
      pass: sst === 0 ? 'No SST charged.' : `SST charged by registered supplier ${supplierSst}.`,
      fail: 'SST is charged but no SST registration no. was found.',
    })
  );

  const brn = v('supplierBrn');
  checks.push(
    check('supplier-brn', 'Supplier BRN format', !brn || BRN_PATTERN.test(brn), {
      blocking: false,
      fieldKey: 'supplierBrn',
      pass: brn ? `${brn} is a valid 12-digit BRN.` : 'No BRN on document.',
      fail: `"${brn}" should be 12 digits.`,
    })
  );

  const rank = { fail: 0, warning: 1, pass: 2 };
  return checks.sort((a, b) => rank[a.status] - rank[b.status]);
}

export function getBlockers(doc, documents) {
  return getComplianceChecks(doc, documents).filter((c) => c.status === 'fail');
}

/** Status a document in the compliance stage should show right now. */
export function complianceStatus(doc, documents) {
  return getBlockers(doc, documents).length > 0 ? 'error' : 'needs-review';
}

/** 0–100 score: share of all checks passing (warnings count half). */
export function getComplianceScore(checks) {
  if (!checks.length) return 0;
  const points = checks.reduce((sum, c) => sum + (c.status === 'pass' ? 1 : c.status === 'warning' ? 0.5 : 0), 0);
  return Math.round((points / checks.length) * 100);
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export function getClientDocuments(documents, clientId) {
  return documents.filter((d) => d.clientId === clientId);
}

/** { processing, 'needs-review', ready, error, submitted, exported, total, pending, completed } */
export function countByStatus(documents) {
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]));
  documents.forEach((d) => {
    counts[d.status] += 1;
  });
  counts.total = documents.length;
  counts.pending = PENDING_STATUSES.reduce((n, s) => n + counts[s], 0);
  counts.completed = COMPLETED_STATUSES.reduce((n, s) => n + counts[s], 0);
  return counts;
}

/**
 * Documents a human needs to act on, most urgent first:
 * blocking errors → most unresolved low-confidence fields → earliest due date.
 */
export function getReviewQueue(documents) {
  return documents
    .filter((d) => d.status === 'needs-review' || d.status === 'error')
    .map((d) => ({ doc: d, pending: getPendingFields(d).length }))
    .sort((a, b) => {
      const errA = a.doc.status === 'error' ? 0 : 1;
      const errB = b.doc.status === 'error' ? 0 : 1;
      if (errA !== errB) return errA - errB;
      if (a.pending !== b.pending) return b.pending - a.pending;
      return a.doc.dueDate.localeCompare(b.doc.dueDate);
    })
    .map((x) => x.doc);
}

/** Where a document should open, based on its workflow stage. */
export function getDocRoute(doc) {
  const base = `/app/documents/${doc.id}`;
  switch (doc.stage) {
    case 'processing':
      return `${base}/processing`;
    case 'review':
      return `${base}/review`;
    case 'compliance':
      return `${base}/compliance`;
    default:
      return `${base}/finish`;
  }
}

/** Next free document id, e.g. "d1021". */
export function nextDocumentId(documents) {
  const max = documents.reduce((m, d) => Math.max(m, Number(d.id.slice(1)) || 0), 1000);
  return `d${max + 1}`;
}

/** Simulated MyInvois reference in UUID style. */
export function makeReference() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, hex);
}
