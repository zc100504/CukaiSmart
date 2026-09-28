// The AI-and-human story inside the hero product window, as a pure function of time
// (so reduced motion can show any moment, and the loop can rest on the final frame).
//
// 0.0–1.0s  document preview fades in                       "Uploading…"
// 1.0–3.5s  teal scan sweeps down; fields type in with ✓     "AI extracting…"
// 3.5–5.0s  Buyer TIN appears amber: "Faded text" + Confirm  "1 field needs review"
// 5.0–6.5s  cursor glides to Confirm, clicks → row turns green, Approve enables
// 6.5–7.5s  cursor clicks Approve → MyInvois-ready badge     "MyInvois-ready"
// 7.5–9.0s  hold, then a soft reset

export const LOOP = 9;
/** Full loops before the animation rests on the final frame (WCAG 2.2.2). */
export const LOOPS_BEFORE_REST = 3;
/** Final settled frame: reduced motion and the resting state show this. */
export const FINAL_T = 8.3;

/** Order and timing of the extracted fields (row key → the moment the scan reads it). */
export const FIELD_TIMES = {
  supplierName: 1.35,
  invoiceNo: 1.6,
  invoiceDate: 1.75,
  buyerName: 2.2,
  sstAmount: 3.0,
  total: 3.2,
};
export const TIN_FIELD = 'buyerTin';
const TYPE_DURATION = 0.35;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const seg = (t, a, b) => clamp01((t - a) / (b - a));
export const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const easeOutBack = (x) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return x <= 0 ? 0 : 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};

const CONFIRM_CLICK = 5.7;
const APPROVE_CLICK = 7.05;

/** Status chip in the window's top bar. */
export function statusAt(t) {
  if (t < 1) return { key: 'uploading', label: 'Uploading…', badge: 'processing' };
  if (t < 3.5) return { key: 'extracting', label: 'AI extracting…', badge: 'processing' };
  if (t < CONFIRM_CLICK + 0.1) return { key: 'review', label: '1 field needs review', badge: 'needs-review' };
  if (t < APPROVE_CLICK + 0.05) return { key: 'approve', label: 'Ready to approve', badge: 'processing' };
  return { key: 'ready', label: 'MyInvois-ready', badge: 'ready' };
}

/** Everything the window shows at time t. */
export function story(t) {
  const fields = Object.fromEntries(
    Object.entries(FIELD_TIMES).map(([key, at]) => [
      key,
      { typed: seg(t, at, at + TYPE_DURATION), checked: t >= at + TYPE_DURATION, scanning: t >= at - 0.2 && t < at + 0.3 },
    ])
  );

  const tinShown = ease(seg(t, 3.5, 3.9));
  const tinOk = t >= CONFIRM_CLICK + 0.1;

  // Cursor: in from outside → Confirm → Approve → fades away.
  const toConfirm = ease(seg(t, 5.0, 5.6));
  const toApprove = ease(seg(t, 6.45, 7.0));
  const cursorOpacity = Math.min(seg(t, 4.95, 5.2), 1 - seg(t, 7.6, 8.0));

  return {
    status: statusAt(t),
    docIn: ease(seg(t, 0, 1)),
    /** Whole-window content fade for the soft reset (8.6–9.0s) and the fade-in at the start. */
    contentOpacity: Math.min(1, 1 - seg(t, 8.6, 9.0)),
    scan: { visible: t >= 1 && t < 3.5, progress: seg(t, 1, 3.5) },
    fields,
    tin: { shown: tinShown, ok: tinOk, typed: seg(t, 3.5, 3.5 + TYPE_DURATION) },
    approveEnabled: tinOk,
    badge: easeOutBack(seg(t, APPROVE_CLICK + 0.05, APPROVE_CLICK + 0.45)),
    cursor: {
      opacity: cursorOpacity,
      toConfirm,
      toApprove,
      pressed: (t >= CONFIRM_CLICK && t < CONFIRM_CLICK + 0.15) || (t >= APPROVE_CLICK && t < APPROVE_CLICK + 0.15),
    },
    ripple: {
      confirm: seg(t, CONFIRM_CLICK, CONFIRM_CLICK + 0.45),
      approve: seg(t, APPROVE_CLICK, APPROVE_CLICK + 0.45),
    },
  };
}
