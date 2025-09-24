/* Navbar shrinking on scroll and adjusting page offset */
const header = document.querySelector('.site-header');

function applyBodyOffset(height) {
  document.body.style.paddingTop = `${height}px`;
}
function updateHeaderSize() {
  const shrink = window.scrollY > 10;
  header.classList.toggle('shrink', shrink);
  applyBodyOffset(shrink ? 56 : 88);
}
window.addEventListener('scroll', updateHeaderSize, { passive: true });
window.addEventListener('load', updateHeaderSize);
updateHeaderSize();

/*  Smooth scrolling */
const navLinks = [...document.querySelectorAll('.nav a')];
function smoothScrollTo(target) {
  const headerH = header.classList.contains('shrink') ? 56 : 88;
  const el = document.querySelector(target);
  if (!el) return;
  const targetTop = el.getBoundingClientRect().top + window.scrollY;
  const top = Math.max(0, targetTop - headerH - 8);
  window.scrollTo({ top, behavior: 'smooth' });
}
navLinks.forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      smoothScrollTo(href);
      history.pushState(null, '', href);
    }
  });
});

/*  Carousel */
(function initCarousel(){
  const carousel = document.querySelector('.carousel');
  if (!carousel) return;

  const track = carousel.querySelector('.carousel__track');
  const slides = [...carousel.querySelectorAll('.carousel__slide')];
  const prevBtn = carousel.querySelector('.carousel__arrow--prev');
  const nextBtn = carousel.querySelector('.carousel__arrow--next');

  let index = 0;
  const clamp = i => Math.max(0, Math.min(i, slides.length - 1));

  function goTo(i) {
    index = clamp(i);
    track.style.transform = `translateX(${-index * 100}%)`;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === slides.length - 1;
    prevBtn.setAttribute('aria-disabled', String(prevBtn.disabled));
    nextBtn.setAttribute('aria-disabled', String(nextBtn.disabled));
  }

  prevBtn.addEventListener('click', () => goTo(index - 1));
  nextBtn.addEventListener('click', () => goTo(index + 1));
  window.addEventListener('resize', () => goTo(index));
  goTo(0);
})();

/* Position indication */
const sections = navLinks.map(a => document.querySelector(a.hash)).filter(Boolean);
function setActiveIndex(i) {
  navLinks.forEach((a, idx) => a.classList.toggle('is-active', idx === i));
}
function updateActive() {
  const headerH = header.classList.contains('shrink') ? 56 : 88;
  const y = window.scrollY + headerH + 1;
  let i = 0;
  for (let k = 0; k < sections.length; k++) {
    if (y >= sections[k].offsetTop) i = k; else break;
  }
  const atBottom = Math.ceil(window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight;
  if (atBottom) i = sections.length - 1;
  setActiveIndex(i);
}
document.addEventListener('scroll', () => requestAnimationFrame(updateActive), { passive: true });
window.addEventListener('load', updateActive);
updateActive();

/* Modals */
(function initModals() {
  const openers = Array.from(document.querySelectorAll('[data-modal]'));
  const body = document.body;

  function getModal(id) { return document.getElementById(id); }

  function trapFocus(modal) {
    const focusables = modal.querySelectorAll(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return { first: null, last: null };
    return { first: focusables[0], last: focusables[focusables.length - 1] };
  }

  function openModal(id, openerSelector) {
    const modal = getModal(id);
    if (!modal) return;
    modal.hidden = false;
    body.classList.add('no-scroll');
    if (openerSelector) modal.dataset.opener = openerSelector;

    const { first } = trapFocus(modal);
    (first || modal).focus({ preventScroll: true });

    function onKey(e) {
      if (e.key === 'Escape') closeModal(modal);
      if (e.key === 'Tab') {
        const { first, last } = trapFocus(modal);
        if (!first) return;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    modal.addEventListener('keydown', onKey);
    modal._onKey = onKey;

    modal.addEventListener('mousedown', e => { if (e.target === modal) closeModal(modal); });
  }

  function closeModal(modal) {
    modal.hidden = true;
    document.body.classList.remove('no-scroll');
    modal.removeEventListener('keydown', modal._onKey || (()=>{}));
    const openerSel = modal.dataset.opener;
    if (openerSel) document.querySelector(openerSel)?.focus();
  }

  openers.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-modal');
      btn.setAttribute('data-modal-opener', '1');
      openModal(id, '[data-modal-opener="1"]');
      setTimeout(() => btn.removeAttribute('data-modal-opener'), 0);
    });
  });

  document.querySelectorAll('.modal__close').forEach(x =>
    x.addEventListener('click', () => closeModal(x.closest('.modal')))
  );
})();

/* Reveal on scrolling */
(function revealOnScroll() {
  const items = Array.from(document.querySelectorAll('.reveal'));
  if (!items.length || 'IntersectionObserver' in window === false) {
    items.forEach(el => el.classList.add('in-view'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = el.getAttribute('data-delay') || '0ms';
        el.style.setProperty('--reveal-delay', delay);
        el.classList.add('in-view');
        io.unobserve(el);
      }
    });
  }, { threshold: 0.16 });

/*  Footer */
const yEl = document.getElementById('year');
if (yEl) yEl.textContent = new Date().getFullYear();

  items.forEach(el => io.observe(el));
})();