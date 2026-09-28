import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SAMPLE_DOCUMENTS, buildSampleDocument, formatFieldValue, seedClients } from '../../data/mock-data.js';
import Badge from '../Badge.jsx';
import Button from '../Button.jsx';
import DocumentPreview, { FIELD_REGIONS } from '../DocumentPreview.jsx';
import Logo from '../Logo.jsx';
import useMediaQuery, { usePrefersReducedMotion } from '../useMediaQuery.js';
import { FINAL_T, LOOP, LOOPS_BEFORE_REST, TIN_FIELD, story } from './storyTimeline.js';

// ---- Tilt (tune here) ----
/** Starting tilt: leaned back in perspective, slightly smaller. */
const START_ROTATE_X = 14; // degrees
const START_SCALE = 0.96;
const PERSPECTIVE = 1600; // px
/**
 * The window is flat once its top has risen to this share of the viewport height.
 * FLATTEN_DISTANCE (the scroll distance that takes) is worked out from it at runtime.
 */
const FLATTEN_AT_VIEWPORT = 0.25;

/** Rows in the "Extracted fields" panel, top to bottom. */
const ROWS = ['supplierName', 'invoiceNo', 'invoiceDate', 'buyerName', 'buyerTin', 'sstAmount', 'total'];
const ROW_LABELS = { supplierName: 'Supplier', buyerName: 'Buyer' };

// The same sample document the Upload page offers, so the hero matches the real demo.
function useSampleDocument() {
  return useMemo(() => {
    const client = seedClients.find((c) => c.id === SAMPLE_DOCUMENTS.sales.clientId);
    return buildSampleDocument('sales', { id: 'hero', client, uploadedAt: '2026-09-28T10:00:00', uploadedBy: 'Demo' });
  }, []);
}

/** Story time in seconds: runs while visible, plays LOOPS_BEFORE_REST times, then rests on the final frame. */
function useStoryClock(running) {
  const [t, setT] = useState(0);
  const state = useRef({ t: 0, wraps: 0, rested: false });

  useEffect(() => {
    if (!running || state.current.rested) return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const s = state.current;
      let next = s.t + Math.min((now - last) / 1000, 0.1);
      last = now;
      if (next >= LOOP) {
        next %= LOOP;
        s.wraps += 1; // completed loops
      }
      // On the last loop, stop at the final frame and stay there.
      if (s.wraps === LOOPS_BEFORE_REST - 1 && next >= FINAL_T) {
        s.t = FINAL_T;
        s.rested = true;
        setT(FINAL_T);
        return;
      }
      s.t = next;
      setT(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  return t;
}

/** Leans the window back and flattens it as it scrolls up (rAF-throttled). */
function useScrollTilt(ref, enabled) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!enabled) {
      el.style.transform = 'none';
      return undefined;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect(); // top edge is the transform origin, so it isn't moved by the tilt
      const startTop = rect.top + window.scrollY; // where the top sits before any scrolling
      const flatTop = window.innerHeight * FLATTEN_AT_VIEWPORT;
      const FLATTEN_DISTANCE = Math.max(1, startTop - flatTop);
      const p = Math.min(1, Math.max(0, (startTop - rect.top) / FLATTEN_DISTANCE));
      const e = 1 - (1 - p) ** 3; // ease-out
      const rx = START_ROTATE_X * (1 - e);
      const sc = START_SCALE + (1 - START_SCALE) * e;
      el.style.transform = `perspective(${PERSPECTIVE}px) rotateX(${rx.toFixed(3)}deg) scale(${sc.toFixed(4)})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      el.style.transform = '';
    };
  }, [ref, enabled]);
}

function useInView(ref) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.15 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

/** Centre of `el` relative to `container`, in layout px (ignores the tilt transform). */
function centreWithin(el, container) {
  let x = el.offsetWidth / 2;
  let y = el.offsetHeight / 2;
  let node = el;
  while (node && node !== container) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return { x, y };
}

const lerp = (a, b, k) => a + (b - a) * k;

/**
 * Decorative "product window" for the landing hero: a miniature Review screen where AI reads
 * the sample invoice and a person confirms the flagged field before approval.
 */
export default function ProductWindow() {
  const doc = useSampleDocument();
  const frameRef = useRef(null);
  const bodyRef = useRef(null);
  const confirmRef = useRef(null);
  const approveRef = useRef(null);

  const reducedMotion = usePrefersReducedMotion();
  const compact = useMediaQuery('(max-width: 1023px)');
  const inView = useInView(frameRef);
  const clock = useStoryClock(inView && !reducedMotion);
  const t = reducedMotion ? FINAL_T : clock;
  const s = story(t);

  useScrollTilt(frameRef, !reducedMotion && !compact);

  // Cursor targets, measured in layout px inside the window body.
  const [targets, setTargets] = useState(null);
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return undefined;
    const measure = () => {
      if (!confirmRef.current || !approveRef.current) return;
      setTargets({
        confirm: centreWithin(confirmRef.current, body),
        approve: centreWithin(approveRef.current, body),
        width: body.offsetWidth,
        height: body.offsetHeight,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(body);
    return () => ro.disconnect();
  }, []);

  const field = (key) => doc.fields.find((f) => f.key === key);
  const faded = doc.fields.filter((f) => f.reason === 'Faded text').map((f) => FIELD_REGIONS[f.key]);

  // Document highlights follow the scan; the TIN region turns amber, then green.
  const highlights = {};
  Object.entries(s.fields).forEach(([key, st]) => {
    if (st.scanning) highlights[FIELD_REGIONS[key]] = 'scan';
  });
  if (s.tin.shown > 0.01) highlights[FIELD_REGIONS[TIN_FIELD]] = s.tin.ok ? 'ok' : 'warn';

  // Cursor path: from outside the window (or near Confirm on small screens) → Confirm → Approve.
  let cursor = null;
  if (targets && s.cursor.opacity > 0.01) {
    const start = compact
      ? { x: targets.confirm.x + 70, y: targets.confirm.y + 60 }
      : { x: targets.width + 40, y: targets.height * 0.9 };
    const a = { x: lerp(start.x, targets.confirm.x, s.cursor.toConfirm), y: lerp(start.y, targets.confirm.y, s.cursor.toConfirm) };
    cursor = { x: lerp(a.x, targets.approve.x, s.cursor.toApprove), y: lerp(a.y, targets.approve.y, s.cursor.toApprove) };
  }

  const renderValue = (key) => {
    const f = field(key);
    const text = formatFieldValue(f.format, f.value);
    const st = key === TIN_FIELD ? { typed: s.tin.typed, checked: s.tin.ok } : s.fields[key];
    if (!st || st.typed <= 0) return <span className="pw-row__skeleton" />;
    return <span>{text.slice(0, Math.ceil(text.length * st.typed))}</span>;
  };

  const tinState = s.tin.shown <= 0.01 ? 'pending' : s.tin.ok ? 'ok' : 'warn';

  return (
    <div className="pw">
      <p className="sr-only">
        Animated preview of CukaiSmart: the AI scans a sample invoice and fills in the extracted fields, flags the
        buyer&apos;s TIN because it is printed faintly, and a person confirms it before approving the invoice as
        MyInvois-ready.
      </p>
      <div className="pw__frame" ref={frameRef} aria-hidden="true" inert="">
        <div className="pw__bar">
          <span className="pw__dots">
            <span />
            <span />
            <span />
          </span>
          <Logo to={null} size="sm" />
          <span className="pw__status">
            <Badge status={s.status.badge}>{s.status.label}</Badge>
          </span>
        </div>

        <div className="pw__body" ref={bodyRef} style={{ opacity: s.contentOpacity }}>
          <div className="pw__doc" style={{ opacity: s.docIn, transform: `translateY(${(1 - s.docIn) * 12}px)` }}>
            <DocumentPreview doc={doc} highlights={highlights} faded={faded} />
            {s.scan.visible && <span className="pw__scan" style={{ top: `${s.scan.progress * 100}%` }} />}
          </div>

          <div className="pw__panel">
            <div className="pw__panel-head">
              <p className="text-h3">Extracted fields</p>
              <span className="text-caption">{doc.fileName}</span>
            </div>
            <ul className="pw__rows">
              {ROWS.map((key) => {
                const isTin = key === TIN_FIELD;
                const state = isTin ? tinState : s.fields[key]?.checked ? 'ok' : 'pending';
                const label = ROW_LABELS[key] || field(key).label;
                return (
                  <li
                    key={key}
                    className={`pw-row pw-row--${state}`}
                    style={isTin && tinState !== 'pending' ? { opacity: 0.4 + 0.6 * s.tin.shown } : undefined}
                  >
                    <span className="pw-row__label">{label}</span>
                    <span className="pw-row__value">{renderValue(key)}</span>
                    <span className="pw-row__icon">
                      {state === 'ok' && <CheckCircle2 size={16} />}
                      {state === 'warn' && <AlertTriangle size={16} />}
                    </span>
                    {/* Always laid out (hidden until flagged) so the Confirm target can be measured and nothing jumps. */}
                    {isTin && (
                      <span className="pw-row__extra" style={{ visibility: tinState === 'pending' ? 'hidden' : 'visible' }}>
                        {state !== 'ok' ? (
                          <>
                            <span className="pw-row__reason">{field(key).reason}</span>
                            <span className="pw-confirm" ref={confirmRef}>
                              <Button size="sm" variant="secondary" tabIndex={-1}>
                                Confirm
                              </Button>
                              {s.ripple.confirm > 0 && s.ripple.confirm < 1 && (
                                <span className="pw-ripple" style={{ '--p': s.ripple.confirm }} />
                              )}
                            </span>
                          </>
                        ) : (
                          <span className="pw-row__confirmed">Confirmed</span>
                        )}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="pw__footer">
              <span className="pw-approve" ref={approveRef}>
                <Button tabIndex={-1} disabled={!s.approveEnabled}>
                  Approve
                </Button>
                {s.ripple.approve > 0 && s.ripple.approve < 1 && <span className="pw-ripple" style={{ '--p': s.ripple.approve }} />}
              </span>
              <span className="pw__badge" style={{ opacity: Math.min(1, s.badge), transform: `scale(${0.8 + 0.2 * s.badge})` }}>
                <Badge status="ready">MyInvois-ready</Badge>
              </span>
            </div>
          </div>

          {cursor && (
            <span
              className={`pw-cursor ${s.cursor.pressed ? 'is-pressed' : ''}`}
              style={{ opacity: s.cursor.opacity, transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
            >
              <svg width="22" height="26" viewBox="0 0 22 26">
                <path d="M2 2 L2 21 L7 16.5 L10.5 24 L14 22.5 L10.5 15 L17 15 Z" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
