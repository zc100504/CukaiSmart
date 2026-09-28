import { Component, Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import useMediaQuery, { usePrefersReducedMotion } from '../useMediaQuery.js';
import HeroFallback from './HeroFallback.jsx';
import HeroSteps from './HeroSteps.jsx';
import { STAGES } from './timeline.js';
import { referenceLayout, stageTransform, toScreen } from './stage.js';

// three.js only downloads when the scene is actually going to run.
const HeroScene = lazy(() => import('./HeroScene.jsx'));

const FONT_SPECS = ['400 20px Inter', '500 20px Inter', '600 20px Inter', '700 20px Inter'];
const FONT_TIMEOUT_MS = 5000;

function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** 'loading' | 'ready' | 'failed' — ready only once every Inter weight used on the canvas has loaded. */
function useFontsReady(enabled) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!enabled) return undefined;
    if (!document.fonts?.load) {
      setStatus('failed');
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setStatus((s) => (s === 'loading' ? 'failed' : s));
    }, FONT_TIMEOUT_MS);

    Promise.all(FONT_SPECS.map((spec) => document.fonts.load(spec)))
      .then((results) => {
        // load() resolves with [] when no Inter face matched — treat that as a failure.
        if (!cancelled) setStatus(results.every((faces) => faces.length > 0) ? 'ready' : 'failed');
      })
      .catch(() => {
        if (!cancelled) setStatus('failed');
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled]);

  return status;
}

function useInView(ref, enabled) {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    if (!enabled || !ref.current || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '100px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, enabled]);
  return inView;
}

/** Any failure inside the 3D scene (chunk load, WebGL context, render) falls back to the static version. */
class SceneBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const DRAG_LIMIT = { y: 0.44, x: 0.21 }; // ≈ ±25° sideways, ±12° up/down; springs back on release
const DRAG_PADDING = 40; // px around the invoice that also starts a drag
const clampTo = (v, m) => Math.max(-m, Math.min(m, v));

/**
 * Hero size (for the stage transform) and the text block's rectangle relative to it.
 * The rectangle is only used to mask hand dots behind the text — sizing is proportional (stage.js).
 */
function useHeroGeometry(stageRef, textRef, enabled) {
  const [geo, setGeo] = useState(null);

  useLayoutEffect(() => {
    if (!enabled) return undefined;
    const measure = () => {
      const stage = stageRef.current?.getBoundingClientRect();
      const text = textRef?.current?.getBoundingClientRect();
      if (!stage) return;
      const next = {
        width: Math.round(stage.width),
        height: Math.round(stage.height),
        text: text
          ? {
              left: Math.round(text.left - stage.left),
              top: Math.round(text.top - stage.top),
              right: Math.round(text.right - stage.left),
              bottom: Math.round(text.bottom - stage.top),
            }
          : null,
      };
      setGeo((prev) => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    [stageRef.current, textRef?.current].forEach((el) => el && ro.observe(el));
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [stageRef, textRef, enabled]);

  return geo;
}

/**
 * Full-hero stage behind the centred text: the 3D scene (or its static fallback),
 * a drag area over the invoice, and the control dock at the bottom centre.
 * textRef: the hero text block — hand dots fade behind it.
 */
export default function HeroVisual({ textRef }) {
  const stageRef = useRef(null);
  const controlRef = useRef(null);
  const dragTarget = useRef({ x: 0, y: 0 });
  const drag = useRef(null);

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const reducedMotion = usePrefersReducedMotion();
  const [webgl, setWebgl] = useState(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  // Resting = no automatic motion: reduced motion, after 3 loops, or after a step click.
  const [resting, setResting] = useState(reducedMotion);
  const [stage, setStage] = useState(STAGES.length - 1);

  useEffect(() => {
    if (reducedMotion) setResting(true);
  }, [reducedMotion]);

  useEffect(() => {
    if (isDesktop && webgl === null) setWebgl(detectWebGL());
  }, [isDesktop, webgl]);

  const fonts = useFontsReady(isDesktop && webgl === true);
  const inView = useInView(stageRef, isDesktop);
  const geo = useHeroGeometry(stageRef, textRef, isDesktop);
  const runScene = isDesktop && webgl === true && fonts === 'ready' && !sceneFailed;

  useEffect(() => {
    if (!runScene) {
      setSceneReady(false);
      setStage(STAGES.length - 1);
    }
  }, [runScene]);

  const live = runScene && sceneReady;

  // Drag area = the invoice's rectangle on screen (from the proportional stage) plus padding.
  let dragStyle;
  if (geo) {
    const t = stageTransform(geo.width, geo.height);
    const { invoice } = referenceLayout();
    const c = toScreen({ x: invoice.cx, y: invoice.cy }, t);
    const w = invoice.w * t.s + DRAG_PADDING * 2;
    const h = invoice.h * t.s + DRAG_PADDING * 2;
    dragStyle = { left: c.x - w / 2, top: c.y - h / 2, width: w, height: h };
  }

  // ---- Drag to tilt the invoice; it springs back to the default angle on release ----
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    drag.current = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    dragTarget.current.y = clampTo(((e.clientX - d.x) / d.w) * 1.2, DRAG_LIMIT.y);
    dragTarget.current.x = clampTo(((e.clientY - d.y) / d.h) * 0.7, DRAG_LIMIT.x);
    controlRef.current?.invalidate?.();
  };
  const endDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    dragTarget.current.x = 0;
    dragTarget.current.y = 0;
    controlRef.current?.invalidate?.();
  };

  return (
    <div ref={stageRef} className={`hero-stage ${live ? 'hero-stage--live' : ''}`}>
      <div className="hero-visual" aria-hidden="true">
        <HeroFallback compact={!isDesktop} heroWidth={geo?.width} heroHeight={geo?.height} />
        {runScene && (
          <SceneBoundary onError={() => setSceneFailed(true)}>
            <Suspense fallback={null}>
              <div className="hero-visual__scene">
                <HeroScene
                  resting={resting}
                  active={inView}
                  textRect={geo?.text}
                  dragTarget={dragTarget}
                  controlRef={controlRef}
                  onStage={setStage}
                  onReady={() => setSceneReady(true)}
                  onRest={() => setResting(true)}
                />
              </div>
            </Suspense>
          </SceneBoundary>
        )}
      </div>

      {live && dragStyle && (
        <div
          className="hero-drag"
          style={dragStyle}
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        />
      )}

      <div className="hero-dock-wrap">
        <HeroSteps
          stage={live ? stage : STAGES.length - 1}
          interactive={live}
          onSelect={(i) => {
            // Jump to the step and hold it there (stops the loop).
            setStage(i);
            setResting(true);
            controlRef.current?.jumpTo(i);
          }}
        />
      </div>
    </div>
  );
}
