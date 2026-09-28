import { Component, Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import useMediaQuery, { usePrefersReducedMotion } from '../useMediaQuery.js';
import HeroFallback from './HeroFallback.jsx';
import HeroSteps from './HeroSteps.jsx';
import { STAGES } from './timeline.js';

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

const DRAG_LIMIT = { y: 0.44, x: 0.21 }; // ≈ ±25° sideways, ±12° up/down
const clampTo = (v, m) => Math.max(-m, Math.min(m, v));

/**
 * Measures the free band between the hero text and the dock (px from the top of the stage),
 * so the 3D scene and the fallback can fit the invoice and hands inside it.
 */
function useFreeBand(stageRef, textRef, dockRef, enabled) {
  const [band, setBand] = useState(null);

  useLayoutEffect(() => {
    if (!enabled) return undefined;
    const measure = () => {
      const stage = stageRef.current?.getBoundingClientRect();
      const text = textRef?.current?.getBoundingClientRect();
      const dock = dockRef.current?.getBoundingClientRect();
      if (!stage || !text || !dock) return;
      const next = {
        top: Math.round(text.bottom - stage.top + 24),
        bottom: Math.round(dock.top - stage.top - 16),
        height: Math.round(stage.height),
      };
      setBand((prev) =>
        prev && prev.top === next.top && prev.bottom === next.bottom && prev.height === next.height ? prev : next
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    [stageRef.current, textRef?.current, dockRef.current].forEach((el) => el && ro.observe(el));
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [stageRef, textRef, dockRef, enabled]);

  return band;
}

/**
 * Full-hero stage behind the centred text: the 3D scene (or its static fallback),
 * a drag area over the invoice, and the control dock at the bottom centre.
 * textRef: the hero text block, so the scene never overlaps it.
 */
export default function HeroVisual({ textRef }) {
  const stageRef = useRef(null);
  const dockRef = useRef(null);
  const controlRef = useRef(null);
  const dragTarget = useRef({ x: 0, y: 0 });
  const drag = useRef(null);

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const reducedMotion = usePrefersReducedMotion();
  const [webgl, setWebgl] = useState(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [paused, setPaused] = useState(reducedMotion);
  const [stage, setStage] = useState(STAGES.length - 1);
  const [dragged, setDragged] = useState(false);

  // Reduced motion starts (and switches to) paused; the viewer can still press Play.
  useEffect(() => {
    setPaused(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    if (isDesktop && webgl === null) setWebgl(detectWebGL());
  }, [isDesktop, webgl]);

  const fonts = useFontsReady(isDesktop && webgl === true);
  const inView = useInView(stageRef, isDesktop);
  const band = useFreeBand(stageRef, textRef, dockRef, isDesktop);
  const runScene = isDesktop && webgl === true && fonts === 'ready' && !sceneFailed;

  useEffect(() => {
    if (!runScene) {
      setSceneReady(false);
      setStage(STAGES.length - 1);
    }
  }, [runScene]);

  const live = runScene && sceneReady;

  // ---- Drag to tilt the invoice (angle holds after release; "Reset view" eases it back) ----
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    drag.current = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height, start: { ...dragTarget.current } };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    dragTarget.current.y = clampTo(d.start.y + ((e.clientX - d.x) / d.w) * 1.2, DRAG_LIMIT.y);
    dragTarget.current.x = clampTo(d.start.x + ((e.clientY - d.y) / d.h) * 0.7, DRAG_LIMIT.x);
    controlRef.current?.invalidate?.();
  };
  const endDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    setDragged(Math.abs(dragTarget.current.x) > 0.01 || Math.abs(dragTarget.current.y) > 0.01);
  };
  const resetView = () => {
    dragTarget.current.x = 0;
    dragTarget.current.y = 0;
    setDragged(false);
    controlRef.current?.invalidate?.();
  };

  const bandStyle = band ? { '--band-top': `${band.top}px`, '--band-bottom': `${band.height - band.bottom}px` } : undefined;

  return (
    <div ref={stageRef} className={`hero-stage ${live ? 'hero-stage--live' : ''}`} style={bandStyle}>
      <div className="hero-visual" aria-hidden="true">
        <HeroFallback />
        {runScene && (
          <SceneBoundary onError={() => setSceneFailed(true)}>
            <Suspense fallback={null}>
              <div className="hero-visual__scene">
                <HeroScene
                  paused={paused}
                  active={inView}
                  band={band}
                  dragTarget={dragTarget}
                  controlRef={controlRef}
                  onStage={setStage}
                  onReady={() => setSceneReady(true)}
                />
              </div>
            </Suspense>
          </SceneBoundary>
        )}
      </div>

      {live && (
        <div
          className="hero-drag"
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        />
      )}

      <div ref={dockRef} className="hero-dock-wrap">
        <HeroSteps
          stage={live ? stage : STAGES.length - 1}
          interactive={live}
          paused={paused}
          canReset={dragged}
          onSelect={(i) => {
            setStage(i);
            controlRef.current?.jumpTo(i);
          }}
          onTogglePause={() => setPaused((p) => !p)}
          onReset={resetView}
        />
      </div>
    </div>
  );
}
