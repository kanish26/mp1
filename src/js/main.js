/* Get topbar element (sticky header) */
const topbar = document.querySelector('.topbar');

/* Apply body top padding to match topbar height */
function setBodyOffset(px) {
  document.body.style.paddingTop = `${px}px`;
}

/* Resize topbar on scroll and update body offset */
function updateTopbar() {
  // Determine compact state based on scroll distance
  const compact = window.scrollY > 10;

  // Toggle compact class
  topbar.classList.toggle('is-compact', compact);

  // Read computed height and set body padding
  const h = parseFloat(getComputedStyle(topbar).height);
  setBodyOffset(isNaN(h) ? 100 : h);
}

addEventListener('scroll', updateTopbar, { passive: true });
addEventListener('load',   updateTopbar);

updateTopbar();


/* Collect nav links for smooth scroll + active highlight */
const navLinks = Array.from(document.querySelectorAll('.navlist a'));


/* Smoothly scroll to hash target accounting for sticky header */
function smoothTo(hash) {
  const target = document.querySelector(hash);
  if (!target) return;


  const headH = parseFloat(getComputedStyle(topbar).height);
  const y = target.getBoundingClientRect().top + window.scrollY - headH;

  window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
}


/* Attach click handlers to nav links (prevent default jump) */
navLinks.forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');

    // Only handle in-page anchors
    if (href && href.startsWith('#')) {
      e.preventDefault();
      smoothTo(href);                  
      history.pushState(null, '', href); 
    }
  });
});


/* Initialize image carousel (glider) */
(function initGlider(){
  // Root element for the glider
  const glider = document.querySelector('[data-glide]');
  if (!glider) return;

  // Key parts of the carousel
  const track = glider.querySelector('.track');
  const panes = Array.from(glider.querySelectorAll('.pane'));
  const prev  = glider.querySelector('.arrow--prev');
  const next  = glider.querySelector('.arrow--next');

  // Current slide index
  let idx = 0;

  // Clamp helper to keep index in range
  const clamp = i => Math.max(0, Math.min(i, panes.length - 1));

  // Go to a specific slide
  function go(i) {
    idx = clamp(i);

    // Translate track by 100% per index
    track.style.transform = `translateX(${-idx * 100}%)`;

    // Enable/disable arrows for ends
    const atFirst = idx === 0;
    const atLast  = idx === panes.length - 1;

    prev.disabled = atFirst;
    next.disabled = atLast;

    prev.setAttribute('aria-disabled', String(atFirst));
    next.setAttribute('aria-disabled', String(atLast));
  }

  // Click handlers for arrows
  prev.addEventListener('click', () => go(idx - 1));
  next.addEventListener('click', () => go(idx + 1));

  // Re-apply position on resize (avoid fractional rounding issues)
  addEventListener('resize', () => go(idx));

  // Start at first slide
  go(0);
})();


/* Active nav link: highlight band directly under header bottom */
const bands = navLinks
  .map(a => document.querySelector(a.getAttribute('href')))  
  .filter(Boolean);                                          



function setActive(i) {
  navLinks.forEach((a, k) => a.classList.toggle('is-current', k === i));
}


/* Update which nav link is active based on scroll position */
function updateActive() {
  // Compute vertical position just below sticky header
  const navBottom = topbar.getBoundingClientRect().bottom + window.scrollY;

  // Walk sections in order, pick last whose top is <= header bottom
  let current = 0;
  for (let k = 0; k < bands.length; k++) {
    if (bands[k].offsetTop <= navBottom + 1) current = k;
    else break;
  }

  // If scrolled to absolute page bottom, force last section active
  const atPageBottom = Math.ceil(window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight;
  if (atPageBottom) current = bands.length - 1;

  // Apply highlight
  setActive(current);
}


/* Bind scroll + load events for active link updates */
addEventListener('scroll', () => requestAnimationFrame(updateActive), { passive: true });
addEventListener('load',   updateActive);

// Initialize immediately
updateActive();


/* Modal (lightbox) behavior with focus trap */
(function modalize() {
  // All openers with [data-modal] attribute
  const triggers = Array.from(document.querySelectorAll('[data-modal]'));

  // Document body (for scroll locking)
  const body = document.body;

  // Helper to get element by ID
  const byId = id => document.getElementById(id);

  // Query focusable elements inside a scope
  const focusables = scope =>
    scope.querySelectorAll('a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])');

  // Open modal by id, remember opener selector for focus return
  function openModal(id, openerSel) {
    const m = byId(id);
    if (!m) return;

    // Show modal and lock body scroll
    m.hidden = false;
    body.classList.add('-noscroll');

    // Save opener selector for later focus restoration
    if (openerSel) m.dataset.opener = openerSel;

    // Move initial focus
    const list = focusables(m);
    (list[0] || m).focus({ preventScroll: true });

    // Key handling (Esc to close, Tab to trap)
    function onKey(e) {
      if (e.key === 'Escape') closeModal(m);

      if (e.key === 'Tab') {
        if (!list.length) return;

        const first = list[0];
        const last  = list[list.length - 1];

        // Loop focus within modal
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    // Bind keydown + backdrop click to close
    m.addEventListener('keydown', onKey);
    m._onKey = onKey;

    m.addEventListener('mousedown', e => {
      if (e.target === m) closeModal(m);  // Click on overlay closes
    });
  }

  // Close modal and restore focus to opener (if any)
  function closeModal(m) {
    m.hidden = true;
    body.classList.remove('-noscroll');

    // Remove listener
    m.removeEventListener('keydown', m._onKey || (() => {}));

    // Restore focus to the opener button
    const opener = m.dataset.opener;
    if (opener) document.querySelector(opener)?.focus();
  }

  // Wire up modal openers
  triggers.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-modal');

      // Mark this button as the opener (selector) for later focus return
      btn.setAttribute('data-opener', '1');

      // Open modal and pass a selector to re-focus after close
      openModal(id, '[data-opener="1"]');

      // Remove marker in next frame (avoid keeping attribute)
      setTimeout(() => btn.removeAttribute('data-opener'), 0);
    });
  });

  // Wire up modal close buttons
  document
    .querySelectorAll('.modalbox__close')
    .forEach(x => x.addEventListener('click', () => closeModal(x.closest('.modalbox'))));
})();


/* Reveal-on-scroll animation using IntersectionObserver */
(function revealOnScroll() {
  // All elements that should reveal
  const els = Array.from(document.querySelectorAll('.revealix'));

  // Fallback: if no IO support, just show everything
  if (!els.length || !('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('in'));
    return;
  }

  // Observer callback: add class when in view
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;

        // Use per-element delay variable
        const delay = el.getAttribute('data-rx-delay') || '0ms';
        el.style.setProperty('--rx-delay', delay);

        // Trigger animation
        el.classList.add('in');

        // Stop observing once revealed
        io.unobserve(el);
      }
    });
  }, { threshold: 0.16 }); // ~16% visibility threshold

  // Observe each target
  els.forEach(el => io.observe(el));
})();


/* Footer: current year injection */
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear(); // Set to current year
}