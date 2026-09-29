import { Component, Suspense, lazy, useEffect, useState } from 'react';
import useMediaQuery from '../useMediaQuery.js';

// three.js only downloads when the objects are actually going to render.
const BrandObjects = lazy(() => import('./BrandObjects.jsx'));

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

/** If the 3D layer fails for any reason, it simply disappears. */
class Quiet extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Loads the 3D brand objects after the hero text has rendered (on idle), only on screens
 * ≥ 1024px with WebGL. Decorative: aria-hidden, no pointer events.
 */
export default function HeroObjects() {
  const desktop = useMediaQuery('(min-width: 1024px)');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!desktop) return undefined;
    const start = () => setReady(hasWebGL());
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(start, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(start, 300);
    return () => clearTimeout(id);
  }, [desktop]);

  if (!desktop || !ready) return null;
  return (
    <div className="hero-objects" aria-hidden="true">
      <Quiet>
        <Suspense fallback={null}>
          <BrandObjects />
        </Suspense>
      </Quiet>
    </div>
  );
}
