/* =====================================================
   config.js — Central Configuration for Frontend & API
   ===================================================== */

// REPLACE THIS with your live Render backend URL once deployed:
// Example: 'https://ai-resume-analyzer-backend.onrender.com/api'
const LIVE_BACKEND_URL = 'https://ai-resume-analyzer-backend.onrender.com/api';

// Detect whether running locally or on live hosting (e.g. Vercel)
const isLocal = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '' ||
  window.location.protocol === 'file:'
);

// If local, use localhost:5000. If live, use LIVE_BACKEND_URL or localStorage override
window.API_BASE_URL = isLocal
  ? 'http://localhost:5000/api'
  : (localStorage.getItem('CUSTOM_API_BASE') || LIVE_BACKEND_URL);

console.log('[Config] Active API Base URL:', window.API_BASE_URL);
