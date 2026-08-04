// froots landing — interactions.

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
