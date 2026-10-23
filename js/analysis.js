/* =====================================================
   analysis.js — Dynamic rendering of real analysis data
   Connected with Flask API, Supabase, and localStorage
   ===================================================== */

var API_BASE_URL = window.API_BASE_URL ||
  (window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:5000/api' : 'http://localhost:5000/api');

function getRating(score) {
  if (score >= 85) return { label: 'Excellent', cls: 'rating-excellent' };
  if (score >= 70) return { label: 'Very Good', cls: 'rating-good' };
  if (score >= 55) return { label: 'Average', cls: 'rating-avg' };
  return { label: 'Needs Work', cls: 'rating-poor' };
}

function updateRing(fillElement, pct) {
  if (!fillElement) return;
  const num = Math.min(Math.max(parseFloat(pct) || 0, 0), 100);
  fillElement.setAttribute('data-pct', num);
  // circumference of r=32 is 2 * pi * 32 ~= 201.06
  const circumference = 2 * Math.PI * 32;
  const offset = circumference - (num / 100) * circumference;
  fillElement.style.strokeDasharray = `${circumference}`;
  fillElement.style.strokeDashoffset = `${offset}`;
}

function renderAnalysisData(data) {
  if (!data) return;

  const scores = data.scores || {};
  const resumeScore = scores.resume_score ?? data.resume_score ?? 75;
  const atsScore = scores.ats_score ?? data.ats_score ?? 80;
  const contentScore = scores.content_score ?? data.content_score ?? 75;
  const matchScore = scores.match_score ?? data.match_score ?? 70;

  // Normalized Filename & Type
  const fileName = data.filename || data.resumes?.file_name || 'Resume.pdf';
  const fileExt = (data.resumes?.file_type || (fileName.endsWith('.docx') ? 'docx' : 'pdf')).toLowerCase();

  // Header Details
  const fileNameEl = document.getElementById('reportFileName');
  if (fileNameEl) {
    const isDocx = fileExt === 'docx';
    const icon = isDocx
      ? '<i class="bi bi-file-earmark-word-fill" style="color:#3B82F6;"></i>'
      : '<i class="bi bi-file-earmark-pdf-fill" style="color:#EF4444;"></i>';
    fileNameEl.innerHTML = `${icon} ${fileName}`;
  }

  const jobBadgeEl = document.getElementById('reportJobBadge');
  if (jobBadgeEl) {
    jobBadgeEl.textContent = data.job_title || 'Software Engineer';
    const oldJd = document.getElementById('reportJdBadge');
    if (oldJd) oldJd.remove();
    if (data.has_job_description || data.job_requirements?.has_job_description) {
      jobBadgeEl.insertAdjacentHTML('afterend', `
        <span id="reportJdBadge" class="badge" style="background:#0D9488;color:#fff;font-size:11px;padding:3px 8px;display:inline-flex;align-items:center;gap:4px;">
          <i class="bi bi-check2-circle"></i> Circular (JD) Matched
        </span>
      `);
    }
  }

  const dateEl = document.getElementById('reportDate');
  if (dateEl) {
    const rawDate = data.analyzed_at || data.created_at;
    let formattedDate = 'Just now';
    if (rawDate) {
      try {
        formattedDate = new Date(rawDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      } catch {}
    }
    dateEl.innerHTML = `<i class="bi bi-calendar3"></i> ${formattedDate}`;
  }

  // 1. Resume Score
  const rScoreVal = document.getElementById('resumeScoreVal');
  if (rScoreVal) rScoreVal.textContent = resumeScore;
  const rRating = getRating(resumeScore);
  const rRateEl = document.getElementById('resumeScoreRating');
  if (rRateEl) {
    rRateEl.textContent = rRating.label;
    rRateEl.className = `score-card-rating ${rRating.cls}`;
  }
  updateRing(document.getElementById('resumeScoreFill'), resumeScore);

  // 2. ATS Score
  const aScoreVal = document.getElementById('atsScoreVal');
  if (aScoreVal) aScoreVal.textContent = atsScore;
  const aRating = getRating(atsScore);
  const aRateEl = document.getElementById('atsScoreRating');
  if (aRateEl) {
    aRateEl.textContent = aRating.label;
    aRateEl.className = `score-card-rating ${aRating.cls}`;
  }
  updateRing(document.getElementById('atsScoreFill'), atsScore);

  // 3. Content Score
  const cScoreVal = document.getElementById('contentScoreVal');
  if (cScoreVal) cScoreVal.textContent = contentScore;
  const cRating = getRating(contentScore);
  const cRateEl = document.getElementById('contentScoreRating');
  if (cRateEl) {
    cRateEl.textContent = cRating.label;
    cRateEl.className = `score-card-rating ${cRating.cls}`;
  }
  updateRing(document.getElementById('contentScoreFill'), contentScore);

  // 4. Match Score
  const mScoreVal = document.getElementById('matchScoreVal');
  if (mScoreVal) mScoreVal.textContent = matchScore;
  const mRating = getRating(matchScore);
  const mRateEl = document.getElementById('matchScoreRating');
  if (mRateEl) {
    mRateEl.textContent = mRating.label;
    mRateEl.className = `score-card-rating ${mRating.cls}`;
  }
  updateRing(document.getElementById('matchScoreFill'), matchScore);

  // 5. Strengths
  let strengths = data.strengths;
  if (!strengths || !Array.isArray(strengths) || strengths.length === 0) {
    strengths = [];
    if (atsScore >= 75) {
      strengths.push(`High ATS Score (${atsScore}%): Resume layout and contact elements are well-optimized for parsing engines.`);
    }
    if (data.matched_skills && data.matched_skills.length > 0) {
      strengths.push(`Core Skill Alignment: Strong demonstration of ${data.matched_skills.slice(0, 3).join(', ')}.`);
    }
    if (contentScore >= 70) {
      strengths.push(`Good Content Quality (${contentScore}/100): Clear professional sections and action-oriented phrasing.`);
    }
    if (strengths.length === 0) {
      strengths.push('Clean foundational resume format with readable structure.');
    }
  }

  const strengthsList = document.getElementById('strengthsList');
  if (strengthsList) {
    strengthsList.innerHTML = strengths.map(s => `
      <li>
        <div class="list-icon green"><i class="bi bi-check-lg"></i></div>
        ${s}
      </li>
    `).join('');
  }

  // 6. Areas to Improve
  let suggestions = data.suggestions;
  if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
    suggestions = [];
    if (data.missing_skills && data.missing_skills.length > 0) {
      suggestions.push(`Consider acquiring or highlighting missing job skills: ${data.missing_skills.slice(0, 4).join(', ')}.`);
    }
    if (matchScore < 75) {
      suggestions.push(`Align resume keywords and projects more closely with the target ${data.job_title || 'job'} role.`);
    }
    if (suggestions.length === 0) {
      suggestions.push('Add more quantifiable metrics and impact numbers to experience bullet points.');
    }
  }

  const improveList = document.getElementById('improveList');
  if (improveList) {
    improveList.innerHTML = suggestions.map(s => `
      <li>
        <div class="list-icon orange"><i class="bi bi-exclamation"></i></div>
        ${s}
      </li>
    `).join('');
  }

  // 7. Matched & Missing Skills
  const matchedSkills = Array.isArray(data.matched_skills) ? data.matched_skills : [];
  const missingSkills = Array.isArray(data.missing_skills) ? data.missing_skills : [];

  const matchedEl = document.getElementById('matchedSkillsList');
  if (matchedEl) {
    matchedEl.innerHTML = matchedSkills.length
      ? matchedSkills.map(skill => `<span class="skill-tag matched">${skill}</span>`).join('')
      : '<span style="color:var(--text-muted);font-size:13px;">No direct skill matches found in resume.</span>';
  }

  const missingEl = document.getElementById('missingSkillsList');
  if (missingEl) {
    missingEl.innerHTML = missingSkills.length
      ? missingSkills.map(skill => `<span class="skill-tag missing">${skill}</span>`).join('')
      : '<span style="color:var(--accent-green);font-size:13px;">Great! No critical skills missing.</span>';
  }

  // Skills percentage bars
  const totalSkills = matchedSkills.length + missingSkills.length;
  const matchedPct = totalSkills > 0 ? Math.round((matchedSkills.length / totalSkills) * 100) : matchScore;
  const missingPct = 100 - matchedPct;

  const mPctText = document.getElementById('matchedSkillsPctText');
  const mBar = document.getElementById('matchedSkillsBar');
  if (mPctText) mPctText.textContent = `${matchedPct}%`;
  if (mBar) mBar.style.width = `${matchedPct}%`;

  const misPctText = document.getElementById('missingSkillsPctText');
  const misBar = document.getElementById('missingSkillsBar');
  if (misPctText) misPctText.textContent = `${missingPct}%`;
  if (misBar) misBar.style.width = `${missingPct}%`;

  const kwMatchText = document.getElementById('kwMatchText');
  const kwMatchBar = document.getElementById('kwMatchBar');
  if (kwMatchText) kwMatchText.textContent = `${matchScore}%`;
  if (kwMatchBar) kwMatchBar.style.width = `${matchScore}%`;

  // Keywords Tab
  const kwFound = document.getElementById('keywordsFoundList');
  if (kwFound) {
    kwFound.innerHTML = matchedSkills.length
      ? matchedSkills.map(k => `<span class="skill-tag matched">${k}</span>`).join('')
      : '<span style="color:var(--text-muted);font-size:13px;">None identified.</span>';
  }
  const kwFoundCount = document.getElementById('keywordsFoundCount');
  if (kwFoundCount) kwFoundCount.textContent = `${matchedSkills.length} found`;

  const kwMissing = document.getElementById('keywordsMissingList');
  if (kwMissing) {
    kwMissing.innerHTML = missingSkills.length
      ? missingSkills.map(k => `<span class="skill-tag missing">${k}</span>`).join('')
      : '<span style="color:var(--accent-green);font-size:13px;">None missing.</span>';
  }
  const kwMissingCount = document.getElementById('keywordsMissingCount');
  if (kwMissingCount) kwMissingCount.textContent = `${missingSkills.length} missing`;

  // AI Suggestions Tab
  const aiSuggList = document.getElementById('aiSuggestionsList');
  if (aiSuggList) {
    aiSuggList.innerHTML = suggestions.map((s, idx) => `
      <div class="suggestion-item">
        <div class="suggestion-item-icon"><i class="bi bi-lightbulb-fill"></i></div>
        <div class="suggestion-item-text">
          <h4>Recommendation #${idx + 1}</h4>
          <p>${s}</p>
        </div>
        <span class="suggestion-priority priority-high">Important</span>
      </div>
    `).join('');
  }

  // Improved CV Tab
  const improvedCvEl = document.getElementById('improvedCvContent');
  if (improvedCvEl) {
    improvedCvEl.textContent = data.improved_cv || 'Generating improved CV...';
  }

  // Re-apply language if set
  if (localStorage.getItem('app_language') === 'BN' && typeof applyLanguage === 'function') {
    applyLanguage('BN');
  }
}

function showNoReportFound() {
  const pageContent = document.querySelector('.page-content');
  if (!pageContent) return;
  pageContent.innerHTML = `
    <div style="text-align:center;padding:80px 20px;max-width:550px;margin:0 auto;">
      <div style="width:70px;height:70px;border-radius:50%;background:var(--primary-soft);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 20px;">
        <i class="bi bi-file-earmark-x"></i>
      </div>
      <h2 style="font-size:22px;font-weight:700;margin-bottom:8px;color:var(--text);">No Analysis Report Found</h2>
      <p style="font-size:14px;color:var(--text-sub);line-height:1.6;margin-bottom:24px;">
        We couldn't find an analysis report. Please upload your resume to generate a detailed ATS analysis and AI-improved CV.
      </p>
      <a href="upload.html" class="btn btn-primary btn-lg">
        <i class="bi bi-cloud-upload"></i> Upload Resume Now
      </a>
    </div>
  `;
}

async function loadAnalysis() {
  const urlParams = new URLSearchParams(window.location.search);
  const analysisId = urlParams.get('id');

  let analysisData = null;

  // 1. If analysisId is present in URL, fetch that specific report from the backend API
  if (analysisId && analysisId !== 'undefined' && analysisId !== 'null') {
    try {
      const res = await fetch(`${API_BASE_URL}/resume/analysis/${analysisId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.analysis) {
          analysisData = json.analysis;
        }
      }
    } catch (err) {
      console.warn('Error fetching analysis by ID from API:', err);
    }
  }

  // 2. Fallback to localStorage if no ID in URL or if API fetch failed
  if (!analysisData) {
    const localData = localStorage.getItem('latest_analysis');
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (parsed && (parsed.scores || parsed.resume_score || parsed.analysis_id)) {
          if (!analysisId || parsed.analysis_id === analysisId) {
            analysisData = parsed;
          }
        }
      } catch (e) {
        console.warn('Error reading latest_analysis from localStorage', e);
      }
    }
  }

  // 3. Fallback: Fetch latest analysis from /resume/analysis/latest or history API
  if (!analysisData) {
    try {
      const latestRes = await fetch(`${API_BASE_URL}/resume/analysis/latest`);
      if (latestRes.ok) {
        const latestJson = await latestRes.json();
        if (latestJson.analysis) {
          analysisData = latestJson.analysis;
        }
      }
    } catch (e) {
      console.warn('Error fetching latest analysis endpoint:', e);
    }
  }

  // 4. Secondary fallback: check history list
  if (!analysisData) {
    try {
      let userId = '';
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        userId = user.id || '';
      } catch {}

      const userParam = userId ? `?user_id=${userId}` : '';
      const res = await fetch(`${API_BASE_URL}/resume/history${userParam}`);
      if (res.ok) {
        const json = await res.json();
        if (json.history && json.history.length > 0) {
          analysisData = json.history[0]; // Most recent report
        }
      }
    } catch (err) {
      console.warn('Error fetching latest history fallback:', err);
    }
  }

  // 5. Render or show graceful empty state
  if (analysisData) {
    renderAnalysisData(analysisData);
  } else {
    showNoReportFound();
  }
}

// ── TABS LOGIC ─────────────────────────────────────────
function initAnalysisTabs() {
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

// ── DOWNLOAD IMPROVED CV AS PDF ───────────────────────
function downloadImprovedCvAsPdf() {
  const cvText = document.getElementById('improvedCvContent')?.textContent;
  if (!cvText || cvText.startsWith('Loading') || cvText.startsWith('Generating')) {
    if (typeof showToast === 'function') {
      showToast('No improved CV content available to download.', 'error');
    }
    return;
  }

  const roleBadge = document.getElementById('reportJobBadge')?.textContent || 'Target Role';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    if (typeof showToast === 'function') {
      showToast('Please allow popups to download your PDF.', 'error');
    }
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Enhanced Resume — ${roleBadge}</title>
      <meta charset="utf-8" />
      <style>
        @page {
          size: A4;
          margin: 18mm 20mm;
        }
        body {
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          line-height: 1.6;
          font-size: 13px;
          margin: 0;
          padding: 24px;
          background: #ffffff;
        }
        pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: inherit;
          margin: 0;
          font-size: 13px;
          line-height: 1.65;
          color: #1e293b;
        }
        .header-print {
          border-bottom: 2px solid #2563eb;
          padding-bottom: 8px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header-title {
          font-size: 17px;
          font-weight: 700;
          color: #2563eb;
        }
        .header-sub {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header-print">
        <div class="header-title">AI-Enhanced Optimized Resume</div>
        <div class="header-sub">${roleBadge}</div>
      </div>
      <pre>${cvText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// ── DOWNLOAD IMPROVED CV AS DOCX (WORD) ───────────────
async function downloadImprovedCvAsDocx() {
  const cvText = document.getElementById('improvedCvContent')?.textContent;
  if (!cvText || cvText.startsWith('Loading') || cvText.startsWith('Generating')) {
    if (typeof showToast === 'function') {
      showToast('No improved CV content available to download.', 'error');
    }
    return;
  }

  const roleBadge = document.getElementById('reportJobBadge')?.textContent || 'Target Role';

  if (typeof showToast === 'function') {
    showToast('Generating Word (.docx) document...', 'info');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/resume/export-docx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cv_text: cvText,
        title: roleBadge
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate document');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    const safeTitle = roleBadge.replace(/[^a-zA-Z0-9_\-]/g, '_');
    a.download = `${safeTitle}_Resume.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);

    if (typeof showToast === 'function') {
      showToast('Word document (.docx) downloaded successfully!', 'success');
    }
  } catch (err) {
    console.error('Error downloading docx:', err);
    if (typeof showToast === 'function') {
      showToast('Failed to download Word document. Please try again.', 'error');
    }
  }
}

function switchToImprovedCvTab() {
  const improvedBtn = document.querySelector('.tab-btn[data-tab="tab-improved-cv"]');
  if (improvedBtn) {
    improvedBtn.click();
    improvedBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ── INIT ───────────────────────────────────────────────
function initAnalysisPage() {
  initAnalysisTabs();
  loadAnalysis();

  // Top Download Improved CV (PDF) button
  const topDownloadCvBtn = document.getElementById('topDownloadImprovedCvBtn');
  if (topDownloadCvBtn) {
    topDownloadCvBtn.addEventListener('click', downloadImprovedCvAsPdf);
  }

  // Top Download Improved CV (Word .docx) button
  const topDownloadDocxBtn = document.getElementById('topDownloadImprovedCvDocxBtn');
  if (topDownloadDocxBtn) {
    topDownloadDocxBtn.addEventListener('click', downloadImprovedCvAsDocx);
  }

  // Copy Improved CV button
  const copyBtn = document.getElementById('copyImprovedCvBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const cvText = document.getElementById('improvedCvContent')?.textContent;
      if (cvText) {
        navigator.clipboard.writeText(cvText).then(() => {
          showToast('Improved CV copied to clipboard!', 'success');
        }).catch(() => {
          showToast('Failed to copy to clipboard.', 'error');
        });
      }
    });
  }

  // Tab Download Improved CV (PDF) button
  const downloadCvBtn = document.getElementById('downloadImprovedCvBtn');
  if (downloadCvBtn) {
    downloadCvBtn.addEventListener('click', downloadImprovedCvAsPdf);
  }

  // Tab Download Improved CV (Word .docx) button
  const downloadDocxBtn = document.getElementById('downloadImprovedCvDocxBtn');
  if (downloadDocxBtn) {
    downloadDocxBtn.addEventListener('click', downloadImprovedCvAsDocx);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnalysisPage);
} else {
  initAnalysisPage();
}
