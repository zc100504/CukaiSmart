import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react';
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

/**
 * Hero visual: static fallback first, then the 3D scene fades in over it when
 * the screen is ≥ 1024px, WebGL works and Inter has loaded.
 * The step indicator sits outside the aria-hidden scene so it stays reachable.
 */
export default function HeroVisual() {
  const ref = useRef(null);
  const controlRef = useRef(null);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const reducedMotion = usePrefersReducedMotion();
  const [webgl, setWebgl] = useState(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [paused, setPaused] = useState(reducedMotion);
  const [stage, setStage] = useState(STAGES.length - 1);

  // Reduced motion starts (and switches to) paused; the viewer can still press Play.
  useEffect(() => {
    setPaused(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    if (isDesktop && webgl === null) setWebgl(detectWebGL());
  }, [isDesktop, webgl]);

  const fonts = useFontsReady(isDesktop && webgl === true);
  const inView = useInView(ref, isDesktop);
  const runScene = isDesktop && webgl === true && fonts === 'ready' && !sceneFailed;

  useEffect(() => {
    if (!runScene) {
      setSceneReady(false);
      setStage(STAGES.length - 1);
    }
  }, [runScene]);

  const live = runScene && sceneReady;

  return (
    <div className="hero-visual-wrap">
      <div ref={ref} className={`hero-visual ${live ? 'hero-visual--live' : ''}`} aria-hidden="true">
        <HeroFallback />
        {runScene && (
          <SceneBoundary onError={() => setSceneFailed(true)}>
            <Suspense fallback={null}>
              <div className="hero-visual__scene">
                <HeroScene
                  paused={paused}
                  active={inView}
                  controlRef={controlRef}
                  onStage={setStage}
                  onReady={() => setSceneReady(true)}
                />
              </div>
            </Suspense>
          </SceneBoundary>
        )}
      </div>
      <HeroSteps
        stage={live ? stage : STAGES.length - 1}
        interactive={live}
        paused={paused}
        onSelect={(i) => {
          setStage(i);
          controlRef.current?.jumpTo(i);
        }}
        onTogglePause={() => setPaused((p) => !p)}
      />
    </div>
  );
}
