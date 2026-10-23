/* =====================================================
   admin.js — Complete Admin Dashboard logic
   Connected with Flask API, Supabase, and dynamic tabs
   ===================================================== */

var API_BASE_URL = window.API_BASE_URL ||
  (window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:5000/api' : 'http://localhost:5000/api');

let allAdminUsers = [];
let allAdminUploads = [];

// ── AUTH GUARD ─────────────────────────────────────────
function checkAdminAuth() {
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    window.location.href = 'admin-login.html';
    return null;
  }

  try {
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
      alert('Access Denied: You do not have administrator permissions.');
      window.location.href = 'dashboard.html';
      return null;
    }
    return user;
  } catch (e) {
    window.location.href = 'admin-login.html';
    return null;
  }
}

// ── SETUP ADMIN HEADER ─────────────────────────────────
function setupAdminHeader(adminUser) {
  if (!adminUser) return;
  const name = adminUser.full_name || 'Admin User';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AD';

  const avatarEl = document.getElementById('adminHeaderAvatar');
  if (avatarEl) avatarEl.textContent = initials;

  const nameEl = document.getElementById('adminHeaderName');
  if (nameEl) nameEl.textContent = name;
}

// ── FORMAT HELPERS ─────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return 'Recent';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function getScoreClass(score) {
  if (score >= 80) return 'score-high';
  if (score >= 65) return 'score-medium';
  return 'score-low';
}

// ── TAB SWITCHING ──────────────────────────────────────
function switchAdminTab(targetTab) {
  document.querySelectorAll('.admin-nav-item').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-tab') === targetTab);
  });

  const sections = ['adminSectionOverview', 'adminSectionUsers', 'adminSectionResumes'];
  sections.forEach(secId => {
    const el = document.getElementById(secId);
    if (el) el.style.display = (secId === targetTab) ? 'block' : 'none';
  });

  // Clear search on tab switch
  const searchInput = document.getElementById('adminSearchInput');
  if (searchInput) searchInput.value = '';

  if (targetTab === 'adminSectionUsers') {
    renderUsersTable(allAdminUsers);
  } else if (targetTab === 'adminSectionResumes') {
    renderResumesTable(allAdminUploads);
  } else {
    renderRecentUploadsTable(allAdminUploads.slice(0, 5));
  }
}

// ── LOAD OVERVIEW & RESUMES DATA ───────────────────────
async function loadAdminStats() {
  try {
    const res = await fetch(`${API_BASE_URL}/resume/admin-stats`);
    if (res.ok) {
      const data = await res.json();
      allAdminUploads = data.recent_uploads || [];

      // Update stat cards
      const totalUsers = document.getElementById('adminTotalUsers');
      if (totalUsers) totalUsers.textContent = data.total_users ?? 0;

      const totalResumes = document.getElementById('adminTotalResumes');
      if (totalResumes) totalResumes.textContent = data.total_resumes ?? 0;

      const totalAnalyses = document.getElementById('adminTotalAnalyses');
      if (totalAnalyses) totalAnalyses.textContent = data.total_analyses ?? 0;

      const avgAts = document.getElementById('adminAvgAtsScore');
      if (avgAts) avgAts.textContent = data.avg_ats ?? 0;

      // Update badges
      const badgeUsers = document.getElementById('sidebarBadgeUsers');
      if (badgeUsers) badgeUsers.textContent = data.total_users ?? 0;

      const badgeResumes = document.getElementById('sidebarBadgeResumes');
      if (badgeResumes) badgeResumes.textContent = data.total_resumes ?? 0;

      // Render recent uploads in overview
      renderRecentUploadsTable(allAdminUploads.slice(0, 5));
      // Render in resumes section as well
      renderResumesTable(allAdminUploads);
    }
  } catch (err) {
    console.error('Error loading admin stats:', err);
  }
}

function renderRecentUploadsTable(rows) {
  const tbody = document.getElementById('adminUploadsTbody');
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:28px;color:var(--text-muted);">
          <i class="bi bi-file-earmark-x" style="font-size:24px;display:block;margin-bottom:6px;opacity:0.5;"></i>
          No resume uploads found in the system.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>
        <div style="font-weight:600;color:var(--text);">${r.user_name}</div>
        <div style="font-size:11px;color:var(--text-muted);">${r.user_email || ''}</div>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <i class="bi bi-file-earmark-pdf-fill" style="color:#EF4444;font-size:16px;"></i>
          <div>
            <div style="font-weight:600;font-size:13px;">${r.file_name}</div>
            <div style="font-size:11px;color:var(--text-muted);">${r.job_title}</div>
          </div>
        </div>
      </td>
      <td style="color:var(--text-secondary);font-size:13px;">${formatDate(r.date)}</td>
      <td>
        <span class="score-pill ${getScoreClass(r.ats_score)}">
          <span class="score-dot"></span> ${r.ats_score}%
        </span>
      </td>
      <td class="action-col">
        <a href="analysis.html?id=${r.id}" class="btn btn-primary btn-sm" style="display:inline-flex;align-items:center;gap:4px;">
          <i class="bi bi-eye"></i> View Report
        </a>
      </td>
    </tr>
  `).join('');
}

function renderResumesTable(rows) {
  const tbody = document.getElementById('adminAllResumesTbody');
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">
          No matching resume analyses found.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>
        <div style="font-weight:600;color:var(--text);">${r.user_name}</div>
        <div style="font-size:11px;color:var(--text-muted);">${r.user_email || ''}</div>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <i class="bi bi-file-earmark-pdf-fill" style="color:#EF4444;font-size:16px;"></i>
          <span style="font-weight:600;font-size:13px;">${r.file_name}</span>
        </div>
      </td>
      <td>
        <span class="badge badge-purple">${r.job_title}</span>
      </td>
      <td>
        <span class="score-pill ${getScoreClass(r.ats_score)}">
          <span class="score-dot"></span> ${r.ats_score}% ATS
        </span>
      </td>
      <td style="color:var(--text-secondary);font-size:13px;">${formatDate(r.date)}</td>
      <td class="action-col" style="text-align:right;white-space:nowrap;">
        <a href="analysis.html?id=${r.id}" class="btn btn-primary btn-sm" style="display:inline-flex;align-items:center;gap:4px;">
          <i class="bi bi-eye"></i> View
        </a>
        <button class="btn btn-ghost btn-sm text-danger" onclick="deleteAnalysis('${r.id}')" style="margin-left:6px;" title="Delete Analysis">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// ── LOAD USERS DATA ────────────────────────────────────
async function loadAdminUsers() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/users`);
    if (res.ok) {
      const data = await res.json();
      allAdminUsers = data.users || [];

      const badgeUsers = document.getElementById('sidebarBadgeUsers');
      if (badgeUsers) badgeUsers.textContent = allAdminUsers.length;

      renderUsersTable(allAdminUsers);
    }
  } catch (err) {
    console.error('Error loading admin users:', err);
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('adminUsersTbody');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted);">
          No registered users found.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const isAdmin = (u.role === 'admin');
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="avatar-placeholder ${isAdmin ? 'admin' : ''}" style="width:34px;height:34px;font-size:12px;">
              ${(u.full_name || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style="font-weight:700;color:var(--text);">${u.full_name}</div>
              <div style="font-size:11px;color:var(--text-muted);">ID: ${u.id.slice(0, 8)}...</div>
            </div>
          </div>
        </td>
        <td style="color:var(--text-secondary);font-size:13px;">${u.email}</td>
        <td>
          <span class="badge ${isAdmin ? 'badge-purple' : 'badge-success'}" style="font-size:11px;text-transform:capitalize;">
            <i class="bi ${isAdmin ? 'bi-shield-check' : 'bi-person'}"></i> ${u.role || 'user'}
          </span>
        </td>
        <td style="color:var(--text-secondary);font-size:13px;">${formatDate(u.created_at)}</td>
        <td class="action-col" style="text-align:right;white-space:nowrap;">
          <button class="btn btn-outline btn-sm" onclick="toggleUserRole('${u.id}', '${isAdmin ? 'user' : 'admin'}', '${u.full_name}')" style="display:inline-flex;align-items:center;gap:4px;">
            <i class="bi ${isAdmin ? 'bi-arrow-down-circle' : 'bi-arrow-up-circle'}"></i>
            ${isAdmin ? 'Demote to User' : 'Make Admin'}
          </button>
          <button class="btn btn-ghost btn-sm text-danger" onclick="deleteUser('${u.id}', '${u.full_name}')" style="margin-left:6px;" title="Delete User">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ── TOGGLE USER ROLE ───────────────────────────────────
async function toggleUserRole(userId, newRole, name) {
  const confirmMsg = `Are you sure you want to change ${name}'s role to "${newRole}"?`;
  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });

    if (res.ok) {
      if (typeof showToast === 'function') {
        showToast(`User role updated to ${newRole}!`, 'success');
      }
      loadAdminUsers();
      loadAdminStats();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to update user role.');
    }
  } catch (e) {
    console.error('Error changing role:', e);
    alert('Network error while updating user role.');
  }
}

// ── DELETE USER ────────────────────────────────────────
async function deleteUser(userId, name) {
  const confirmMsg = `Are you sure you want to delete user "${name}"? This action cannot be undone.`;
  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      if (typeof showToast === 'function') {
        showToast(`User "${name}" deleted.`, 'success');
      }
      loadAdminUsers();
      loadAdminStats();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to delete user.');
    }
  } catch (e) {
    console.error('Error deleting user:', e);
    alert('Network error while deleting user.');
  }
}

// ── DELETE ANALYSIS ────────────────────────────────────
async function deleteAnalysis(analysisId) {
  if (!confirm('Are you sure you want to delete this analysis report?')) return;

  try {
    const res = await fetch(`${API_BASE_URL}/resume/analysis/${analysisId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      if (typeof showToast === 'function') {
        showToast('Analysis report deleted successfully.', 'success');
      }
      loadAdminStats();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to delete analysis.');
    }
  } catch (e) {
    console.error('Error deleting analysis:', e);
    alert('Network error while deleting analysis.');
  }
}

// ── EXPORT CSV ─────────────────────────────────────────
function exportSystemReportCsv() {
  if (typeof showToast === 'function') {
    showToast('Exporting system report CSV...', 'info');
  }
  window.location.href = `${API_BASE_URL}/resume/export-csv`;
}

// ── LIVE SEARCH ────────────────────────────────────────
function initAdminSearch() {
  const searchInput = document.getElementById('adminSearchInput');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();

    // Check which section is visible
    const usersSec = document.getElementById('adminSectionUsers');
    const resumesSec = document.getElementById('adminSectionResumes');

    if (usersSec && usersSec.style.display !== 'none') {
      const filtered = allAdminUsers.filter(u =>
        (u.full_name || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query) ||
        (u.role || '').toLowerCase().includes(query)
      );
      renderUsersTable(filtered);
    } else if (resumesSec && resumesSec.style.display !== 'none') {
      const filtered = allAdminUploads.filter(r =>
        (r.user_name || '').toLowerCase().includes(query) ||
        (r.file_name || '').toLowerCase().includes(query) ||
        (r.job_title || '').toLowerCase().includes(query)
      );
      renderResumesTable(filtered);
    } else {
      const filtered = allAdminUploads.filter(r =>
        (r.user_name || '').toLowerCase().includes(query) ||
        (r.file_name || '').toLowerCase().includes(query) ||
        (r.job_title || '').toLowerCase().includes(query)
      );
      renderRecentUploadsTable(filtered);
    }
  });
}

// ── INIT ADMIN DASHBOARD ───────────────────────────────
function initAdminDashboard() {
  const adminUser = checkAdminAuth();
  if (!adminUser) return;

  setupAdminHeader(adminUser);
  loadAdminStats();
  loadAdminUsers();
  initAdminSearch();

  // Sidebar navigation clicks
  document.querySelectorAll('.admin-nav-item').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-tab');
      if (target) switchAdminTab(target);
    });
  });

  // Export buttons
  document.querySelectorAll('.btn-export-csv').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      exportSystemReportCsv();
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminDashboard);
} else {
  initAdminDashboard();
}
