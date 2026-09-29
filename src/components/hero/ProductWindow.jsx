import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SAMPLE_DOCUMENTS, buildSampleDocument, formatFieldValue, seedClients } from '../../data/mock-data.js';
import Badge from '../Badge.jsx';
import Button from '../Button.jsx';
import DocumentPreview, { FIELD_REGIONS } from '../DocumentPreview.jsx';
import Logo from '../Logo.jsx';
import useMediaQuery, { usePrefersReducedMotion } from '../useMediaQuery.js';
import FloatingCards from './FloatingCards.jsx';
import { heroMotion, notifyHeroMotion } from './heroMotion.js';
import { FINAL_T, LOOP, LOOPS_BEFORE_REST, TIN_FIELD, story } from './storyTimeline.js';

// ---- Scroll tilt (tune here) ----
/** Starting tilt: leaned back in perspective, slightly smaller. */
const START_ROTATE_X = 14; // degrees
const START_SCALE = 0.96;
const PERSPECTIVE = 1600; // px
/**
 * The window is flat once its top has risen to this share of the viewport height.
 * FLATTEN_DISTANCE (the scroll distance that takes) is worked out from it at runtime.
 */
const FLATTEN_AT_VIEWPORT = 0.25;

// ---- Mouse parallax (tune here) ----
/** Maximum rotation following the mouse (degrees). */
const PARALLAX_Y = 5;
const PARALLAX_X = 3;
/** Easing speed toward the mouse (higher = snappier). */
const PARALLAX_EASE = 6;
/** Grid floor shift at full parallax (px). */
const FLOOR_SHIFT = 18;

// ---- Depth layers (px toward the viewer) ----
export const DEPTH = {
  base: 0,
  doc: 24,
  panel: 24,
  tinLifted: 60, // flagged TIN row while it needs review
  cursor: 80,
  badgePop: 90, // MyInvois-ready badge at the top of its pop
  badgeRest: 40,
};

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

/**
 * Story time: runs while visible, plays LOOPS_BEFORE_REST times, then rests on the final frame.
 * Returns { t, clock } — clock is continuous seconds of play (drives gentle floating; stops at rest).
 */
function useStoryClock(running) {
  const [time, setTime] = useState({ t: 0, clock: 0 });
  const state = useRef({ t: 0, clock: 0, wraps: 0, rested: false });

  useEffect(() => {
    if (!running || state.current.rested) return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const s = state.current;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      let next = s.t + dt;
      s.clock += dt;
      if (next >= LOOP) {
        next %= LOOP;
        s.wraps += 1; // completed loops
      }
      // On the last loop, stop at the final frame and stay there.
      if (s.wraps === LOOPS_BEFORE_REST - 1 && next >= FINAL_T) {
        s.t = FINAL_T;
        s.rested = true;
        setTime({ t: FINAL_T, clock: s.clock });
        return;
      }
      s.t = next;
      setTime({ t: next, clock: s.clock });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  return { ...time, rested: state.current.rested };
}

/**
 * One motion loop for the window: scroll tilt (flattens as it scrolls up) combined with mouse
 * parallax. Applies the same transform to the window and the floating-card layer, shifts the
 * grid floor, and publishes the window's on-screen box for the 3D objects.
 */
function useWindowMotion({ pwRef, frameRef, cardsRef, tilt, parallax }) {
  useEffect(() => {
    const pw = pwRef.current;
    const frame = frameRef.current;
    const cards = cardsRef.current;
    if (!pw || !frame) return undefined;
    const hero = pw.closest('.hero-pw') || pw.parentElement;

    const target = { x: 0, y: 0 };
    const mouse = { x: 0, y: 0 };
    let raf = 0;
    let last = performance.now();

    const apply = () => {
      let transform = 'none';
      if (tilt) {
        const layoutTop = frame.getBoundingClientRect().top; // transform origin = top edge, so unaffected
        const startTop = layoutTop + window.scrollY;
        const FLATTEN_DISTANCE = Math.max(1, startTop - window.innerHeight * FLATTEN_AT_VIEWPORT);
        const p = Math.min(1, Math.max(0, (startTop - layoutTop) / FLATTEN_DISTANCE));
        const e = 1 - (1 - p) ** 3;
        const rx = START_ROTATE_X * (1 - e) - mouse.y * PARALLAX_X;
        const ry = mouse.x * PARALLAX_Y;
        const sc = START_SCALE + (1 - START_SCALE) * e;
        transform = `perspective(${PERSPECTIVE}px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) scale(${sc.toFixed(4)})`;
      }
      frame.style.transform = transform;
      if (cards) cards.style.transform = transform;
      pw.style.setProperty('--floor-x', `${(-mouse.x * FLOOR_SHIFT).toFixed(1)}px`);
      pw.style.setProperty('--floor-y', `${(-mouse.y * FLOOR_SHIFT * 0.5).toFixed(1)}px`);

      const h = hero.getBoundingClientRect();
      const f = frame.getBoundingClientRect();
      heroMotion.mouse.x = mouse.x;
      heroMotion.mouse.y = mouse.y;
      heroMotion.heroSize = { width: h.width, height: h.height };
      heroMotion.windowRect = { left: f.left - h.left, top: f.top - h.top, width: f.width, height: f.height };
      notifyHeroMotion();
    };

    const frameStep = (now) => {
      raf = 0;
      const k = 1 - Math.exp(-Math.min((now - last) / 1000, 0.1) * PARALLAX_EASE);
      last = now;
      mouse.x += (target.x - mouse.x) * k;
      mouse.y += (target.y - mouse.y) * k;
      apply();
      if (Math.abs(target.x - mouse.x) > 0.001 || Math.abs(target.y - mouse.y) > 0.001) request();
    };
    const request = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frameStep);
      }
    };
    const onPointer = (e) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = -((e.clientY / window.innerHeight) * 2 - 1);
      request();
    };

    apply();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    if (parallax) window.addEventListener('pointermove', onPointer, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
      window.removeEventListener('pointermove', onPointer);
      frame.style.transform = '';
      if (cards) cards.style.transform = '';
      heroMotion.mouse.x = 0;
      heroMotion.mouse.y = 0;
    };
  }, [pwRef, frameRef, cardsRef, tilt, parallax]);
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
 * the sample invoice and a person confirms the flagged field before approval. UI parts sit on
 * depth layers, the whole window follows the mouse, and two floating cards join the story.
 */
export default function ProductWindow() {
  const doc = useSampleDocument();
  const pwRef = useRef(null);
  const frameRef = useRef(null);
  const cardsRef = useRef(null);
  const bodyRef = useRef(null);
  const confirmRef = useRef(null);
  const approveRef = useRef(null);

  const reducedMotion = usePrefersReducedMotion();
  const compact = useMediaQuery('(max-width: 1023px)');
  const finePointer = useMediaQuery('(pointer: fine)');
  const inView = useInView(frameRef);
  const clock = useStoryClock(inView && !reducedMotion);
  const t = reducedMotion ? FINAL_T : clock.t;
  const s = story(t);

  // Publish story state for the 3D objects (coin spin, shield bounce, resting pose).
  heroMotion.story.t = t;
  heroMotion.story.clock = reducedMotion ? 0 : clock.clock;
  heroMotion.story.resting = reducedMotion || clock.rested;
  heroMotion.story.state = s;
  useEffect(() => {
    notifyHeroMotion();
  }, [t]);

  useWindowMotion({
    pwRef,
    frameRef,
    cardsRef,
    tilt: !reducedMotion && !compact,
    parallax: !reducedMotion && !compact && finePointer,
  });

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
  // Opacity below 1 flattens 3D layers, so it is only set during the reset fade.
  const fade = s.contentOpacity < 1 ? s.contentOpacity : undefined;
  const layer = (z, extra = '') => `translateZ(${z}px)${extra}`;
  const tinZ = (DEPTH.tinLifted - DEPTH.panel) * s.tinLift;
  const badgeZ = DEPTH.badgeRest - DEPTH.panel + (DEPTH.badgePop - DEPTH.badgeRest) * s.badgeLift;

  return (
    <div className="pw" ref={pwRef}>
      <p className="sr-only">
        Animated preview of CukaiSmart: the AI scans a sample invoice and fills in the extracted fields, flags the
        buyer&apos;s TIN because it is printed faintly, and a person confirms it before approving the invoice as
        MyInvois-ready.
      </p>
      <div className="pw-floor" aria-hidden="true" />

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

        <div className="pw__body" ref={bodyRef}>
          <div
            className="pw__doc"
            style={{
              opacity: Math.min(s.docIn, fade ?? 1),
              transform: layer(DEPTH.doc, ` translateY(${((1 - s.docIn) * 12).toFixed(1)}px)`),
            }}
          >
            <DocumentPreview doc={doc} highlights={highlights} faded={faded} />
            {s.scan.visible && <span className="pw__scan" style={{ top: `${s.scan.progress * 100}%` }} />}
          </div>

          <div className="pw__panel" style={{ opacity: fade, transform: layer(DEPTH.panel) }}>
            <div className="pw__panel-head">
              <p className="text-h3">Extracted fields</p>
              <span className="text-caption">{doc.fileName}</span>
            </div>
            <ul className="pw__rows">
              {ROWS.map((key) => {
                const isTin = key === TIN_FIELD;
                const state = isTin ? tinState : s.fields[key]?.checked ? 'ok' : 'pending';
                const label = ROW_LABELS[key] || field(key).label;
                const tinStyle = isTin
                  ? {
                      opacity: tinState !== 'pending' ? 0.4 + 0.6 * s.tin.shown : undefined,
                      transform: layer(tinZ, ` scale(${(1 + 0.03 * s.tinLift).toFixed(4)})`),
                    }
                  : undefined;
                return (
                  <li
                    key={key}
                    className={`pw-row pw-row--${state} ${isTin && s.tinLift > 0.01 ? 'pw-row--lifted' : ''}`}
                    style={tinStyle}
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
              <span
                className={`pw__badge ${s.badgeLift > 0.01 ? 'is-lifted' : ''}`}
                style={{
                  opacity: Math.min(1, s.badge),
                  transform: layer(badgeZ, ` scale(${(0.8 + 0.2 * s.badge).toFixed(4)})`),
                }}
              >
                <Badge status="ready">MyInvois-ready</Badge>
              </span>
            </div>
          </div>

          {cursor && (
            <span
              className={`pw-cursor ${s.cursor.pressed ? 'is-pressed' : ''}`}
              style={{ opacity: s.cursor.opacity, transform: `translate3d(${cursor.x}px, ${cursor.y}px, ${DEPTH.cursor}px)` }}
            >
              <svg width="22" height="26" viewBox="0 0 22 26">
                <path d="M2 2 L2 21 L7 16.5 L10.5 24 L14 22.5 L10.5 15 L17 15 Z" />
              </svg>
            </span>
          )}
        </div>
      </div>

      {/* Floating cards share the window's transform but stack above the 3D objects. */}
      <div className="pw__cards" ref={cardsRef} aria-hidden="true">
        <FloatingCards cards={s.cards} clock={clock.clock} contentOpacity={s.contentOpacity} />
      </div>
    </div>
  );
}
