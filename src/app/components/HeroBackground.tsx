import { useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  opacityTarget: number;
  opacitySpeed: number;
  type: "house" | "building" | "dot" | "ring";
  rotation: number;
  rotationSpeed: number;
  color: string;
  pulse: number;
  pulseSpeed: number;
  floatOffset: number;
}

interface MousePos {
  x: number;
  y: number;
}

interface Ripple {
  x: number;
  y: number;
  r: number;
  maxR: number;
  opacity: number;
  color: string;
}

// ─── Draw helpers ─────────────────────────────────────────────────────────
function drawHouseIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  color: string,
  opacity: number,
  pulse: number
) {
  const s = size * (1 + pulse * 0.06);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;

  ctx.shadowColor = color;
  ctx.shadowBlur = 8 * (1 + pulse * 0.5);

  ctx.beginPath();
  ctx.roundRect(-s * 0.5, -s * 0.2, s, s * 0.7, s * 0.08);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-s * 0.6, -s * 0.2);
  ctx.lineTo(0, -s * 0.72);
  ctx.lineTo(s * 0.6, -s * 0.2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(-s * 0.12, s * 0.12, s * 0.24, s * 0.35, s * 0.04);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(-s * 0.42, -s * 0.05, s * 0.22, s * 0.22, s * 0.04);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(s * 0.2, -s * 0.05, s * 0.22, s * 0.22, s * 0.04);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawBuildingIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  color: string,
  opacity: number,
  pulse: number
) {
  const s = size * (1 + pulse * 0.05);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6 * (1 + pulse * 0.4);

  ctx.beginPath();
  ctx.roundRect(-s * 0.36, -s * 0.5, s * 0.72, s, s * 0.06);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, -s * 0.5);
  ctx.lineTo(0, -s * 0.75);
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.06;
  ctx.stroke();

  const cols = 3, rows = 4;
  const ww = s * 0.14, wh = s * 0.13;
  const gapX = (s * 0.72 - cols * ww) / (cols + 1);
  const gapY = (s * 0.85 - rows * wh) / (rows + 1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = -s * 0.36 + gapX + c * (ww + gapX);
      const wy = -s * 0.5 + gapY * 1.2 + r * (wh + gapY);
      ctx.beginPath();
      ctx.roundRect(wx, wy, ww, wh, 2);
      ctx.fillStyle =
        (r + c + Math.floor(pulse * 3)) % 3 === 0
          ? "rgba(255,255,255,0.6)"
          : "rgba(255,255,255,0.2)";
      ctx.fill();
    }
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  opacity: number,
  pulse: number
) {
  const r = size * (1 + pulse * 0.3);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.shadowColor = color;
  ctx.shadowBlur = r * 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  opacity: number,
  pulse: number
) {
  const r = size * (1 + pulse * 0.4);
  ctx.save();
  ctx.globalAlpha = opacity * 0.7;
  ctx.shadowColor = color;
  ctx.shadowBlur = r * 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.18;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ─── Connection lines between nearby particles ────────────────────────────
function drawConnections(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  maxDist: number
) {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i];
      const b = particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        const alpha = (1 - dist / maxDist) * 0.12;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = a.color;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

// ─── Main component ────────────────────────────────────────────────────────
export default function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<MousePos>({ x: -9999, y: -9999 });
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const frameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  const COLORS = [
    "rgba(14,165,233,0.55)",
    "rgba(56,189,248,0.5)",
    "rgba(99,179,237,0.5)",
    "rgba(218,165,32,0.45)",
    "rgba(245,166,35,0.45)",
    "rgba(148,196,232,0.4)",
  ];

  const makeParticle = useCallback(
    (w: number, h: number, fromEdge = false): Particle => {
      const type = (["house", "house", "building", "dot", "dot", "ring"] as const)[
        Math.floor(Math.random() * 6)
      ];
      const size =
        type === "house"
          ? 14 + Math.random() * 22
          : type === "building"
          ? 12 + Math.random() * 18
          : type === "ring"
          ? 3 + Math.random() * 5
          : 2 + Math.random() * 4;

      return {
        x: fromEdge
          ? Math.random() < 0.5
            ? Math.random() * 60
            : w - Math.random() * 60
          : Math.random() * w,
        y: fromEdge
          ? Math.random() < 0.5
            ? Math.random() * 60
            : h - Math.random() * 60
          : Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35 - 0.08,
        size,
        opacity: 0,
        opacityTarget: 0.15 + Math.random() * 0.55,
        opacitySpeed: 0.005 + Math.random() * 0.008,
        type,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.008,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        pulse: Math.random(),
        pulseSpeed: 0.012 + Math.random() * 0.018,
        floatOffset: Math.random() * Math.PI * 2,
      };
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0;

    const resize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * window.devicePixelRatio;
      canvas.height = h * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener("resize", resize);

    const COUNT = Math.min(55, Math.floor((w * h) / 18000));
    particlesRef.current = Array.from({ length: COUNT }, () => makeParticle(w, h));

    // ── mouse move: ripple + burst, throttled ─────────────────────────
    let lastRippleTime = 0;
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      mouseRef.current = { x: mx, y: my };

      const now = performance.now();
      if (now - lastRippleTime > 180) {
        lastRippleTime = now;
        ripplesRef.current.push({
          x: mx, y: my, r: 0, maxR: 80 + Math.random() * 50,
          opacity: 0.35,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
        for (let i = 0; i < 2; i++) {
          const p = makeParticle(w, h);
          p.x = mx; p.y = my;
          p.vx = (Math.random() - 0.5) * 2;
          p.vy = (Math.random() - 0.5) * 2 - 0.3;
          p.opacity = p.opacityTarget;
          particlesRef.current.push(p);
        }
      }
    };

    const onMouseLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    // ── render loop ───────────────────────────────────────────────────
    const render = (ts: number) => {
      const dt = Math.min((ts - timeRef.current) / 16.67, 3);
      timeRef.current = ts;

      ctx.clearRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const MOUSE_R = 140;

      const particles = particlesRef.current;

      drawConnections(ctx, particles, 160);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        if (p.opacity < p.opacityTarget) p.opacity = Math.min(p.opacity + p.opacitySpeed, p.opacityTarget);

        p.pulse = (Math.sin(ts * 0.001 * p.pulseSpeed * 60 + p.floatOffset) + 1) / 2;
        p.vy += Math.sin(ts * 0.0003 + p.floatOffset) * 0.003;

        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_R && dist > 0) {
          const force = ((MOUSE_R - dist) / MOUSE_R) * 0.7;
          p.vx += (dx / dist) * force * dt;
          p.vy += (dy / dist) * force * dt;
        }

        p.vx *= 0.982;
        p.vy *= 0.982;

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotationSpeed * dt;

        const pad = p.size * 2;
        if (p.x < -pad) p.x = w + pad;
        if (p.x > w + pad) p.x = -pad;
        if (p.y < -pad) p.y = h + pad;
        if (p.y > h + pad) p.y = -pad;

        switch (p.type) {
          case "house":
            drawHouseIcon(ctx, p.x, p.y, p.size, p.rotation, p.color, p.opacity, p.pulse);
            break;
          case "building":
            drawBuildingIcon(ctx, p.x, p.y, p.size, p.rotation, p.color, p.opacity, p.pulse);
            break;
          case "dot":
            drawDot(ctx, p.x, p.y, p.size, p.color, p.opacity, p.pulse);
            break;
          case "ring":
            drawRing(ctx, p.x, p.y, p.size, p.color, p.opacity, p.pulse);
            break;
        }

        if (dist < MOUSE_R * 0.6) {
          const gAlpha = (1 - dist / (MOUSE_R * 0.6)) * 0.25;
          ctx.save();
          ctx.globalAlpha = gAlpha;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.restore();
        }
      }

      // ── mouse aura ────────────────────────────────────────────────
      if (mx > 0 && mx < w) {
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, MOUSE_R * 0.8);
        grad.addColorStop(0, "rgba(56,189,248,0.07)");
        grad.addColorStop(1, "transparent");
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(mx, my, MOUSE_R * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(56,189,248,0.8)";
        ctx.fill();
        ctx.restore();
      }

      // ── ripples ───────────────────────────────────────────────────
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const rp = ripplesRef.current[i];
        rp.r += (rp.maxR - rp.r) * 0.07 * dt;
        rp.opacity -= 0.018 * dt;
        if (rp.opacity <= 0) { ripplesRef.current.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = rp.opacity;
        ctx.shadowColor = rp.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = rp.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ── ambient grid ──────────────────────────────────────────────
      ctx.save();
      ctx.globalAlpha = 0.025;
      ctx.strokeStyle = "rgba(14,165,233,0.8)";
      ctx.lineWidth = 0.5;
      const gridSize = 80;
      for (let gx = 0; gx < w; gx += gridSize) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      }
      ctx.restore();

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [makeParticle]);

  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(186,230,255,0.45) 0%, transparent 70%), " +
            "radial-gradient(ellipse 60% 40% at 80% 80%, rgba(218,165,32,0.08) 0%, transparent 60%)",
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: "crosshair" }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, rgba(248,250,252,0.55) 100%)",
        }}
      />
    </>
  );
}