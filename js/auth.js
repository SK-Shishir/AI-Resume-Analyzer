/* =====================================================
   auth.js — Client-side form validation and API calls
   for Login, Register, Admin Login pages
   ===================================================== */

var API_BASE_URL = window.API_BASE_URL ||
  (window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:5000/api' : 'http://localhost:5000/api');

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

  form.addEventListener('submit', async (e) => {
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
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
      
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Save session token and user info
          localStorage.setItem('access_token', data.session.access_token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          showToast('Login successful!', 'success');
          setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
        } else {
          showToast(data.error || 'Login failed.', 'error');
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      } catch (error) {
        console.error('Login Error:', error);
        showToast('Network error. Is the backend running?', 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  });
}

// ── REGISTER FORM (1-CLICK INSTANT REGISTRATION) ──────
function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  // Real-time email validation on blur (checks domain existence & fake email filters)
  const regEmailInput = document.getElementById('regEmail');
  regEmailInput?.addEventListener('blur', async () => {
    const email = regEmailInput.value.trim();
    if (!email || !isValidEmail(email)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/validate-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        setError('regEmail', data.error || 'Invalid or non-existent email domain.');
      } else {
        clearError('regEmail');
      }
    } catch (err) {
      // ignore network errors on blur
    }
  });

  // Direct 1-click registration (NO OTP modal, NO waiting for code)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors('registerForm');
    let valid = true;

    const name     = document.getElementById('regName')?.value.trim();
    const email    = document.getElementById('regEmail')?.value.trim();
    const pass     = document.getElementById('regPassword')?.value;
    const confirm  = document.getElementById('regConfirm')?.value;

    if (!name || name.length < 2) {
      setError('regName', 'Full name must be at least 2 characters.'); valid = false;
    }

    if (!email) {
      setError('regEmail', 'Email is required.'); valid = false;
    } else if (!isValidEmail(email)) {
      setError('regEmail', 'Enter a valid email address.'); valid = false;
    }

    if (!pass || pass.length < 6) {
      setError('regPassword', 'Password must be at least 6 characters.'); valid = false;
    }

    if (!confirm) {
      setError('regConfirm', 'Please confirm your password.'); valid = false;
    } else if (pass !== confirm) {
      setError('regConfirm', 'Passwords do not match.'); valid = false;
    }

    if (valid) {
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';

      try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: name, email, password: pass })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          showToast('Account created successfully! Redirecting to login…', 'success');
          setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        } else {
          showToast(data.error || 'Registration failed.', 'error');
          if (data.error) {
            setError('regEmail', data.error);
          }
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      } catch (error) {
        console.error('Registration Error:', error);
        showToast('Network error. Is the backend running?', 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  });
}

// ── ADMIN LOGIN FORM ──────────────────────────────────
function initAdminLoginForm() {
  const form = document.getElementById('adminLoginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
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
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
      
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          if (data.user.role !== 'admin') {
            showToast('Access Denied: You are not an admin.', 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
          }
          
          localStorage.setItem('access_token', data.session.access_token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          showToast('Admin Login successful!', 'success');
          setTimeout(() => { window.location.href = 'admin-dashboard.html'; }, 1000);
        } else {
          showToast(data.error || 'Login failed.', 'error');
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      } catch (error) {
        console.error('Login Error:', error);
        showToast('Network error. Is the backend running?', 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  });
}

// ── LOGOUT FUNCTION ───────────────────────────────────
function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// ── FORGOT PASSWORD MODAL & RESET FLOW ─────────────────
function initForgotPasswordModal() {
  const modal = document.getElementById('forgotPasswordModal');
  const trigger = document.getElementById('forgotPasswordLink');
  const closeBtn = document.getElementById('closeForgotModalBtn');
  const step1 = document.getElementById('forgotStep1');
  const step2 = document.getElementById('forgotStep2');
  const sendOtpBtn = document.getElementById('sendOtpBtn');
  const backBtn = document.getElementById('backToStep1Btn');
  const confirmResetBtn = document.getElementById('confirmResetBtn');

  if (!modal || !trigger) return;

  function openModal() {
    // Pre-fill email from login form if already typed
    const loginEmail = document.getElementById('loginEmail')?.value.trim();
    const emailInput = document.getElementById('resetEmailInput');
    if (emailInput && loginEmail) {
      emailInput.value = loginEmail;
    }
    // Reset view
    step1.style.display = 'block';
    step2.style.display = 'none';
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
  }

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
  });

  closeBtn?.addEventListener('click', closeModal);

  // Close when clicking modal backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  backBtn?.addEventListener('click', () => {
    step2.style.display = 'none';
    step1.style.display = 'block';
  });

  // Step 1: Send OTP
  sendOtpBtn?.addEventListener('click', async () => {
    const emailInput = document.getElementById('resetEmailInput');
    const emailError = document.getElementById('resetEmailError');
    const email = emailInput?.value.trim();

    if (emailError) emailError.style.display = 'none';

    if (!email) {
      if (emailError) { emailError.textContent = 'Please enter your email address.'; emailError.style.display = 'block'; }
      return;
    }
    if (!isValidEmail(email)) {
      if (emailError) { emailError.textContent = 'Please enter a valid email address.'; emailError.style.display = 'block'; }
      return;
    }

    const origText = sendOtpBtn.innerHTML;
    sendOtpBtn.disabled = true;
    sendOtpBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verifying Account...';

    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (res.ok) {
        showToast(data.message || 'Verification code sent!', 'success');
        
        const otpInput = document.getElementById('resetOtpInput');
        const noticeBox = document.getElementById('otpNoticeBox');
        if (otpInput) otpInput.value = '';
        if (noticeBox) {
          noticeBox.innerHTML = `<i class="bi bi-envelope-open-fill" style="margin-right:6px;"></i> Verification code sent to your email. Please check your <strong>Inbox</strong> or <strong>Spam folder</strong>.`;
        }

        step1.style.display = 'none';
        step2.style.display = 'block';
        document.getElementById('resetNewPassInput')?.focus();
      } else {
        showToast(data.error || 'Failed to verify email.', 'error');
        if (emailError) {
          emailError.textContent = data.error || 'Account not found.';
          emailError.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('Send OTP Error:', err);
      showToast('Connection error. Is the backend server running?', 'error');
    } finally {
      sendOtpBtn.disabled = false;
      sendOtpBtn.innerHTML = origText;
    }
  });

  // Step 2: Confirm Reset
  confirmResetBtn?.addEventListener('click', async () => {
    const email = document.getElementById('resetEmailInput')?.value.trim();
    const otp = document.getElementById('resetOtpInput')?.value.trim();
    const newPass = document.getElementById('resetNewPassInput')?.value;
    const confirmPass = document.getElementById('resetConfirmPassInput')?.value;

    const otpErr = document.getElementById('resetOtpError');
    const newPassErr = document.getElementById('resetNewPassError');
    const confirmPassErr = document.getElementById('resetConfirmPassError');

    if (otpErr) otpErr.style.display = 'none';
    if (newPassErr) newPassErr.style.display = 'none';
    if (confirmPassErr) confirmPassErr.style.display = 'none';

    let valid = true;

    if (!otp || otp.length < 4) {
      if (otpErr) { otpErr.textContent = 'Please enter the verification code.'; otpErr.style.display = 'block'; }
      valid = false;
    }

    if (!newPass || newPass.length < 6) {
      if (newPassErr) { newPassErr.textContent = 'Password must be at least 6 characters.'; newPassErr.style.display = 'block'; }
      valid = false;
    }

    if (!confirmPass) {
      if (confirmPassErr) { confirmPassErr.textContent = 'Please confirm your new password.'; confirmPassErr.style.display = 'block'; }
      valid = false;
    } else if (newPass !== confirmPass) {
      if (confirmPassErr) { confirmPassErr.textContent = 'Passwords do not match.'; confirmPassErr.style.display = 'block'; }
      valid = false;
    }

    if (!valid) return;

    const origText = confirmResetBtn.innerHTML;
    confirmResetBtn.disabled = true;
    confirmResetBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating Password...';

    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, new_password: newPass })
      });
      const data = await res.json();

      if (res.ok) {
        showToast(data.message || 'Password reset successfully! Please sign in.', 'success');
        closeModal();

        // Pre-fill login email and focus password
        const loginEmail = document.getElementById('loginEmail');
        const loginPass = document.getElementById('loginPassword');
        if (loginEmail) loginEmail.value = email;
        if (loginPass) {
          loginPass.value = '';
          loginPass.focus();
        }
      } else {
        showToast(data.error || 'Password reset failed.', 'error');
        if (otpErr) {
          otpErr.textContent = data.error || 'Verification failed.';
          otpErr.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('Reset Password Error:', err);
      showToast('Network error while resetting password.', 'error');
    } finally {
      confirmResetBtn.disabled = false;
      confirmResetBtn.innerHTML = origText;
    }
  });
}

// ── INIT ─────────────────────────────────────────────
function initAuthPage() {
  initPasswordToggles();
  initLoginForm();
  initRegisterForm();
  initAdminLoginForm();
  initForgotPasswordModal();
  
  // Attach logout handler if logout button exists
  const logoutBtn = document.querySelector('.logout-link');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthPage);
} else {
  initAuthPage();
}
