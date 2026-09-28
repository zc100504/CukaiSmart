// Display formatters shared by every screen.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const rmFormatter = new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/** 1240 -> "RM 1,240.00" */
export function formatRM(amount) {
  if (amount === '' || amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—';
  return `RM ${rmFormatter.format(Number(amount))}`;
}

/** Current local time as "2026-09-28T10:14:00" — same shape as the seed data, so strings sort correctly. */
export function nowLocalISO(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`;
}

/** "2026-09-28" or ISO datetime -> "28 Sep 2026" */
export function formatDate(value) {
  if (!value) return '—';
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return String(value);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** ISO datetime -> "28 Sep 2026, 10:14" (local time) */
export function formatDateTime(value) {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}, ${hh}:${mm}`;
}

/** bytes -> "1.2 MB" / "248 KB" */
export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 580 -> "580", 10000 -> "10,000" */
export function formatNumber(n) {
  return Number(n).toLocaleString('en-MY');
}

/** "Razak Ismail" -> "RI" */
export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}
