/* =====================================================
   main.js — Shared utilities: sidebar toggle, toasts,
   mobile overlay, active nav highlighting
   ===================================================== */

// ── SIDEBAR TOGGLE (mobile) ──────────────────────────
function initSidebar() {
  const toggle  = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay && overlay.classList.toggle('active');
  });

  overlay && overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  });
}

// ── ACTIVE NAV LINK ──────────────────────────────────
function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href && href !== '#' && page === href.split('/').pop()) {
      link.classList.add('active');
    }
  });
}

// ── TOAST NOTIFICATIONS ──────────────────────────────
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', info: 'bi-info-circle-fill' };
  const colors = { success: '#10B981', error: '#EF4444', info: '#7C3AED' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="bi ${icons[type] || icons.info}" style="color:${colors[type] || colors.info};font-size:18px;flex-shrink:0;"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── SCORE RING ANIMATION ─────────────────────────────
function animateScoreRings() {
  const rings = document.querySelectorAll('.score-ring-fill');
  rings.forEach(ring => {
    const pct  = parseFloat(ring.getAttribute('data-pct') || 0);
    const r    = parseFloat(ring.getAttribute('r') || 32);
    const circ = 2 * Math.PI * r;
    ring.style.strokeDasharray  = circ;
    ring.style.strokeDashoffset = circ; // start hidden
    ring.getBoundingClientRect(); // force reflow
    setTimeout(() => {
      ring.style.strokeDashoffset = circ - (pct / 100) * circ;
    }, 100);
  });
}

// ── PROFILE DROPDOWN ─────────────────────────────────
function initProfileDropdown() {
  const btn  = document.getElementById('profileDropdownBtn');
  const menu = document.getElementById('profileDropdownMenu');
  if (!btn || !menu) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  });

  document.addEventListener('click', () => {
    if (menu) menu.style.display = 'none';
  });
}

// ── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  setActiveNav();
  animateScoreRings();
  initProfileDropdown();
});
