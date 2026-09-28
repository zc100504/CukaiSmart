// Lazy-loaded 3D hero, full-width behind the centred text: a navy dot-matrix AI hand and a
// teal human hand reach diagonally in from the lower corners toward a voxel invoice that
// assembles, gets scanned, reviewed and marked MyInvois-ready.
// Decorative: the canvas is aria-hidden and takes no pointer input; HeroVisual owns the
// drag area and the control dock.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei/core/ContactShadows.js';
import { PerformanceMonitor } from '@react-three/drei/core/PerformanceMonitor.js';
import { loadHandCloud } from './handPoints.js';
import { COLS, CUBE, PITCH, ROWS, buildInvoiceVoxels } from './voxelInvoice.js';
import { FINAL_T, LOOP, STAGES, START_T, ease, timeline } from './timeline.js';

// ---- Composition (scene units at scale 1) ----
const CAMERA = { position: [0, 0.4, 9], fov: 32 };
const INVOICE_HALF_WIDTH = (COLS * PITCH) / 2;
/** Gap between each fingertip and the invoice edge. */
const TIP_GAP = 0.2;
/** Fingertips point at the upper-middle of the invoice. */
const TIP_Y_OFFSET = 0.12;
/** Invoice + checkmark + shadow span about this height; its centre sits this far above the invoice centre. */
const COMPOSITION_HEIGHT = 2.2;
const COMPOSITION_OFFSET = 0.2;
const SCALE_RANGE = [0.4, 1.2];
/** Hands aim toward their corner, kept within this angle range (degrees above horizontal). */
const HAND_ANGLE_RANGE = [20, 26];
const HAND_SCALE_RANGE = [0.7, 2.8];
/** Hands never grow beyond this multiple of the invoice scale, so they stay in proportion on short screens. */
const HAND_TO_INVOICE_MAX = 2.4;

const TOKENS = {
  navy: '--navy',
  navyPale: '--navy-pale',
  teal: '--teal',
  card: '--card',
  surfaceMuted: '--surface-muted',
  border: '--border',
  warning: '--warning',
  success: '--success',
};

function readPalette() {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    Object.entries(TOKENS).map(([k, v]) => [k, new THREE.Color(style.getPropertyValue(v).trim())])
  );
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));
const deg = THREE.MathUtils.degToRad;

/**
 * Fits the composition into the free band between the text block and the dock.
 * band: { top, bottom } in px from the top of the canvas (measured by HeroVisual).
 */
function computeLayout(viewport, size, band, clouds) {
  const wpp = viewport.height / size.height; // world units per CSS pixel at z = 0
  const topPx = band ? band.top : size.height * 0.5;
  const bottomPx = band ? band.bottom : size.height * 0.9;
  const availPx = Math.max(80, bottomPx - topPx);
  const centerY = (size.height / 2 - (topPx + bottomPx) / 2) * wpp;

  const s = clamp((availPx * wpp) / COMPOSITION_HEIGHT, SCALE_RANGE);
  const invoiceY = centerY - COMPOSITION_OFFSET * s;
  const tipX = (INVOICE_HALF_WIDTH + TIP_GAP) * s;
  const tipY = invoiceY + TIP_Y_OFFSET * s;

  // Aim each hand at its lower corner and make it long enough that the arm leaves the frame.
  const dx = viewport.width / 2 - tipX;
  const dy = tipY + viewport.height / 2;
  const angle = deg(clamp(THREE.MathUtils.radToDeg(Math.atan2(dy, dx)), HAND_ANGLE_RANGE));
  const dist = Math.hypot(dx, dy);
  const handScale = (cloud) =>
    Math.min(clamp(cloud ? (dist * 1.1) / cloud.reach : 1, HAND_SCALE_RANGE), s * HAND_TO_INVOICE_MAX);

  return {
    s,
    invoiceY,
    tipX,
    tipY,
    angle,
    aiScale: handScale(clouds?.ai),
    humanScale: handScale(clouds?.human),
  };
}

// ---------------------------------------------------------------------------
// Dot-matrix hand
// ---------------------------------------------------------------------------

const DOT_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aShade;
  attribute float aTip;
  attribute float aFade;
  uniform float uScale;
  uniform float uDot;
  uniform float uHighlight;
  varying float vShade;
  varying float vTip;
  varying float vFade;
  void main() {
    vShade = aShade;
    vFade = aFade;
    vTip = aTip * uHighlight;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uDot * aSize * (1.0 + vTip * 0.2) * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const DOT_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uLight;
  uniform float uOpacity;
  varying float vShade;
  varying float vTip;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = 1.0 - smoothstep(0.4, 0.5, d);
    if (alpha <= 0.0) discard;
    vec3 col = mix(uColor * 0.8, uColor, vShade);
    col = mix(col, uLight, vTip * 0.45);
    gl_FragColor = vec4(col, alpha * uOpacity * vFade);
    #include <colorspace_fragment>
  }
`;

/** side 'left' = AI hand (points right), 'right' = human hand (points left). */
function HandCloud({ cloud, color, light, side, lowQuality, highlightRef, breathe, layoutRef }) {
  const group = useRef();
  const material = useRef();
  const dir = side === 'left' ? -1 : 1; // which side of the invoice the fingertip is on

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(cloud.positions, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(cloud.sizes, 1));
    g.setAttribute('aShade', new THREE.BufferAttribute(cloud.shades, 1));
    g.setAttribute('aTip', new THREE.BufferAttribute(cloud.tips, 1));
    g.setAttribute('aFade', new THREE.BufferAttribute(cloud.fades, 1));
    return g;
  }, [cloud]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Points are pre-shuffled, so drawing the first half still covers the whole hand.
  useEffect(() => {
    geometry.setDrawRange(0, lowQuality ? Math.ceil(cloud.count / 2) : cloud.count);
  }, [geometry, lowQuality, cloud.count]);

  const uniforms = useMemo(
    () => ({
      uColor: { value: color },
      uLight: { value: light },
      uOpacity: { value: 1 },
      uHighlight: { value: 0 },
      uScale: { value: 500 },
      uDot: { value: cloud.spacing },
    }),
    [color, light, cloud.spacing]
  );

  useFrame((state) => {
    const L = layoutRef.current;
    const scale = side === 'left' ? L.aiScale : L.humanScale;
    const u = material.current.uniforms;
    const px = state.size.height * state.viewport.dpr;
    u.uScale.value = px / (2 * Math.tan(deg(CAMERA.fov / 2)));
    // Dot size follows the hand's scale so the dot-matrix density looks the same on every screen.
    u.uDot.value = cloud.spacing * scale * (lowQuality ? 1.45 : 1.05);
    u.uHighlight.value = highlightRef.current;

    // Rotate about the fingertip: AI hand tilts up to the right, human hand mirrors it.
    const t = breathe.current;
    const phase = side === 'left' ? 0 : Math.PI / 2;
    const reachIn = Math.sin(t * 0.6 + phase) * 0.015 * L.s; // slow drift toward/away from the invoice
    group.current.rotation.z = side === 'left' ? L.angle : -L.angle;
    group.current.position.set(
      dir * (L.tipX - reachIn * Math.cos(L.angle)),
      L.tipY - reachIn * Math.sin(L.angle) + Math.sin(t * 0.7 + phase) * 0.01 * L.s,
      0
    );
    group.current.scale.setScalar(scale * (1 + Math.sin(t * 0.9 + phase) * 0.012));
  });

  return (
    <group ref={group}>
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={DOT_VERTEX}
          fragmentShader={DOT_FRAGMENT}
          transparent
          depthWrite={false}
        />
      </points>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Voxel invoice
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function VoxelInvoice({ palette, stateRef, dragRot, breathe, layoutRef }) {
  const anchor = useRef(); // position + scale from the layout (no rotation)
  const group = useRef(); // float + rotation
  const mesh = useRef();
  const material = useRef();
  const beam = useRef();
  const beamMat = useRef();
  const beamLineMat = useRef();

  const cubes = useMemo(() => {
    const rand = mulberry32(42);
    return buildInvoiceVoxels().map((c) => {
      const angle = rand() * Math.PI * 2;
      const dist = 1.2 + rand() * 1.4;
      return {
        ...c,
        start: new THREE.Vector3(c.x + Math.cos(angle) * dist, c.y + Math.sin(angle) * dist * 0.7, c.z + 0.6 + rand() * 1.2),
        rot: new THREE.Euler(rand() * 3, rand() * 3, rand() * 3),
        delay: rand() * 0.8 + (c.row ?? 0) * 0.012,
        out: new THREE.Vector3(c.x, c.y, 0.4).normalize(),
      };
    });
  }, []);

  const reviewIdx = useMemo(() => cubes.flatMap((c, i) => (c.role === 'review' ? [i] : [])), [cubes]);
  const lastReview = useRef(-1);
  const tmp = useMemo(() => ({ obj: new THREE.Object3D(), color: new THREE.Color(), pos: new THREE.Vector3() }), []);

  // Base colours before the first frame, so the shader compiles with instance colours.
  useLayoutEffect(() => {
    const colorFor = {
      paper: palette.card,
      paperShade: palette.surfaceMuted,
      flap: palette.border,
      ink: palette.navy,
      review: palette.navy,
      check: palette.success,
    };
    cubes.forEach((c, i) => mesh.current.setColorAt(i, colorFor[c.role]));
    mesh.current.instanceColor.needsUpdate = true;
  }, [cubes, palette]);

  useFrame(() => {
    const s = stateRef.current;
    const L = layoutRef.current;
    const { obj, pos } = tmp;
    const a = s.assemble * 1.5;

    anchor.current.position.set(0, L.invoiceY, 0);
    anchor.current.scale.setScalar(L.s);

    cubes.forEach((c, i) => {
      if (c.role === 'check') {
        const k = Math.max(0, s.check);
        obj.position.set(c.x, c.y, c.z);
        obj.rotation.set(0, 0, 0);
        obj.scale.set(c.sx * k, c.sy * k, c.sz * k);
      } else {
        const p = ease(Math.min(1, Math.max(0, a - c.delay * 0.5)));
        pos.set(c.x, c.y, c.z).lerp(c.start, 1 - p).addScaledVector(c.out, s.scatter * 0.35);
        obj.position.copy(pos);
        obj.rotation.set(c.rot.x * (1 - p), c.rot.y * (1 - p), c.rot.z * (1 - p));
        obj.scale.set(c.sx, c.sy, c.sz);
      }
      obj.updateMatrix();
      mesh.current.setMatrixAt(i, obj.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    material.current.opacity = s.opacity;

    // Flagged row: navy → amber → green
    const key = Math.round(s.amber * 100) * 1000 + Math.round(s.green * 100);
    if (key !== lastReview.current) {
      lastReview.current = key;
      tmp.color.copy(palette.navy).lerp(palette.warning, s.amber).lerp(palette.success, s.green);
      reviewIdx.forEach((i) => mesh.current.setColorAt(i, tmp.color));
      mesh.current.instanceColor.needsUpdate = true;
    }

    // Scan beam
    beam.current.visible = s.beam.visible;
    const half = (ROWS * PITCH) / 2;
    beam.current.position.y = lerp(half, -half, s.beam.progress);
    beamMat.current.opacity = 0.18 * s.beam.opacity;
    beamLineMat.current.opacity = 0.75 * s.beam.opacity;

    // Slow rotation and float, plus the viewer's drag angle.
    const t = breathe.current;
    group.current.position.y = Math.sin(t * 0.7) * 0.04;
    group.current.rotation.y = Math.sin(t * 0.35) * 0.16 + dragRot.current.y;
    group.current.rotation.x = -0.06 + dragRot.current.x;
  });

  const width = COLS * PITCH;

  return (
    <group ref={anchor}>
      <group ref={group}>
        <instancedMesh ref={mesh} args={[null, null, cubes.length]} frustumCulled={false}>
          <boxGeometry args={[CUBE, CUBE, CUBE]} />
          <meshStandardMaterial ref={material} roughness={0.7} metalness={0} transparent />
        </instancedMesh>
        <group ref={beam} position={[0, 0, CUBE * 0.95]}>
          <mesh renderOrder={2}>
            <planeGeometry args={[width + 0.12, 0.18]} />
            <meshBasicMaterial ref={beamMat} color={palette.teal} transparent depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh renderOrder={3}>
            <planeGeometry args={[width + 0.12, 0.012]} />
            <meshBasicMaterial ref={beamLineMat} color={palette.teal} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      </group>
      <ContactShadows
        position={[0, -1.08, 0]}
        scale={3.2}
        far={0.55}
        blur={2.4}
        opacity={0.2}
        resolution={256}
        color={palette.navy}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

function Scene({ pausedRef, lowQuality, controlRef, band, onStage, onReady, dragTarget }) {
  const palette = useMemo(readPalette, []);
  const [clouds, setClouds] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const { camera, invalidate, viewport, size } = useThree();

  const time = useRef(pausedRef.current ? FINAL_T : START_T);
  const breathe = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const lastStage = useRef(-1);
  const ready = useRef(false);
  const stateRef = useRef(timeline(time.current));
  const aiTip = useRef(0);
  const humanTip = useRef(0);
  const dragRot = useRef({ x: 0, y: 0 });

  if (loadError) throw loadError; // handled by SceneBoundary → static fallback

  // Layout depends on canvas size and the measured free band.
  const layout = useMemo(
    () => computeLayout(viewport.getCurrentViewport(camera, [0, 0, 0], size), size, band, clouds),
    [viewport, camera, size, band, clouds]
  );
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  useEffect(() => {
    invalidate();
  }, [layout, invalidate]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadHandCloud('ai'), loadHandCloud('human')])
      .then(([ai, human]) => !cancelled && setClouds({ ai, human }))
      .catch((err) => !cancelled && setLoadError(err));
    return () => {
      cancelled = true;
    };
  }, []);

  // Dock buttons jump the loop; while paused they show that step's still frame.
  useEffect(() => {
    controlRef.current = {
      jumpTo(index) {
        const stage = STAGES[index];
        time.current = pausedRef.current ? stage.still : stage.start;
        invalidate();
      },
      invalidate,
    };
    return () => {
      controlRef.current = null;
    };
  }, [controlRef, pausedRef, invalidate]);

  useEffect(() => {
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const playing = !pausedRef.current;
    if (playing) {
      time.current = (time.current + dt) % LOOP;
      breathe.current += dt;
    }
    const s = timeline(time.current);
    stateRef.current = s;
    aiTip.current = s.aiTip;
    humanTip.current = s.humanTip;

    // Gentle mouse parallax only while playing (paused means no automatic motion).
    if (playing) {
      const k = 1 - Math.exp(-dt * 2.5);
      camera.position.x = lerp(camera.position.x, pointer.current.x * 0.25, k);
      camera.position.y = lerp(camera.position.y, CAMERA.position[1] + pointer.current.y * 0.12, k);
    }
    camera.lookAt(0, 0, 0);

    // Ease the invoice toward the drag angle (held after release; "Reset view" sets it back to 0).
    const spring = 1 - Math.exp(-dt * 9);
    dragRot.current.x = lerp(dragRot.current.x, dragTarget.current.x, spring);
    dragRot.current.y = lerp(dragRot.current.y, dragTarget.current.y, spring);
    const settling =
      Math.abs(dragRot.current.x - dragTarget.current.x) > 0.0005 ||
      Math.abs(dragRot.current.y - dragTarget.current.y) > 0.0005;
    if (!playing && settling) invalidate();

    if (s.stage !== lastStage.current) {
      lastStage.current = s.stage;
      onStage?.(s.stage);
    }
    if (clouds && !ready.current) {
      ready.current = true;
      onReady?.();
    }
  });

  return (
    <>
      {/* Soft light only: sky/ground fill plus two directional lights, so faces shade as the invoice turns. */}
      <hemisphereLight args={[palette.card, palette.navyPale, 0.9]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[-3, 4, 5]} intensity={1.3} />
      <directionalLight position={[3, -1, 4]} intensity={0.35} />

      {clouds && (
        <>
          <HandCloud
            cloud={clouds.ai}
            color={palette.navy}
            light={palette.card}
            side="left"
            lowQuality={lowQuality}
            highlightRef={aiTip}
            breathe={breathe}
            layoutRef={layoutRef}
          />
          <HandCloud
            cloud={clouds.human}
            color={palette.teal}
            light={palette.card}
            side="right"
            lowQuality={lowQuality}
            highlightRef={humanTip}
            breathe={breathe}
            layoutRef={layoutRef}
          />
        </>
      )}

      <VoxelInvoice palette={palette} stateRef={stateRef} dragRot={dragRot} breathe={breathe} layoutRef={layoutRef} />
    </>
  );
}

/**
 * @param paused     true = no automatic motion (reduced motion starts paused; Pause button)
 * @param active     false = hero is off-screen: stop rendering
 * @param band       { top, bottom } px: free area between the text block and the dock
 * @param dragTarget ref { x, y } — invoice drag angle, set by HeroVisual's drag area
 * @param controlRef receives { jumpTo(stageIndex), invalidate() }
 * @param onStage    called when the loop enters a new step (0–3)
 * @param onReady    called once the hands have loaded and a frame has rendered
 */
export default function HeroScene({ paused = false, active = true, band, dragTarget, controlRef, onStage, onReady }) {
  const [lowQuality, setLowQuality] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onStageRef = useRef(onStage);
  onStageRef.current = onStage;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // Re-render one frame when pausing/unpausing so the still frame is current.
  useEffect(() => {
    controlRef.current?.invalidate?.();
  }, [paused, controlRef]);

  const frameloop = !active ? 'never' : paused ? 'demand' : 'always';

  return (
    <Canvas
      className="hero-canvas"
      frameloop={frameloop}
      dpr={lowQuality ? 1 : [1, 1.75]}
      flat
      camera={CAMERA}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ pointerEvents: 'none' }}
    >
      <PerformanceMonitor onDecline={() => setLowQuality(true)} />
      <Scene
        pausedRef={pausedRef}
        lowQuality={lowQuality}
        controlRef={controlRef}
        band={band}
        dragTarget={dragTarget}
        onStage={(i) => onStageRef.current?.(i)}
        onReady={() => onReadyRef.current?.()}
      />
    </Canvas>
  );
}
