// ─────────────────────────────────────────────────────────────────────────────
// preload.js — Electron Preload Script
//
// This runs in the renderer process BUT has access to Node/Electron APIs.
// It creates a safe, explicit bridge (window.api) so renderer.js can
// communicate with main.js WITHOUT needing full Node access.
//
// Security model: contextIsolation=true means renderer code cannot
// call ipcRenderer directly — it MUST go through this bridge.
// ─────────────────────────────────────────────────────────────────────────────

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {

  // ── Open native PDF file picker ───────────────────────────────────────────
  // Returns: { filePath, fileName } or null if cancelled
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),

  // ── Start the automation ──────────────────────────────────────────────────
  // inputs: { claimNumber, patientName, file1, file2, file3 }
  // Returns: { started: true } or { error: '...' }
  startAutomation: (inputs) => ipcRenderer.invoke('start-automation', inputs),

  // ── Stop the automation ───────────────────────────────────────────────────
  // Returns: { stopped: true } or { stopped: false }
  stopAutomation: () => ipcRenderer.invoke('stop-automation'),

  // ── Listen for log lines streamed from automation process ─────────────────
  // callback: ({ type: 'info'|'error'|'warn', text: string }) => void
  onLogLine: (callback) => {
    ipcRenderer.on('log-line', (_event, data) => callback(data));
  },

  // ── Listen for automation completion ─────────────────────────────────────
  // callback: ({ success: bool, code: number, message: string }) => void
  onAutomationDone: (callback) => {
    ipcRenderer.on('automation-done', (_event, data) => callback(data));
  },

  // ── Remove all listeners (cleanup on re-run) ─────────────────────────────
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('log-line');
    ipcRenderer.removeAllListeners('automation-done');
  },
});