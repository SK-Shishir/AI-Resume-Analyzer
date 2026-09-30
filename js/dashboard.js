/* =====================================================
   dashboard.js — Demo data for tables and dashboard.
   Replace these arrays with real Flask API calls later.
   ===================================================== */

// ── DEMO DATA ─────────────────────────────────────────
const demoResumeHistory = [
  {
    id: 1,
    name: 'Software_Engineer_Resume.pdf',
    type: 'pdf',
    date: '20 May 2024',
    resumeScore: 85,
    atsScore: 88,
    status: 'Completed',
    reports: 2
  },
  {
    id: 2,
    name: 'Fullstack_Developer.docx',
    type: 'docx',
    date: '16 May 2024',
    resumeScore: 74,
    atsScore: 75,
    status: 'Completed',
    reports: 1
  },
  {
    id: 3,
    name: 'Product_Manager_Resume.pdf',
    type: 'pdf',
    date: '10 May 2024',
    resumeScore: 69,
    atsScore: 72,
    status: 'Completed',
    reports: 1
  },
  {
    id: 4,
    name: 'Data_Analyst_Resume.pdf',
    type: 'pdf',
    date: '05 May 2024',
    resumeScore: 78,
    atsScore: 72,
    status: 'Completed',
    reports: 1
  },
  {
    id: 5,
    name: 'UI_UX_Designer.docx',
    type: 'docx',
    date: '01 May 2024',
    resumeScore: 76,
    atsScore: 80,
    status: 'Completed',
    reports: 1
  }
];

const demoAdminUsers = [
  { user: 'Saymun Islam',  file: 'Software_Engineer_Resume.pdf',  date: '20 May 2024', atsScore: 88 },
  { user: 'Shirin Ahmed',  file: 'Fullstack_Developer.docx',       date: '19 May 2024', atsScore: 75 },
  { user: 'Arnas Bau',     file: 'Product_Manager_Resume.pdf',     date: '18 May 2024', atsScore: 72 },
  { user: 'Nber-view',     file: 'Data_Analyst_Resume.pdf',        date: '18 May 2024', atsScore: 68 },
  { user: 'Fatyr Marn',    file: 'UI_UX_Designer.docx',            date: '18 May 2024', atsScore: 80 }
];

// ── HELPER: SCORE CLASS ───────────────────────────────
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

// ── RENDER DASHBOARD RECENT TABLE ────────────────────
function renderDashboardTable() {
  const tbody = document.getElementById('dashboardRecentTbody');
  if (!tbody) return;

  const rows = demoResumeHistory.slice(0, 3); // show 3 recent
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>
        <div class="file-name-cell">
          ${getFileIconHTML(r.type)}
          <span class="file-name-text">${r.name}</span>
        </div>
      </td>
      <td style="color:var(--text-secondary);font-size:13px;">${r.date}</td>
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
        <a href="analysis.html" class="btn btn-primary btn-sm">
          <i class="bi bi-eye"></i> View Report
        </a>
      </td>
    </tr>
  `).join('');
}

// ── RENDER HISTORY TABLE ─────────────────────────────
function renderHistoryTable(filter = '') {
  const tbody = document.getElementById('historyTbody');
  if (!tbody) return;

  const data = filter
    ? demoResumeHistory.filter(r =>
        r.name.toLowerCase().includes(filter.toLowerCase()))
    : demoResumeHistory;

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">
        <i class="bi bi-search" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.4;"></i>
        No results found.
      </td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(r => `
    <tr>
      <td>
        <div class="file-name-cell">
          ${getFileIconHTML(r.type)}
          <div>
            <div class="file-name-text">${r.name}</div>
            <div style="font-size:11px;color:var(--text-muted);">${r.reports} report${r.reports > 1 ? 's' : ''}</div>
          </div>
        </div>
      </td>
      <td style="color:var(--text-secondary);font-size:13px;">${r.date}</td>
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
      <td><span class="badge badge-success">${r.status}</span></td>
      <td class="action-col">
        <a href="analysis.html" class="btn btn-primary btn-sm">
          <i class="bi bi-eye"></i> View
        </a>
      </td>
    </tr>
  `).join('');
}

// ── RENDER ADMIN TABLE ────────────────────────────────
function renderAdminTable() {
  const tbody = document.getElementById('adminUploadsTbody');
  if (!tbody) return;

  tbody.innerHTML = demoAdminUsers.map(u => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:9px;">
          <div class="avatar-placeholder" style="width:28px;height:28px;font-size:11px;">
            ${u.user.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <span style="font-size:13px;font-weight:500;">${u.user}</span>
        </div>
      </td>
      <td>
        <div class="file-name-cell">
          ${getFileIconHTML(u.file.endsWith('.pdf') ? 'pdf' : 'docx')}
          <span class="file-name-text">${u.file}</span>
        </div>
      </td>
      <td style="color:var(--text-secondary);font-size:13px;">${u.date}</td>
      <td>
        <span class="score-pill ${getScoreClass(u.atsScore)}">
          <span class="score-dot"></span> ${u.atsScore}%
        </span>
      </td>
      <td>
        <a href="analysis.html" class="btn btn-ghost btn-sm">
          <i class="bi bi-eye"></i> View
        </a>
      </td>
    </tr>
  `).join('');
}

// ── SEARCH HANDLER ────────────────────────────────────
function initHistorySearch() {
  const input = document.getElementById('historySearch');
  if (!input) return;
  input.addEventListener('input', () => renderHistoryTable(input.value));
}

// ── DOWNLOAD REPORT PLACEHOLDER ───────────────────────
function initDownloadReport() {
  const btn = document.getElementById('downloadReportBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    showToast('Report download will be available after backend integration.', 'info');
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

// ── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderDashboardTable();
  renderHistoryTable();
  renderAdminTable();
  initHistorySearch();
  initDownloadReport();
  initTabs();
});
