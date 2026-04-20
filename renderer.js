// ─────────────────────────────────────────────────────────────────────────────
// renderer.js — UI Logic (runs in the browser/renderer process)
//
// Responsibilities:
//   1. Handle PDF Browse buttons (open file picker, show selected filename)
//   2. Handle Start button (validate inputs, send to main.js, listen for logs)
//   3. Handle Stop button (kill automation)
//   4. Update log window with live output from automation
//   5. Update banner/status based on automation state
//   6. Handle "How to Run" modal open/close
// ─────────────────────────────────────────────────────────────────────────────

// ── State: selected file paths ────────────────────────────────────────────────
const selectedFiles = {
  main: null,   // file1 — Main Report PDF
  doc1: null,   // file2 — Doc_1 PDF
  doc2: null,   // file3 — Doc_2 PDF
};

// ── Run counter (shown in badge) ──────────────────────────────────────────────
let runCount = parseInt(localStorage.getItem('runCount') || '1', 10);

// ── DOM refs ──────────────────────────────────────────────────────────────────
const logWindow   = document.getElementById('logWindow');
const banner      = document.getElementById('banner');
const runBadge    = document.getElementById('runBadge');
const btnStart    = document.getElementById('btnStart');
const claimInput  = document.getElementById('claimInput');
const nameInput   = document.getElementById('nameInput');

// If the DOM changes and any critical element is missing, avoid crashing the
// whole renderer (which would prevent Start + log streaming from ever wiring up).
if (!logWindow || !banner || !runBadge || !btnStart || !claimInput || !nameInput) {
  // eslint-disable-next-line no-console
  console.error('UI init failed: missing required DOM element(s).');
} else {

// ── Init run badge ────────────────────────────────────────────────────────────
runBadge.textContent = `Run #${runCount}`;

// ─────────────────────────────────────────────────────────────────────────────
// PDF Browse Handler
// Called from HTML: onclick="browsePdf('main')" etc.
// Opens native file picker, updates state + UI on selection.
// ─────────────────────────────────────────────────────────────────────────────
window.browsePdf = async function (slot) {
  const result = await window.api.openFileDialog();
  if (!result) return; // User cancelled

  // Save the full path
  selectedFiles[slot] = result.filePath;

  // Update filename display
  const fnameEl = document.getElementById(`fname-${slot}`);
  fnameEl.textContent = result.fileName;
  fnameEl.classList.remove('empty');

  // Turn browse button green to indicate selection
  const btnId = `browse${slot.charAt(0).toUpperCase() + slot.slice(1)}`;
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.classList.add('selected');
    btn.textContent = '✓ Selected';
  }

  appendLog(`📄 ${slot === 'main' ? 'Main Report' : slot === 'doc1' ? 'Doc_1' : 'Doc_2'} selected: ${result.fileName}`, 'info');
};

// ─────────────────────────────────────────────────────────────────────────────
// Log Helpers
// ─────────────────────────────────────────────────────────────────────────────

function appendLog(text, type = 'info') {
  const line = document.createElement('div');
  line.style.margin = '1px 0';

  if (type === 'error') {
    line.style.color = '#e53935';
  } else if (type === 'warn') {
    line.style.color = '#fb8c00';
  } else if (text.startsWith('✅')) {
    line.style.color = '#2e7d32';
  } else if (text.startsWith('❌')) {
    line.style.color = '#c62828';
  } else if (text.startsWith('⚠️')) {
    line.style.color = '#e65100';
  } else if (text.startsWith('--') || text.startsWith('══')) {
    line.style.color = '#1565c0';
    line.style.fontWeight = 'bold';
  } else {
    line.style.color = '#212121';
  }

  line.textContent = text;
  logWindow.appendChild(line);
  logWindow.scrollTop = logWindow.scrollHeight; // Auto-scroll to bottom
}

function appendSeparator() {
  const hr = document.createElement('hr');
  hr.className = 'log-sep';
  logWindow.appendChild(hr);
}

// ─────────────────────────────────────────────────────────────────────────────
// Banner Helper
// ─────────────────────────────────────────────────────────────────────────────

function setBanner(type, message) {
  banner.className = `banner ${type}`;
  banner.textContent = message;
}

function hideBanner() {
  banner.className = 'banner';
  banner.textContent = '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Start Button Handler
// ─────────────────────────────────────────────────────────────────────────────

btnStart.addEventListener('click', async () => {
  const claimNumber = claimInput.value.trim();
  const patientName = nameInput.value.trim();

  // ── Validate inputs ────────────────────────────────────────────────────────
  if (!claimNumber) {
    setBanner('error', '❌ Please enter a Claim / Intimation Number.');
    claimInput.focus();
    return;
  }
  if (claimNumber.includes(' ')) {
    setBanner('error', '❌ Claim number must not contain spaces.');
    claimInput.focus();
    return;
  }
  if (!patientName) {
    setBanner('error', '❌ Please enter the Patient Name.');
    nameInput.focus();
    return;
  }
  if (!selectedFiles.main) {
    setBanner('error', '❌ Main Report PDF is required. Please browse and select it.');
    return;
  }

  // ── Prepare UI for running ─────────────────────────────────────────────────
  btnStart.disabled = true;
  setBanner('running', '⏳ Automation is running… Do NOT touch keyboard or mouse.');

  // Clear old logs and add separator
  if (logWindow.children.length > 0) appendSeparator();
  appendLog(`▶ Run #${runCount} started — Claim: ${claimNumber} | Patient: ${patientName}`, 'info');
  if (selectedFiles.main) appendLog(`   file1 (Main Report): ${selectedFiles.main}`, 'info');
  if (selectedFiles.doc1) appendLog(`   file2 (Doc_1): ${selectedFiles.doc1}`, 'info');
  if (selectedFiles.doc2) appendLog(`   file3 (Doc_2): ${selectedFiles.doc2}`, 'info');

  // ── Clean up old IPC listeners before registering new ones ────────────────
  window.api.removeAllListeners();

  // ── Listen for live log output ─────────────────────────────────────────────
  window.api.onLogLine(({ type, text }) => {
    appendLog(text, type);
  });

  // ── Listen for completion ──────────────────────────────────────────────────
  window.api.onAutomationDone(({ success, message }) => {
    btnStart.disabled = false;

    if (success) {
      setBanner('success', message);
    } else {
      setBanner('stopped', message);
    }

    // Increment run counter
    runCount++;
    localStorage.setItem('runCount', runCount);
    runBadge.textContent = `Run #${runCount}`;

    appendLog(message, success ? 'info' : 'warn');
  });

  // ── Send to main.js ────────────────────────────────────────────────────────
  const result = await window.api.startAutomation({
    claimNumber,
    patientName,
    file1: selectedFiles.main || '',
    file2: selectedFiles.doc1 || '',
    file3: selectedFiles.doc2 || '',
  });

  // Handle immediate errors (validation failed in main.js)
  if (result && result.error) {
    setBanner('error', `❌ ${result.error}`);
    appendLog(`❌ ${result.error}`, 'error');
    btnStart.disabled = false;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// How to Run Modal
// ─────────────────────────────────────────────────────────────────────────────

window.openPopup = function () {
  const popup = document.getElementById('popup');
  popup.style.display = 'flex';
  popup.setAttribute('aria-hidden', 'false');
};

window.closePopup = function () {
  const popup = document.getElementById('popup');
  popup.style.display = 'none';
  popup.setAttribute('aria-hidden', 'true');
};

// Close modal on backdrop click
document.getElementById('popup').addEventListener('click', function (e) {
  if (e.target === this) closePopup();
});

// ── Wire up "How to Run" button ───────────────────────────────────────────────
document.getElementById('btnHow').addEventListener('click', openPopup);

} // end DOM-required guard