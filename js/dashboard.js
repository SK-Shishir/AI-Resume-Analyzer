/* =====================================================
   dashboard.js — Dynamic Dashboard & History data
   connected with Flask & Supabase backend API.
   ===================================================== */

var API_BASE_URL = window.API_BASE_URL ||
  (window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:5000/api' : 'http://localhost:5000/api');

// ── GET LOGGED-IN USER & AUTH GUARD ──────────────────
function getLoggedInUser() {
  const userStr = localStorage.getItem('user');
  const token = localStorage.getItem('access_token');

  // If on dashboard or history page and not logged in, redirect to login
  const path = window.location.pathname.toLowerCase();

  // Admin Dashboard Guard
  if (path.endsWith('admin-dashboard.html')) {
    if (!userStr || !token) {
      window.location.href = 'admin-login.html';
      return null;
    }
    try {
      const u = JSON.parse(userStr);
      if (u.role !== 'admin') {
        alert('Access denied: Admin role required.');
        window.location.href = 'dashboard.html';
        return null;
      }
    } catch {
      window.location.href = 'admin-login.html';
      return null;
    }
  }

  const isProtectedPage = path.endsWith('dashboard.html') || path.endsWith('history.html') || path.endsWith('upload.html');

  if (isProtectedPage && (!userStr || !token)) {
    window.location.href = 'login.html';
    return null;
  }

  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    console.warn('Error parsing user JSON', e);
    return null;
  }
}

// ── HELPER: INITIALS & ICONS ─────────────────────────
function getInitials(name) {
  if (!name) return 'U';
  return name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getScoreClass(score) {
  if (score >= 80) return 'score-high';
  if (score >= 65) return 'score-medium';
  return 'score-low';
}

function getFileIconHTML(type) {
  if (type === 'pdf') {
    return `<div class="file-icon pdf"><i class="bi bi-file-earmark-pdf-fill"></i></div>`;
  }
  return `<div class="file-icon docx"><i class="bi bi-file-earmark-word-fill"></i></div>`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'Recent';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return 'Recent';
  }
}

// ── POPULATE USER PROFILE HEADER & BANNER ────────────
function setupUserProfile(user) {
  if (!user) return;

  const initials = getInitials(user.full_name);
  const fullName = user.full_name || 'User';

  // Header avatar & name
  const avatarEls = document.querySelectorAll('.avatar-placeholder, #userAvatar');
  avatarEls.forEach(el => el.textContent = initials);

  const nameEls = document.querySelectorAll('.user-name, #userNameHeader');
  nameEls.forEach(el => el.textContent = fullName);

  // Welcome banner on dashboard
  const welcomeTitle = document.getElementById('welcomeUserTitle');
  if (welcomeTitle) {
    welcomeTitle.textContent = `Welcome back, ${fullName}!`;
  }

  // Dropdown info
  const dropName = document.getElementById('dropdownUserName');
  if (dropName) dropName.textContent = fullName;
  const dropEmail = document.getElementById('dropdownUserEmail');
  if (dropEmail) dropEmail.textContent = user.email || 'user@example.com';
}

// ── LOAD DASHBOARD STATS & RECENT RESUMES ────────────
async function loadDashboardData(user) {
  const tbody = document.getElementById('dashboardRecentTbody');
  if (!tbody) return;

  try {
    const userIdParam = user?.id ? `?user_id=${user.id}` : '';
    const res = await fetch(`${API_BASE_URL}/resume/dashboard-stats${userIdParam}`);
    
    if (res.ok) {
      const stats = await res.json();

      // Update stat cards
      const totalEl = document.getElementById('dashTotalAnalyses');
      if (totalEl) totalEl.textContent = stats.total_analyses ?? 0;

      const avgScoreEl = document.getElementById('dashAvgScore');
      if (avgScoreEl) avgScoreEl.textContent = stats.avg_resume_score ?? 0;

      const atsScoreEl = document.getElementById('dashAtsScore');
      if (atsScoreEl) atsScoreEl.textContent = stats.avg_ats_score ?? 0;

      const suggestionsEl = document.getElementById('dashTotalSuggestions');
      if (suggestionsEl) suggestionsEl.textContent = stats.total_suggestions ?? 0;

      // Render recent analyses table
      const rows = stats.recent_analyses || [];
      if (rows.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center;padding:32px 16px;color:var(--text-muted);">
              <i class="bi bi-file-earmark-plus" style="font-size:28px;display:block;margin-bottom:8px;opacity:0.4;"></i>
              No resumes analyzed yet.<br>
              <a href="upload.html" class="btn btn-primary btn-sm" style="margin-top:12px;display:inline-flex;align-items:center;gap:6px;">
                <i class="bi bi-cloud-upload"></i> Upload your first resume
              </a>
            </td>
          </tr>`;
        return;
      }

      tbody.innerHTML = rows.map(r => `
        <tr>
          <td>
            <div class="file-name-cell">
              ${getFileIconHTML(r.type)}
              <div>
                <span class="file-name-text">${r.name}</span>
                <div style="font-size:11px;color:var(--text-muted);">${r.job_title}</div>
              </div>
            </div>
          </td>
          <td style="color:var(--text-secondary);font-size:13px;">${formatDate(r.date)}</td>
          <td>
            <span class="score-pill ${getScoreClass(r.resumeScore)}">
              <span class="score-dot"></span> ${r.resumeScore}/100
            </span>
          </td>
          <td>
            <span class="score-pill ${getScoreClass(r.atsScore)}">
              <span class="score-dot"></span> ${r.atsScore}%
            </span>
          </td>
          <td class="action-col">
            <a href="analysis.html?id=${r.id}" class="btn btn-primary btn-sm">
              <i class="bi bi-eye"></i> View Report
            </a>
          </td>
        </tr>
      `).join('');

      if (localStorage.getItem('app_language') === 'BN' && typeof applyLanguage === 'function') {
        applyLanguage('BN');
      }
    }
  } catch (err) {
    console.error('Error loading dashboard stats:', err);
  }
}

// ── LOAD HISTORY TABLE & STATS ────────────────────────
let allHistoryData = [];

function updateHistoryStats(data) {
  const totalEl = document.getElementById('historyTotalResumes');
  if (totalEl) totalEl.textContent = allHistoryData.length;

  const bestScoreEl = document.getElementById('historyBestScore');
  if (bestScoreEl) {
    const maxScore = allHistoryData.length > 0 ? Math.max(...allHistoryData.map(d => d.resume_score || 0)) : 0;
    bestScoreEl.textContent = `${maxScore}/100`;
  }

  const avgAtsEl = document.getElementById('historyAvgAts');
  if (avgAtsEl) {
    const avgAts = allHistoryData.length > 0 ? Math.round(allHistoryData.reduce((sum, d) => sum + (d.ats_score || 0), 0) / allHistoryData.length) : 0;
    avgAtsEl.textContent = `${avgAts}%`;
  }

  const countLabel = document.getElementById('historyCountLabel');
  if (countLabel) {
    countLabel.textContent = `Showing ${data.length} of ${allHistoryData.length} results`;
  }
}

function renderHistoryTable(filtered) {
  const tbody = document.getElementById('historyTbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    const searchVal = document.getElementById('historySearch')?.value || '';
    tbody.innerHTML = `
      <tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">
        <i class="bi bi-search" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.4;"></i>
        ${searchVal ? 'No matching resumes found.' : 'No resume reports found yet.'}
      </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const r = item.resumes || {};
    const fName = r.file_name || 'Resume.pdf';
    const fType = r.file_type || 'pdf';
    const rScore = item.resume_score ?? 0;
    const aScore = item.ats_score ?? 0;
    const dStr = formatDate(item.analyzed_at);
    const safeName = fName.replace(/'/g, "\\'").replace(/"/g, '&quot;');

    return `
      <tr id="report-row-${item.id}">
        <td>
          <div class="file-name-cell">
            ${getFileIconHTML(fType)}
            <div>
              <div class="file-name-text">${fName}</div>
              <div style="font-size:11px;color:var(--text-muted);">${item.job_title || 'General'}</div>
            </div>
          </div>
        </td>
        <td style="color:var(--text-secondary);font-size:13px;">${dStr}</td>
        <td>
          <span class="score-pill ${getScoreClass(rScore)}">
            <span class="score-dot"></span> ${rScore}/100
          </span>
        </td>
        <td>
          <span class="score-pill ${getScoreClass(aScore)}">
            <span class="score-dot"></span> ${aScore}%
          </span>
        </td>
        <td><span class="badge badge-success">${item.status || 'Completed'}</span></td>
        <td class="action-col" style="text-align:right;white-space:nowrap;">
          <a href="analysis.html?id=${item.id}" class="btn btn-primary btn-sm" style="display:inline-flex;align-items:center;gap:4px;">
            <i class="bi bi-eye"></i> View
          </a>
          <button class="btn btn-ghost btn-sm" style="color:var(--red);border-color:#FEE2E2;margin-left:6px;display:inline-flex;align-items:center;gap:4px;" onclick="promptDeleteReport('${item.id}', '${safeName}')" title="Delete Report">
            <i class="bi bi-trash"></i> Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (localStorage.getItem('app_language') === 'BN' && typeof applyLanguage === 'function') {
    applyLanguage('BN');
  }
}

function applyHistoryFilters() {
  const search = document.getElementById('historySearch')?.value.toLowerCase().trim() || '';
  const status = document.getElementById('historyStatusFilter')?.value || 'all';
  const dateFilter = document.getElementById('historyDateFilter')?.value || 'all';

  const now = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(now.getMonth() - 1);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  const filtered = allHistoryData.filter(h => {
    const name = (h.resumes?.file_name || '').toLowerCase();
    const role = (h.job_title || '').toLowerCase();
    const matchesSearch = !search || name.includes(search) || role.includes(search);

    const itemStatus = (h.status || 'completed').toLowerCase();
    const matchesStatus = status === 'all' || itemStatus === status;

    let matchesDate = true;
    if (dateFilter !== 'all' && h.analyzed_at) {
      const itemDate = new Date(h.analyzed_at);
      if (dateFilter === 'month') {
        matchesDate = itemDate >= oneMonthAgo;
      } else if (dateFilter === '3months') {
        matchesDate = itemDate >= threeMonthsAgo;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  renderHistoryTable(filtered);
  updateHistoryStats(filtered);
}

async function loadHistoryData(user) {
  const tbody = document.getElementById('historyTbody');
  if (!tbody) return;

  try {
    const userIdParam = user?.id ? `?user_id=${user.id}` : '';
    const res = await fetch(`${API_BASE_URL}/resume/history${userIdParam}`);
    if (res.ok) {
      const json = await res.json();
      allHistoryData = json.history || [];
    }
  } catch (err) {
    console.error('Error fetching history:', err);
  }

  applyHistoryFilters();
}

// ── DELETE REPORT LOGIC ───────────────────────────────
function promptDeleteReport(id, fileName) {
  const nameEl = document.getElementById('deleteReportFileName');
  if (nameEl) nameEl.textContent = fileName ? `"${fileName}"` : 'this report';

  const btn = document.getElementById('btnConfirmDeleteReport');
  if (btn) {
    btn.onclick = () => executeDeleteReport(id);
  }
  if (typeof openModal === 'function') {
    openModal('deleteReportModal');
  }
}

async function executeDeleteReport(id) {
  const btn = document.getElementById('btnConfirmDeleteReport');
  const originalHtml = btn ? btn.innerHTML : '<i class="bi bi-trash"></i> Delete';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Deleting...';
  }

  try {
    const res = await fetch(`${API_BASE_URL}/resume/analysis/${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      if (typeof showToast === 'function') {
        showToast('Report deleted successfully from database.', 'success');
      }
      if (typeof closeModal === 'function') {
        closeModal('deleteReportModal');
      }

      // Remove item from local cache
      allHistoryData = allHistoryData.filter(item => item.id !== id);

      // Re-apply filters to refresh table and stats
      applyHistoryFilters();
    } else {
      const err = await res.json().catch(() => ({}));
      if (typeof showToast === 'function') {
        showToast(err.error || 'Failed to delete report.', 'error');
      }
    }
  } catch (err) {
    console.error('Delete report error:', err);
    if (typeof showToast === 'function') {
      showToast('Network error while deleting report.', 'error');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

// ── SEARCH & FILTERS HANDLER ──────────────────────────
function initHistoryFilters() {
  const searchInput = document.getElementById('historySearch');
  if (searchInput) {
    searchInput.addEventListener('input', applyHistoryFilters);
  }
  const statusFilter = document.getElementById('historyStatusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', applyHistoryFilters);
  }
  const dateFilter = document.getElementById('historyDateFilter');
  if (dateFilter) {
    dateFilter.addEventListener('change', applyHistoryFilters);
  }
}

// ── DOWNLOAD REPORT PLACEHOLDER ───────────────────────
function initDownloadReport() {
  const btn = document.getElementById('downloadReportBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    window.print();
  });
}

// ── TABS (Analysis Result Page) ───────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(target)?.classList.add('active');
    });
  });
}

// ── LOAD ADMIN DASHBOARD DATA ─────────────────────────
async function loadAdminDashboardData() {
  const tbody = document.getElementById('adminUploadsTbody');
  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE_URL}/resume/admin-stats`);
    if (res.ok) {
      const data = await res.json();

      const totalUsersEl = document.getElementById('adminTotalUsers');
      if (totalUsersEl) totalUsersEl.textContent = data.total_users ?? 0;

      const totalResumesEl = document.getElementById('adminTotalResumes');
      if (totalResumesEl) totalResumesEl.textContent = data.total_resumes ?? 0;

      const totalAnalysesEl = document.getElementById('adminTotalAnalyses');
      if (totalAnalysesEl) totalAnalysesEl.textContent = data.total_analyses ?? 0;

      const avgAtsEl = document.getElementById('adminAvgAtsScore');
      if (avgAtsEl) avgAtsEl.textContent = data.avg_ats ?? 0;

      const rows = data.recent_uploads || [];
      if (rows.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted);">
              No uploaded resumes found in system.
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
              <i class="bi bi-eye"></i> View
            </a>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading admin stats:', err);
  }
}

function initDashboardPage() {
  const user = getLoggedInUser();
  setupUserProfile(user);
  loadDashboardData(user);
  loadHistoryData(user);
  loadAdminDashboardData();
  initHistoryFilters();
  initDownloadReport();
  initTabs();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboardPage);
} else {
  initDashboardPage();
}
