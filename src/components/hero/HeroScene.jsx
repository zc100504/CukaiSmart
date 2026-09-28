// Lazy-loaded 3D hero. Everything is laid out on the 1440 × 900 reference frame (stage.js)
// and scaled uniformly with the hero, with a fixed-FOV camera that maps 1 scene unit to 1 CSS
// pixel at the invoice plane. The AI robot hand enters from the left and the human hand from
// the right, facing each other across a paper invoice.
// Decorative: the canvas is aria-hidden and takes no pointer input; HeroVisual owns the drag
// area and the control dock.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei/core/PerformanceMonitor.js';
import { SHADOW_OPACITY, loadHandImage, makeShadowCanvas } from './handImages.js';
import { FIELDS, FOLD, TEX_W, createInvoiceTextures, readCssPalette, texToLocal } from './paperInvoice.js';
import { HAND_DEPTH, handPlacement, referenceLayout, stageTransform } from './stage.js';
import { FINAL_T, LOOP, LOOPS_BEFORE_REST, STAGES, START_T, timeline } from './timeline.js';

// ---- Scene constants (reference px; proportions live in stage.js) ----
const CAMERA_FOV = 30;
const PAPER_DEPTH = 3;
const BADGE_DEPTH = 8;
/** Paper starts this far below its resting place (and rotated) during "Upload". */
const ENTER_OFFSET = 260;
/** Mouse parallax: camera shift in reference px. */
const PARALLAX = { x: 14, y: 8 };
/** Text mask: hand pixels inside the text block fade to this opacity, with a soft edge. */
const TEXT_MASK_OPACITY = 0.12;
const TEXT_MASK_FEATHER = 32;
/** Hand breathing: vertical float and drift toward/away from the invoice (reference px). */
const HAND_FLOAT = 5;
const HAND_DRIFT = 4;
/** Hand shadow offset (reference px, downward). */
const SHADOW_OFFSET = 12;
/** Fingertip ring radius range (reference px). */
const RING_RADIUS = [6, 34];

const lerp = (a, b, t) => a + (b - a) * t;

function colorPalette() {
  const css = readCssPalette();
  const style = getComputedStyle(document.documentElement);
  const c = (v) => new THREE.Color(v);
  const navy = c(css.navy);
  const teal = c(css.teal);
  return {
    css,
    navy,
    teal,
    navyTeal: navy.clone().lerp(teal, 0.5),
    card: c(css.card),
    surfaceMuted: c(css.surfaceMuted),
    success: c(css.success),
    navyPale: c(style.getPropertyValue('--navy-pale').trim()),
    border: c(css.border),
  };
}

/** Stage transform + composition in world units (1 unit = 1 CSS px; origin at the canvas centre, y up). */
function computeLayout(size) {
  const ref = referenceLayout();
  const t = stageTransform(size.width, size.height);
  const toWorld = (p) => ({
    x: t.offX + p.x * t.s - size.width / 2,
    y: size.height / 2 - (t.offY + p.y * t.s),
  });
  return {
    s: t.s,
    width: size.width,
    height: size.height,
    ref,
    invoice: toWorld({ x: ref.invoice.cx, y: ref.invoice.cy }),
    toWorld,
  };
}

// ---------------------------------------------------------------------------
// Hand image
// ---------------------------------------------------------------------------

const HAND_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Texture is uploaded premultiplied (no dark fringes when filtered); blending is ONE / ONE_MINUS_SRC_ALPHA.
const HAND_FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform vec4 uMask;      // text block in device px (x0, y0, x1, y1), GL coords
  uniform float uFeather;
  uniform float uMaskMin;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(map, vUv);
    if (c.a < 0.003) discard;

    float mask = 1.0;
    if (uMask.z > uMask.x) {
      vec2 p = gl_FragCoord.xy;
      vec2 outside = max(uMask.xy - p, p - uMask.zw);
      mask = mix(uMaskMin, 1.0, smoothstep(0.0, uFeather, length(max(outside, 0.0))));
    }

    // Un-premultiply, convert to the output colour space, premultiply again.
    gl_FragColor = vec4(c.rgb / c.a, c.a);
    #include <colorspace_fragment>
    gl_FragColor = vec4(gl_FragColor.rgb * gl_FragColor.a, gl_FragColor.a) * mask;
  }
`;

function useHandTextures(data, gl) {
  return useMemo(() => {
    const image = new THREE.Texture(data.source);
    image.colorSpace = THREE.SRGBColorSpace;
    image.premultiplyAlpha = true;
    image.generateMipmaps = true;
    image.minFilter = THREE.LinearMipmapLinearFilter;
    image.magFilter = THREE.LinearFilter;
    image.anisotropy = gl.capabilities.getMaxAnisotropy();
    image.needsUpdate = true;

    const sh = makeShadowCanvas(data.source, data.width, data.height);
    const shadow = new THREE.CanvasTexture(sh.canvas);
    shadow.colorSpace = THREE.SRGBColorSpace;
    return { image, shadow, padX: sh.padX, padY: sh.padY };
  }, [data, gl]);
}

/** side 'ai' = left, points right; 'human' = right, points left. */
function HandImage({ data, side, ringColor, ringRef, breathe, layoutRef, maskRef }) {
  const { gl } = useThree();
  const tex = useHandTextures(data, gl);
  useEffect(
    () => () => {
      tex.image.dispose();
      tex.shadow.dispose();
    },
    [tex]
  );

  const group = useRef();
  const hand = useRef();
  const shadow = useRef();
  const material = useRef();
  const ring = useRef();
  const ringMat = useRef();

  const uniforms = useMemo(
    () => ({
      map: { value: tex.image },
      uMask: { value: new THREE.Vector4(0, 0, 0, 0) },
      uFeather: { value: TEXT_MASK_FEATHER },
      uMaskMin: { value: TEXT_MASK_OPACITY },
    }),
    [tex]
  );

  useFrame((state) => {
    const L = layoutRef.current;
    const P = handPlacement(side, data, L.width, L.height);
    const s = L.s;

    // Group sits on the fingertip; the plane is offset so the image's fingertip lands there.
    const tip = L.toWorld(P.tip);
    const t = breathe.current;
    const phase = side === 'ai' ? 0 : 2.1; // out of sync with each other
    const toward = side === 'ai' ? 1 : -1;
    group.current.position.set(
      tip.x + toward * Math.sin(t * 0.5 + phase) * HAND_DRIFT * s - toward * HAND_DRIFT * s,
      tip.y + Math.sin(t * 0.8 + phase) * HAND_FLOAT * s,
      -HAND_DEPTH * s
    );
    group.current.rotation.z = -P.rotation;

    const cx = (P.x + P.width / 2 - P.tip.x) * s;
    const cy = -(P.y + P.height / 2 - P.tip.y) * s;
    hand.current.position.set(cx, cy, 0);
    hand.current.scale.set(P.width * s, P.height * s, 1);

    const shW = P.width * (1 + (2 * tex.padX) / data.width);
    const shH = P.height * (1 + (2 * tex.padY) / data.height);
    shadow.current.position.set(cx, cy - SHADOW_OFFSET * s, -1);
    shadow.current.scale.set(shW * s, shH * s, 1);

    // Fingertip ring cue
    const r = ringRef.current;
    ring.current.visible = r.opacity > 0.01;
    ring.current.scale.setScalar(lerp(RING_RADIUS[0], RING_RADIUS[1], r.progress) * s);
    ringMat.current.opacity = 0.7 * r.opacity;

    // Text mask in device pixels (GL origin bottom-left)
    const dpr = state.viewport.dpr;
    const u = material.current.uniforms;
    u.uFeather.value = TEXT_MASK_FEATHER * dpr;
    const m = maskRef.current;
    if (m) u.uMask.value.set(m.left * dpr, (L.height - m.bottom) * dpr, m.right * dpr, (L.height - m.top) * dpr);
    else u.uMask.value.set(0, 0, 0, 0);
  });

  return (
    <group ref={group}>
      <mesh ref={shadow} renderOrder={-2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={tex.shadow} transparent opacity={SHADOW_OPACITY} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={hand} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={HAND_VERTEX}
          fragmentShader={HAND_FRAGMENT}
          transparent
          depthWrite={false}
          blending={THREE.CustomBlending}
          blendSrc={THREE.OneFactor}
          blendDst={THREE.OneMinusSrcAlphaFactor}
          blendSrcAlpha={THREE.OneFactor}
          blendDstAlpha={THREE.OneMinusSrcAlphaFactor}
        />
      </mesh>
      <mesh ref={ring} position={[0, 0, 2]} renderOrder={6}>
        <ringGeometry args={[0.9, 1, 64]} />
        <meshBasicMaterial ref={ringMat} color={ringColor} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Paper invoice
// ---------------------------------------------------------------------------

function usePaperGeometry(w, h) {
  return useMemo(() => {
    const f = (FOLD / TEX_W) * w;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, -h / 2);
    shape.lineTo(w / 2, -h / 2);
    shape.lineTo(w / 2, h / 2 - f);
    shape.lineTo(w / 2 - f, h / 2);
    shape.lineTo(-w / 2, h / 2);
    shape.closePath();
    const body = new THREE.ExtrudeGeometry(shape, {
      depth: PAPER_DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.6,
      bevelSize: 0.6,
      bevelSegments: 2,
      curveSegments: 1,
    });
    body.translate(0, 0, -PAPER_DEPTH / 2);

    const flapShape = new THREE.Shape();
    flapShape.moveTo(w / 2 - f, h / 2);
    flapShape.lineTo(w / 2, h / 2 - f);
    flapShape.lineTo(w / 2 - f, h / 2 - f);
    flapShape.closePath();
    const flap = new THREE.ShapeGeometry(flapShape);
    return { body, flap, fold: f };
  }, [w, h]);
}

function PaperInvoice({ palette, textures, stateRef, dragRot, breathe, layoutRef }) {
  const anchor = useRef(); // world position + stage scale
  const paper = useRef(); // enter/float/rotation
  const materials = useRef({});
  const highlightMats = useRef([]);
  const tinWarnMat = useRef();
  const tinOkMat = useRef();
  const badge = useRef();
  const beam = useRef();
  const beamMat = useRef();
  const beamLineMat = useRef();
  const shadowMat = useRef();

  const { w, h } = layoutRef.current.ref.invoice;
  const { body, flap } = usePaperGeometry(w, h);
  useEffect(
    () => () => {
      body.dispose();
      flap.dispose();
    },
    [body, flap]
  );

  // Map the face texture onto the extruded cap (cap UVs are shape coordinates).
  useLayoutEffect(() => {
    textures.face.repeat.set(1 / w, 1 / h);
    textures.face.offset.set(0.5, 0.5);
    textures.face.needsUpdate = true;
  }, [textures, w, h]);

  const fields = useMemo(
    () =>
      Object.entries(FIELDS).map(([key, [x0, y0, x1, y1]]) => {
        const a = texToLocal(x0, y0, w, h);
        const b = texToLocal(x1, y1, w, h);
        return { key, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, w: b.x - a.x, h: a.y - b.y };
      }),
    [w, h]
  );
  const tin = fields.find((f) => f.key === 'tin');
  const badgeR = layoutRef.current.ref.badgeRadius;
  const faceZ = PAPER_DEPTH / 2 + 0.7;

  useFrame(() => {
    const s = stateRef.current;
    const L = layoutRef.current;
    anchor.current.position.set(L.invoice.x, L.invoice.y, 0);
    anchor.current.scale.setScalar(L.s);

    const t = breathe.current;
    const e = 1 - s.enter;
    paper.current.position.set(0, -ENTER_OFFSET * e + Math.sin(t * 0.7) * 6 - s.reset * 30, 0);
    paper.current.rotation.set(
      -0.05 + 0.7 * e + dragRot.current.x,
      Math.sin(t * 0.35) * 0.18 + dragRot.current.y,
      -0.4 * e
    );
    paper.current.scale.setScalar(1 - s.reset * 0.03);

    const o = s.opacity;
    Object.values(materials.current).forEach((m) => m && (m.opacity = o));
    shadowMat.current.opacity = 0.35 * o;

    // Scan beam + field highlights as the beam passes each field.
    const beamY = lerp(h / 2, -h / 2, s.beam.progress);
    beam.current.visible = s.beam.visible;
    beam.current.position.y = beamY;
    beamMat.current.opacity = 0.16 * s.beam.opacity * o;
    beamLineMat.current.opacity = 0.8 * s.beam.opacity * o;
    fields.forEach((f, i) => {
      const near = 1 - Math.min(1, Math.abs(beamY - f.cy) / (f.h / 2 + 24));
      highlightMats.current[i].opacity = s.beam.visible ? 0.2 * near * o : 0;
    });

    tinWarnMat.current.opacity = s.tinWarn * o;
    tinOkMat.current.opacity = s.tinOk * o;

    const k = Math.max(0, s.badge) * o;
    badge.current.scale.setScalar(Math.max(0.0001, k));
    badge.current.visible = k > 0.01;
  });

  const setMat = (key) => (m) => {
    materials.current[key] = m;
  };

  return (
    <group ref={anchor}>
      <group ref={paper}>
        {/* Soft shadow behind the page */}
        <mesh position={[8, -14, -10]} renderOrder={-1}>
          <planeGeometry args={[w * 1.3, h * 1.25]} />
          <meshBasicMaterial ref={shadowMat} map={textures.shadow} transparent depthWrite={false} toneMapped={false} />
        </mesh>

        {/* Paper body: front/back caps show the invoice, sides are light grey */}
        <mesh geometry={body}>
          <meshStandardMaterial attach="material-0" ref={setMat('face')} map={textures.face} roughness={0.85} transparent />
          <meshStandardMaterial attach="material-1" ref={setMat('side')} color={palette.surfaceMuted} roughness={0.9} transparent />
        </mesh>

        {/* Folded corner flap */}
        <mesh geometry={flap} position={[0, 0, faceZ + 0.3]}>
          <meshStandardMaterial ref={setMat('flap')} color={palette.border} roughness={0.8} side={THREE.DoubleSide} transparent />
        </mesh>

        {/* Field highlights (AI extracts) */}
        {fields.map((f, i) => (
          <mesh key={f.key} position={[f.cx, f.cy, faceZ + 0.1]} renderOrder={1}>
            <planeGeometry args={[f.w, f.h]} />
            <meshBasicMaterial
              ref={(m) => (highlightMats.current[i] = m)}
              color={palette.teal}
              transparent
              opacity={0}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}

        {/* TIN review overlays */}
        <mesh position={[tin.cx, tin.cy, faceZ + 0.2]} renderOrder={2}>
          <planeGeometry args={[tin.w, tin.h]} />
          <meshBasicMaterial ref={tinWarnMat} map={textures.tinWarn} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[tin.cx, tin.cy, faceZ + 0.25]} renderOrder={3}>
          <planeGeometry args={[tin.w, tin.h]} />
          <meshBasicMaterial ref={tinOkMat} map={textures.tinOk} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>

        {/* Scan beam */}
        <group ref={beam} position={[0, 0, faceZ + 0.4]}>
          <mesh renderOrder={4}>
            <planeGeometry args={[w + 12, 30]} />
            <meshBasicMaterial ref={beamMat} color={palette.teal} transparent depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh renderOrder={5}>
            <planeGeometry args={[w + 12, 2.5]} />
            <meshBasicMaterial ref={beamLineMat} color={palette.teal} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        </group>

        {/* MyInvois-ready badge at the top-right corner */}
        <group ref={badge} position={[w / 2 - badgeR * 0.35, h / 2 - badgeR * 0.35, faceZ + BADGE_DEPTH / 2 + 2]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[badgeR, badgeR, BADGE_DEPTH, 48]} />
            <meshStandardMaterial color={palette.success} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, BADGE_DEPTH / 2 + 0.2]}>
            <planeGeometry args={[badgeR * 1.5, badgeR * 1.5]} />
            <meshBasicMaterial map={textures.badgeCheck} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

function Scene({ restingRef, controlRef, textRect, onStage, onReady, onRest, dragTarget }) {
  const palette = useMemo(colorPalette, []);
  const textures = useMemo(() => createInvoiceTextures(palette.css), [palette]);
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures]);

  const [hands, setHands] = useState(null);
  const { camera, invalidate, size } = useThree();

  const time = useRef(restingRef.current ? FINAL_T : START_T);
  const wraps = useRef(0);
  const breathe = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const lastStage = useRef(-1);
  const ready = useRef(false);
  const stateRef = useRef(timeline(time.current));
  const aiRing = useRef({ progress: 0, opacity: 0 });
  const humanRing = useRef({ progress: 0, opacity: 0 });
  const dragRot = useRef({ x: 0, y: 0 });
  const maskRef = useRef(textRect);
  maskRef.current = textRect;

  const layout = useMemo(() => computeLayout(size), [size]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // Fixed-FOV fit: 1 scene unit = 1 CSS pixel at z = 0.
  const cameraDist = size.height / 2 / Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
  useLayoutEffect(() => {
    camera.fov = CAMERA_FOV;
    camera.near = cameraDist * 0.05;
    camera.far = cameraDist * 4;
    camera.position.set(0, 0, cameraDist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, cameraDist, invalidate]);

  useEffect(() => {
    invalidate();
  }, [textRect, invalidate]);

  // Images never reject: a missing/opaque file resolves to a placeholder silhouette.
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadHandImage('ai'), loadHandImage('human')]).then(([ai, human]) => {
      if (!cancelled) setHands({ ai, human });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Dock buttons jump to a step and hold it there (the loop stops — this is the pause).
  useEffect(() => {
    controlRef.current = {
      jumpTo(index) {
        time.current = STAGES[index].still;
        onRest?.();
        invalidate();
      },
      invalidate,
    };
    return () => {
      controlRef.current = null;
    };
  }, [controlRef, invalidate, onRest]);

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
    const playing = !restingRef.current;
    if (playing) {
      let next = time.current + dt;
      if (next >= LOOP) {
        next %= LOOP;
        wraps.current += 1;
      }
      // After LOOPS_BEFORE_REST full loops, rest on the MyInvois-ready frame.
      if (wraps.current >= LOOPS_BEFORE_REST && next >= FINAL_T) {
        next = FINAL_T;
        onRest?.();
      }
      time.current = next;
      breathe.current += dt;
    }
    const s = timeline(time.current);
    stateRef.current = s;
    aiRing.current = s.aiRing;
    humanRing.current = s.humanRing;

    // Gentle mouse parallax while playing; hands sit behind the invoice, so it shows depth.
    const L = layoutRef.current;
    if (playing) {
      const k = 1 - Math.exp(-dt * 2.5);
      camera.position.x = lerp(camera.position.x, pointer.current.x * PARALLAX.x * L.s, k);
      camera.position.y = lerp(camera.position.y, pointer.current.y * PARALLAX.y * L.s, k);
    }
    camera.lookAt(0, 0, 0);

    // Invoice follows the drag angle and springs back to default when released.
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
    if (hands && !ready.current) {
      ready.current = true;
      onReady?.();
    }
  });

  return (
    <>
      {/* Soft light only: sky/ground fill plus two directional lights, so the page shades as it turns. */}
      <hemisphereLight args={[palette.card, palette.navyPale, 1.0]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[-400, 600, 800]} intensity={1.2} />
      <directionalLight position={[400, -200, 600]} intensity={0.3} />

      {hands && (
        <>
          <HandImage
            data={hands.ai}
            side="ai"
            ringColor={palette.teal}
            ringRef={aiRing}
            breathe={breathe}
            layoutRef={layoutRef}
            maskRef={maskRef}
          />
          <HandImage
            data={hands.human}
            side="human"
            ringColor={palette.navyTeal}
            ringRef={humanRing}
            breathe={breathe}
            layoutRef={layoutRef}
            maskRef={maskRef}
          />
        </>
      )}

      <PaperInvoice
        palette={palette}
        textures={textures}
        stateRef={stateRef}
        dragRot={dragRot}
        breathe={breathe}
        layoutRef={layoutRef}
      />
    </>
  );
}

/**
 * @param resting    true = no automatic motion: reduced motion, after 3 loops, or after a step click
 * @param active     false = hero is off-screen: stop rendering
 * @param textRect   { left, top, right, bottom } px in the canvas — hand pixels fade inside it
 * @param dragTarget ref { x, y } — invoice drag angle, set by HeroVisual's drag area
 * @param controlRef receives { jumpTo(stageIndex), invalidate() }
 * @param onStage    called when the loop enters a new step (0–3)
 * @param onReady    called once the hands have loaded and a frame has rendered
 * @param onRest     called when the loop comes to rest (after 3 loops or a step click)
 */
export default function HeroScene({ resting = false, active = true, textRect, dragTarget, controlRef, onStage, onReady, onRest }) {
  const [lowQuality, setLowQuality] = useState(false);
  const restingRef = useRef(resting);
  restingRef.current = resting;
  const onStageRef = useRef(onStage);
  onStageRef.current = onStage;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onRestRef = useRef(onRest);
  onRestRef.current = onRest;
  const callbacks = useMemo(
    () => ({
      stage: (i) => onStageRef.current?.(i),
      ready: () => onReadyRef.current?.(),
      rest: () => onRestRef.current?.(),
    }),
    []
  );

  // Render one frame when coming to rest so the still frame is current.
  useEffect(() => {
    controlRef.current?.invalidate?.();
  }, [resting, controlRef]);

  const frameloop = !active ? 'never' : resting ? 'demand' : 'always';

  return (
    <Canvas
      className="hero-canvas"
      frameloop={frameloop}
      dpr={lowQuality ? 1 : [1, 2]}
      flat
      camera={{ fov: CAMERA_FOV, position: [0, 0, 1000] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ pointerEvents: 'none' }}
    >
      <PerformanceMonitor onDecline={() => setLowQuality(true)} />
      <Scene
        restingRef={restingRef}
        controlRef={controlRef}
        textRect={textRect}
        dragTarget={dragTarget}
        onStage={callbacks.stage}
        onReady={callbacks.ready}
        onRest={callbacks.rest}
      />
    </Canvas>
  );
}
