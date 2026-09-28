// Lazy-loaded 3D hero: invoice + receipt, scan beam, field chips settling into a "MyInvois-ready" card.
// Decorative only — the wrapper in HeroVisual is aria-hidden and pointer-events: none.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei/core/RoundedBox.js';
import { PerformanceMonitor } from '@react-three/drei/core/PerformanceMonitor.js';
import { createHeroTextures, readPalette } from './textures.js';
import { FINAL_T, LOOP, START_T, timeline } from './timeline.js';

// ---- Layout (world units) ----
const INVOICE = { pos: [-0.6, 0.1, 0], rot: [0, 0.14, -0.02], size: [1.8, 2.4] };
const RECEIPT = { pos: [-1.45, -0.2, -0.5], rot: [0, 0.22, 0.06], size: [1.05, 2.2] };
const CARD = { pos: [1.3, -0.05, 0.25], rot: [0, -0.12, 0], size: [1.45, 1.6] };
const CHIP = [1.15, 0.3];
const PAPER_DEPTH = 0.035;

// Where each chip starts on the invoice (invoice-local), floats to (root-local), and settles (card-local).
const PAGE_POINTS = [
  [-0.35, 0.78, 0.03],
  [-0.5, 0.5, 0.03],
  [0.45, -0.84, 0.03],
].map((p) => new THREE.Vector3(...p));
const BESIDE_POINTS = [
  [1.15, 0.8, 0.75],
  [1.2, 0.35, 0.8],
  [1.15, -0.1, 0.75],
].map((p) => new THREE.Vector3(...p));
const CARD_SLOTS = [
  [0, 0.28, 0.05],
  [0, -0.08, 0.05],
  [0, -0.44, 0.05],
].map((p) => new THREE.Vector3(...p));

const lerp = (a, b, t) => a + (b - a) * t;

function Paper({ size, texture, color, children, bodyMaterialRef, faceMaterialRef, depth = PAPER_DEPTH }) {
  const [w, h] = size;
  return (
    <>
      <RoundedBox args={[w, h, depth]} radius={0.04} smoothness={3}>
        <meshStandardMaterial
          ref={bodyMaterialRef}
          color={color}
          roughness={0.9}
          metalness={0}
          transparent={Boolean(bodyMaterialRef)}
        />
      </RoundedBox>
      <mesh position={[0, 0, depth / 2 + 0.002]} renderOrder={1}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial ref={faceMaterialRef} map={texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {children}
    </>
  );
}

function Scene({ animate, onFirstFrame }) {
  const palette = useMemo(readPalette, []);
  const tex = useMemo(() => createHeroTextures(palette), [palette]);
  useEffect(() => () => Object.values(tex).forEach((t) => t.dispose()), [tex]);

  const { camera } = useThree();
  const root = useRef();
  const invoice = useRef();
  const card = useRef();
  const beam = useRef();
  const beamMat = useRef();
  const cardBodyMat = useRef();
  const cardFaceMat = useRef();
  const chips = useRef([]);
  const chipMats = useRef([]);

  const time = useRef(animate ? START_T : FINAL_T);
  const pointer = useRef({ x: 0, y: 0 });
  const firstFrame = useRef(false);
  const scratch = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3() }), []);

  // Parallax follows the mouse anywhere on the page; the canvas itself never receives pointer events.
  useEffect(() => {
    if (!animate) return undefined;
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [animate]);

  useFrame((state, delta) => {
    if (animate) time.current = (time.current + Math.min(delta, 0.1)) % LOOP;
    const s = timeline(time.current);

    // Camera parallax (eased) and a very gentle float.
    if (animate) {
      const k = 1 - Math.exp(-delta * 2.5);
      camera.position.x = lerp(camera.position.x, pointer.current.x * 0.35, k);
      camera.position.y = lerp(camera.position.y, pointer.current.y * 0.22, k);
      root.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.03;
    }
    camera.lookAt(0, 0, 0);

    // Card
    card.current.scale.setScalar(s.card.scale);
    card.current.visible = s.card.opacity > 0.01;
    cardBodyMat.current.opacity = s.card.opacity;
    cardFaceMat.current.opacity = s.card.opacity;
    root.current.updateMatrixWorld(true);

    // Scan beam (invoice-local)
    beam.current.visible = s.beam.visible;
    beam.current.position.y = lerp(INVOICE.size[1] / 2 - 0.1, -INVOICE.size[1] / 2 + 0.1, s.beam.progress);
    beamMat.current.opacity = s.beam.opacity;

    // Chips: page → beside → card slot, all converted to root-local space.
    s.chips.forEach((c, i) => {
      const mesh = chips.current[i];
      const mat = chipMats.current[i];
      if (!mesh || !mat) return;
      const page = root.current.worldToLocal(scratch.a.copy(PAGE_POINTS[i]).applyMatrix4(invoice.current.matrixWorld));
      const slot = root.current.worldToLocal(scratch.b.copy(CARD_SLOTS[i]).applyMatrix4(card.current.matrixWorld));
      const pos = scratch.c.copy(page).lerp(BESIDE_POINTS[i], c.lift).lerp(slot, c.settle);
      pos.z += c.arc;
      mesh.position.copy(pos);
      mesh.rotation.y = lerp(lerp(INVOICE.rot[1], 0, c.lift), CARD.rot[1], c.settle);
      mesh.scale.setScalar(c.scale);
      mesh.visible = c.opacity > 0.01;
      mat.opacity = c.opacity;
      if (i === 1) {
        const map = c.confirmed ? tex.tinOk : tex.tinWarn;
        if (mat.map !== map) mat.map = map;
      }
    });

    if (!firstFrame.current) {
      firstFrame.current = true;
      onFirstFrame?.();
    }
  });

  const chipMaps = [tex.supplierOk, tex.tinOk, tex.totalOk];

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[-3, 4, 5]} intensity={1.2} />

      <group ref={root}>
        <group position={RECEIPT.pos} rotation={RECEIPT.rot}>
          <Paper size={RECEIPT.size} texture={tex.receipt} color={palette.card} />
        </group>

        <group ref={invoice} position={INVOICE.pos} rotation={INVOICE.rot}>
          <Paper size={INVOICE.size} texture={tex.invoice} color={palette.card}>
            <mesh ref={beam} position={[0, 0, PAPER_DEPTH / 2 + 0.01]} renderOrder={2}>
              <planeGeometry args={[INVOICE.size[0] + 0.1, 0.26]} />
              <meshBasicMaterial ref={beamMat} map={tex.beam} transparent depthWrite={false} toneMapped={false} />
            </mesh>
          </Paper>
        </group>

        <group ref={card} position={CARD.pos} rotation={CARD.rot}>
          <Paper
            size={CARD.size}
            texture={tex.card}
            color={palette.card}
            depth={0.04}
            bodyMaterialRef={cardBodyMat}
            faceMaterialRef={cardFaceMat}
          />
        </group>

        {chipMaps.map((map, i) => (
          <mesh key={i} ref={(el) => (chips.current[i] = el)} renderOrder={3}>
            <planeGeometry args={CHIP} />
            <meshBasicMaterial
              ref={(el) => (chipMats.current[i] = el)}
              map={map}
              transparent
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}

/**
 * @param animate false = reduced motion: render one frame of the settled final state.
 * @param active  false = hero is off-screen: stop the render loop.
 * @param onReady called after the first frame so the static fallback can fade out.
 */
export default function HeroScene({ animate = true, active = true, onReady }) {
  const [dpr, setDpr] = useState(1.75);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const frameloop = animate ? (active ? 'always' : 'never') : 'demand';

  return (
    <Canvas
      className="hero-canvas"
      frameloop={frameloop}
      dpr={[1, dpr]}
      flat
      camera={{ position: [0, 0, 7.2], fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ pointerEvents: 'none' }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <Scene animate={animate} onFirstFrame={() => onReadyRef.current?.()} />
    </Canvas>
  );
}
