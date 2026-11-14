'use client';

import { useEffect, useRef, useState } from 'react';
/** How long each teaser item stays up. */
const TEASER_MS = 2800;

/**
 * One icon per teaser item, in the order the page passes them: customer data,
 * wallet, transactions, charging, stations & pricing.
 */
const TEASER_ICONS = [
  // person
  'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0',
  // wallet
  'M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M21 11h-5a2 2 0 0 0 0 4h5v-4Z',
  // two-way arrows
  'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  // lightning bolt
  'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  // map pin
  'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
];

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  z: number; // depth 0.3–1: drives parallax, size and brightness
}

interface Pulse {
  node: Node;
  t: number;
  speed: number;
}

interface Ripple {
  x: number;
  y: number;
  r: number;
  life: number;
}

const LINK = 140; // max distance for node-to-node lines
const HUB_LINK = 260; // max distance for hub-to-node lines

/**
 * Full-bleed animated network: a glowing hub (Eplug) with partner nodes
 * drifting around it, energy pulses running hub → node, cursor parallax and
 * click shockwaves. Falls back to a single still frame for reduced motion.
 */
export function PartnersStage({
  title,
  subtitle,
  teaserLead,
  teaserItems,
  children,
}: {
  title: string;
  subtitle: string;
  teaserLead?: string;
  teaserItems?: string[];
  children?: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!wrap || !canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let nodes: Node[] = [];
    const pulses: Pulse[] = [];
    const ripples: Ripple[] = [];
    const mouse = { x: 0, y: 0, tx: 0, ty: 0, active: false };
    let raf = 0;
    let last = performance.now();
    let pulseClock = 0;

    // Canvas can't use CSS variables directly, so read the theme's brand and
    // text colours as "r, g, b" and refresh them whenever the theme changes.
    let brand = '16, 185, 129';
    let fg = '230, 237, 246';
    let glow = '52, 211, 153';
    let ink = 1; // alpha boost: thin lines need more weight on a light page
    const probe = document.createElement('span');
    probe.style.display = 'none';
    wrap.appendChild(probe);
    function rgbOf(cssVar: string, fallback: string) {
      probe.style.color = `var(${cssVar})`;
      const m = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g);
      return m && m.length >= 3 ? m.slice(0, 3).join(', ') : fallback;
    }
    function readColors() {
      brand = rgbOf('--brand', brand);
      fg = rgbOf('--foreground', fg);
      glow = rgbOf('--brand-strong', glow);
      const [r, g, b] = rgbOf('--background', '6, 11, 18').split(',').map(Number);
      const light = 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
      ink = light ? 2.4 : 1;
      if (light) fg = glow;
      wrap!.dataset.light = light ? 'true' : 'false';
      if (reduced && w) draw(0);
    }
    readColors();
    const themeObserver = new MutationObserver(readColors);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
    const schemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    schemeQuery.addEventListener('change', readColors);
    const stopTheme = () => {
      themeObserver.disconnect();
      schemeQuery.removeEventListener('change', readColors);
      probe.remove();
    };

    function seed() {
      const count = Math.min(120, Math.max(36, Math.round((w * h) / 13000)));
      nodes = Array.from({ length: count }, () => {
        const z = 0.3 + Math.random() * 0.7;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.25 * z,
          vy: (Math.random() - 0.5) * 0.25 * z,
          r: 0.8 + z * 1.8,
          z,
        };
      });
    }

    function resize() {
      const rect = wrap!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      mouse.x = mouse.tx = w / 2;
      mouse.y = mouse.ty = h / 2;
      seed();
      if (reduced) draw(0);
    }

    function project(n: Node) {
      // Nearer nodes shift more against the cursor: a cheap depth effect.
      const px = (mouse.x - w / 2) * 0.04 * n.z;
      const py = (mouse.y - h / 2) * 0.04 * n.z;
      return { x: n.x - px, y: n.y - py };
    }

    function draw(dt: number) {
      const cx = w / 2 - (mouse.x - w / 2) * 0.015;
      const cy = h * 0.46 - (mouse.y - h / 2) * 0.015;
      ctx!.clearRect(0, 0, w, h);

      // Move nodes; the cursor gently pushes them away.
      for (const n of nodes) {
        if (mouse.active) {
          const dx = n.x - mouse.tx;
          const dy = n.y - mouse.ty;
          const d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120 && d2 > 1) {
            const f = (1 - Math.sqrt(d2) / 120) * 0.04;
            n.vx += dx * f * 0.05;
            n.vy += dy * f * 0.05;
          }
        }
        n.vx *= 0.985;
        n.vy *= 0.985;
        // Keep a minimum drift so the scene never freezes.
        if (Math.abs(n.vx) < 0.05) n.vx += (Math.random() - 0.5) * 0.02;
        if (Math.abs(n.vy) < 0.05) n.vy += (Math.random() - 0.5) * 0.02;
        n.x += n.vx * dt * 0.06;
        n.y += n.vy * dt * 0.06;
        if (n.x < -20) n.x = w + 20;
        if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        if (n.y > h + 20) n.y = -20;
      }

      const pts = nodes.map(project);

      // Node-to-node mesh.
      ctx!.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            const a = (1 - d / LINK) * 0.22 * Math.min(nodes[i].z, nodes[j].z);
            ctx!.strokeStyle = `rgba(${brand}, ${Math.min(1, a * ink)})`;
            ctx!.beginPath();
            ctx!.moveTo(pts[i].x, pts[i].y);
            ctx!.lineTo(pts[j].x, pts[j].y);
            ctx!.stroke();
          }
        }
      }

      // Hub spokes.
      for (let i = 0; i < pts.length; i++) {
        const d = Math.hypot(pts[i].x - cx, pts[i].y - cy);
        if (d < HUB_LINK) {
          const a = (1 - d / HUB_LINK) * 0.28;
          ctx!.strokeStyle = `rgba(${brand}, ${Math.min(1, a * ink)})`;
          ctx!.beginPath();
          ctx!.moveTo(cx, cy);
          ctx!.lineTo(pts[i].x, pts[i].y);
          ctx!.stroke();
        }
      }

      // Cursor links.
      if (mouse.active) {
        for (const p of pts) {
          const d = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          if (d < 170) {
            ctx!.strokeStyle = `rgba(${brand}, ${Math.min(1, (1 - d / 170) * 0.45 * ink)})`;
            ctx!.beginPath();
            ctx!.moveTo(mouse.x, mouse.y);
            ctx!.lineTo(p.x, p.y);
            ctx!.stroke();
          }
        }
      }

      // Nodes.
      for (let i = 0; i < pts.length; i++) {
        const n = nodes[i];
        ctx!.fillStyle = `rgba(${fg}, ${0.25 + n.z * 0.6})`;
        ctx!.beginPath();
        ctx!.arc(pts[i].x, pts[i].y, n.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Energy pulses travelling out from the hub.
      if (!reduced) {
        pulseClock += dt;
        if (pulseClock > 260) {
          pulseClock = 0;
          const near = nodes.filter((n) => {
            const p = project(n);
            return Math.hypot(p.x - cx, p.y - cy) < HUB_LINK * 1.4;
          });
          if (near.length) {
            pulses.push({ node: near[(Math.random() * near.length) | 0], t: 0, speed: 0.0008 + Math.random() * 0.0008 });
          }
        }
        for (let i = pulses.length - 1; i >= 0; i--) {
          const p = pulses[i];
          p.t += p.speed * dt;
          if (p.t >= 1) {
            pulses.splice(i, 1);
            continue;
          }
          const target = project(p.node);
          const x = cx + (target.x - cx) * p.t;
          const y = cy + (target.y - cy) * p.t;
          const g = ctx!.createRadialGradient(x, y, 0, x, y, 10);
          g.addColorStop(0, `rgba(${glow}, 0.95)`);
          g.addColorStop(0.4, `rgba(${brand}, 0.5)`);
          g.addColorStop(1, `rgba(${brand}, 0)`);
          ctx!.fillStyle = g;
          ctx!.beginPath();
          ctx!.arc(x, y, 10, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // Hub core with breathing rings.
      const now = performance.now() / 1000;
      const breathe = reduced ? 0.5 : (Math.sin(now * 1.6) + 1) / 2;
      const core = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 90 + breathe * 20);
      core.addColorStop(0, `rgba(${glow}, 0.9)`);
      core.addColorStop(0.08, `rgba(${brand}, 0.7)`);
      core.addColorStop(0.35, `rgba(${brand}, 0.18)`);
      core.addColorStop(1, `rgba(${brand}, 0)`);
      ctx!.fillStyle = core;
      ctx!.beginPath();
      ctx!.arc(cx, cy, 110 + breathe * 20, 0, Math.PI * 2);
      ctx!.fill();
      if (!reduced) {
        for (let k = 0; k < 3; k++) {
          const phase = (now * 0.35 + k / 3) % 1;
          ctx!.strokeStyle = `rgba(${brand}, ${Math.min(1, (1 - phase) * 0.35 * ink)})`;
          ctx!.lineWidth = 1.2;
          ctx!.beginPath();
          ctx!.arc(cx, cy, 20 + phase * 220, 0, Math.PI * 2);
          ctx!.stroke();
        }
      }

      // Click shockwaves.
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += dt * 0.6;
        r.life -= dt * 0.0012;
        if (r.life <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx!.strokeStyle = `rgba(${brand}, ${Math.min(1, r.life * 0.7 * ink)})`;
        ctx!.lineWidth = 2 * r.life;
        ctx!.beginPath();
        ctx!.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx!.stroke();
      }
    }

    function frame(t: number) {
      const dt = Math.min(48, t - last);
      last = t;
      mouse.x += (mouse.tx - mouse.x) * 0.08;
      mouse.y += (mouse.ty - mouse.y) * 0.08;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
      }
      draw(dt);
      raf = requestAnimationFrame(frame);
    }

    function onMove(e: PointerEvent) {
      const rect = wrap!.getBoundingClientRect();
      mouse.tx = e.clientX - rect.left;
      mouse.ty = e.clientY - rect.top;
      mouse.active = true;
    }

    function onLeave() {
      mouse.active = false;
      mouse.tx = w / 2;
      mouse.ty = h / 2;
    }

    function onDown(e: PointerEvent) {
      const rect = wrap!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ripples.push({ x, y, r: 0, life: 1 });
      // Blast nearby nodes outward and fire a burst of pulses.
      for (const n of nodes) {
        const dx = n.x - x;
        const dy = n.y - y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 260) {
          const f = (1 - d / 260) * 4;
          n.vx += (dx / d) * f;
          n.vy += (dy / d) * f;
        }
      }
      for (let i = 0; i < 8; i++) {
        pulses.push({ node: nodes[(Math.random() * nodes.length) | 0], t: 0, speed: 0.0015 + Math.random() * 0.001 });
      }
    }

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    if (!reduced) {
      wrap.addEventListener('pointermove', onMove);
      wrap.addEventListener('pointerleave', onLeave);
      wrap.addEventListener('pointerdown', onDown);
      const onVisibility = () => {
        cancelAnimationFrame(raf);
        if (!document.hidden) {
          last = performance.now();
          raf = requestAnimationFrame(frame);
        }
      };
      document.addEventListener('visibilitychange', onVisibility);
      raf = requestAnimationFrame(frame);
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        stopTheme();
        wrap.removeEventListener('pointermove', onMove);
        wrap.removeEventListener('pointerleave', onLeave);
        wrap.removeEventListener('pointerdown', onDown);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }
    return () => {
      ro.disconnect();
      stopTheme();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="partners-stage relative isolate flex flex-col items-center justify-center overflow-hidden bg-background text-foreground py-20 sm:py-28 border-b border-border"
    >
      {/* Deep aurora backdrop */}
      <div aria-hidden className="partners-aurora pointer-events-none absolute inset-0 -z-20" />
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 -z-10" />
      {/* Soft spotlight that trails the cursor */}
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 -z-10 -ml-[300px] -mt-[300px] size-[600px] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand)_14%,transparent),transparent_60%)]"
      />
      {/* Edges fade into the page colour + film grain */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,var(--background)_100%)]" />
      <div aria-hidden className="partners-grain pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay" />

      {/* Content wrapper with standard font, natural typography, and clickable buttons */}
      <div className="relative z-10 px-4 text-center max-w-4xl mx-auto space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3.5 py-1 text-xs font-semibold text-brand ring-1 ring-brand/20">
          Eplug Түншлэлийн платформ
        </span>

        <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl font-sans">
          {title}
        </h1>

        <p className="mx-auto max-w-2xl text-pretty text-base text-muted sm:text-lg leading-relaxed font-sans">
          {subtitle}
        </p>

        {children && (
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
