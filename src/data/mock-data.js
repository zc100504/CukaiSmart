// Fictional sample data only. Expanded in Phase 1.

export const clients = [
  { id: 'c1', name: 'Ali Trading Sdn Bhd', tin: 'C20880145020', brn: '201901034567' },
  { id: 'c2', name: 'Nasi Kandar Cafe', tin: 'IG21475839010', brn: '202003012345' },
  { id: 'c3', name: 'Teh Tarik Enterprise', tin: 'IG30582716040', brn: '202103045678' },
  { id: 'c4', name: 'Kedai Runcit Maju', tin: 'IG11938472050', brn: '201803067890' },
];

// type: 'sales' (Sales e-Invoice) | 'purchase' (Purchase invoice / receipt)
export const documents = [
  {
    id: 'd1001',
    clientId: 'c1',
    type: 'sales',
    number: 'INV-2026-0412',
    counterparty: 'Teh Tarik Enterprise',
    date: '2026-09-28',
    total: 1240,
    status: 'needs-review',
  },
  {
    id: 'd1002',
    clientId: 'c1',
    type: 'purchase',
    number: 'RCP-88213',
    counterparty: 'Kedai Runcit Maju',
    date: '2026-09-27',
    total: 86.4,
    status: 'processing',
  },
  {
    id: 'd1003',
    clientId: 'c2',
    type: 'sales',
    number: 'INV-NK-0098',
    counterparty: 'Ali Trading Sdn Bhd',
    date: '2026-09-26',
    total: 3512.5,
    status: 'ready',
  },
  {
    id: 'd1004',
    clientId: 'c3',
    type: 'purchase',
    number: 'SUP-7741',
    counterparty: 'Nasi Kandar Cafe',
    date: '2026-09-25',
    total: 452,
    status: 'error',
  },
  {
    id: 'd1005',
    clientId: 'c2',
    type: 'sales',
    number: 'INV-NK-0097',
    counterparty: 'Kedai Runcit Maju',
    date: '2026-09-24',
    total: 980,
    status: 'submitted',
  },
  {
    id: 'd1006',
    clientId: 'c4',
    type: 'purchase',
    number: 'RCP-10293',
    counterparty: 'Ali Trading Sdn Bhd',
    date: '2026-09-22',
    total: 215.3,
    status: 'exported',
  },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 1240 -> "RM 1,240.00" */
export function formatRM(amount) {
  return `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "2026-09-28" -> "28 Sep 2026" */
export function formatDate(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
