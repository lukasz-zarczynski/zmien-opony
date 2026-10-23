// Animated weather backdrop: snow, falling leaves, drizzle or warm light motes on a full-screen canvas.

const LEAF_COLORS = ["#d9822b", "#c4561d", "#e0a526", "#a8441a", "#b8762a"];

const MODES = {
  snow: {
    density: 1 / 7000,
    max: 180,
    spawn(w, h) {
      const r = 1 + Math.random() * 3;
      return { x: Math.random() * w, y: Math.random() * h - 10, r, vy: 0.3 + r * 0.25, phase: Math.random() * 6.28, alpha: 0.5 + Math.random() * 0.5 };
    },
    step(p, t) {
      p.y += p.vy;
      p.x += Math.sin(t / 1400 + p.phase) * 0.4;
    },
    draw(ctx, p) {
      ctx.globalAlpha = p.alpha * p.fade;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  leaves: {
    density: 1 / 45000,
    max: 28,
    spawn(w, h) {
      return {
        x: Math.random() * w, y: Math.random() * h - 20, size: 7 + Math.random() * 7,
        vy: 0.5 + Math.random() * 0.6, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.04,
        phase: Math.random() * 6.28, color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
      };
    },
    step(p, t) {
      p.y += p.vy;
      p.x += Math.sin(t / 900 + p.phase) * 1.1;
      p.rot += p.vr;
    },
    draw(ctx, p) {
      ctx.globalAlpha = 0.85 * p.fade;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.abs(Math.sin(p.rot * 2)) * 0.6 + 0.4); // fake 3D flutter
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.quadraticCurveTo(p.size * 0.8, 0, 0, p.size);
      ctx.quadraticCurveTo(-p.size * 0.8, 0, 0, -p.size);
      ctx.fill();
      ctx.restore();
    },
  },
  rain: {
    density: 1 / 9000,
    max: 140,
    spawn(w, h) {
      return { x: Math.random() * (w + 200), y: Math.random() * h - 20, len: 10 + Math.random() * 14, vy: 7 + Math.random() * 5, alpha: 0.2 + Math.random() * 0.3 };
    },
    step(p) {
      p.y += p.vy;
      p.x -= p.vy * 0.18;
    },
    draw(ctx, p) {
      ctx.globalAlpha = p.alpha * p.fade;
      ctx.strokeStyle = "#dfe8f2";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.len * 0.18, p.y + p.len);
      ctx.stroke();
    },
  },
  sun: {
    density: 1 / 30000,
    max: 40,
    spawn(w, h) {
      return { x: Math.random() * w, y: Math.random() * h, r: 1.5 + Math.random() * 3, vy: -(0.2 + Math.random() * 0.4), phase: Math.random() * 6.28 };
    },
    step(p, t) {
      p.y += p.vy;
      p.x += Math.sin(t / 2000 + p.phase) * 0.3;
    },
    draw(ctx, p, t) {
      ctx.globalAlpha = (0.35 + Math.sin(t / 600 + p.phase) * 0.25) * p.fade;
      ctx.fillStyle = "#fff6d6";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    },
    offscreen: (p) => p.y < -20,
  },
};

export function createScene(canvas) {
  const ctx = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let particles = [];
  let mode = null;
  let width = 0;
  let height = 0;
  let frame = null;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function targetCount() {
    const spec = MODES[mode];
    return spec ? Math.min(spec.max, Math.round(width * height * spec.density)) : 0;
  }

  function tick(t) {
    ctx.clearRect(0, 0, width, height);
    const spec = MODES[mode];
    const live = particles.filter((p) => p.mode === mode).length;
    if (spec && live < targetCount() && Math.random() < 0.6) {
      particles.push({ ...spec.spawn(width, height), mode, fade: 0 });
    }

    particles = particles.filter((p) => {
      const s = MODES[p.mode];
      const leaving = p.mode !== mode;
      p.fade = Math.max(0, Math.min(1, p.fade + (leaving ? -0.02 : 0.02)));
      s.step(p, t);
      const gone = s.offscreen ? s.offscreen(p) : p.y > height + 30;
      if (gone && !leaving) Object.assign(p, s.spawn(width, 0), { y: s.offscreen ? height + 10 : -20 });
      if (leaving && p.fade === 0) return false;
      s.draw(ctx, p, t);
      return true;
    });
    ctx.globalAlpha = 1;
    frame = particles.length || spec ? requestAnimationFrame(tick) : null;
  }

  // Reduced motion: a single still frame of the scene instead of an animation.
  function drawStill() {
    ctx.clearRect(0, 0, width, height);
    const spec = MODES[mode];
    particles = spec ? Array.from({ length: targetCount() }, () => ({ ...spec.spawn(width, height), mode, fade: 1 })) : [];
    particles.forEach((p) => spec.draw(ctx, p, 0));
    ctx.globalAlpha = 1;
  }

  function start() {
    if (reducedMotion.matches) drawStill();
    else if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = null;
  }

  window.addEventListener("resize", () => {
    resize();
    if (reducedMotion.matches) drawStill();
  });
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  reducedMotion.addEventListener("change", () => {
    stop();
    start();
  });
  resize();

  return {
    setMode(next) {
      if (next === mode) return;
      mode = next;
      start();
    },
  };
}
