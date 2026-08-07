// froots landing — interactions.

// ─── Mobile menu ───────────────────────────────────
const menuBtn = document.querySelector('.mobile-menu-btn');
const mobileMenu = document.querySelector('.mobile-menu');
if (menuBtn && mobileMenu) {
  // The rail is transparent over the hero; while the menu is open it needs
  // the same ground the panel has, or the footage shows through it.
  const setOpen = (open) => {
    mobileMenu.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    document.querySelector('.topbar')?.classList.toggle('menu-open', open);
  };
  menuBtn.addEventListener('click', () => setOpen(!mobileMenu.classList.contains('open')));
  mobileMenu.querySelectorAll('.mobile-link').forEach((l) =>
    l.addEventListener('click', () => setOpen(false)));
}

// ─── Top rail ──────────────────────────────────────
// Bare over the hero, as designed; once the page scrolls it needs a ground
// of its own or the sections below read straight through it.
const topbar = document.querySelector('.topbar');
if (topbar) {
  const sync = () => topbar.classList.toggle('is-scrolled', window.scrollY > 40);
  sync();
  window.addEventListener('scroll', sync, { passive: true });
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
