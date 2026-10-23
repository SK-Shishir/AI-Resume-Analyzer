/* =====================================================
   upload.js — Drag & Drop file upload UI logic
   File validation, preview, progress simulation
   ===================================================== */

const ALLOWED_TYPES = ['application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED_EXT   = ['.pdf', '.docx'];
const MAX_SIZE_MB   = 10;

let selectedFile = null;

function getFileExt(name) {
  return name.substring(name.lastIndexOf('.')).toLowerCase();
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function getFileType(name) {
  return getFileExt(name) === '.pdf' ? 'pdf' : 'docx';
}

function getFileIcon(name) {
  return getFileExt(name) === '.pdf'
    ? '<i class="bi bi-file-earmark-pdf-fill" style="color:#EF4444;font-size:20px;"></i>'
    : '<i class="bi bi-file-earmark-word-fill" style="color:#3B82F6;font-size:20px;"></i>';
}

// ── VALIDATE FILE ─────────────────────────────────────
function validateFile(file) {
  const ext = getFileExt(file.name);
  if (!ALLOWED_EXT.includes(ext)) {
    showToast('Only PDF and DOCX files are supported.', 'error');
    return false;
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    showToast(`File size must be under ${MAX_SIZE_MB}MB.`, 'error');
    return false;
  }
  return true;
}

// ── SHOW FILE PREVIEW ─────────────────────────────────
function showFilePreview(file) {
  const previewArea = document.getElementById('filePreview');
  if (!previewArea) return;

  const type = getFileType(file.name);
  previewArea.innerHTML = `
    <div class="file-selected-box">
      <div class="file-selected-icon ${type}">
        ${getFileIcon(file.name)}
      </div>
      <div class="file-selected-info">
        <div class="file-selected-name">${file.name}</div>
        <div class="file-selected-size">${formatBytes(file.size)}</div>
        <div class="progress-bar-wrapper" id="uploadProgressWrapper" style="display:none;">
          <div class="progress-bar-fill" id="uploadProgressBar" style="width:0%;"></div>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" id="removeFileBtn" title="Remove file">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
  `;
  previewArea.style.display = 'block';

  document.getElementById('removeFileBtn')?.addEventListener('click', clearFile);
}

// ── CLEAR FILE ────────────────────────────────────────
function clearFile() {
  selectedFile = null;
  const previewArea = document.getElementById('filePreview');
  if (previewArea) { previewArea.innerHTML = ''; previewArea.style.display = 'none'; }
  const fileInput = document.getElementById('fileInput');
  if (fileInput) fileInput.value = '';
  const analyzeBtn = document.getElementById('analyzeBtn');
  if (analyzeBtn) analyzeBtn.disabled = true;
}

// ── HANDLE FILE ───────────────────────────────────────
function handleFile(file) {
  if (!validateFile(file)) return;
  selectedFile = file;
  showFilePreview(file);
  showToast(`"${file.name}" selected successfully!`, 'success');

  const analyzeBtn = document.getElementById('analyzeBtn');
  if (analyzeBtn) analyzeBtn.disabled = false;
}

// ── SIMULATE UPLOAD PROGRESS ──────────────────────────
function simulateUploadProgress(callback) {
  const wrapper = document.getElementById('uploadProgressWrapper');
  const bar     = document.getElementById('uploadProgressBar');
  if (!wrapper || !bar) { callback && callback(); return; }

  wrapper.style.display = 'block';
  let pct = 0;
  const interval = setInterval(() => {
    pct += Math.random() * 20;
    if (pct >= 100) { pct = 100; clearInterval(interval); setTimeout(callback, 300); }
    bar.style.width = pct + '%';
  }, 200);
}

// ── INIT UPLOAD PAGE ──────────────────────────────────
function initUpload() {
  const dropZone  = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const chooseBtn = document.getElementById('chooseFileBtn');
  const analyzeBtn = document.getElementById('analyzeBtn');

  if (!dropZone) return;

  // Click on drop zone
  dropZone.addEventListener('click', (e) => {
    if (e.target.closest('#chooseFileBtn')) return;
    fileInput && fileInput.click();
  });

  // Choose file button
  chooseBtn && chooseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput && fileInput.click();
  });

  // File input change
  fileInput && fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
  });

  // Drag events
  ['dragenter', 'dragover'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'dragend'].forEach(evt => {
    dropZone.addEventListener(evt, () => {
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  });

var API_BASE_URL = window.API_BASE_URL ||
  (window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:5000/api' : 'http://localhost:5000/api');

  // Analyze button
  analyzeBtn && analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    const targetJobInput = document.getElementById('targetJobInput');
    const jobTitle = targetJobInput ? targetJobInput.value.trim() : 'Software Engineer';

    const targetCompanyInput = document.getElementById('targetCompanyInput');
    const companyName = targetCompanyInput ? targetCompanyInput.value.trim() : '';

    const targetJobDescInput = document.getElementById('targetJobDescriptionInput');
    const jobDescription = targetJobDescInput ? targetJobDescInput.value.trim() : '';

    let userId = '';
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        userId = parsed.id || '';
      }
    } catch (e) {
      console.warn('Could not read user id from storage', e);
    }

    const originalBtnHtml = analyzeBtn.innerHTML;
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Extracting & Analyzing...';

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('job_title', jobTitle || 'Software Engineer');
    if (companyName) formData.append('company_name', companyName);
    if (jobDescription) formData.append('job_description', jobDescription);
    if (userId) formData.append('user_id', userId);

    const progressWrapper = document.getElementById('uploadProgressWrapper');
    const progressBar = document.getElementById('uploadProgressBar');
    if (progressWrapper && progressBar) {
      progressWrapper.style.display = 'block';
      progressBar.style.width = '45%';
    }

    try {
      const response = await fetch(`${API_BASE_URL}/resume/analyze`, {
        method: 'POST',
        body: formData
      });

      if (progressBar) progressBar.style.width = '85%';

      const data = await response.json();

      if (response.ok) {
        if (progressBar) progressBar.style.width = '100%';
        localStorage.setItem('latest_analysis', JSON.stringify(data));
        showToast('Analysis completed successfully!', 'success');
        setTimeout(() => {
          window.location.href = `analysis.html?id=${data.analysis_id || ''}`;
        }, 800);
      } else {
        showToast(data.error || 'Failed to analyze resume.', 'error');
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = originalBtnHtml;
        if (progressWrapper) progressWrapper.style.display = 'none';
      }
    } catch (err) {
      console.error('Upload Error:', err);
      showToast('Network error: Is the backend server running?', 'error');
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = originalBtnHtml;
      if (progressWrapper) progressWrapper.style.display = 'none';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUpload);
} else {
  initUpload();
}
