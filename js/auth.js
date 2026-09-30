/* =====================================================
   auth.js — Client-side form validation for
   Login, Register, Admin Login pages
   ===================================================== */

// ── HELPERS ──────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.add('is-invalid');
  let fb = field.parentElement.querySelector('.invalid-feedback');
  if (!fb) {
    fb = document.createElement('div');
    fb.className = 'invalid-feedback';
    field.parentElement.appendChild(fb);
  }
  fb.textContent = message;
  fb.style.display = 'block';
}

function clearError(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.remove('is-invalid');
  const fb = field.parentElement.querySelector('.invalid-feedback');
  if (fb) fb.style.display = 'none';
}

function clearAllErrors(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  form.querySelectorAll('.invalid-feedback').forEach(el => el.style.display = 'none');
}

// ── PASSWORD TOGGLE ───────────────────────────────────
function initPasswordToggles() {
  document.querySelectorAll('.input-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.input-wrapper').querySelector('input');
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.classList.replace('bi-eye-slash', 'bi-eye');
      } else {
        input.type = 'password';
        btn.classList.replace('bi-eye', 'bi-eye-slash');
      }
    });
  });
}

// ── LOGIN FORM ────────────────────────────────────────
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllErrors('loginForm');
    let valid = true;

    const email = document.getElementById('loginEmail')?.value.trim();
    const pass  = document.getElementById('loginPassword')?.value;

    if (!email) {
      setError('loginEmail', 'Email is required.'); valid = false;
    } else if (!isValidEmail(email)) {
      setError('loginEmail', 'Enter a valid email address.'); valid = false;
    }

    if (!pass) {
      setError('loginPassword', 'Password is required.'); valid = false;
    } else if (pass.length < 6) {
      setError('loginPassword', 'Password must be at least 6 characters.'); valid = false;
    }

    if (valid) {
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
    }
  });
}

// ── REGISTER FORM ─────────────────────────────────────
function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllErrors('registerForm');
    let valid = true;

    const name     = document.getElementById('regName')?.value.trim();
    const email    = document.getElementById('regEmail')?.value.trim();
    const pass     = document.getElementById('regPassword')?.value;
    const confirm  = document.getElementById('regConfirm')?.value;
    const terms    = document.getElementById('regTerms')?.checked;

    if (!name || name.length < 2) {
      setError('regName', 'Full name must be at least 2 characters.'); valid = false;
    }

    if (!email) {
      setError('regEmail', 'Email is required.'); valid = false;
    } else if (!isValidEmail(email)) {
      setError('regEmail', 'Enter a valid email address.'); valid = false;
    }

    if (!pass || pass.length < 8) {
      setError('regPassword', 'Password must be at least 8 characters.'); valid = false;
    }

    if (!confirm) {
      setError('regConfirm', 'Please confirm your password.'); valid = false;
    } else if (pass !== confirm) {
      setError('regConfirm', 'Passwords do not match.'); valid = false;
    }

    if (!terms) {
      showToast('You must agree to the Terms & Conditions.', 'error'); valid = false;
    }

    if (valid) {
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';
      showToast('Account created successfully! Redirecting to login…', 'success');
      setTimeout(() => { window.location.href = 'login.html'; }, 1800);
    }
  });
}

// ── ADMIN LOGIN FORM ──────────────────────────────────
function initAdminLoginForm() {
  const form = document.getElementById('adminLoginForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllErrors('adminLoginForm');
    let valid = true;

    const email = document.getElementById('adminEmail')?.value.trim();
    const pass  = document.getElementById('adminPassword')?.value;

    if (!email) {
      setError('adminEmail', 'Admin email is required.'); valid = false;
    } else if (!isValidEmail(email)) {
      setError('adminEmail', 'Enter a valid email address.'); valid = false;
    }

    if (!pass) {
      setError('adminPassword', 'Password is required.'); valid = false;
    }

    if (valid) {
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
      setTimeout(() => { window.location.href = 'admin-dashboard.html'; }, 1200);
    }
  });
}

// ── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initPasswordToggles();
  initLoginForm();
  initRegisterForm();
  initAdminLoginForm();
});
