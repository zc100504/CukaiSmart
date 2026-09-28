// Renders the demo sample documents in public/samples/ from the same data the app uses,
// so what the image shows is exactly what the "AI" extracts.
//
//   node scripts/render-samples.mjs
//
// Needs a local Chrome or Edge (headless screenshot). Re-run after changing SAMPLE_DOCUMENTS,
// then copy the printed byte sizes into SAMPLE_DOCUMENTS[*].fileSize.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SAMPLE_DOCUMENTS, buildSampleDocument, formatFieldValue, seedClients } from '../src/data/mock-data.js';
import { formatDate } from '../src/data/format.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'samples');
mkdirSync(outDir, { recursive: true });

const BROWSERS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];
const browser = BROWSERS.find((p) => existsSync(p));
if (!browser) throw new Error('No Chrome/Edge found for headless rendering.');

const num = (n) => Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// The sales sample is issued by its fixed client; the receipt doesn't print a buyer.
const client = seedClients.find((c) => c.id === SAMPLE_DOCUMENTS.sales.clientId);
const opts = { id: 'sample', client, uploadedAt: '2026-09-28T10:45:00', uploadedBy: 'Sample' };

// ---------------------------------------------------------------------------
// Sales invoice (A4 at 150 dpi)
// ---------------------------------------------------------------------------
function invoiceHtml(doc) {
  const s = doc.source;
  const { supplier: sup, buyer } = s;
  const rows = s.lines
    .map(
      (l, i) => `<tr><td>${i + 1}</td><td>${esc(l.description)}</td><td class="r">${l.qty}</td>
        <td class="r">${num(l.unitPrice)}</td><td class="r">${num(l.amount)}</td></tr>`
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1240px; height: 1754px; padding: 96px 104px; background: #fff; color: #1f2933;
         font-family: "Segoe UI", Arial, sans-serif; font-size: 22px; line-height: 1.45; }
  .head { display: flex; justify-content: space-between; padding-bottom: 32px; border-bottom: 4px solid #1f2933; }
  .co { font-size: 36px; font-weight: 700; letter-spacing: .02em; }
  .muted { color: #52606d; }
  .title { font-size: 56px; font-weight: 700; letter-spacing: .12em; text-align: right; }
  .meta { margin-top: 12px; border-collapse: collapse; margin-left: auto; }
  .meta td { padding: 2px 0 2px 24px; } .meta td:first-child { color: #52606d; }
  .meta td:last-child { font-weight: 600; text-align: right; }
  .bill { display: flex; justify-content: space-between; margin-top: 48px; }
  .label { font-size: 18px; font-weight: 700; letter-spacing: .08em; color: #52606d; text-transform: uppercase; }
  .faded { color: #b9bec4; }
  table.items { width: 100%; margin-top: 56px; border-collapse: collapse; }
  .items th { padding: 14px 12px; background: #eef1f4; font-size: 19px; text-align: left; }
  .items td { padding: 18px 12px; border-bottom: 1px solid #d9dee3; }
  .r { text-align: right; }
  .totals { width: 460px; margin: 32px 0 0 auto; border-collapse: collapse; }
  .totals td { padding: 8px 12px; } .totals td:last-child { text-align: right; }
  .totals .grand td { padding-top: 16px; border-top: 3px solid #1f2933; font-size: 28px; font-weight: 700; }
  .foot { position: absolute; left: 104px; right: 104px; bottom: 96px; padding-top: 20px;
          border-top: 1px solid #d9dee3; font-size: 18px; color: #52606d; }
  </style></head><body>
  <div class="head">
    <div>
      <p class="co">${esc(sup.name.toUpperCase())}</p>
      <p class="muted">(${sup.brn})</p>
      <p>${esc(sup.address)}</p>
      <p>TIN: ${sup.tin} &nbsp;·&nbsp; SST No: ${sup.sst}</p>
    </div>
    <div>
      <p class="title">INVOICE</p>
      <table class="meta">
        <tr><td>Invoice No</td><td>${s.invoiceNo}</td></tr>
        <tr><td>Date</td><td>${formatDate(s.date)}</td></tr>
        <tr><td>Terms</td><td>30 days</td></tr>
      </table>
    </div>
  </div>
  <div class="bill">
    <div>
      <p class="label">Bill to</p>
      <p style="font-weight:600;font-size:26px">${esc(buyer.name)}</p>
      <p class="muted">(${buyer.brn})</p>
      <p>${esc(buyer.address)}</p>
      <p class="faded">TIN: ${buyer.tin}</p>
    </div>
    <div style="text-align:right">
      <p class="label">e-Invoice classification</p>
      <p style="font-weight:600">${esc(formatFieldValue('classification', doc.fields.find((f) => f.key === 'classificationCode').value))}</p>
    </div>
  </div>
  <table class="items">
    <tr><th style="width:60px">No</th><th>Description</th><th class="r">Qty</th><th class="r">Unit price (RM)</th><th class="r">Amount (RM)</th></tr>
    ${rows}
  </table>
  <table class="totals">
    <tr><td>Subtotal</td><td>${num(s.subtotal)}</td></tr>
    <tr><td>SST ${Math.round(s.sstRate * 100)}%</td><td>${num(s.sstAmount)}</td></tr>
    <tr class="grand"><td>Total</td><td>RM ${num(s.total)}</td></tr>
  </table>
  <p class="foot">This is a computer-generated invoice. Sample document for the CukaiSmart prototype — fictional data.</p>
  </body></html>`;
}

// ---------------------------------------------------------------------------
// Thermal receipt (80 mm roll)
// ---------------------------------------------------------------------------
function receiptHtml(doc, time) {
  const s = doc.source;
  const sup = s.supplier;
  const items = s.lines
    .map(
      (l) => `<p>${esc(l.description)}</p>
      <p class="row"><span>&nbsp;&nbsp;${l.qty} x ${num(l.unitPrice)}</span><span>${num(l.amount)}</span></p>`
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 576px; height: 930px; padding: 48px 40px; background: #fbfaf6; color: #232323;
         font-family: Consolas, "Courier New", monospace; font-size: 22px; line-height: 1.5; }
  .c { text-align: center; } .b { font-weight: 700; }
  .row { display: flex; justify-content: space-between; }
  hr { margin: 16px 0; border: none; border-top: 2px dashed #6b6b6b; }
  .big { font-size: 28px; }
  .faded { opacity: .38; }
  .barcode { height: 90px; margin: 24px 40px 12px;
    background: repeating-linear-gradient(90deg, #232323 0 3px, transparent 3px 7px, #232323 7px 8px, transparent 8px 13px, #232323 13px 17px, transparent 17px 20px); }
  </style></head><body>
  <p class="c b big">${esc(sup.name.toUpperCase())}</p>
  <p class="c">(${sup.brn})</p>
  <p class="c">${esc(sup.address)}</p>
  <p class="c">TIN: ${sup.tin}</p>
  <p class="c">SST No: ${sup.sst}</p>
  <hr>
  <p class="c b">RESIT / RECEIPT</p>
  <p class="row"><span>No:</span><span>${s.invoiceNo}</span></p>
  <p class="row"><span>Date:</span><span>${formatDate(s.date)} ${time}</span></p>
  <p class="row"><span>Cashier:</span><span>03</span></p>
  <hr>
  ${items}
  <hr>
  <p class="row"><span>Subtotal</span><span>${num(s.subtotal)}</span></p>
  <p class="row"><span>SST ${Math.round(s.sstRate * 100)}%</span><span>${num(s.sstAmount)}</span></p>
  <p class="row b big faded"><span>TOTAL</span><span>RM ${num(s.total)}</span></p>
  <hr>
  <p class="c b">TERIMA KASIH / THANK YOU</p>
  <div class="barcode"></div>
  <p class="c" style="font-size:17px">Sample receipt — fictional data</p>
  </body></html>`;
}

// ---------------------------------------------------------------------------

const tmp = mkdtempSync(join(tmpdir(), 'cukaismart-samples-'));
const jobs = [
  { type: 'sales', html: invoiceHtml, size: [1240, 1754], out: 'sample-sales-invoice.png' },
  { type: 'purchase', html: receiptHtml, size: [576, 930], out: 'sample-receipt.png' },
];

for (const job of jobs) {
  const doc = buildSampleDocument(job.type, opts);
  const htmlPath = join(tmp, `${job.type}.html`);
  writeFileSync(htmlPath, job.html(doc, SAMPLE_DOCUMENTS[job.type].time));
  const outPath = join(outDir, job.out);
  execFileSync(browser, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${job.size[0]},${job.size[1]}`,
    `--screenshot=${outPath}`,
    pathToFileURL(htmlPath).href,
  ], { stdio: 'ignore' });
  const s = doc.source;
  console.log(
    `${job.out}: ${statSync(outPath).size} bytes · ${s.invoiceNo} · ${s.date} · ${s.supplier.name} → ${s.buyer.name}` +
      ` · subtotal ${s.subtotal} · SST ${s.sstAmount} · total ${s.total}`
  );
}
