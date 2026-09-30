import { getValue } from './selectors.js';

const field = (doc, key) => getValue(doc, key);

export function prototypeJson(doc) {
  return JSON.stringify({
    schema: 'CukaiSmart prototype export v1 — not the official MyInvois schema',
    simulated: true,
    documentId: doc.id,
    documentType: doc.type,
    invoice: { number: field(doc, 'invoiceNo'), date: field(doc, 'invoiceDate') },
    supplier: {
      name: field(doc, 'supplierName'), tin: field(doc, 'supplierTin'),
      brn: field(doc, 'supplierBrn'), sstRegistration: field(doc, 'supplierSst'),
    },
    buyer: { name: field(doc, 'buyerName'), tin: field(doc, 'buyerTin'), brn: field(doc, 'buyerBrn') },
    classificationCode: field(doc, 'classificationCode'),
    expenseCategory: field(doc, 'expenseCategory'),
    amounts: { subtotal: field(doc, 'subtotal'), sst: field(doc, 'sstAmount'), total: field(doc, 'total'), currency: 'MYR' },
    extractedFields: doc.fields.map(({ key, label, value, confidence, confirmed, edited }) => ({
      key, label, value, confidence, confirmed, edited,
    })),
    sourceLineItems: doc.source.lines,
  }, null, 2);
}

const COLUMNS = [
  ['documentId', (doc) => doc.id],
  ['documentType', (doc) => doc.type],
  ['invoiceNumber', (doc) => field(doc, 'invoiceNo')],
  ['invoiceDate', (doc) => field(doc, 'invoiceDate')],
  ['supplierName', (doc) => field(doc, 'supplierName')],
  ['supplierTin', (doc) => field(doc, 'supplierTin')],
  ['supplierBrn', (doc) => field(doc, 'supplierBrn')],
  ['supplierSst', (doc) => field(doc, 'supplierSst')],
  ['buyerName', (doc) => field(doc, 'buyerName')],
  ['buyerTin', (doc) => field(doc, 'buyerTin')],
  ['buyerBrn', (doc) => field(doc, 'buyerBrn')],
  ['classificationCode', (doc) => field(doc, 'classificationCode')],
  ['expenseCategory', (doc) => field(doc, 'expenseCategory')],
  ['subtotalMYR', (doc) => field(doc, 'subtotal')],
  ['sstMYR', (doc) => field(doc, 'sstAmount')],
  ['totalMYR', (doc) => field(doc, 'total')],
  ['destination', (doc) => doc.destination],
];

const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export function prototypeCsv(doc) {
  return `${COLUMNS.map(([name]) => csvCell(name)).join(',')}\r\n${COLUMNS.map(([, read]) => csvCell(read(doc))).join(',')}\r\n`;
}

export function downloadDocument(doc, format) {
  if (format !== 'csv' && format !== 'json') throw new Error('Unsupported download format.');
  if (format === 'json' && doc.type !== 'sales') throw new Error('MyInvois prototype JSON is only available for sales invoices.');
  const number = String(field(doc, 'invoiceNo') || doc.id).replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 80);
  const content = format === 'json' ? prototypeJson(doc) : prototypeCsv(doc);
  const mime = format === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8';
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  let link;
  try {
    link = document.createElement('a');
    link.href = url;
    link.download = `${number}-cukaismart-prototype.${format}`;
    document.body.appendChild(link);
    link.click();
  } finally {
    link?.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
