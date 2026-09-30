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

  // Analyze button
  analyzeBtn && analyzeBtn.addEventListener('click', () => {
    if (!selectedFile) return;
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Analyzing...';
    simulateUploadProgress(() => {
      showToast('Analysis complete! Redirecting to results...', 'success');
      setTimeout(() => { window.location.href = 'analysis.html'; }, 1000);
    });
  });
}

document.addEventListener('DOMContentLoaded', initUpload);
