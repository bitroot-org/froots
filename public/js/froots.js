// froots landing — interactions + self-contained ASCII hero (no CDN).

// ─── Mobile menu ───────────────────────────────────
const menuBtn = document.querySelector('.mobile-menu-btn');
const mobileMenu = document.querySelector('.mobile-menu');
if (menuBtn && mobileMenu) {
  menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('open'));
  mobileMenu.querySelectorAll('.mobile-link').forEach((l) =>
    l.addEventListener('click', () => mobileMenu.classList.remove('open')));
}

// ─── Filter tabs ───────────────────────────────────
const tabs = document.querySelectorAll('.filter-tab');
const cards = document.querySelectorAll('.project-card');
tabs.forEach((tab) => tab.addEventListener('click', () => {
  tabs.forEach((t) => t.classList.remove('active'));
  tab.classList.add('active');
  const filter = tab.dataset.filter;
  cards.forEach((card) => {
    const show = filter === 'all' || card.dataset.category === filter;
    card.classList.toggle('hidden', !show);
  });
}));

// ─── ASCII hero: a rotating torus rendered as characters ──
// The classic "donut" — self-contained, no dependencies, and it
// reads unmistakably as an ASCII effect behind the headline.
(function asciiHero() {
  const canvas = document.getElementById('ascii-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const CH = '.,-~:;=!*#$@'; // luminance ramp
  const font = 13;           // px per cell
  let cols, rows, cx, cy, dpr;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(canvas.clientWidth / (font * 0.62));
    rows = Math.ceil(canvas.clientHeight / font);
    cx = cols / 2;
    cy = rows / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  ctx.font = `${font}px 'IBM Plex Mono', monospace`;
  ctx.textBaseline = 'top';

  let A = 0, B = 0;
  const R1 = 1, R2 = 2, K2 = 5;

  // Throttle to ~24fps and rotate gently — a slow ambient drift, not
  // a spin. Respect reduced-motion preference.
  const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const speedA = calm ? 0.003 : 0.006;
  const speedB = calm ? 0.0015 : 0.003;
  const interval = 1000 / 24;
  let last = 0;

  function frame(now) {
    if (now - last < interval) { requestAnimationFrame(frame); return; }
    last = now;
    const K1 = cols * K2 * 3 / (8 * (R1 + R2));
    const zbuf = new Float32Array(cols * rows).fill(0);
    const cbuf = new Int8Array(cols * rows).fill(-1);

    const cA = Math.cos(A), sA = Math.sin(A);
    const cB = Math.cos(B), sB = Math.sin(B);

    for (let theta = 0; theta < 6.28; theta += 0.14) {
      const ct = Math.cos(theta), st = Math.sin(theta);
      for (let phi = 0; phi < 6.28; phi += 0.04) {
        const cp = Math.cos(phi), sp = Math.sin(phi);
        const circleX = R2 + R1 * ct;
        const circleY = R1 * st;
        const x = circleX * (cB * cp + sA * sB * sp) - circleY * cA * sB;
        const y = circleX * (sB * cp - sA * cB * sp) + circleY * cA * cB;
        const z = K2 + cA * circleX * sp + circleY * sA;
        const ooz = 1 / z;
        const xp = Math.floor(cx + K1 * ooz * x * 0.62 * 1.6);
        const yp = Math.floor(cy - K1 * ooz * y);
        const lum = cp * ct * sB - cA * ct * sp - sA * st + cB * (cA * st - ct * sA * sp);
        if (yp >= 0 && yp < rows && xp >= 0 && xp < cols && ooz > zbuf[xp + yp * cols]) {
          zbuf[xp + yp * cols] = ooz;
          cbuf[xp + yp * cols] = Math.max(0, Math.floor(lum * 8));
        }
      }
    }

    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const l = cbuf[i + j * cols];
        if (l < 0) continue;
        // Accent-tint the brightest cells, cool grey for the rest.
        ctx.fillStyle = l > 6 ? 'rgba(78,149,251,0.95)' : `rgba(150,170,200,${0.25 + l * 0.06})`;
        ctx.fillText(CH[Math.min(l, CH.length - 1)], i * font * 0.62, j * font);
      }
    }

    A += speedA;
    B += speedB;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
