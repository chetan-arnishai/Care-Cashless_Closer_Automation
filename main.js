// // ─────────────────────────────────────────────────────────────────────────────
// // main.js — Electron Main Process
// // Responsibilities:
// //   1. Create the BrowserWindow (the UI)
// //   2. Load index.html into it
// //   3. Handle IPC calls from renderer (file picker, run automation, stop)
// //   4. Spawn index.js as a child process and pipe its logs back to UI
// // ─────────────────────────────────────────────────────────────────────────────

// const { app, BrowserWindow, ipcMain, dialog } = require('electron');
// const path   = require('path');
// const { spawn } = require('child_process');

// let mainWindow = null;
// let automationProcess = null; // Track the running automation child process

// // ── Create the main window ────────────────────────────────────────────────────
// function createWindow() {
//   mainWindow = new BrowserWindow({
//     width: 820,
//     height: 780,
//     minWidth: 600,
//     minHeight: 600,
//     title: 'Care Closer Automation Tool',
//     webPreferences: {
//       preload: path.join(__dirname, 'preload.js'),
//       contextIsolation: true,   // Security: renderer can't access Node directly
//       nodeIntegration: false,   // Security: no require() in renderer
//     },
//   });

//   mainWindow.loadFile('index.html');

//   mainWindow.on('closed', () => {
//     mainWindow = null;
//     // Kill automation if window is closed mid-run
//     if (automationProcess) {
//       automationProcess.kill();
//       automationProcess = null;
//     }
//   });
// }

// app.whenReady().then(createWindow);

// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') app.quit();
// });

// app.on('activate', () => {
//   if (mainWindow === null) createWindow();
// });

// // ── IPC: Open PDF file picker ─────────────────────────────────────────────────
// // Called from renderer when user clicks any "Browse PDF" button
// // Returns: { filePath, fileName } or null if cancelled
// ipcMain.handle('open-file-dialog', async () => {
//   const result = await dialog.showOpenDialog(mainWindow, {
//     title: 'Select PDF File',
//     filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
//     properties: ['openFile'],
//   });

//   if (result.canceled || !result.filePaths.length) return null;

//   const filePath = result.filePaths[0];
//   return {
//     filePath,
//     fileName: path.basename(filePath),
//   };
// });

// // ── IPC: Start Automation ─────────────────────────────────────────────────────
// // Receives: { claimNumber, patientName, file1, file2, file3 }
// // Spawns index.js as a child Node process, passing inputs as env vars
// // Streams stdout/stderr line-by-line back to UI as 'log-line' events
// ipcMain.handle('start-automation', async (_event, inputs) => {
//   // Prevent double-running
//   if (automationProcess) {
//     return { error: 'Automation is already running.' };
//   }

//   const {
//     claimNumber,
//     patientName,
//     file1 = '',
//     file2 = '',
//     file3 = '',
//   } = inputs;

//   // Validate required fields before spawning
//   if (!claimNumber || !claimNumber.trim()) {
//     return { error: 'Claim number is required.' };
//   }
//   if (!patientName || !patientName.trim()) {
//     return { error: 'Patient name is required.' };
//   }
//   if (!file1) {
//     return { error: 'Main Report PDF is required.' };
//   }

//   // Pass inputs to index.js via environment variables
//   // (cleaner than command-line args for paths with spaces)
//   const env = {
//     ...process.env,
//     AUTO_CLAIM_NUMBER: claimNumber.trim(),
//     AUTO_PATIENT_NAME: patientName.trim(),
//     AUTO_FILE1: file1,
//     AUTO_FILE2: file2,
//     AUTO_FILE3: file3,
//   };

//   try {
//     automationProcess = spawn('node', [path.join(__dirname, 'index.js')], {
//       env,
//       cwd: __dirname,
//     });

//     // Stream stdout line-by-line to UI
//     automationProcess.stdout.on('data', (data) => {
//       const lines = data.toString().split('\n');
//       lines.forEach(line => {
//         if (line.trim()) {
//           mainWindow?.webContents.send('log-line', { type: 'info', text: line });
//         }
//       });
//     });

//     // Stream stderr to UI as errors
//     automationProcess.stderr.on('data', (data) => {
//       const lines = data.toString().split('\n');
//       lines.forEach(line => {
//         if (line.trim()) {
//           mainWindow?.webContents.send('log-line', { type: 'error', text: line });
//         }
//       });
//     });

//     // When process exits, notify UI
//     automationProcess.on('close', (code) => {
//       automationProcess = null;
//       const success = code === 0;
//       mainWindow?.webContents.send('automation-done', {
//         success,
//         code,
//         message: success
//           ? '✅ Automation completed successfully!'
//           : `⚠️ Automation exited with code ${code}`,
//       });
//     });

//     // Handle spawn errors (e.g., node not found)
//     automationProcess.on('error', (err) => {
//       automationProcess = null;
//       mainWindow?.webContents.send('log-line', {
//         type: 'error',
//         text: `❌ Failed to start process: ${err.message}`,
//       });
//       mainWindow?.webContents.send('automation-done', {
//         success: false,
//         code: -1,
//         message: `❌ Failed to start: ${err.message}`,
//       });
//     });

//     return { started: true };

//   } catch (err) {
//     automationProcess = null;
//     return { error: `Failed to spawn automation: ${err.message}` };
//   }
// });

// // ── IPC: Stop Automation ──────────────────────────────────────────────────────
// ipcMain.handle('stop-automation', async () => {
//   if (automationProcess) {
//     automationProcess.kill('SIGTERM');
//     automationProcess = null;
//     mainWindow?.webContents.send('log-line', {
//       type: 'warn',
//       text: '⛔ Automation stopped by user.',
//     });
//     return { stopped: true };
//   }
//   return { stopped: false, message: 'No automation was running.' };
// });


// ─────────────────────────────────────────────────────────────────────────────
// main.js — Electron Main Process
// ─────────────────────────────────────────────────────────────────────────────

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path   = require('path');
const fs     = require('fs');
const { spawn } = require('child_process');

let mainWindow       = null;
let automationProcess = null;

// ── Create the main window ────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 820,
    height: 780,
    minWidth: 600,
    minHeight: 600,
    title: 'Care Closer Automation Tool',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (automationProcess) {
      automationProcess.kill();
      automationProcess = null;
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});



// ── IPC: Open PDF file picker ─────────────────────────────────────────────────
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select PDF File',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    properties: ['openFile'],
  });

  if (result.canceled || !result.filePaths.length) return null;

  const filePath = result.filePaths[0];
  return { filePath, fileName: path.basename(filePath) };
});

// ── Helper: send a log line to the renderer ───────────────────────────────────
function sendLog(type, text) {
  mainWindow?.webContents.send('log-line', { type, text });
}

// ── Helper: run Python script (test.py) on file1 ─────────────────────────────
// Clears reportvalues.json first, then spawns python test.py file1 outputPath
// Returns a Promise that resolves on exit code 0, rejects otherwise.
function runPython(file1) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(__dirname, 'inputs', 'reportvalues.json');

    // ── Step 1: Clear reportvalues.json ──────────────────────────────────────
    try {
      fs.writeFileSync(outputPath, '{}', 'utf8');
      sendLog('info', '🗑️  Cleared reportvalues.json');
    } catch (err) {
      return reject(`Failed to clear reportvalues.json: ${err.message}`);
    }

    sendLog('info', `🐍 Running PDF extraction on: ${path.basename(file1)}`);
    sendLog('info', `   Output → inputs/reportvalues.json`);

    const py = spawn('python', [
      path.join(__dirname, 'test.py'),
      file1,
      outputPath,
    ], { cwd: __dirname });

    py.stdout.on('data', (data) => {
      data.toString().split('\n').forEach(line => {
        if (line.trim()) sendLog('info', `📤 ${line}`);
      });
    });

    py.stderr.on('data', (data) => {
      data.toString().split('\n').forEach(line => {
        if (line.trim()) sendLog('error', `❌ PYTHON: ${line}`);
      });
    });

    py.on('close', (code) => {
      if (code === 0) {
        sendLog('info', '✅ PDF extraction complete → reportvalues.json updated');
        resolve();
      } else {
        reject(`Python exited with code ${code}`);
      }
    });

    py.on('error', (err) => {
      reject(`Failed to spawn python: ${err.message}`);
    });
  });
}

// ── Helper: run Node automation (index.js) ────────────────────────────────────
function runAutomation(inputs) {
  return new Promise((resolve, reject) => {
    const { claimNumber, patientName, file1, file2, file3 } = inputs;

    const env = {
      ...process.env,
      AUTO_CLAIM_NUMBER: claimNumber,
      AUTO_PATIENT_NAME: patientName,
      AUTO_FILE1: file1,
      AUTO_FILE2: file2,
      AUTO_FILE3: file3,
    };

    automationProcess = spawn('node', [path.join(__dirname, 'index.js')], {
      env,
      cwd: __dirname,
    });

    automationProcess.stdout.on('data', (data) => {
      data.toString().split('\n').forEach(line => {
        if (line.trim()) sendLog('info', line);
      });
    });

    automationProcess.stderr.on('data', (data) => {
      data.toString().split('\n').forEach(line => {
        if (line.trim()) sendLog('error', line);
      });
    });

    automationProcess.on('close', (code) => {
      automationProcess = null;
      if (code === 0) resolve();
      else reject(`Automation exited with code ${code}`);
    });

    automationProcess.on('error', (err) => {
      automationProcess = null;
      reject(`Failed to start automation: ${err.message}`);
    });
  });
}

// ── IPC: Start Automation ─────────────────────────────────────────────────────
ipcMain.handle('start-automation', async (_event, inputs) => {
  if (automationProcess) {
    return { error: 'Automation is already running.' };
  }

  const {
    claimNumber,
    patientName,
    file1 = '',
    file2 = '',
    file3 = '',
  } = inputs;

  // ── Validate ──────────────────────────────────────────────────────────────
  if (!claimNumber || !claimNumber.trim()) return { error: 'Claim number is required.' };
  if (!patientName || !patientName.trim()) return { error: 'Patient name is required.' };
  if (!file1)                              return { error: 'Main Report PDF is required.' };

  // ── Run async pipeline in background ─────────────────────────────────────
  // We return { started: true } immediately so the UI unlocks.
  // The actual pipeline sends log-line and automation-done events.
  (async () => {
    try {
      // STEP 1: Python PDF extraction
      sendLog('info', '\n══ STEP 1: PDF Extraction ══');
      await runPython(file1);

      // STEP 2: Playwright automation
      sendLog('info', '\n══ STEP 2: Running Automation ══');
      await runAutomation({ claimNumber: claimNumber.trim(), patientName: patientName.trim(), file1, file2, file3 });

      mainWindow?.webContents.send('automation-done', {
        success: true,
        code: 0,
        message: '✅ Automation completed successfully!',
      });

    } catch (err) {
      sendLog('error', `❌ Pipeline failed: ${err}`);
      mainWindow?.webContents.send('automation-done', {
        success: false,
        code: 1,
        message: `⚠️ Failed: ${err}`,
      });
    }
  })();

  return { started: true };
});

// ── IPC: Stop Automation (kept for safety, no UI button) ─────────────────────
ipcMain.handle('stop-automation', async () => {
  if (automationProcess) {
    automationProcess.kill('SIGTERM');
    automationProcess = null;
    sendLog('warn', '⛔ Automation stopped.');
    return { stopped: true };
  }
  return { stopped: false };
});