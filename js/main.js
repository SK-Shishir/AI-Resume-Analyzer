/* =====================================================
   main.js — Shared utilities: sidebar toggle, toasts,
   mobile overlay, active nav highlighting, profile dropdown,
   and Account Modals (Settings, Help, Contact, Language)
   ===================================================== */

const MAIN_API_BASE = 'http://localhost:5000/api';

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
  const colors = { success: '#10B981', error: '#EF4444', info: '#2563EB' };

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

// ── LOGOUT FUNCTION ──────────────────────────────────
function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  showToast('Logged out successfully.', 'info');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 400);
}

// ── MODAL HELPERS ────────────────────────────────────
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// ── INJECT GLOBAL MODALS (Account Settings, Help, Contact, Language) ──
function injectGlobalModals() {
  if (document.getElementById('accountSettingsModal')) return;

  const modalsContainer = document.createElement('div');
  modalsContainer.id = 'globalModalsContainer';
  modalsContainer.innerHTML = `
    <!-- 1. Account Settings Modal -->
    <div class="modal-overlay" id="accountSettingsModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3><i class="bi bi-person-gear" style="color:var(--primary);"></i> Account Settings</h3>
          <button class="modal-close-btn" onclick="closeModal('accountSettingsModal')"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="modal-body">
          <form id="accountSettingsForm" onsubmit="handleSaveAccountSettings(event)">
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label" for="settingFullName">Full Name</label>
              <div class="input-wrapper">
                <i class="bi bi-person input-icon"></i>
                <input type="text" class="form-control" id="settingFullName" required />
              </div>
            </div>
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label" for="settingEmail">Email Address</label>
              <div class="input-wrapper">
                <i class="bi bi-envelope input-icon"></i>
                <input type="email" class="form-control" id="settingEmail" disabled style="background:var(--bg);cursor:not-allowed;" />
              </div>
              <small style="font-size:11px;color:var(--text-muted);margin-top:3px;display:block;">Email cannot be changed.</small>
            </div>
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label">Role</label>
              <div class="input-wrapper">
                <i class="bi bi-shield-check input-icon"></i>
                <input type="text" class="form-control" id="settingRole" disabled value="Standard User" style="background:var(--bg);cursor:not-allowed;" />
              </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
              <button type="button" class="btn btn-outline btn-sm" onclick="closeModal('accountSettingsModal')">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm" id="btnSaveAccountSettings">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 2. Help Center Modal -->
    <div class="modal-overlay" id="helpCenterModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3><i class="bi bi-question-circle" style="color:var(--primary);"></i> Help Center</h3>
          <button class="modal-close-btn" onclick="closeModal('helpCenterModal')"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="modal-body">
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div style="background:var(--bg);padding:14px 16px;border-radius:var(--r-md);border:1px solid var(--border-light);">
              <h4 style="font-size:13.5px;font-weight:700;margin-bottom:4px;color:var(--text);"><i class="bi bi-file-earmark-check" style="color:var(--primary);margin-right:6px;"></i>How does ATS Scoring work?</h4>
              <p style="font-size:12.5px;color:var(--text-sub);line-height:1.5;margin:0;">
                Our custom algorithm evaluates your resume structure, contact information, essential sections, quantifiable impact metrics, and action verbs without relying on external AI for scoring.
              </p>
            </div>

            <div style="background:var(--bg);padding:14px 16px;border-radius:var(--r-md);border:1px solid var(--border-light);">
              <h4 style="font-size:13.5px;font-weight:700;margin-bottom:4px;color:var(--text);"><i class="bi bi-filetype-pdf" style="color:var(--red);margin-right:6px;"></i>Supported File Formats</h4>
              <p style="font-size:12.5px;color:var(--text-sub);line-height:1.5;margin:0;">
                You can upload resumes in PDF (.pdf) or Microsoft Word (.docx) formats up to 10MB in size. Ensure your PDF has selectable text.
              </p>
            </div>

            <div style="background:var(--bg);padding:14px 16px;border-radius:var(--r-md);border:1px solid var(--border-light);">
              <h4 style="font-size:13.5px;font-weight:700;margin-bottom:4px;color:var(--text);"><i class="bi bi-stars" style="color:var(--accent-orange);margin-right:6px;"></i>How does Gemini AI enhance your CV?</h4>
              <p style="font-size:12.5px;color:var(--text-sub);line-height:1.5;margin:0;">
                Gemini AI dynamically determines market requirements for your target job and rewrites your resume draft with missing skills and strong action verbs in the "Improved CV" tab.
              </p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary btn-sm" onclick="closeModal('helpCenterModal')">Got it</button>
        </div>
      </div>
    </div>

    <!-- 3. Contact Us Modal -->
    <div class="modal-overlay" id="contactUsModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3><i class="bi bi-chat-dots" style="color:var(--primary);"></i> Contact Us</h3>
          <button class="modal-close-btn" onclick="closeModal('contactUsModal')"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="modal-body">
          <form id="contactUsForm" onsubmit="handleSendContactMessage(event)">
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label" for="contactSenderName">Your Name</label>
              <input type="text" class="form-control" id="contactSenderName" placeholder="Your Full Name" required />
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label" for="contactSenderEmail">Your Email</label>
              <input type="email" class="form-control" id="contactSenderEmail" placeholder="your.email@example.com" required />
            </div>
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label" for="contactSubject">Subject</label>
              <input type="text" class="form-control" id="contactSubject" placeholder="e.g. Question about ATS score" required />
            </div>
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label" for="contactMessage">Your Message</label>
              <textarea class="form-control" id="contactMessage" rows="4" placeholder="How can our team help you?" required style="resize:vertical;"></textarea>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;">
              <button type="button" class="btn btn-outline btn-sm" onclick="closeModal('contactUsModal')">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm" id="btnSendContact">
                <i class="bi bi-send"></i> Send Message
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 4. Language Selection Modal -->
    <div class="modal-overlay" id="languageModal">
      <div class="modal-card" style="max-width:380px;">
        <div class="modal-header">
          <h3><i class="bi bi-globe" style="color:var(--primary);"></i> Select Language</h3>
          <button class="modal-close-btn" onclick="closeModal('languageModal')"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="modal-body" style="padding:16px 20px;">
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div class="dropdown-item" style="border-radius:var(--r-md);border:1px solid var(--border);padding:12px 16px;cursor:pointer;" onclick="selectLanguage('English', 'EN')">
              <span style="font-size:18px;">🇺🇸</span>
              <span style="font-weight:600;flex:1;">English (US)</span>
              <i class="bi bi-check2" id="langCheckEN" style="color:var(--primary);font-size:18px;"></i>
            </div>
            <div class="dropdown-item" style="border-radius:var(--r-md);border:1px solid var(--border);padding:12px 16px;cursor:pointer;" onclick="selectLanguage('বাংলা', 'BN')">
              <span style="font-size:18px;">🇧🇩</span>
              <span style="font-weight:600;flex:1;">বাংলা (Bengali)</span>
              <i class="bi bi-check2" id="langCheckBN" style="color:var(--primary);font-size:18px;display:none;"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. Delete Report Confirmation Modal -->
    <div class="modal-overlay" id="deleteReportModal">
      <div class="modal-card" style="max-width:390px;text-align:center;padding:26px 22px;">
        <div style="width:54px;height:54px;border-radius:50%;background:#FEE2E2;color:var(--red);display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 14px;">
          <i class="bi bi-trash3-fill"></i>
        </div>
        <h3 style="font-size:18px;font-weight:700;margin-bottom:8px;color:var(--text);">Delete Report?</h3>
        <p style="font-size:13px;color:var(--text-sub);line-height:1.5;margin-bottom:20px;">
          Are you sure you want to delete <strong id="deleteReportFileName" style="color:var(--text);word-break:break-all;">this report</strong>?<br>
          This will permanently remove it from your database.
        </p>
        <div style="display:flex;justify-content:center;gap:10px;">
          <button type="button" class="btn btn-ghost btn-sm" style="min-width:85px;" onclick="closeModal('deleteReportModal')">Cancel</button>
          <button type="button" class="btn btn-danger btn-sm" style="min-width:85px;" id="btnConfirmDeleteReport">
            <i class="bi bi-trash"></i> Delete
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modalsContainer);

  // Close modals when clicking outside
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });
}

// ── SAVE ACCOUNT SETTINGS ────────────────────────────
async function handleSaveAccountSettings(e) {
  e.preventDefault();
  const nameInput = document.getElementById('settingFullName');
  const newName = nameInput ? nameInput.value.trim() : '';

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch {}

  if (!user || !user.id) {
    showToast('Please log in again to update profile.', 'error');
    return;
  }

  const btn = document.getElementById('btnSaveAccountSettings');
  const originalHtml = btn ? btn.innerHTML : 'Save Changes';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';
  }

  try {
    const res = await fetch(`${MAIN_API_BASE}/auth/update-profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, full_name: newName })
    });

    if (res.ok) {
      user.full_name = newName;
      localStorage.setItem('user', JSON.stringify(user));
      populateGlobalUserInfo();
      showToast('Profile updated successfully!', 'success');
      closeModal('accountSettingsModal');
    } else {
      const err = await res.json();
      showToast(err.error || 'Failed to update profile.', 'error');
    }
  } catch (error) {
    console.error('Update profile error:', error);
    user.full_name = newName;
    localStorage.setItem('user', JSON.stringify(user));
    populateGlobalUserInfo();
    showToast('Profile updated locally!', 'success');
    closeModal('accountSettingsModal');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

// ── SEND CONTACT MESSAGE ─────────────────────────────
async function handleSendContactMessage(e) {
  e.preventDefault();
  const name = document.getElementById('contactSenderName')?.value.trim();
  const email = document.getElementById('contactSenderEmail')?.value.trim();
  const subject = document.getElementById('contactSubject')?.value.trim();
  const message = document.getElementById('contactMessage')?.value.trim();

  if (!name || !email || !subject || !message) {
    showToast('Please fill in all fields.', 'error');
    return;
  }

  const btn = document.getElementById('btnSendContact');
  const originalHtml = btn ? btn.innerHTML : '<i class="bi bi-send"></i> Send Message';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Sending...';
  }

  try {
    const response = await fetch('https://formsubmit.co/ajax/skshishir015@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: name,
        email: email,
        _subject: `[AI Resume Analyzer] ${subject}`,
        _replyto: email,
        _captcha: 'false',
        _template: 'table',
        message: message
      })
    });

    const data = await response.json();

    if (response.ok && (data.success === 'true' || data.success === true)) {
      showToast('Thank you! Your message has been sent to our team.', 'success');
      closeModal('contactUsModal');
      const form = document.getElementById('contactUsForm');
      if (form) form.reset();
    } else if (data.message && data.message.includes('Activation')) {
      showToast('FormSubmit activation required. Please check skshishir015@gmail.com to activate.', 'info');
      closeModal('contactUsModal');
    } else {
      showToast(data.message || 'Failed to send message. Please try again.', 'error');
    }
  } catch (error) {
    console.error('Contact error:', error);
    showToast('Failed to send message. Please check connection.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

// ── TRANSLATION DICTIONARY (English <-> Bengali) ─────
const I18N_DICT = {
  // Navigation & Menus
  "Main Menu": "মূল মেনু",
  "Dashboard": "ড্যাশবোর্ড",
  "Upload Resume": "সিভি আপলোড",
  "My Reports": "আমার রিপোর্ট",
  "Resume History": "সিভির ইতিহাস",
  "Account": "একাউন্ট",
  "Account Settings": "একাউন্ট সেটিংস",
  "Account settings": "একাউন্ট সেটিংস",
  "Help Center": "সহায়তা কেন্দ্র",
  "Help center": "সহায়তা কেন্দ্র",
  "Contact Us": "যোগাযোগ করুন",
  "Contact us": "যোগাযোগ করুন",
  "Language": "ভাষা",
  "Logout": "লগআউট",
  "Log out": "লগআউট",
  "Profile": "প্রোফাইল",
  "Settings": "সেটিংস",
  "Back to Home": "হোমে ফিরুন",
  "Back to Reports": "রিপোর্টে ফিরুন",

  // Top Header & Inputs
  "Search...": "অনুসন্ধান করুন...",
  "Search analyses...": "অ্যানালাইসিস খুঁজুন...",
  "Standard User": "সাধারণ ব্যবহারকারী",
  "Administrator": "এডমিনিস্ট্রেটর",

  // Dashboard Page
  "Welcome back!": "স্বাগতম!",
  "Here's your resume analysis overview. Let's boost your career!": "আপনার সিভি অ্যানালাইসিসের সারসংক্ষেপ এখানে। আসুন ক্যারিয়ার এগিয়ে নিই!",
  "Total Analyses": "মোট অ্যানালাইসিস",
  "Resumes processed": "প্রক্রিয়াকৃত সিভি",
  "Average Score": "গড় স্কোর",
  "Across all resumes": "সকল সিভির গড়",
  "Avg ATS Score": "গড় এটিএস স্কোর",
  "ATS Score": "এটিএস স্কোর",
  "ATS Compatibility": "এটিএস সামঞ্জস্যতা",
  "AI Suggestions": "এআই পরামর্শ",
  "Improvement points": "উন্নতির ক্ষেত্রসমূহ",
  "Recent Analysis": "সাম্প্রতিক অ্যানালাইসিস",
  "View All →": "সব দেখুন →",
  "View All": "সব দেখুন",
  "Resume Name": "সিভির নাম",
  "Date": "তারিখ",
  "Resume Score": "সিভি স্কোর",
  "Action": "অ্যাকশন",
  "View Report": "রিপোর্ট দেখুন",
  "View": "দেখুন",
  "Completed": "সম্পন্ন",
  "Quick Actions": "কুইক অ্যাকশন",
  "Upload New Resume": "নতুন সিভি আপলোড করুন",
  "View Full History": "পুরো ইতিহাস দেখুন",
  "Latest Report": "সর্বশেষ রিপোর্ট",
  "Tips for Better Results": "ভালো ফলাফলের পরামর্শ",
  "Use a simple and clean resume format": "সহজ ও পরিষ্কার ফরম্যাটে সিভি তৈরি করুন",
  "Make sure your resume is up-to-date": "সিভি আপ-টু-ডেট আছে কিনা নিশ্চিত করুন",
  "Include relevant skills and experience": "প্রাসঙ্গিক স্কিল ও অভিজ্ঞতা যোগ করুন",
  "Avoid images and tables for better ATS results": "ভালো এটিএস স্কোরের জন্য ছবি ও টেবিল পরিহার করুন",
  "Add numbers and metrics to show your impact": "অর্জন বোঝাতে সংখ্যা ও মেট্রিক উল্লেখ করুন",
  "No resumes analyzed yet.": "এখনো কোনো সিভি অ্যানালাইসিস করা হয়নি।",
  "Upload your first resume": "আপনার প্রথম সিভি আপলোড করুন",

  // Upload Page
  "Upload Your Resume": "আপনার সিভি আপলোড করুন",
  "Upload your resume in PDF or DOCX format for AI-powered analysis and ATS scoring": "এআই বিশ্লেষণ এবং এটিএস স্কোরের জন্য আপনার সিভি আপলোড করুন",
  "Drag & Drop your file here": "আপনার ফাইলটি টেনে এখানে আনুন",
  "or click to choose a file from your device": "অথবা ডিভাইস থেকে ফাইল বাছাই করতে ক্লিক করুন",
  "Choose File": "ফাইল নির্বাচন করুন",
  "Target Job Role": "কাঙ্ক্ষিত পদ (Job Role)",
  "Target Company": "কাঙ্ক্ষিত প্রতিষ্ঠান (Company)",
  "Optional": "ঐচ্ছিক",
  "Specify the role you are applying for so the algorithm can match your skills and experience.": "আপনি যে পদের জন্য আবেদন করছেন তা উল্লেখ করুন যেন অ্যালগরিদম স্কিল মিলিয়ে দেখতে পারে।",
  "Analyze Resume": "সিভি অ্যানালাইসিস করুন",
  "Extracting & Analyzing...": "এক্সট্র্যাক্ট ও বিশ্লেষণ হচ্ছে...",
  "Your resume is processed securely and never shared.": "আপনার সিভি সম্পূর্ণ নিরাপদে সংরক্ষিত হয় এবং কারো সাথে শেয়ার করা হয় না।",
  "Tips for Better Analysis": "ভালো অ্যানালাইসিসের টিপস",
  "What We Analyze": "আমরা যা বিশ্লেষণ করি",
  "Keyword Analysis": "কিওয়ার্ড বিশ্লেষণ",
  "Missing & matched keywords for your role": "আপনার পদের জন্য বিদ্যমান ও অনুপস্থিত কিওয়ার্ড",
  "Content Quality": "কনটেন্টের মান",
  "Clarity, structure, and impact scoring": "গঠন, স্পষ্টতা ও প্রভাবের স্কোর",
  "Grammar Check": "ব্যাকরণ যাচাই",
  "Language, tone, and grammar accuracy": "ভাষা, বাচনভঙ্গি ও ব্যাকরণগত নির্ভুলতা",

  // Analysis Report Page
  "Analysis Report": "অ্যানালাইসিস রিপোর্ট",
  "Download Report": "রিপোর্ট ডাউনলোড",
  "Job Match Score": "জব ম্যাচ স্কোর",
  "Content Score": "কনটেন্ট স্কোর",
  "Grammar Score": "গ্রামার স্কোর",
  "Overview": "ওভারভিউ",
  "Skills & Gaps": "স্কিল ও কমতি",
  "Keywords": "কিওয়ার্ড",
  "Suggestions": "পরামর্শ",
  "Improved CV": "উন্নত সিভি",
  "Strengths": "ইতিবাচক দিকসমূহ",
  "Areas to Improve": "উন্নতির ক্ষেত্রসমূহ",
  "Target Job Skills Comparison": "জবের প্রয়োজনীয় স্কিলের সাথে তুলনা",
  "Matched Skills Found in Resume": "সিভিতে প্রাপ্ত স্কিলসমূহ",
  "Missing / Recommended Skills": "অনুপস্থিত / দরকারি স্কিলসমূহ",
  "Skills & Match Distribution": "স্কিল ও ম্যাচ বিশ্লেষণ",
  "Matched Job Skills": "ম্যাচ হওয়া স্কিল",
  "Missing Key Skills": "অনুপস্থিত মূল স্কিল",
  "Role Compatibility": "জবের সাথে সামঞ্জস্যতা",
  "Algorithm Match Rate": "অ্যালগরিদম ম্যাচ রেট",
  "Matched Keywords": "প্রাপ্ত কিওয়ার্ড",
  "Missing Target Keywords": "অনুপস্থিত কিওয়ার্ড",
  "Actionable Resume Recommendations": "সিভি উন্নয়নের কার্যকর পরামর্শ",
  "Rule-based & market aligned enhancements for your resume": "মার্কেট রিকোয়ারমেন্ট অনুযায়ী সিভির পরামর্শসমূহ",
  "AI-Generated Improved Resume": "এআই দিয়ে তৈরি উন্নত সিভি",
  "Enhanced version of your resume incorporating missing keywords and active impact verbs.": "অনুপস্থিত কিওয়ার্ড ও অ্যাকশন ভার্ব যুক্ত করে আপনার সিভির উন্নত সংস্করণ।",
  "Copy to Clipboard": "ক্লিপবোর্ডে কপি করুন",
  "Download Improved CV (PDF)": "উন্নত সিভি ডাউনলোড করুন (PDF)",
  "Calculating": "হিসাব হচ্ছে...",
  "Just now": "এইমাত্র",
  "Excellent": "চমৎকার",
  "Very Good": "খুব ভালো",
  "Good": "ভালো",
  "Average": "মোটামুটি",
  "Needs Work": "উন্নতি প্রয়োজন",

  // Modals
  "Your Name": "আপনার নাম",
  "Your Email": "আপনার ইমেইল",
  "Full Name": "পুরো নাম",
  "Email Address": "ইমেইল ঠিকানা",
  "Email cannot be changed.": "ইমেইল পরিবর্তন করা সম্ভব নয়।",
  "Save Changes": "পরিবর্তন সংরক্ষণ করুন",
  "Cancel": "বাতিল",
  "How does ATS Scoring work?": "এটিএস স্কোর কিভাবে কাজ করে?",
  "Supported File Formats": "সমর্থিত ফাইল ফরম্যাট",
  "How does Gemini AI enhance your CV?": "জেমিনি এআই কিভাবে সিভি উন্নত করে?",
  "Got it": "বুঝেছি",
  "Subject": "বিষয়",
  "Your Message": "আপনার বার্তা",
  "How can our team help you?": "আমরা কিভাবে আপনাকে সাহায্য করতে পারি?",
  "Send Message": "বার্তা পাঠান",
  "Select Language": "ভাষা নির্বাচন করুন",
  "English (US)": "English (ইংরেজি)",
  "বাংলা (Bengali)": "বাংলা (Bengali)",
  "Delete Report?": "রিপোর্ট মুছে ফেলবেন?",
  "Delete": "মুছে ফেলুন",
  "Deleting...": "মুছে ফেলা হচ্ছে...",
  "Total Resumes": "মোট সিভি",
  "Best Score": "সর্বোচ্চ স্কোর"
};

const EN_REVERSE_DICT = {};
for (const [en, bn] of Object.entries(I18N_DICT)) {
  EN_REVERSE_DICT[bn] = en;
}

function translateNode(node, targetLang) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue.trim();
    if (!text) return;

    if (targetLang === 'BN') {
      if (I18N_DICT[text]) {
        node.nodeValue = node.nodeValue.replace(text, I18N_DICT[text]);
      }
    } else {
      if (EN_REVERSE_DICT[text]) {
        node.nodeValue = node.nodeValue.replace(text, EN_REVERSE_DICT[text]);
      }
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const tag = node.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'svg' || node.id === 'improvedCvContent') return;

    if (node.placeholder) {
      const p = node.placeholder.trim();
      if (targetLang === 'BN' && I18N_DICT[p]) {
        node.placeholder = I18N_DICT[p];
      } else if (targetLang === 'EN' && EN_REVERSE_DICT[p]) {
        node.placeholder = EN_REVERSE_DICT[p];
      }
    }

    node.childNodes.forEach(child => translateNode(child, targetLang));
  }
}

function applyLanguage(langCode) {
  localStorage.setItem('app_language', langCode);
  const isBN = langCode === 'BN';

  const badges = document.querySelectorAll('#currentLangLabel');
  badges.forEach(b => b.textContent = isBN ? 'বাংলা' : 'English');

  const checkEN = document.getElementById('langCheckEN');
  const checkBN = document.getElementById('langCheckBN');
  if (checkEN) checkEN.style.display = isBN ? 'none' : 'block';
  if (checkBN) checkBN.style.display = isBN ? 'block' : 'none';

  translateNode(document.body, langCode);

  // Dynamic welcome title
  const welcomeTitle = document.getElementById('welcomeUserTitle');
  if (welcomeTitle) {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch {}
    const name = user?.full_name || 'User';
    welcomeTitle.textContent = isBN ? `স্বাগতম, ${name}!` : `Welcome back, ${name}!`;
  }
}

// ── SELECT LANGUAGE ──────────────────────────────────
function selectLanguage(langName, langCode) {
  applyLanguage(langCode);
  showToast(langCode === 'BN' ? 'ভাষা সফলভাবে বাংলায় পরিবর্তন করা হয়েছে।' : 'Language switched to English.', 'info');
  closeModal('languageModal');
}

// ── POPULATE USER INFO (Across header and dropdown) ───
function populateGlobalUserInfo() {
  let user = null;
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) user = JSON.parse(userStr);
  } catch {}

  const fullName = user?.full_name || 'User';
  const email = user?.email || 'user@example.com';
  const role = user?.role || 'user';
  const initials = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  // Avatars
  document.querySelectorAll('.avatar-placeholder, #userAvatar').forEach(el => el.textContent = initials);

  // User Names
  document.querySelectorAll('.user-name, #userNameHeader').forEach(el => el.textContent = fullName);

  // Dropdown specific info
  const dropName = document.getElementById('dropdownUserName');
  if (dropName) dropName.textContent = fullName;
  const dropEmail = document.getElementById('dropdownUserEmail');
  if (dropEmail) dropEmail.textContent = email;

  // Settings Modal inputs
  const settingName = document.getElementById('settingFullName');
  if (settingName && (!settingName.value || settingName.value === '')) settingName.value = fullName;
  const settingEmail = document.getElementById('settingEmail');
  if (settingEmail) settingEmail.value = email;
  const settingRole = document.getElementById('settingRole');
  if (settingRole) settingRole.value = role === 'admin' ? 'Administrator' : 'Standard User';

  // Contact Us Modal inputs
  const contactName = document.getElementById('contactSenderName');
  if (contactName && !contactName.value) contactName.value = fullName !== 'User' ? fullName : '';
  const contactEmail = document.getElementById('contactSenderEmail');
  if (contactEmail && !contactEmail.value) contactEmail.value = email !== 'user@example.com' ? email : '';
}

// ── PROFILE DROPDOWN INITIALIZATION ──────────────────
function initProfileDropdown() {
  const btns = document.querySelectorAll('.user-profile-btn');
  const menus = document.querySelectorAll('.profile-dropdown-menu');

  btns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = btn.closest('.user-profile-wrapper');
      const menu = parent ? parent.querySelector('.profile-dropdown-menu') : document.getElementById('profileDropdownMenu');
      if (!menu) return;

      const isShowing = menu.style.display === 'block';
      menus.forEach(m => m.style.display = 'none');
      menu.style.display = isShowing ? 'none' : 'block';
    });
  });

  document.addEventListener('click', () => {
    menus.forEach(m => m.style.display = 'none');
  });

  // Wire up account options
  const attachAction = (selector, action) => {
    document.querySelectorAll(selector).forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        menus.forEach(m => m.style.display = 'none');
        action();
      });
    });
  };

  attachAction('#btnAccountSettings, #nav-account-settings', () => {
    populateGlobalUserInfo();
    openModal('accountSettingsModal');
  });

  attachAction('#btnHelpCenter, #nav-help-center', () => openModal('helpCenterModal'));
  attachAction('#btnContactUs, #nav-contact-us', () => {
    populateGlobalUserInfo();
    openModal('contactUsModal');
  });
  attachAction('#btnLanguage, #nav-language', () => openModal('languageModal'));
  attachAction('#dropdownLogoutBtn, .logout-link', () => logout());
}

// ── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  setActiveNav();
  animateScoreRings();
  injectGlobalModals();
  populateGlobalUserInfo();
  initProfileDropdown();

  // Apply saved language if any
  const savedLang = localStorage.getItem('app_language');
  if (savedLang === 'BN') {
    applyLanguage('BN');
  }
});
