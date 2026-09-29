// Lazy-loaded three.js layer: three matte "clay" brand objects (receipt, RM coin, shield with check)
// floating around the product window. Positions come from objectLayout.js relative to the window's
// on-screen box, which ProductWindow publishes in heroMotion. Renders on demand only.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei/core/PerformanceMonitor.js';
import { OBJECTS, objectBoxes } from './objectLayout.js';
import { heroMotion, subscribeHeroMotion } from './heroMotion.js';

/** Parallax shift per unit of depth factor (px at full mouse deflection). */
const PARALLAX_PX = 14;
/** Idle float amplitude (px) and soft shadow opacity. */
const FLOAT_PX = 6;
const SHADOW_OPACITY = 0.18;

function cssColor(name) {
  return new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Matte clay: fully rough, no metal, no reflections. */
function clay(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, ...extra });
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Soft round shadow blob (navy) used under each object. */
function shadowTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, cssVar('--navy'));
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

// ---------------------------------------------------------------------------
// Objects (built at a 100-unit base size, scaled to their layout box)
// ---------------------------------------------------------------------------

/** Thermal receipt: curled paper strip with zigzag bottom and navy text lines. */
function useReceipt() {
  return useMemo(() => {
    const W = 44;
    const H = 100;
    const geo = new THREE.PlaneGeometry(W, H, 1, 32);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const y = pos.getY(i);
      const v = (H / 2 - y) / H; // 0 top → 1 bottom
      pos.setZ(i, 16 * v * v); // bottom curls toward the viewer
    }
    geo.computeVertexNormals();

    const texture = canvasTexture(220, 500, (ctx, w, h) => {
      const tooth = 20;
      ctx.fillStyle = cssVar('--card');
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, 0);
      ctx.lineTo(w, h - tooth);
      for (let x = w; x > 0; x -= tooth) {
        ctx.lineTo(x - tooth / 2, h);
        ctx.lineTo(x - tooth, h - tooth);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = cssVar('--navy');
      const bar = (x, y, bw, bh = 10) => ctx.fillRect(x, y, bw, bh);
      bar(50, 40, 120, 14);
      [90, 120, 150].forEach((y, i) => {
        bar(28, y, 110 - i * 20);
        bar(162, y, 30);
      });
      ctx.fillRect(28, 190, 164, 3);
      [220, 250, 280, 310].forEach((y, i) => {
        bar(28, y, 90 + (i % 2) * 30);
        bar(160, y, 32);
      });
      ctx.fillRect(28, 350, 164, 3);
      bar(28, 375, 70, 16);
      bar(132, 375, 60, 16);
    });
    const material = clay(cssColor('--card'), { map: texture, alphaTest: 0.5, side: THREE.DoubleSide });
    return { geo, material, texture, aspect: W / H };
  }, []);
}

/** RM coin: thick gold disc with a rounded rim and a raised "RM" on its face. */
function useCoin() {
  return useMemo(() => {
    const R = 50;
    const T = 7; // half thickness
    const r = 5; // rim rounding
    // Profile (radius, height): back face → rounded rim → front face, revolved around the axis.
    const profile = [new THREE.Vector2(0, -T)];
    for (let i = 0; i <= 6; i += 1) {
      const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
      profile.push(new THREE.Vector2(R - r + Math.cos(a) * r, -T + r + Math.sin(a) * r));
    }
    for (let i = 0; i <= 6; i += 1) {
      const a = (i / 6) * (Math.PI / 2);
      profile.push(new THREE.Vector2(R - r + Math.cos(a) * r, T - r + Math.sin(a) * r));
    }
    profile.push(new THREE.Vector2(0, T));
    const body = new THREE.LatheGeometry(profile, 64);
    body.rotateX(Math.PI / 2); // axis toward the viewer

    const faceTexture = canvasTexture(256, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      // Inner ring
      ctx.strokeStyle = cssVar('--gold-text');
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 104, 0, Math.PI * 2);
      ctx.stroke();
      // Raised "RM": darker offset below, lighter letters on top
      ctx.font = `700 96px "Inter", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = cssVar('--gold-text');
      ctx.fillText('RM', w / 2 + 4, h / 2 + 7);
      ctx.globalAlpha = 1;
      ctx.fillStyle = cssVar('--gold-pale');
      ctx.fillText('RM', w / 2, h / 2 + 2);
    });
    const face = new THREE.PlaneGeometry(R * 1.7, R * 1.7);
    return {
      body,
      bodyMaterial: clay(cssColor('--gold'), { side: THREE.DoubleSide }),
      face,
      faceMaterial: clay(new THREE.Color(1, 1, 1), { map: faceTexture, transparent: true, depthWrite: false }),
      faceTexture,
      faceZ: T + 0.3,
    };
  }, []);
}

/** Rounded teal shield with a raised white check. */
function useShield() {
  return useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-40, 44);
    s.quadraticCurveTo(0, 58, 40, 44);
    s.lineTo(40, 6);
    s.bezierCurveTo(40, -30, 16, -48, 0, -56);
    s.bezierCurveTo(-16, -48, -40, -30, -40, 6);
    s.closePath();
    const body = new THREE.ExtrudeGeometry(s, {
      depth: 12,
      bevelEnabled: true,
      bevelThickness: 6,
      bevelSize: 6,
      bevelSegments: 5,
      curveSegments: 24,
    });
    body.translate(0, 0, -6);

    const path = new THREE.CurvePath();
    const p1 = new THREE.Vector3(-17, 0, 0);
    const p2 = new THREE.Vector3(-4, -13, 0);
    const p3 = new THREE.Vector3(20, 14, 0);
    path.add(new THREE.LineCurve3(p1, p2));
    path.add(new THREE.LineCurve3(p2, p3));
    const check = new THREE.TubeGeometry(path, 48, 5.5, 12, false);
    const cap = new THREE.SphereGeometry(5.5, 16, 12);
    return { body, check, cap, capPoints: [p1, p2, p3], checkZ: 12 + 4 };
  }, []);
}

// ---------------------------------------------------------------------------

function Objects() {
  const { invalidate, size } = useThree();
  const receipt = useReceipt();
  const coin = useCoin();
  const shield = useShield();
  const shadowTex = useMemo(shadowTexture, []);
  const colors = useMemo(() => ({ teal: cssColor('--teal'), card: cssColor('--card') }), []);

  // Redraw whenever the shared motion state changes, when the canvas size changes, and once after mounting
  // (the first frame can happen before the canvas has its size).
  useEffect(() => subscribeHeroMotion(() => invalidate()), [invalidate]);
  useEffect(() => {
    invalidate();
    const id = setTimeout(() => invalidate(), 100);
    return () => clearTimeout(id);
  }, [invalidate, size.width, size.height]);
  useEffect(
    () => () => {
      [receipt.geo, receipt.material, receipt.texture, coin.body, coin.bodyMaterial, coin.face, coin.faceMaterial, coin.faceTexture, shield.body, shield.check, shield.cap, shadowTex].forEach(
        (x) => x.dispose()
      );
    },
    [receipt, coin, shield, shadowTex]
  );

  const refs = { receipt: useRef(), coin: useRef(), shield: useRef() };
  const shadows = { receipt: useRef(), coin: useRef(), shield: useRef() };

  useFrame(() => {
    const rect = heroMotion.windowRect;
    const hero = heroMotion.heroSize;
    const visible = Boolean(rect && hero);
    Object.values(refs).forEach((r) => r.current && (r.current.visible = visible));
    Object.values(shadows).forEach((r) => r.current && (r.current.visible = visible));
    if (!visible) return;

    const boxes = objectBoxes(rect, hero.width);
    const { mouse, story } = heroMotion;
    const { clock } = story; // stops advancing when the story rests, so floating stops too
    const st = story.state;
    const toWorld = (x, y) => ({ x: x - size.width / 2, y: size.height / 2 - y });

    const place = (key, box, base, phase, speed) => {
      const o = OBJECTS[key];
      const p = toWorld(box.cx + mouse.x * PARALLAX_PX * o.depth, box.cy - mouse.y * PARALLAX_PX * o.depth);
      const float = Math.sin(clock * speed + phase) * FLOAT_PX;
      const g = refs[key].current;
      g.position.set(p.x, p.y + float, 0);
      g.scale.setScalar(base);
      const sh = shadows[key].current;
      sh.position.set(p.x + 6, p.y - box.h * 0.55, -80);
      sh.scale.set(box.w * 1.1 * (1 - float / 60), box.w * 0.32, 1);
      return { g, float };
    };

    // Receipt
    const rb = boxes.receipt;
    const r = place('receipt', rb, rb.h / 100, 0, 0.9);
    r.g.rotation.set(0.15, 0.25 + Math.sin(clock * 0.5) * 0.12, OBJECTS.receipt.tilt + Math.sin(clock * 0.7) * 0.04);

    // Coin — one smooth spin when MyInvois-ready appears
    const cb = boxes.coin;
    const c = place('coin', cb, cb.w / 100, 1.3, 0.8);
    const spin = (st?.objects.coinSpin ?? 0) * Math.PI * 2;
    c.g.rotation.set(0.25 + Math.sin(clock * 0.6) * 0.08, -0.35 + Math.sin(clock * 0.45) * 0.2 + spin, 0.1);

    // Shield — small bounce when MyInvois-ready appears
    const sb = boxes.shield;
    const s = place('shield', sb, sb.w / 100, 2.4, 1.0);
    s.g.position.y += (st?.objects.shieldBounce ?? 0) * 14;
    s.g.rotation.set(0.12, -0.3 + Math.sin(clock * 0.55 + 1) * 0.15, -0.08);
  });

  return (
    <>
      <ambientLight intensity={0.95} />
      <directionalLight position={[-400, 600, 800]} intensity={1.4} />

      {['receipt', 'coin', 'shield'].map((key) => (
        <mesh key={`${key}-shadow`} ref={shadows[key]} renderOrder={-1}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={shadowTex} transparent opacity={SHADOW_OPACITY} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}

      <group ref={refs.receipt}>
        <mesh geometry={receipt.geo} material={receipt.material} />
      </group>

      <group ref={refs.coin}>
        <mesh geometry={coin.body} material={coin.bodyMaterial} />
        <mesh geometry={coin.face} material={coin.faceMaterial} position={[0, 0, coin.faceZ]} />
      </group>

      <group ref={refs.shield}>
        <mesh geometry={shield.body}>
          <meshStandardMaterial color={colors.teal} roughness={1} metalness={0} />
        </mesh>
        <group position={[0, 0, shield.checkZ]}>
          <mesh geometry={shield.check}>
            <meshStandardMaterial color={colors.card} roughness={1} metalness={0} />
          </mesh>
          {shield.capPoints.map((p, i) => (
            <mesh key={i} geometry={shield.cap} position={p}>
              <meshStandardMaterial color={colors.card} roughness={1} metalness={0} />
            </mesh>
          ))}
        </group>
      </group>
    </>
  );
}

/**
 * Transparent canvas over the hero section. Renders every frame while the story plays (the objects float),
 * then only on demand (mouse, scroll, resize) once it rests; stops completely when off-screen.
 */
export default function BrandObjects() {
  const ref = useRef(null);
  const [lowQuality, setLowQuality] = useState(false);
  const [visible, setVisible] = useState(true);
  const [resting, setResting] = useState(heroMotion.story.resting);

  useEffect(
    () =>
      subscribeHeroMotion(() => {
        if (heroMotion.story.resting !== resting) setResting(heroMotion.story.resting);
      }),
    [resting]
  );

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="hero-objects__canvas">
      <Canvas
        orthographic
        frameloop={!visible ? 'never' : resting ? 'demand' : 'always'}
        dpr={lowQuality ? 1 : [1, 2]}
        flat
        camera={{ position: [0, 0, 1000], zoom: 1, near: 1, far: 4000 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        style={{ pointerEvents: 'none' }}
      >
        <PerformanceMonitor onDecline={() => setLowQuality(true)} />
        <Objects />
      </Canvas>
    </div>
  );
}
