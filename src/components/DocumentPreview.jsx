import { formatDate } from '../data/format.js';
import { formatFieldValue } from '../data/mock-data.js';

/** Extracted field key → the region of the printed document it was read from. */
export const FIELD_REGIONS = {
  supplierName: 'supplier',
  supplierTin: 'supplier',
  supplierBrn: 'supplier',
  supplierSst: 'supplier',
  invoiceNo: 'meta',
  invoiceDate: 'meta',
  buyerName: 'buyer',
  buyerBrn: 'buyer',
  buyerTin: 'buyerTin',
  classificationCode: 'classification',
  subtotal: 'subtotal',
  sstAmount: 'tax',
  total: 'total',
};

const money = (n) => Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * HTML/CSS drawing of a sales / purchase invoice from a document's `source` data.
 * highlights: { [region]: 'scan' | 'warn' | 'ok' } — outlines a region (e.g. while it is read).
 * faded: regions printed faintly (why a field was read with low confidence).
 */
export default function DocumentPreview({ doc, highlights = {}, faded = [], className = '' }) {
  const s = doc.source;
  const region = (key) =>
    ['docp-region', highlights[key] && `docp-region--${highlights[key]}`, faded.includes(key) && 'docp-region--faded']
      .filter(Boolean)
      .join(' ');
  const classification = doc.fields.find((f) => f.key === 'classificationCode')?.value;

  return (
    <div className={`docp ${className}`}>
      <div className="docp__head">
        <div className={region('supplier')}>
          <p className="docp__company">{s.supplier.name.toUpperCase()}</p>
          <p className="docp__muted">({s.supplier.brn})</p>
          <p>{s.supplier.address}</p>
          <p>TIN: {s.supplier.tin}</p>
          {s.supplier.sst && <p>SST No: {s.supplier.sst}</p>}
        </div>
        <div className="docp__title-block">
          <p className="docp__title">INVOICE</p>
          <dl className={`docp__meta ${region('meta')}`}>
            <dt>Invoice No</dt>
            <dd>{s.invoiceNo}</dd>
            <dt>Date</dt>
            <dd>{formatDate(s.date)}</dd>
          </dl>
        </div>
      </div>

      <div className="docp__bill">
        <div>
          <p className="docp__label">Bill to</p>
          <div className={region('buyer')}>
            <p className="docp__buyer">{s.buyer.name}</p>
            <p className="docp__muted">({s.buyer.brn})</p>
          </div>
          <p className={region('buyerTin')}>TIN: {s.buyer.tin}</p>
        </div>
        {doc.type === 'sales' && classification && (
          <div className={`docp__class ${region('classification')}`}>
            <p className="docp__label">e-Invoice classification</p>
            <p>{formatFieldValue('classification', classification)}</p>
          </div>
        )}
      </div>

      <table className="docp__lines">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit (RM)</th>
            <th>Amount (RM)</th>
          </tr>
        </thead>
        <tbody>
          {s.lines.map((l) => (
            <tr key={l.description}>
              <td>{l.description}</td>
              <td>{l.qty}</td>
              <td>{money(l.unitPrice)}</td>
              <td>{money(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="docp__totals">
        <p className={region('subtotal')}>
          <span>Subtotal</span>
          <span>{money(s.subtotal)}</span>
        </p>
        <p className={region('tax')}>
          <span>{s.taxLabel || `SST ${Math.round(s.sstRate * 100)}%`}</span>
          <span>{money(s.sstAmount)}</span>
        </p>
        <p className={`docp__total ${region('total')}`}>
          <span>Total</span>
          <span>RM {money(s.total)}</span>
        </p>
      </div>
    </div>
  );
}
