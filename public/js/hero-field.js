/* froots — hero point field.
 *
 * An ASCII point cloud that morphs through globe → helix → atom → wave,
 * rotating slowly behind the hero footage.
 *
 * Deliberately dependency-free. Three.js would cost ~600 KB over the wire
 * and GSAP ~70 KB to do what the maths below does in a few: one cloud, a
 * lerp, and a rotation. Load speed was half the brief.
 *
 * Two things keep it cheap at runtime:
 *   - glyphs are pre-rendered once into sprites, so a frame is N cheap
 *     drawImage calls rather than N fillText calls;
 *   - it only runs while the hero is actually on screen and the tab is
 *     visible, so scrolling away costs nothing.
 */
(function heroField() {
  const canvas = document.getElementById('hero-field');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const hero = document.querySelector('.hero');
  const video = document.querySelector('.hero-video');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const N = 1400;
  const RAMP = '.:+*#';
  const LEVELS = RAMP.length;
  const TAU = Math.PI * 2;
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // ─── Shapes ─────────────────────────────────────────
  // Each emits exactly N points in a stable order, so morphing between any
  // two is a straight lerp — no matching or resampling at runtime.

  const GOLDEN = Math.PI * (3 - Math.sqrt(5));

  function globe(out) {
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const t = i * GOLDEN;
      out[i * 3] = Math.cos(t) * r;
      out[i * 3 + 1] = y;
      out[i * 3 + 2] = Math.sin(t) * r;
    }
    return out;
  }

  function helix(out) {
    const turns = 3;
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1);
      const t = f * TAU * turns;
      const y = f * 2 - 1;
      const a = Math.cos(t) * 0.5;
      const b = Math.sin(t) * 0.5;
      if (i % 9 === 0) {
        // A rung between the two strands. Stepped deterministically so the
        // shape is identical every build — no rng to desync a morph.
        const k = ((i / 9) % 5) / 4;
        out[i * 3] = a + (-a - a) * k;
        out[i * 3 + 1] = y;
        out[i * 3 + 2] = b + (-b - b) * k;
      } else {
        const s = i % 2 ? Math.PI : 0;
        out[i * 3] = Math.cos(t + s) * 0.5;
        out[i * 3 + 1] = y;
        out[i * 3 + 2] = Math.sin(t + s) * 0.5;
      }
    }
    return out;
  }

  function atom(out) {
    const core = Math.floor(N * 0.16);
    for (let i = 0; i < core; i++) {
      const y = 1 - (i / (core - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const t = i * GOLDEN;
      out[i * 3] = Math.cos(t) * r * 0.2;
      out[i * 3 + 1] = y * 0.2;
      out[i * 3 + 2] = Math.sin(t) * r * 0.2;
    }
    const perRing = Math.ceil((N - core) / 3);
    for (let i = core; i < N; i++) {
      const k = i - core;
      const ring = Math.min(2, Math.floor(k / perRing));
      const t = ((k % perRing) / perRing) * TAU;
      const x = Math.cos(t);
      const z = Math.sin(t);
      // Tip the ring out of the XZ plane, then spin it around Y so the
      // three orbits sit at even angles to each other.
      const tip = 1.1;
      const y2 = -z * Math.sin(tip);
      const z2 = z * Math.cos(tip);
      const spin = (ring * TAU) / 3;
      out[i * 3] = (x * Math.cos(spin) + z2 * Math.sin(spin)) * 0.95;
      out[i * 3 + 1] = y2 * 0.95;
      out[i * 3 + 2] = (-x * Math.sin(spin) + z2 * Math.cos(spin)) * 0.95;
    }
    return out;
  }

  function wave(out) {
    const gx = 48;
    const gz = Math.ceil(N / gx);
    for (let i = 0; i < N; i++) {
      const u = (i % gx) / (gx - 1);
      const v = Math.floor(i / gx) / (gz - 1);
      // 1.7, not 2.2: a flat sheet's diagonal is its widest axis, and at
      // 2.2 the rotated corners reached into the headline.
      out[i * 3] = (u - 0.5) * 1.7;
      out[i * 3 + 1] = Math.sin(u * Math.PI * 3 + v * Math.PI * 1.5) * 0.26;
      out[i * 3 + 2] = (v - 0.5) * 1.7;
    }
    return out;
  }

  const SHAPES = [globe, helix, atom, wave].map((fn) => fn(new Float32Array(N * 3)));

  // ─── Sprites ────────────────────────────────────────
  // One pre-rendered glyph per depth level. Built once per resize.

  let sprites = [];
  let spriteHalf = 0;
  let glyphPx = 9;

  function buildSprites() {
    sprites = [];
    const px = glyphPx * DPR;
    const size = Math.ceil(px * 1.8);
    spriteHalf = size / 2;
    for (let l = 0; l < LEVELS; l++) {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      g.font = `${px}px ${MONO}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = `rgba(255,255,255,${0.1 + (l / (LEVELS - 1)) * 0.5})`;
      g.fillText(RAMP[l], size / 2, size / 2);
      sprites.push(c);
    }
  }

  // ─── Layout ─────────────────────────────────────────
  // The cloud locks onto the footage's own box, so it stays centred on the
  // orb across every breakpoint without duplicating the CSS here.

  let cx = 0;
  let cy = 0;
  let radius = 0;
  let w = 0;
  let h = 0;

  function layout() {
    const box = hero.getBoundingClientRect();
    w = Math.round(box.width * DPR);
    h = Math.round(box.height * DPR);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${box.width}px`;
    canvas.style.height = `${box.height}px`;

    const v = video ? video.getBoundingClientRect() : null;
    if (v && v.width > 0) {
      cx = (v.left - box.left + v.width / 2) * DPR;
      cy = (v.top - box.top + v.height / 2) * DPR;
      // Radius, not diameter — a shape spanning -1..1 ends up twice this
      // across, so it should sit comfortably inside the orb's box.
      radius = Math.min(v.width, v.height) * 0.34 * DPR;
    } else {
      // Footage hidden (reduced motion) — mirror where the CSS would have
      // put it: off to the right on desktop, centred once stacked.
      const narrow = box.width <= 860;
      cx = box.width * (narrow ? 0.5 : 0.72) * DPR;
      cy = box.height * (narrow ? 0.26 : 0.45) * DPR;
      radius = Math.min(box.width, box.height) * 0.26 * DPR;
    }

    glyphPx = Math.max(6, Math.min(11, (radius / DPR) * 0.03));
    buildSprites();
  }

  // ─── Loop ───────────────────────────────────────────

  const HOLD = 4200;
  const MORPH = 1500;
  const CYCLE = HOLD + MORPH;
  const FRAME = 1000 / 32; // the cloud drifts; 60fps buys nothing here

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  let start = 0;
  let last = 0;
  let onScreen = true;
  let raf = 0;

  function draw(elapsed) {
    const phase = elapsed % CYCLE;
    const step = Math.floor(elapsed / CYCLE);
    const A = SHAPES[step % SHAPES.length];
    const B = SHAPES[(step + 1) % SHAPES.length];
    const m = phase < HOLD ? 0 : ease((phase - HOLD) / MORPH);

    const yaw = elapsed * 0.00021;
    const pitch = Math.sin(elapsed * 0.00013) * 0.32;
    const cyaw = Math.cos(yaw);
    const syaw = Math.sin(yaw);
    const cpit = Math.cos(pitch);
    const spit = Math.sin(pitch);
    const focal = 4;

    ctx.clearRect(0, 0, w, h);

    // Bucket by depth so fillStyle never changes mid-frame — the sprites
    // already carry the alpha.
    const buckets = [];
    for (let l = 0; l < LEVELS; l++) buckets.push([]);

    for (let i = 0; i < N; i++) {
      const j = i * 3;
      const x = A[j] + (B[j] - A[j]) * m;
      const y = A[j + 1] + (B[j + 1] - A[j + 1]) * m;
      const z = A[j + 2] + (B[j + 2] - A[j + 2]) * m;

      const x1 = x * cyaw + z * syaw;
      const z1 = -x * syaw + z * cyaw;
      const y1 = y * cpit - z1 * spit;
      const z2 = y * spit + z1 * cpit;

      const persp = focal / (focal - z2);
      const sx = cx + x1 * radius * persp;
      const sy = cy + y1 * radius * persp;
      if (sx < -20 || sy < -20 || sx > w + 20 || sy > h + 20) continue;

      const depth = (z2 + 1) / 2;
      let l = (depth * LEVELS) | 0;
      if (l >= LEVELS) l = LEVELS - 1;
      else if (l < 0) l = 0;
      buckets[l].push(sx, sy);
    }

    for (let l = 0; l < LEVELS; l++) {
      const pts = buckets[l];
      const sprite = sprites[l];
      for (let k = 0; k < pts.length; k += 2) {
        ctx.drawImage(sprite, pts[k] - spriteHalf, pts[k + 1] - spriteHalf);
      }
    }
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (!onScreen || document.hidden) return;
    if (!start) start = now;
    if (now - last < FRAME) return;
    last = now;
    draw(now - start);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  layout();

  // Paint the first frame synchronously. Without this the canvas is blank
  // until the first rAF — which never arrives at all if the tab loads in
  // the background, leaving the hero permanently empty for that visitor.
  draw(0);

  if (reduce) {
    // The static frame above is the whole story; nothing moves.
  } else {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        (entries) => { onScreen = entries[0].isIntersecting; },
        { threshold: 0 },
      ).observe(hero);
    }
    raf = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', () => { last = 0; });
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      layout();
      if (reduce) draw(0);
    }, 150);
  });

  window.addEventListener('pagehide', stop);
})();
