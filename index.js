// const { chromium } = require('playwright');
// const fs = require('fs');
// const path = require('path');

// const SESSION_FILE = path.join(__dirname, 'session.json');
// const COOKIES_FILE = path.join(__dirname, 'cookies.json');

// async function runLogin(config) {
//   const LOGIN_URL = config.login_url;
//   const USERNAME  = config.username;
//   const PASSWORD  = config.password;
//   const S         = config.selectors;

//   let browser, context, page;

//   try {
//     console.log("🚀 Script started...");

//     browser = await chromium.launch({ headless: false });

//     // 🔹 Load session if exists
//     const hasSession = fs.existsSync(SESSION_FILE);

//     context = hasSession
//       ? await browser.newContext({ storageState: SESSION_FILE })
//       : await browser.newContext();

//     console.log(hasSession ? "🔁 Loaded existing session" : "🆕 Fresh session");

//     page = await context.newPage();
//     await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });

//     // 🔹 Better login detection
//     const isLoginPage = await page.locator(S.login.username)
//       .isVisible()
//       .catch(() => false);

//     if (isLoginPage) {
//       console.log("🔐 Login required...");

//       // Remove old session
//       if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
//       if (fs.existsSync(COOKIES_FILE)) fs.unlinkSync(COOKIES_FILE);

//       // Fill credentials
//       await page.fill(S.login.username, USERNAME);
//       await page.fill(S.login.password, PASSWORD);
//       await page.click(S.login.loginBtn);

//       console.log("👉 Enter OTP manually...");

//       // Wait for OTP success (URL change)
//       await page.waitForURL(
//         url => !url.toString().toLowerCase().includes('login'),
//         { timeout: 600000 }
//       );

//       console.log("✅ OTP verified");

//     } else {
//       console.log("✅ Already logged in (session reused)");
//     }

//     // 🔍 DEBUG SECTION (VERY IMPORTANT)
//     console.log("\n🔍 DEBUG AFTER LOGIN");
//     await page.waitForTimeout(5000);

//     console.log("🌐 URL:", page.url());
//     console.log("📄 Title:", await page.title());

//     const stillLogin = await page.locator(S.login.username)
//       .isVisible()
//       .catch(() => false);

//     console.log("❓ Still on login page:", stillLogin);

//     // 🍪 Cookies
//     const cookies = await context.cookies();
//     console.log("\n🍪 Cookies:");
//     cookies.forEach(c => {
//       console.log(`- ${c.name} = ${c.value.substring(0, 20)}...`);
//     });

//     // 📦 LocalStorage
//     const localStorageData = await page.evaluate(() => {
//       let data = {};
//       for (let i = 0; i < localStorage.length; i++) {
//         const key = localStorage.key(i);
//         data[key] = localStorage.getItem(key);
//       }
//       return data;
//     });

//     console.log("\n📦 LocalStorage:");
//     console.log(localStorageData);

//     // 🔹 Save session
//     await context.storageState({ path: SESSION_FILE });
//     console.log("\n💾 Session saved → session.json");

//     // 🔹 Save cookies
//     fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
//     console.log("🍪 Cookies saved → cookies.json");

//     console.log("\n✅ DONE");

//     return { browser, context };

//   } catch (err) {
//     console.error("❌ Login failed:", err.message);
//     throw err;
//   }
// }

// // 🔹 Run script
// (async () => {
//   try {
//     const config = require('./config.json');
//     await runLogin(config);
//   } catch (err) {
//     console.error("❌ Error:", err.message);
//   }
// })();

// const { chromium } = require('playwright');
// const fs = require('fs');
// const path = require('path');
// const { spawn } = require('child_process');

// const SESSION_FILE = path.join(__dirname, 'session.json');
// const COOKIES_FILE = path.join(__dirname, 'cookies.json');
// const S = require('./config.json');
// const reportValues = require('./inputs/reportvalues.json')
// const currentClaimNumber = '1504202601863';
// let name = 'Sandip Baban Gurav';

// // ✅ ADD THIS LINE HERE — before any function that uses log
// const log = console.log;


// // ─────────────────────────────────────────────────────────────────────────────
// // SECTION 6: FILE RESOLVER
// //
// // Every upload field has a specific file assigned (file2, file3, etc.).
// // But if that file doesn't exist on disk, we fall back to file1.
// //
// // This function centralises that logic so every upload helper uses it.
// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * resolveFile(filePath, fallbackPath, label)
//  *
//  * Returns the best available file path for an upload:
//  *   1. If filePath exists on disk → return it (intended file)
//  *   2. If not → return fallbackPath (file1 as backup)
//  *   3. If neither exists → return null (upload will be skipped)
//  *
//  * EXAMPLE:
//  *   resolveFile(file2, file1, 'Patient photo field')
//  *   → Patient Part.pdf exists → returns its path
//  *   → Patient Part.pdf missing → logs warning, returns file1 path
//  *   → Both missing → logs error, returns null
//  *
//  * @param {string} filePath     - The intended file path to upload
//  * @param {string} fallbackPath - file1 path used as emergency backup
//  * @param {string} label        - Human-readable name shown in logs
//  * @returns {string|null}       - Resolved file path, or null if nothing available
//  */
// function resolveFile(filePath, fallbackPath, label) {
//   // Case 1: Intended file exists — use it (happy path)
//   if (filePath && fs.existsSync(filePath)) {
//     return filePath;
//   }

//   // Case 2: Intended file missing — try file1 as fallback
//   if (fallbackPath && fs.existsSync(fallbackPath)) {
//     log(`⚠️  ${label} not found — falling back to file1: ${path.basename(fallbackPath)}`);
//     return fallbackPath;
//   }

//   // Case 3: Both files missing — cannot upload anything
//   log(`❌ ${label} not found and file1 fallback also missing — upload will be skipped`);
//   return null;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // SECTION 7: SAFE INTERACTION HELPERS
// //
// // These functions wrap Playwright actions with:
// //   - Proper waiting (so elements are ready before we touch them)
// //   - Error catching (so one failed field doesn't crash the whole form)
// //   - Clear logging (so you know exactly what happened)
// //
// // RULE: None of these functions throw errors — they log and continue.
// // ─────────────────────────────────────────────────────────────────────────────

// /**
//  * safeCheck(page, selector, retries)
//  *
//  * Clicks a radio button or checkbox reliably.
//  *
//  * WHY IT'S COMPLEX:
//  *   Some radio buttons on this site are hidden behind CSS overlays.
//  *   Playwright's normal .check() fails because it thinks they're invisible.
//  *   So we use a multi-step strategy:
//  *     1. Wait for the element to exist in the DOM (doesn't need to be visible)
//  *     2. Scroll it into view (it may be far down the page)
//  *     3. Use JavaScript to click it (bypasses CSS visibility guards)
//  *     4. Verify it's actually checked now
//  *     5. If JS click didn't work → use Playwright force-check
//  *     6. Retry up to 3 times with increasing delays if anything fails
//  *
//  * @param {Page}   page     - Playwright page object
//  * @param {string} selector - CSS selector for the radio/checkbox
//  * @param {number} retries  - Max retry attempts (default: 3)
//  */
// async function safeCheck(page, selector, retries = 3) {
//   if (!selector) return; // Skip if selector is empty or undefined

//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       // Step 1: Wait for element to be in the DOM (not necessarily visible)
//       const locator = page.locator(selector).first();
//       await locator.waitFor({ state: 'attached', timeout: 1000 });

//       // Step 2: Scroll element into the viewport
//       await locator.scrollIntoViewIfNeeded().catch(() => {});

//       // Step 3: Short pause — DOM can shift slightly after scrolling
//       await page.waitForTimeout(50);

//       // Step 4: Re-locate fresh after scroll (avoids stale element errors)
//       const fresh = page.locator(selector).first();

//       // Step 5: If already checked, nothing to do — exit early
//       const isChecked = await fresh.isChecked().catch(() => false);
//       if (isChecked) {
//         log(`Already checked: ${selector}`);
//         return;
//       }

//       // Step 6: Click via JavaScript — works even on CSS-hidden elements
//       await fresh.evaluate(el => el.click());
//       await page.waitForTimeout(100); // Wait for UI to register the click

//       // Step 7: Confirm the click was successful
//       const nowChecked = await fresh.isChecked().catch(() => false);
//       if (nowChecked) {
//         log(`Checked (attempt ${attempt}): ${selector}`);
//         return;
//       }

//       // Step 8: JS click didn't take — use Playwright's force-check as last resort
//       await fresh.check({ force: true, timeout: 1000 });
//       log(`Force-checked (attempt ${attempt}): ${selector}`);
//       return;

//     } catch (e) {
//       const msg = String(e.message).split('\n')[0]; // First line only

//       // Special case: "did not change its state" = already checked, not an error
//       if (msg.includes('did not change its state')) {
//         log(`Already checked: ${selector}`);
//         return;
//       }

//       if (attempt < retries) {
//         // Exponential-ish backoff: 500ms, 1000ms, 1500ms between retries
//         log(`Retry ${attempt}/${retries} for "${selector}": ${msg}`);
//         await page.waitForTimeout(100 * attempt);
//       } else {
//         log(`❌ safeCheck failed after ${retries} attempts "${selector}": ${msg}`);
//       }
//     }
//   }
// }

// /**
//  * safeSelect(page, selector, value)
//  *
//  * Selects an option from a <select> dropdown by its value attribute.
//  *
//  * NOTE: Use the option's `value` attribute, not its visible display text.
//  * EXAMPLE: <option value="YES">Yes</option> → pass value="YES"
//  *
//  * @param {Page}   page     - Playwright page
//  * @param {string} selector - CSS selector for the <select> element
//  * @param {string} value    - The option value to select
//  */
// async function safeSelect(page, selector, value) {
//   if (!selector) return;
//   try {
//     await page.waitForSelector(selector, { timeout: 5000 });
//     await page.selectOption(selector, { value });
//     log(`Selected "${value}" in: ${selector}`);
//   } catch (e) {
//     log(`safeSelect skipped "${selector}" value="${value}": ${String(e.message).split('\n')[0]}`);
//   }
// }

// /**
//  * safeUpload(page, selector, filePath, file1Fallback)
//  *
//  * Uploads a SINGLE file to a file input field.
//  *
//  * FALLBACK RULE:
//  *   If filePath doesn't exist → automatically upload file1 instead.
//  *   If file1 also doesn't exist → skip the upload and log an error.
//  *
//  * EXAMPLE:
//  *   safeUpload(page, '#PatientPhotoMedia', file2, file1)
//  *   → Patient Part.pdf found → uploads Patient Part.pdf
//  *   → Patient Part.pdf missing → uploads Main Report (file1) instead
//  *   → Both missing → logs error and skips
//  *
//  * @param {Page}   page          - Playwright page
//  * @param {string} selector      - CSS selector for the file <input>
//  * @param {string} filePath      - Intended file to upload
//  * @param {string} file1Fallback - Backup file (file1 / Main Report)
//  */
// async function safeUpload(page, selector, filePath, file1Fallback) {
//   if (!selector) return;

//   // Resolve which file to actually upload (applies fallback logic)
//   const resolved = resolveFile(filePath, file1Fallback, `Upload "${selector}"`);
//   if (!resolved) return; // Both files missing — skip cleanly

//   try {
//     await page.waitForSelector(selector, { timeout: 5000 });
//     await page.setInputFiles(selector, resolved);
//     log(`Uploaded "${path.basename(resolved)}" to: ${selector}`);
//   } catch (e) {
//     log(`safeUpload failed "${selector}": ${String(e.message).split('\n')[0]}`);
//   }
// }

// /**
//  * safeUploadMulti(page, selector, filePaths, file1Fallback)
//  *
//  * Uploads MULTIPLE files to a single file input field.
//  * Used for "Other Documents" and "Evidence" fields that accept many files.
//  *
//  * FALLBACK RULE:
//  *   Filters out any file paths that don't exist on disk.
//  *   If the filtered list is empty → fall back to just uploading file1.
//  *   If file1 is also missing → skip the upload.
//  *
//  * EXAMPLE:
//  *   safeUploadMulti(page, '#OtherDocumentsMedia', All_Files, file1)
//  *   → All 5 files found → uploads all 5
//  *   → upload_documents folder is empty → uploads just file1
//  *   → Everything missing → logs error and skips
//  *
//  * @param {Page}     page          - Playwright page
//  * @param {string}   selector      - CSS selector for the file <input>
//  * @param {string[]} filePaths     - Array of file paths to upload
//  * @param {string}   file1Fallback - Backup (file1) if all paths are missing
//  */
// async function safeUploadMulti(page, selector, filePaths, file1Fallback) {
//   if (!selector) return;

//   // Keep only files that actually exist on disk
//   // let valid = (filePaths || []).filter(p => p && fs.existsSync(p));
//   if (!Array.isArray(filePaths)) {
//     if (typeof filePaths === 'string') {
//       filePaths = [filePaths];
//     } else if (!filePaths) {
//       filePaths = [];
//     } else {
//       filePaths = Object.values(filePaths);
//     }
//   }

//   let valid = filePaths.filter(p => p && fs.existsSync(p));

//   if (!valid.length) {
//     // No valid files — try file1 as emergency backup
//     if (file1Fallback && fs.existsSync(file1Fallback)) {
//       log(`⚠️  No valid files for "${selector}" — falling back to file1`);
//       valid = [file1Fallback];
//     } else {
//       log(`❌ No valid files for "${selector}" and file1 also missing — skipping`);
//       return;
//     }
//   }

//   try {
//     const locator = page.locator(selector);
//     await locator.waitFor({ state: 'attached', timeout: 5000 });
//     await locator.scrollIntoViewIfNeeded().catch(() => {});
//     await locator.setInputFiles(valid);
//     log(`Uploaded ${valid.length} file(s) to: ${selector}`);
//     valid.forEach(p => log(`   -> ${path.basename(p)}`));
//   } catch (e) {
//     log(`safeUploadMulti failed "${selector}": ${String(e.message).split('\n')[0]}`);
//   }
// }

// /**
//  * safeFill(page, selector, value)
//  *
//  * Types text into an input or textarea field.
//  * Clicks the field first to make sure it's focused, then types the value.
//  *
//  * @param {Page}   page     - Playwright page
//  * @param {string} selector - CSS selector for the input or textarea
//  * @param {string} value    - Text to type into the field
//  */

// async function safeFill(page, selector, value) {
//   if (!selector) return;
//   try {
//     const locator = page.locator(selector).first();
//     await locator.waitFor({ state: 'visible', timeout: 8000 });
//     await locator.scrollIntoViewIfNeeded().catch(() => {});
//     await locator.click({ force: true }); // Focus the field before typing
//     await locator.fill(value || '');      // Type the value (clears existing text)
//     log(`Filled "${selector}"`);
//   } catch (e) {
//     log(`safeFill skipped "${selector}": ${String(e.message).split('\n')[0]}`);
//   }
// }

// /**
//  * toPascalCase(str)
//  *
//  * Converts any string to PascalCase (first letter uppercase, rest lowercase).
//  * Used for the Gender dropdown — the site expects "Male" not "MALE" or "male".
//  *
//  * EXAMPLES:
//  *   "MALE"   → "Male"
//  *   "female" → "Female"
//  *   "male"   → "Male"
//  *
//  * @param {string} str - Input string (any case)
//  * @returns {string}   - PascalCase string
//  */
// function toPascalCase(str) {
//   return (str || '')
//     .toLowerCase()
//     .split(/[\s_-]+/)
//     .map(w => w.charAt(0).toUpperCase() + w.slice(1))
//     .join('');
// }



// function formatDateUniversal(dateStr) {
//   // 1. Normalize separators (replace -, -- with /)
//   const clean = dateStr.replace(/-+/g, '/');

//   // 2. Split into parts
//   let [day, month, year] = clean.split('/');

//   // 3. Month mapping (handles number + short name)
//   const monthMap = {
//     "01": "January", "1": "January", "Jan": "January",
//     "02": "February", "2": "February", "Feb": "February",
//     "03": "March", "3": "March", "Mar": "March",
//     "04": "April", "4": "April", "Apr": "April",
//     "05": "May", "5": "May",
//     "06": "June", "6": "June", "Jun": "June",
//     "07": "July", "7": "July", "Jul": "July",
//     "08": "August", "8": "August", "Aug": "August",
//     "09": "September", "9": "September", "Sep": "September",
//     "10": "October", "Oct": "October",
//     "11": "November", "Nov": "November",
//     "12": "December", "Dec": "December"
//   };

//   const fullMonth = monthMap[month];

//   if (!fullMonth) {
//     throw new Error("Invalid month format: " + month);
//   }

//   // 4. Ensure day is 2-digit
//   day = day.padStart(2, '0');

//   return `${day}/${fullMonth}/${year}`;
// }


// function getIntValue(value) {
//   if (value == null) return '';

//   const num = value.toString().replace(/\D/g, '');
//   return num || '';
// }

// async function fillDateField(page, selector, rawDate) {
//   if (!selector) return false;

//   try {
//     // 🔹 Step 1: Validate
//     if (!rawDate || rawDate === 'NA') {
//       log(`⚠️ Skipping "${selector}" (invalid date)`);
//       return false;
//     }

//     // 🔹 Step 2: Format using your function
//     const formattedDate = formatDateUniversal(rawDate);

//     // 🔹 Step 3: Fill using evaluate (best for date pickers)
//     await page.evaluate(({ selector, value }) => {
//       const input = document.querySelector(selector);

//       if (!input) {
//         console.warn(`Element not found: ${selector}`);
//         return;
//       }

//       // Remove restrictions if any
//       input.removeAttribute('readonly');
//       input.removeAttribute('disabled');

//       // Set value
//       input.value = value;

//       // Trigger events (IMPORTANT)
//       input.dispatchEvent(new Event('input', { bubbles: true }));
//       input.dispatchEvent(new Event('change', { bubbles: true }));

//     }, { selector, value: formattedDate });

//     log(`✅ Date filled "${selector}" → ${formattedDate}`);
//     return true;

//   } catch (err) {
//     log(`❌ Failed "${selector}": ${err.message}`);
//     return false;
//   }
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // SECTION 8: FORM FILLER
// //
// // This is the main function that fills all 4 sections of the claim form.
// //
// // IT RECEIVES:
// //   page         → the browser tab (opened during login)
// //   reportValues → data extracted from the PDF by test.py
// //   UF           → upload file paths from config.json
// //   S            → CSS selectors from config.json
// //
// // FORM SECTIONS:
// //   Section 1 — Patient Details   (name, age, gender, ~30 radio buttons, 3 uploads)
// //   Section 2 — Hospital Details  (doctors, bill, beds, 11 radio buttons, 1 multi-upload)
// //   Section 3 — Clinical Details  (diagnosis, history, 4 radio buttons, 2 dropdowns, 1 upload)
// //   Section 4 — Conclusion        (opinion, payable dropdown, 3 uploads)
// // ─────────────────────────────────────────────────────────────────────────────

// async function fillForm(page, S, reportValues) {
//   log('\nStarting form fill...');
//   log('Page URL: '     + page.url());

//   // Shorthand references to CSS selector groups from config.json
//   const SN = S.search_claim_no;
//   const F  = S.form;        // Patient / general form selectors
//   const H  = S.hospital;    // Hospital section selectors
//   const C  = S.clinical;    // Clinical section selectors
//   const CL = S.conclusion;  // Conclusion section selectors

//   // ── File path setup ────────────────────────────────────────────────────────
//   // These are resolved from config.json (built by main.js during login).
//   // If any file2-5 is empty or missing, safeUpload/safeUploadMulti
//   // will automatically fall back to file1 (Main Report).
//   const file1 = 'C:/Users/Admin/Desktop/upload_documents/97593398 Paramjit Singh Kalyan Singh Kohli.pdf';
//   const file2 = 'C:/Users/Admin/Desktop/upload_documents/Insured Part.pdf';
//   const file3 = 'C:/Users/Admin/Desktop/upload_documents/Hospital Part.pdf';
 


  



//   // Log the complete file mapping so it's easy to debug any upload issue
//   // log('\n-- File mapping --');
//   // log(`   file1 (Main Report) : ${path.basename(file1) || '(not set)'}`);
//   // log(`   file2               : ${path.basename(file2) || '(not set — will fall back to file1)'}`);
//   // log(`   file3               : ${path.basename(file3) || '(not set — will fall back to file1)'}`);


//   // ── STEP 1: Open Investigation Tab ────────────────────────────────────────
//   // Click the first nav item to open the investigations list table
//   log('\n-- Navigating to investigation list --');
//   await page.waitForSelector(SN.firstClick);
//   await page.click(SN.firstClick);

//   // ── STEP 2: Open the Claim Number Filter ──────────────────────────────────
//   // Click the filter icon on the second column header of the grid
//   await page.waitForSelector(SN.secondClick);
//   await page.click(SN.secondClick);

//   // ── STEP 3: Type the Claim Number into the Filter Input ───────────────────
//   const filterInput = page.locator(SN.fillCliamName);
//   await filterInput.waitFor({ state: 'visible' });
//   await filterInput.fill(name);

//   // ── STEP 4: Apply the Filter ──────────────────────────────────────────────
//   const applyBtn = page.locator(SN.applyButton);
//   await applyBtn.click();

//   await page.waitForTimeout(3000);

//   // ── STEP 5: Click the First Result Row ────────────────────────────────────
//   // The filtered table should now show only the matching claim — click it
//   await page.click(SN.clickOnClaim);

//   // ── STEP 6: Verify Claim Number on the Opened Form ────────────────────────
//   // IMPORTANT SAFETY CHECK: confirm the form that opened is actually our claim.
//   // This prevents accidentally filling the wrong claim if the filter returned
//   // multiple results or clicked the wrong row.
//   await page.waitForSelector(SN.verifyClaimNumber);
//   const formClaim = await page.locator(SN.verifyClaimNumber).inputValue();
//   log(`Form claim number: ${formClaim}`);

//   if (formClaim.trim() !== name) {
//     log(`❌ Claim mismatch! Expected: ${name}, Found: ${formClaim}`);
//     log('Stopping form fill to avoid filling the wrong claim.');
//     return; // STOP — do not fill anything on the wrong claim
//   }
//   log(`✅ Claim matched. Proceeding with form fill...`);

//   // ── STEP 7: Accept Investigation Button (if visible) ──────────────────────
//   // Some claims have an "Accept Investigation" button that must be clicked
//   // before the form becomes editable. Others don't have it — so we check first.
//   try {
//     const acceptBtn = page.locator(S.acceptInvestigationButton);
//     if (await acceptBtn.isVisible()) {
//       await acceptBtn.click();
//       log('✅ Accept Investigation button clicked');
//     } else {
//       log('ℹ️  Accept Investigation button not visible — skipped');
//     }
//   } catch (e) {
//     log(`⚠️  Accept button check failed: ${e.message.split('\n')[0]}`);
//   }

//   // ── STEP 8: Wait for the Form to be Ready ─────────────────────────────────
//   // The patient visit dropdown is the first field in the form.
//   // If it doesn't appear in 15 seconds, the form didn't load properly.
//   try {
//     await page.waitForSelector(F.patient_visit_dropdown, { timeout: 15000 });
//   } catch {
//     log('❌ Form not loaded in 15 seconds. URL: ' + page.url());
//     log('Stopping — form is not ready to fill.');
//     return;
//   }

//   // ═══════════════════════════════════════════════════════════════════════════
//   // SECTION 1: PATIENT DETAILS
//   //
//   // Text Fields:
//   //   - Is Patient Visit? → YES
//   //   - Patient Name      → from PDF (reportValues)
//   //   - Relationship      → always SELF
//   //   - Age               → from PDF
//   //   - Remarks           → from PDF
//   //   - Gender            → from PDF (converted to PascalCase)
//   //
//   // Radio Buttons:
//   //   All ~30 document-collection flags → set to NO
//   //   (Did investigator collect each document? No by default)
//   //
//   // File Uploads:
//   //   Health ID Card  → file1 (Main Report)
//   //   Patient Photo   → file2, fallback to file1
//   //   ID Card         → file3, fallback to file1
//   // ═══════════════════════════════════════════════════════════════════════════

//   log('\n-- Section 1: Patient Details --');
//   await safeSelect(page, F.patient_visit_dropdown,    'YES');
//   await safeFill  (page, F.patient_name,              reportValues['patient name']  || '');
//   await safeFill  (page, F.relationship_with_insured, 'SELF');

//   const age = getIntValue(reportValues['patient age']);
//   await safeFill(page, F.age, age ?? '');

//   await safeFill  (page, F.remarks,                   reportValues['remarks']       || '');
//   await safeSelect(page, F.gender,                    toPascalCase(reportValues['gender'] || ''));

//   // Section 1 uploads — file1 is passed as the fallback for every upload
//   log('\n-- Section 1: File Uploads --');
//   await safeUpload(page, F.health_id_card_media, file2, file1); // Health ID Card  → file1
//   await safeUpload(page, F.patient_photo_media,  file2, file1); // Patient Photo   → file2, else file1
//   await safeUpload(page, F.id_card_media,        file2, file1); // ID Card         → file3, else file1

//   // Document collection flags — all set to NO by default
//   log('\n-- Section 1: Radio Buttons --');
//   await safeCheck(page, F.relationship_same_as_in_policy_flag_yes);
//   await safeCheck(page, F.ot_chart_collected_flag_no);
//   await safeCheck(page, F.family_doctor_visited_flag_no);
//   await safeCheck(page, F.opd_records_collected_flag_no);
//   await safeCheck(page, F.work_place_checked_flag_no);
//   await safeCheck(page, F.rc_of_vehicle_flag_no);
//   await safeCheck(page, F.guilty_party_statement_flag_no);
//   await safeCheck(page, F.cos_id_card_collected_for_corporate_cases_flag_no);
//   await safeCheck(page, F.doctors_statement_flag_no);
//   await safeCheck(page, F.progressive_chart_collected_flag_no);
//   await safeCheck(page, F.hospital_bill_verified_flag_no);
//   await safeCheck(page, F.previous_opd_consultations_flag_no);
//   await safeCheck(page, F.previous_mri_xray_scans_flag_no);
//   await safeCheck(page, F.post_hospitalisation_bills_or_prescriptions_flag_no);
//   await safeCheck(page, F.first_consultation_papers_flag_no);
//   await safeCheck(page, F.neighbors_visited_flag_no);
//   await safeCheck(page, F.health_card_flag_no);
//   await safeCheck(page, F.pharmacy_bills_verified_flag_no);
//   await safeCheck(page, F.registration_of_vehicle_involved_in_accident_flag_no);
//   await safeCheck(page, F.dl_of_driver_at_time_of_accident_flag_no);
//   await safeCheck(page, F.id_matching_with_insured_physically_flag_no);
//   await safeCheck(page, F.attendant_statement_flag_no);
//   await safeCheck(page, F.nursing_note_collected_flag_no);
//   await safeCheck(page, F.doctors_note_collected_flag_no);
//   await safeCheck(page, F.family_member_statement_flag_no);
//   await safeCheck(page, F.previous_hospitalisation_docs_flag_no);
//   await safeCheck(page, F.id_proof_flag_no);
//   await safeCheck(page, F.consent_letter_for_obtaining_icp_flag_no);
//   await safeCheck(page, F.family_physician_nameand_address_flag_no);
//   // await safeCheck(page, F.hospital_doctors_statement_flag_no);
//   await safeCheck(page, F.anesthesia_chart_collected_flag_no);



//   // ═══════════════════════════════════════════════════════════════════════════
//   // SECTION 2: HOSPITAL DETAILS
//   //
//   // Text Fields:
//   //   - Planned Admission         → NO
//   //   - Patient Present           → YES
//   //   - Room Category             → NA
//   //   - Pathologist Name          → from PDF
//   //   - Registration No           → from PDF
//   //   - Current Bill              → from PDF
//   //   - Room No                   → from PDF
//   //   - Treating Doctor Name      → from PDF
//   //   - Radiologist Name          → from PDF
//   //   - No of Beds                → from PDF
//   //
//   // Radio Buttons:
//   //   11 hospital document flags → all NO
//   //
//   // File Uploads:
//   //   Other Documents → all files (file1 + entire folder), fallback to file1
//   // ═══════════════════════════════════════════════════════════════════════════

//   log('\n-- Section 2: Hospital Details --');
//   await safeSelect(page, H.planned_admission_dropdown,           'NO');
//   await safeSelect(page, H.patient_present_in_hospital_dropdown, 'YES');
//   await safeFill  (page, H.room_category,        'NA');
//   await safeFill  (page, H.pathologist_name,     reportValues['pathologist doctor name'] || 'NA');
//   await safeFill  (page, H.reg_no_of_hospital,   reportValues['registration no']         || '00');
//   await safeFill  (page, H.current_bill,         reportValues['final bill of hospital']  || '');
//   await safeFill  (page, H.room_no,              reportValues['room no']                 || '0');
//   await safeFill  (page, H.treating_doctor_name, reportValues['treating doctor name']    || 'NA');
//   await safeFill  (page, H.radiologist_name,     reportValues['radiologist doctor name'] || 'NA');
  
//   const beds = getIntValue(reportValues['total no of beds']);
//   await safeFill(page, H.no_of_beds, beds ?? '');



//   // const formattedDate1 = formatDateUniversal(reportValues['dod'] || 'NA');
//   // await page.evaluate((date) => {
//   //   const input = document.querySelector('#txtExpectedDOD');
//   //   input.value = date;
//   //   input.dispatchEvent(new Event('input', { bubbles: true }));
//   //   input.dispatchEvent(new Event('change', { bubbles: true }));
//   // }, formattedDate1);

//   await fillDateField(page, H.expected_dod, reportValues['dod']);


//     // Multi-file upload: uploads file1 + all folder files together
//   // If the folder is empty, just file1 is uploaded
//   log('\n-- Section 2: File Uploads --');
//   // await safeUploadMulti(page, H.other_documents_media, All_Files, file1);
//   await safeUploadMulti(page, H.other_documents_media, file3, file1);

//   // Hospital document collection flags — all NO
//   log('\n-- Section 2: Radio Buttons --');
//   await safeCheck(page, H.treating_doctor_statement_flag_yes);
//   await safeCheck(page, H.progress_notes_flag_no);
//   await safeCheck(page, H.medication_chart_flag_no);
//   await safeCheck(page, H.anesthesia_notes_flag_no);
//   await safeCheck(page, H.lab_register_flag_no);
//   await safeCheck(page, H.emergency_notes_flag_no);
//   await safeCheck(page, H.admission_notes_flag_no);
//   await safeCheck(page, H.vital_or_nursing_chart_flag_no);
//   await safeCheck(page, H.ot_notes_flag_no);
//   await safeCheck(page, H.post_op_notes_flag_no);
//   await safeCheck(page, H.admission_register_flag_no);



//   // ═══════════════════════════════════════════════════════════════════════════
//   // SECTION 3: CLINICAL DETAILS
//   //
//   // Text Fields:
//   //   - Reason for Admission  → from PDF (presenting complaints)
//   //   - Provisional Diagnosis → from PDF
//   //   - Duration of Illness   → from PDF (past history)
//   //   - Accident Case         → NO
//   //
//   // Radio Buttons:
//   //   - Patient Statement      → NO
//   //   - Nearby Pathology Labs  → NO
//   //   - Get Well Soon Card     → NO
//   //   - Nearby Radiology       → NO
//   //
//   // Dropdowns:
//   //   - Vicinity Check    → NO
//   //   - Workplace Visit   → NO
//   //
//   // File Uploads:
//   //   Clinical Evidence → file2, fallback to file1
//   // ═══════════════════════════════════════════════════════════════════════════

//   log('\n-- Section 3: Clinical Details --');
//   await safeFill  (page, C.reason_for_admission,  reportValues['presenting complains'] || 'NA');
//   await safeFill  (page, C.provisional_diagnosis, reportValues['diagnosis']            || 'NA');
//   await safeFill  (page, C.duration_of_illness,   reportValues['past history']         || '');
//   await safeSelect(page, C.accident_case_dropdown, 'NO');


//   // const formattedDate2 = formatDateUniversal(reportValues['doa'] || 'NA');
//   // await page.evaluate((date) => {
//   //   const input = document.querySelector('#txtDOA');
//   //   input.value = date;
//   //   input.dispatchEvent(new Event('input', { bubbles: true }));
//   //   input.dispatchEvent(new Event('change', { bubbles: true }));
//   // }, formattedDate2);


//   // const formattedDate3 = formatDateUniversal(reportValues['dod'] || 'NA');
//   // await page.evaluate((date) => {
//   //   const input = document.querySelector('#txtDOD');
//   //   input.value = date;
//   //   input.dispatchEvent(new Event('input', { bubbles: true }));
//   //   input.dispatchEvent(new Event('change', { bubbles: true }));
//   // }, formattedDate3);

//   await fillDateField(page, C.doa, reportValues['doa']);
//   await fillDateField(page, C.dod, reportValues['dod']);


//   // Clinical evidence → file2 (Patient Part), fallback to file1
//   await safeUpload(page, C.clinical_evidence_media, file1, file1);

//   // Clinical investigation flags
//   log('\n-- Section 3: Radio Buttons --');
//   await safeCheck(page, C.patient_statement_flag_no);
//   await safeCheck(page, C.nearby_pathology_labs_flag_no);
//   await safeCheck(page, C.get_well_soon_card_flag_no);
//   await safeCheck(page, C.nearby_radiology_center_flag_no);

//   // Vicinity and workplace visit checks
//   await safeSelect(page, C.vicinity_check_dropdown, 'NO');
//   await safeSelect(page, C.workplace_visit_dropdown, 'NO');
//   await page.selectOption('#ddlIsCaseManagement', '0');

//   // ═══════════════════════════════════════════════════════════════════════════
//   // SECTION 4: CONCLUSION
//   //
//   // File Uploads:
//   //   Patient Signature    → file3 (Hospital Part), fallback to file1
//   //   Evidence             → all files (same as Other Documents), fallback to file1
//   //   Investigator Sig     → file5, fallback to file1
//   //
//   // Dropdown:
//   //   Payable → true (claim is payable)
//   //
//   // Text Field:
//   //   Opinion → from PDF (overall findings and details)
//   // ═══════════════════════════════════════════════════════════════════════════

//   log('\n-- Section 4: Conclusion --');

//   // Patient signature → file3 (Hospital Part PDF), fallback to file1
//   await safeUpload(page, CL.patients_signature_media, file2, file1);

//   // Evidence → upload all available files, fallback to file1
//   await safeUploadMulti(page, CL.evidence_media, file2, file1);

//   // Mark claim as payable
//   await safeSelect(page, CL.payable_dropdown, 'true');

//   //Admissible YES
//   await safeSelect(page, CL.admissible, 'true');

//   // Investigator's overall findings text
//   await safeFill(page, CL.opinion, reportValues['overall findings and details'] || '');

//   // Investigator signature → file5, fallback to file1
//   await safeUpload(page, CL.investigator_signature_media, file1, file1);

//   log('\n✅ Form filled successfully!');
//   log('Claim Number processed: ' + (currentClaimNumber || '(not set)'));
// }

// // 🔹 Safe click with retries
// async function safeClick(page, selector, retries = 3) {
//   if (!selector) return;
 
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       const locator = page.locator(selector).first();
//       await locator.waitFor({ state: 'attached', timeout: 3000 });
//       await locator.scrollIntoViewIfNeeded().catch(() => {});
//       await page.waitForTimeout(100);
//       await locator.click({ timeout: 2000 });
//       console.log(`✅ Clicked: ${selector}`);
//       return;
//     } catch (e) {
//       if (attempt < retries) {
//         console.log(`🔁 Retry ${attempt}/${retries} → ${selector}`);
//         await page.waitForTimeout(200 * attempt);
//       } else {
//         console.log(`⚠️ Trying force click → ${selector}`);
//         try {
//           await page.locator(selector).first().click({ force: true });
//           console.log(`✅ Force clicked: ${selector}`);
//           return;
//         } catch (err) {
//           console.log(`❌ safeClick failed: ${selector}`);
//         }
//       }
//     }
//   }
// }
 
// // // 🔹 Safe select
// // async function safeSelects(page, selector, value) {
// //   try {
// //     await page.locator(selector).first().selectOption(value);
// //     console.log(`✅ Selected: ${value} in ${selector}`);
// //   } catch (e) {
// //     console.log(`❌ safeSelect failed: ${selector} → ${e.message.split('\n')[0]}`);
// //   }
// // }

// // async function safeFill(page, selector, value) {
// //   if (!selector) return;

// //   try {
// //     const locator = page.locator(selector).first();

// //     await locator.waitFor({ state: 'visible', timeout: 8000 });
// //     await locator.scrollIntoViewIfNeeded().catch(() => {});
// //     await locator.click({ force: true });
// //     await locator.fill(value || '');

// //     console.log(`✅ Filled "${selector}"`);

// //   } catch (e) {
// //     console.log(`❌ safeFill failed "${selector}": ${String(e.message).split('\n')[0]}`);
// //   }
// // }

// async function getValue(page, selector) {
//   try {
//     const locator = page.locator(selector).first();
//     await locator.waitFor({ state: 'visible', timeout: 5000 });

//     const value = await locator.inputValue();

//     console.log(`✅ Extracted from ${selector}`);
//     return value;

//   } catch (e) {
//     console.log(`❌ Failed to get value from ${selector}`);
//     return null;
//   }
// } 
 


// // async function isVisible(page, selector) {
// //   try {
// //     const el = page.locator(selector).first();

// //     // wait for element to be attached in DOM
// //     await el.waitFor({ state: 'attached', timeout: 3000 });

// //     return await el.isVisible();
// //   } catch {
// //     return false;
// //   }
// // }

// async function safeVisibleClick(page, selector) {
//   const el = page.locator(selector).first();

//   try {
//     await el.waitFor({ state: 'visible', timeout: 5000 });

//     // ensure it's interactable
//     await el.scrollIntoViewIfNeeded();

//     await el.click();
//     console.log(`✅ Clicked: ${selector}`);
//   } catch (err) {
//     console.log(`⏭️ Skipped (not visible/clickable): ${selector}`);
//   }
// }


// // // First bucket action
// // async function firstBucket(page) {
// //   await safeClick(page, '.username.username-hide-on-mobile');
// //   await safeClick(page, 'text=Switch Role');
// //   await safeSelect(page, '#loadPrimRole', 'b902b31e-213c-45d3-97c0-8910ae62b8ae');
// //   console.log("🎯 firstBucket executed");
// //   await safeClick(page, 'input[value="OK"]');
// //   await safeClick(page, 'text=Cases for Investigation');
// //   await safeSelect(page, '#ddlPagination', '200');
// //   await safeClick(page, '#divInvestigationGrid > div.grid-mvc > div > table > thead > tr > th:nth-child(2) > div.grid-filter > span');
// //   await safeFill(page, '.grid-filter-input', '82276009');
// // //   await safeClick(
// // //   page,
// // //   'xpath=//*[@id="divInvestigationGrid"]/div[2]/div/table/thead/tr/th[2]/div[1]/div/div[2]/div[1]/div[3]/button'
// // // );
// // await safeClick(page, '.grid-filter-btn >> nth=0');
// //   await safeClick(page, 'xpath=(//table//tbody//tr)[1]//a[1]');
// // }

// async function firstBucket(page) {
//   await safeClick(page, '.username.username-hide-on-mobile');
//   await page.waitForTimeout(1000);
//   await safeClick(page, 'text=Switch Role');
//   await page.waitForTimeout(1000);
//   await safeSelect(page, '#loadPrimRole', 'b902b31e-213c-45d3-97c0-8910ae62b8ae');
//   await page.waitForTimeout(1000);
//   await safeClick(page, 'input[value="OK"]');
//   await page.waitForTimeout(1000);
//   console.log("🎯 firstBucket executed");

//   await safeClick(page, 'text=Cases for Investigation');

//   await safeSelect(page, '#ddlPagination', '200');

// //   // 🔥 stable filter click
// //   await safeClick(page, '//*[@id="divInvestigationGrid"]/div[2]/div/table/thead/tr/th[2]/div[1]/span');

// //   await safeFill(page, '//*[@id="divInvestigationGrid"]/div[2]/div/table/thead/tr/th[2]/div[1]/div/div[2]/div[1]/div[2]/input', '97276986');

// //   // 🔥 stable apply click
// //   await safeClick(page, '.grid-filter-buttons button:has-text("Apply")');

// const values = '1504202601041';
// console.log(values);
// // 🔹 Decide based on length
// if (values.length === 8) {

//   console.log("🔹 Using Column 2 filter (8-digit case)");

//   // Click filter icon (column 2)
//   await safeClick(
//     page,
//     'xpath=//*[@id="divInvestigationGrid"]/div[2]/div/table/thead/tr/th[2]/div[1]/span'
//   );

//   // Fill input
//   await safeFill(
//     page,
//     'xpath=//*[@id="divInvestigationGrid"]/div[2]/div/table/thead/tr/th[2]/div[1]/div/div[2]/div[1]/div[2]/input',
//     values
//   );

//   // Click Apply
//   await safeClick(page, '.grid-filter-buttons button:has-text("Apply")');

// } else if (values.length > 8) {

//   console.log("🔹 Using Column 3 filter (>8-digit case)");

//   // Click filter icon (column 3)
//   await safeClick(
//     page,
//     'xpath=//*[@id="divInvestigationGrid"]/div[2]/div/table/thead/tr/th[3]/div[1]/span'
//   );
//   await page.waitForTimeout(1000);

//   // Fill input
//   await safeFill(
//     page,
//     'xpath=//*[@id="divInvestigationGrid"]/div[2]/div/table/thead/tr/th[3]/div[1]/div/div[2]/div[1]/div[2]/input',
//     values
//   );
//   await page.waitForTimeout(1000);

//   // Click Apply
//   await safeClick(
//     page,
//     'xpath=//*[@id="divInvestigationGrid"]/div[2]/div/table/thead/tr/th[3]/div[1]/div/div[2]/div[1]/div[3]/button'
//   );
//   await page.waitForTimeout(1000);

// }


//   // 🔥 click first result
//   await safeClick(page, 'xpath=(//table//tbody//tr)[1]//a[1]');
//   try{
//       const claimNo = await page.locator('#PreInvestigationRecordTempModel_ClaimNO').inputValue();
//       const intimationNo = await page.locator('#PreInvestigationRecordTempModel_IntimationNO').inputValue();

//       console.log("📄 Claim No:", claimNo);
//       console.log("📄 Intimation No:", intimationNo);

//       if (values === claimNo || values === intimationNo) {
//         console.log("✅ Value matched with Claim No or Intimation No");
//         name = await page
//           .locator('#PreInvestigationRecordTempModel_PatientName')
//           .inputValue();

//         console.log("👤 Patient Name:", name);
//       } else {
//         console.log("❌ Claim No or Intimation No is not matched");
//         return; // stop execution
//       }
//   }catch{
//     log("not get the name of the claim");
//   }
  
//   // if()
// // await page.waitForSelector('table tbody tr', { timeout: 5000 });
// // const row = page.locator('table tbody tr:first-child a:first-child');

// // try {
// //   await row.waitFor({ state: 'visible', timeout: 5000 });
// //   await row.click();
// //   console.log("✅ Clicked first row");
// // } catch (e) {
// //   console.log("⏭️ No data found after filter OR row not visible");
// //   return;
// // }


// //   await safeClick(page, '#btnAcceptInvestigation');

// //   await safeSelect(page, '#ddlInternalInvestigator', '126014');
// //   const remarks = await getValue(page, '#Remarks');
// //   console.log(remarks);
// //   await safeFill(page, '#txtSupervisorRemark', remarks);
// //   await safeClick(page, '#btnAddInvestigator');
// //   await safeClick(page, '#EASupervisorbtnSubmit');



// // // 🔹 Your block — each step only runs if the element is visible
// // if (await isVisible(page, '#btnAcceptInvestigation')) {
// //   await safeClick(page, '#btnAcceptInvestigation');
// // } else {
// //   console.log('⏭️ Skipped: #btnAcceptInvestigation not visible');
// // }

// // if (await isVisible(page, '#ddlInternalInvestigator')) {
// //   await safeSelect(page, '#ddlInternalInvestigator', '126014');
// // } else {
// //   console.log('⏭️ Skipped: #ddlInternalInvestigator not visible');
// // }

// // if (await isVisible(page, '#Remarks')) {
// //   const remarks = await getValue(page, '#Remarks');
// //   console.log(remarks);

// //   if (await isVisible(page, '#txtSupervisorRemark')) {
// //     await safeFill(page, '#txtSupervisorRemark', remarks);
// //   } else {
// //     console.log('⏭️ Skipped: #txtSupervisorRemark not visible');
// //   }
// // } else {
// //   console.log('⏭️ Skipped: #Remarks not visible');
// // }

// // if (await isVisible(page, '#btnAddInvestigator')) {
// //   await safeClick(page, '#btnAddInvestigator');
// // } else {
// //   console.log('⏭️ Skipped: #btnAddInvestigator not visible');
// // }

// // if (await isVisible(page, '#EASupervisorbtnSubmit')) {
// //   await safeClick(page, '#EASupervisorbtnSubmit');
// // } else {
// //   console.log('⏭️ Skipped: #EASupervisorbtnSubmit not visible');
// // }

// // 🔹 Wait for page after row click (VERY IMPORTANT)
// await page.waitForLoadState('networkidle');
// await page.waitForTimeout(2000);

// // Accept Investigation
// await safeVisibleClick(page, '#btnAcceptInvestigation');

// // Select Investigator
// const investigatorDropdown = page.locator('#ddlInternalInvestigator');

// try {
//   await investigatorDropdown.waitFor({ state: 'visible', timeout: 5000 });
//   await page.waitForTimeout(1000);
//   await investigatorDropdown.selectOption('126014');
//   console.log("✅ Selected: #ddlInternalInvestigator");
// } catch {
//   console.log("⏭️ Skipped: #ddlInternalInvestigator");
// }
// await page.waitForTimeout(1000);

// // Remarks handling
// const remarksField = page.locator('#Remarks');

// try {
//   await remarksField.waitFor({ state: 'visible', timeout: 5000 });

//   const remarks = await remarksField.inputValue();
//   console.log("📄 Remarks:", remarks);

//   const supervisorRemark = page.locator('#txtSupervisorRemark');

//   try {
//     await supervisorRemark.waitFor({ state: 'visible', timeout: 5000 });
//     await supervisorRemark.fill(remarks);
//     console.log("✅ Filled: #txtSupervisorRemark");
//   } catch {
//     console.log("⏭️ Skipped: #txtSupervisorRemark");
//   }

// } catch {
//   console.log("⏭️ Skipped: #Remarks");
// }

// // Add Investigator
// await safeVisibleClick(page, '#btnAddInvestigator');
// await page.waitForTimeout(1000);
// // Submit
// await safeVisibleClick(page, '#EASupervisorbtnSubmit');

//   await page.waitForTimeout(3000);
//   await safeClick(page, '.username.username-hide-on-mobile');
//   await page.waitForTimeout(1000);
//   await safeClick(page, 'text=Switch Role');
//   await page.waitForTimeout(1000);
//   await safeSelect(page, '#loadPrimRole', '8884184c-2980-44ee-8154-0b1c41e393f0');
//   await page.waitForTimeout(1000);
//   await safeClick(page, 'input[value="OK"]');
//   await page.waitForTimeout(1000);
// }

 
// // 🔹 Perform login — always navigates to login_url first
// async function doLogin(page, config) {
//   const { username, password, login_url, selectors: S } = config;
 
//   console.log("🔐 Navigating to login page...");
//   await page.goto(login_url);
//   await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
 
//   // Delete stale session so next run starts fresh
//   [SESSION_FILE, COOKIES_FILE].forEach(f => {
//     if (fs.existsSync(f)) {
//       fs.unlinkSync(f);
//       console.log(`🗑️ Deleted stale file: ${f}`);
//     }
//   });
 
//   await page.waitForSelector(S.login.username, { timeout: 15000 });
//   await page.fill(S.login.username, username);
//   await page.waitForTimeout(1000);
//   await page.fill(S.login.password, password);
//   await page.waitForTimeout(1000);
//   await page.click(S.login.loginBtn);
 
//   console.log("👉 Enter OTP manually...");
 
//   await page.waitForURL(
//     url => url.toString().includes('/Intranet/IntranetHome'),
//     { timeout: 600000 }
//   );
 
//   console.log("✅ Login successful → Dashboard loaded");
// }
 
// // 🔹 Save session
// async function saveSession(context) {
//   const cookies = await context.cookies();
//   await context.storageState({ path: SESSION_FILE });
//   fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
//   console.log("💾 Session saved");
//   console.log("🍪 Cookies saved");
// }
 
// async function isOnDashboard(page) {
//   try {
//     await page.locator('text=ClaimsLive Home').waitFor({ timeout: 10000 });
//     console.log("✅ Dashboard detected (UI)");
//     return true;
//   } catch {
//     console.log("❌ Dashboard not detected");
//     return false;
//   }
// }

// // 🔹 Main flow — dashboard → skip login | anything else → login first
// async function startAutomation(config) {
//   console.log("🚀 Starting automation...");
 
//   const browser = await chromium.launch({ headless: false });
//   const hasSession = fs.existsSync(SESSION_FILE);
 
//   const context = hasSession
//     ? await browser.newContext({ storageState: SESSION_FILE })
//     : await browser.newContext();
 
//   console.log(hasSession ? "🔁 Trying saved session..." : "🆕 Fresh session");
 
//   const page = await context.newPage();
//   await page.goto(config.login_url);
 
 
 
// const isDashboard = await isOnDashboard(page);

// if (isDashboard) {
//   console.log("✅ Already logged in");

// } else {
//   console.log("🔐 Need to login");

//   await doLogin(page, config);
//   await saveSession(context);
// }
 
//   return { browser, context, page };
// }
 
// // ─── Python Runner ────────────────────────────────────────────────────────────

// function runPythonScript() {
//   return new Promise((resolve, reject) => {
//     console.log("🐍 Converting PDF → JSON...");
//     const py = spawn('python', [
//       path.join(__dirname, 'test.py'),
//       path.join(__dirname, '97593398 Paramjit Singh Kalyan Singh Kohli.pdf'),
//       path.join(__dirname, 'inputs', 'reportvalues.json'),
//     ]);
//     py.stdout.on('data', d => console.log(`📤 PYTHON: ${d}`));
//     py.stderr.on('data', d => console.error(`❌ PYTHON ERROR: ${d}`));
//     py.on('close', code => code === 0 ? resolve() : reject(`Python exited with code ${code}`));
//   });
// }

// // 🔹 Run
// (async () => {
//   try {
//     // try { await runPythonScript(); }
//     // catch (err) { console.error("❌ Python failed:", err); process.exit(1); }

//     const config = require('./config.json');
//     const { page } = await startAutomation(config);
 
//     // ✅ Always reaches here on dashboard — run firstBucket
//     await firstBucket(page); 

//     await fillForm(page, S, reportValues);
 
//   } catch (err) {
//     console.error("❌ Error:", err.message);
//   }
// })();


// ─────────────────────────────────────────────────────────────────────────────
// index.js — Playwright Automation Entry Point
//
// Receives inputs from main.js via environment variables:
//   AUTO_CLAIM_NUMBER  → claim/intimation number to search
//   AUTO_PATIENT_NAME  → patient name (fallback + form search)
//   AUTO_FILE1         → Main Report PDF path
//   AUTO_FILE2         → Doc_1 PDF path (optional)
//   AUTO_FILE3         → Doc_2 PDF path (optional)
//
// All selectors live in config.json — nothing hardcoded here.
// All errors are caught and logged; no single failure crashes the whole run.
// ─────────────────────────────────────────────────────────────────────────────

const { chromium } = require('playwright');
const fs           = require('fs');
const path         = require('path');

const SESSION_FILE = path.join(__dirname, 'session.json');
const COOKIES_FILE = path.join(__dirname, 'cookies.json');
const S            = require('./config.json');
const reportValues = require('./inputs/reportvalues.json');

// ── Read inputs from environment variables (set by main.js) ──────────────────
const currentClaimNumber = (process.env.AUTO_CLAIM_NUMBER || '').trim();
let   patientName        = (process.env.AUTO_PATIENT_NAME || '').trim();
const file1              = (process.env.AUTO_FILE1 || '').trim(); // Main Report (required)
const file2              = (process.env.AUTO_FILE2 || '').trim(); // Doc_1
const file3              = (process.env.AUTO_FILE3 || '').trim(); // Doc_2

// Safe logger — always console.log so main.js can capture it
const log = (...args) => console.log(...args);

// Validate required inputs
if (!currentClaimNumber) {
  log('❌ FATAL: AUTO_CLAIM_NUMBER env var is not set. Exiting.');
  process.exit(1);
}
if (!patientName) {
  log('❌ FATAL: AUTO_PATIENT_NAME env var is not set. Exiting.');
  process.exit(1);
}
if (!file1) {
  log('❌ FATAL: AUTO_FILE1 (Main Report) is not set. Exiting.');
  process.exit(1);
}

log(`📋 Claim/Intimation: ${currentClaimNumber}`);
log(`👤 Patient Name:     ${patientName}`);
log(`📄 file1 (Main):     ${path.basename(file1)}`);
log(`📄 file2 (Doc_1):    ${file2 ? path.basename(file2) : '(not provided — will use file1 as fallback)'}`);
log(`📄 file3 (Doc_2):    ${file3 ? path.basename(file3) : '(not provided — will use file1 as fallback)'}`);

// ─────────────────────────────────────────────────────────────────────────────
// FILE RESOLVER
// ─────────────────────────────────────────────────────────────────────────────

function resolveFile(filePath, fallbackPath, label) {
  if (filePath && fs.existsSync(filePath)) return filePath;

  if (fallbackPath && fs.existsSync(fallbackPath)) {
    log(`⚠️  ${label} not found — falling back to file1: ${path.basename(fallbackPath)}`);
    return fallbackPath;
  }

  log(`❌ ${label} not found and file1 fallback also missing — upload will be skipped`);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFE INTERACTION HELPERS — all errors caught, never throw
// ─────────────────────────────────────────────────────────────────────────────

async function safeCheck(page, selector, retries = 3) {
  if (!selector) return;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const locator = page.locator(selector).first();
      await locator.waitFor({ state: 'attached', timeout: 1000 });
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(50);

      const fresh = page.locator(selector).first();
      const isChecked = await fresh.isChecked().catch(() => false);
      if (isChecked) { log(`Already checked: ${selector}`); return; }

      await fresh.evaluate(el => el.click());
      await page.waitForTimeout(100);

      const nowChecked = await fresh.isChecked().catch(() => false);
      if (nowChecked) { log(`Checked (attempt ${attempt}): ${selector}`); return; }

      await fresh.check({ force: true, timeout: 1000 });
      log(`Force-checked (attempt ${attempt}): ${selector}`);
      return;
    } catch (e) {
      const msg = String(e.message).split('\n')[0];
      if (msg.includes('did not change its state')) { log(`Already checked: ${selector}`); return; }
      if (attempt < retries) {
        log(`Retry ${attempt}/${retries} for "${selector}": ${msg}`);
        await page.waitForTimeout(100 * attempt);
      } else {
        log(`❌ safeCheck failed after ${retries} attempts "${selector}": ${msg}`);
      }
    }
  }
}

async function safeSelect(page, selector, value) {
  if (!selector) return;
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    await page.selectOption(selector, { value });
    log(`Selected "${value}" in: ${selector}`);
  } catch (e) {
    log(`safeSelect skipped "${selector}" value="${value}": ${String(e.message).split('\n')[0]}`);
  }
}

async function safeUpload(page, selector, filePath, file1Fallback) {
  if (!selector) return;
  const resolved = resolveFile(filePath, file1Fallback, `Upload "${selector}"`);
  if (!resolved) return;
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    await page.setInputFiles(selector, resolved);
    log(`Uploaded "${path.basename(resolved)}" to: ${selector}`);
  } catch (e) {
    log(`safeUpload failed "${selector}": ${String(e.message).split('\n')[0]}`);
  }
}

async function safeUploadMulti(page, selector, filePaths, file1Fallback) {
  if (!selector) return;

  if (!Array.isArray(filePaths)) {
    filePaths = filePaths ? [filePaths] : [];
  }
  let valid = filePaths.filter(p => p && fs.existsSync(p));

  if (!valid.length) {
    if (file1Fallback && fs.existsSync(file1Fallback)) {
      log(`⚠️  No valid files for "${selector}" — falling back to file1`);
      valid = [file1Fallback];
    } else {
      log(`❌ No valid files for "${selector}" and file1 also missing — skipping`);
      return;
    }
  }

  try {
    const locator = page.locator(selector);
    await locator.waitFor({ state: 'attached', timeout: 5000 });
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.setInputFiles(valid);
    log(`Uploaded ${valid.length} file(s) to: ${selector}`);
    valid.forEach(p => log(`   -> ${path.basename(p)}`));
  } catch (e) {
    log(`safeUploadMulti failed "${selector}": ${String(e.message).split('\n')[0]}`);
  }
}

async function safeFill(page, selector, value) {
  if (!selector) return;
  try {
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: 'visible', timeout: 8000 });
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ force: true });
    await locator.fill(value || '');
    log(`Filled "${selector}"`);
  } catch (e) {
    log(`safeFill skipped "${selector}": ${String(e.message).split('\n')[0]}`);
  }
}

async function safeClick(page, selector, retries = 3) {
  if (!selector) return;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const locator = page.locator(selector).first();
      await locator.waitFor({ state: 'attached', timeout: 3000 });
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(100);
      await locator.click({ timeout: 2000 });
      log(`✅ Clicked: ${selector}`);
      return;
    } catch (e) {
      if (attempt < retries) {
        log(`🔁 Retry ${attempt}/${retries} → ${selector}`);
        await page.waitForTimeout(200 * attempt);
      } else {
        try {
          await page.locator(selector).first().click({ force: true });
          log(`✅ Force clicked: ${selector}`);
          return;
        } catch {
          log(`❌ safeClick failed: ${selector}`);
        }
      }
    }
  }
}


// async function safeClicks(page, selector, retries = 1) {
//   if (!selector) return;
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       const locator = page.locator(selector).first();
//       await locator.waitFor({ state: 'attached', timeout: 3000 });
//       await locator.scrollIntoViewIfNeeded().catch(() => {});
//       await page.waitForTimeout(100);
//       await locator.click({ timeout: 2000 });
//       log(`✅ Clicked: ${selector}`);
//       return;
//     } catch (e) {
//       if (attempt < retries) {
//         log(`🔁 Retry ${attempt}/${retries} → ${selector}`);
//         await page.waitForTimeout(200 * attempt);
//       } else {
//         try {
//           await page.locator(selector).first().click({ force: true });
//           log(`✅ Force clicked: ${selector}`);
//           return;
//         } catch {
//           log(`❌ safeClick failed: ${selector}`);
//         }
//       }
//     }
//   }
// }
let flag = false;
async function safeClicks(page, selector) {
  if (!selector) {
    flag = true;
    log(`   Keeping user-provided name: "${patientName}"`);
    return;
  }
  try {
    const locator = page.locator(selector).first();

    // 🔹 Check immediately if element exists & is visible
    const isVisible = await locator.isVisible().catch(() => false);

    if (!isVisible) {
      log(`⏭️ Not visible: ${selector}`);
      log(`   Keeping user-provided name: "${patientName}"`);
      flag = true;
      return;
    }

    // 🔹 Perform click directly
    await locator.click();
    log(`✅ Clicked: ${selector}`);

  } catch (e) {
    log(`❌ safeClick error: ${selector}`);
    log(`   Keeping user-provided name: "${patientName}"`);
    flag = true;
  }
}

async function safeVisibleClick(page, selector) {
  if (!selector) return;
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout: 5000 });
    await el.scrollIntoViewIfNeeded();
    await el.click();
    log(`✅ Clicked: ${selector}`);
  } catch {
    log(`⏭️ Skipped (not visible/clickable): ${selector}`);
  }
}

async function getValue(page, selector) {
  try {
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: 'visible', timeout: 5000 });
    const value = await locator.inputValue();
    log(`✅ Extracted from ${selector}`);
    return value;
  } catch {
    log(`❌ Failed to get value from ${selector}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function toPascalCase(str) {
  return (str || '').toLowerCase().split(/[\s_-]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function getIntValue(value) {
  if (value == null) return '';
  return value.toString().replace(/\D/g, '') || '';
}

function formatDateUniversal(dateStr) {
  if (!dateStr || dateStr === 'NA') throw new Error('Invalid date: ' + dateStr);
  const clean = dateStr.replace(/-+/g, '/');
  let [day, month, year] = clean.split('/');
  const monthMap = {
    "01":"January","1":"January","Jan":"January",
    "02":"February","2":"February","Feb":"February",
    "03":"March","3":"March","Mar":"March",
    "04":"April","4":"April","Apr":"April",
    "05":"May","5":"May",
    "06":"June","6":"June","Jun":"June",
    "07":"July","7":"July","Jul":"July",
    "08":"August","8":"August","Aug":"August",
    "09":"September","9":"September","Sep":"September",
    "10":"October","Oct":"October",
    "11":"November","Nov":"November",
    "12":"December","Dec":"December"
  };
  const fullMonth = monthMap[month];
  if (!fullMonth) throw new Error('Invalid month: ' + month);
  return `${day.padStart(2, '0')}/${fullMonth}/${year}`;
}

function getInclusiveDays(dateStr) {
  if (!dateStr || dateStr === 'NA') {
    throw new Error('Invalid date: ' + dateStr);
  }

  const clean = dateStr.replace(/-+/g, '/');
  let [day, month, year] = clean.split('/');

  const monthMap = {
    "01":0,"1":0,"Jan":0,"January":0,
    "02":1,"2":1,"Feb":1,"February":1,
    "03":2,"3":2,"Mar":2,"March":2,
    "04":3,"4":3,"Apr":3,"April":3,
    "05":4,"5":4,"May":4,
    "06":5,"6":5,"Jun":5,"June":5,
    "07":6,"7":6,"Jul":6,"July":6,
    "08":7,"8":7,"Aug":7,"August":7,
    "09":8,"9":8,"Sep":8,"September":8,
    "10":9,"Oct":9,"October":9,
    "11":10,"Nov":10,"November":10,
    "12":11,"Dec":11,"December":11
  };

  const monthIndex = monthMap[month];
  if (monthIndex === undefined) {
    throw new Error('Invalid month: ' + month);
  }

  if (year.length === 2) {
    year = 2000 + Number(year);
  }

  const givenDate = new Date(year, monthIndex, Number(day));

  // ✅ Validate date properly
  if (
    givenDate.getDate() != Number(day) ||
    givenDate.getMonth() != monthIndex ||
    givenDate.getFullYear() != year
  ) {
    throw new Error('Invalid date value');
  }

  const today = new Date();

  givenDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = today - givenDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return Math.abs(diffDays) + 1; // ✅ always positive + inclusive
}

async function fillDateField(page, selector, rawDate) {
  if (!selector) return false;
  try {
    if (!rawDate || rawDate === 'NA') {
      log(`⚠️ Skipping "${selector}" (invalid date: ${rawDate})`);
      return false;
    }
    const formattedDate = formatDateUniversal(rawDate);
    await page.evaluate(({ selector, value }) => {
      const input = document.querySelector(selector);
      if (!input) { console.warn(`Element not found: ${selector}`); return; }
      input.removeAttribute('readonly');
      input.removeAttribute('disabled');
      input.value = value;
      input.dispatchEvent(new Event('input',  { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, { selector, value: formattedDate });
    log(`✅ Date filled "${selector}" → ${formattedDate}`);
    return true;
  } catch (err) {
    log(`❌ fillDateField failed "${selector}": ${err.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRST BUCKET — Search by claim number, assign investigator
//
// Flow:
//   1. Switch role to supervisor role
//   2. Open "Cases for Investigation" list
//   3. Filter by claim number (col2 for 8-digit, col3 for >8-digit)
//   4. Click first result
//   5. Verify claim matches → read patient name → update patientName
//   6. Accept investigation, assign internal investigator
//   7. Submit, then switch role back to investigator role
//
// If ANYTHING fails → log the error and return gracefully.
// patientName from UI is kept as-is if we can't fetch it from the form.
// ─────────────────────────────────────────────────────────────────────────────

async function firstBucket(page) {
  const FB = S.first_bucket; // All selectors from config.json

  log('\n══ FIRST BUCKET: Searching claim by number ══');

  try {
    // ── Switch to supervisor role ─────────────────────────────────────────
    await safeClick(page, FB.username_menu);
    await page.waitForTimeout(1000);
    await safeClick(page, FB.switch_role_link);
    await page.waitForTimeout(1000);
    await safeSelect(page, FB.role_dropdown, FB.supervisor_role_id);
    await page.waitForTimeout(1000);
    await safeClick(page, FB.role_ok_button);
    await page.waitForTimeout(1000);
    log('✅ Switched to supervisor role');

    // ── Open investigation list ───────────────────────────────────────────
    await safeClick(page, FB.cases_for_investigation_link);
    await safeSelect(page, FB.pagination_dropdown, FB.pagination_value);

    // ── Filter by claim number ────────────────────────────────────────────
    const values = currentClaimNumber;
    log(`🔍 Filtering by: ${values} (length: ${values.length})`);

    if (values.length === 8) {
      log('🔹 Using Column 2 filter (8-digit case)');
      await safeClick(page, FB.col2_filter_icon);
      await safeFill (page, FB.col2_filter_input, values);
      await safeClick(page, FB.col2_filter_apply);
    } else if (values.length > 8) {
      log('🔹 Using Column 3 filter (>8-digit case)');
      await safeClick(page, FB.col3_filter_icon);
      await page.waitForTimeout(1000);
      await safeFill (page, FB.col3_filter_input, values);
      await page.waitForTimeout(1000);
      await safeClick(page, FB.col3_filter_apply);
      await page.waitForTimeout(1000);
    } else {
      log('⚠️  Claim number length unexpected — trying column 3 anyway');
      await safeClick(page, FB.col3_filter_icon);
      await page.waitForTimeout(1000);
      await safeFill (page, FB.col3_filter_input, values);
      await page.waitForTimeout(1000);
      await safeClick(page, FB.col3_filter_apply);
      await page.waitForTimeout(1000);
    }

    // ── Click first row ───────────────────────────────────────────────────
    await safeClicks(page, FB.first_row_link);

    if(flag === true){
      log("=> Claim is not found in first Bucket.")
      // ── Switch back to investigator role ──────────────────────────────────
      await safeClick(page, FB.username_menu);
      await page.waitForTimeout(1000);
      await safeClick(page, FB.switch_role_link);
      await page.waitForTimeout(1000);
      await safeSelect(page, FB.role_dropdown, FB.investigator_role_id);
      await page.waitForTimeout(1000);
      await safeClick(page, FB.role_ok_button);
      await page.waitForTimeout(1000);
      log('✅ Switched back to investigator role');
      log('✅ First bucket complete');
      return;
    }

    // ── Verify and read patient name ──────────────────────────────────────
    try {
      const claimNo      = await page.locator(FB.verify_claim_no).inputValue();
      const intimationNo = await page.locator(FB.verify_intimation_no).inputValue();
      log(`📄 Claim No found: ${claimNo}`);
      log(`📄 Intimation No found: ${intimationNo}`);

      if (values === claimNo || values === intimationNo) {
        log('✅ Claim/Intimation matched');
        const nameFromForm = await page.locator(FB.verify_patient_name).inputValue();
        if (nameFromForm && nameFromForm.trim()) {
          patientName = nameFromForm.trim();
          log(`👤 Patient name updated from form: "${patientName}"`);
        } else {
          log(`⚠️ Name field empty — keeping user-provided name: "${patientName}"`);
        }
      } else {
        log(`❌ Claim mismatch — Expected: ${values}, Got ClaimNo: ${claimNo}, IntimationNo: ${intimationNo}`);
        log('⚠️ Proceeding with user-provided patient name as fallback');
      }
    } catch (e) {
      log(`⚠️ Could not verify claim/read name: ${e.message.split('\n')[0]}`);
      log(`   Keeping user-provided name: "${patientName}"`);
    }

    // ── Wait for page load after row click ───────────────────────────────
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // ── Accept investigation ──────────────────────────────────────────────
    await safeVisibleClick(page, FB.accept_investigation_button);

    // ── Select internal investigator ──────────────────────────────────────
    try {
      const invDropdown = page.locator(FB.investigator_dropdown);
      await invDropdown.waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForTimeout(1000);
      await invDropdown.selectOption(FB.investigator_id);
      log(`✅ Selected investigator: ${FB.investigator_id}`);
    } catch {
      log('⏭️ Skipped: investigator dropdown not visible');
    }
    await page.waitForTimeout(1000);

    // ── Copy remarks → supervisor remark ─────────────────────────────────
    try {
      const remarksField = page.locator(FB.remarks_field);
      await remarksField.waitFor({ state: 'visible', timeout: 5000 });
      const remarks = await remarksField.inputValue();
      log(`📄 Remarks: ${remarks}`);
      const supRemark = page.locator(FB.supervisor_remark_field);
      await supRemark.waitFor({ state: 'visible', timeout: 5000 });
      await supRemark.fill(remarks);
      log('✅ Filled supervisor remark');
    } catch {
      log('⏭️ Skipped: remarks/supervisor remark fields not visible');
    }

    // ── Add investigator & submit ─────────────────────────────────────────
    await safeVisibleClick(page, FB.add_investigator_button);
    await page.waitForTimeout(1000);
    await safeVisibleClick(page, FB.submit_button);
    await page.waitForTimeout(3000);

    // ── Switch back to investigator role ──────────────────────────────────
    await safeClick(page, FB.username_menu);
    await page.waitForTimeout(1000);
    await safeClick(page, FB.switch_role_link);
    await page.waitForTimeout(1000);
    await safeSelect(page, FB.role_dropdown, FB.investigator_role_id);
    await page.waitForTimeout(1000);
    await safeClick(page, FB.role_ok_button);
    await page.waitForTimeout(1000);
    log('✅ Switched back to investigator role');
    log('✅ First bucket complete');

  } catch (e) {
    log(`❌ firstBucket encountered an error: ${e.message.split('\n')[0]}`);
    log('⚠️  Continuing to fillForm with available patient name...');
  }
}
  function getCurrentDateFormatted() {
    const today = new Date();

    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = String(today.getFullYear()).slice(-2); // Last 2 digits

    return `${day}/${month}/${year}`;
  }

// ─────────────────────────────────────────────────────────────────────────────
// FILL FORM — Searches by patient name, fills all 4 sections
// ─────────────────────────────────────────────────────────────────────────────

async function fillForm(page) {
  log('\n══ FILL FORM: Starting form fill ══');
  log(`   Patient name used for search: "${patientName}"`);

  const SN = S.search_claim_no;
  const F  = S.form;
  const H  = S.hospital;
  const C  = S.clinical;
  const CL = S.conclusion;

  // ── Navigate to investigation list ────────────────────────────────────────
  try {
    await page.waitForSelector(SN.firstClick, { timeout: 10000 });
    await page.click(SN.firstClick);
  } catch (e) {
    log(`❌ Could not click nav item: ${e.message.split('\n')[0]}`);
    return;
  }

  // ── Open claim filter ─────────────────────────────────────────────────────
  try {
    await page.waitForSelector(SN.secondClick);
    await page.click(SN.secondClick);
  } catch (e) {
    log(`❌ Could not open claim filter: ${e.message.split('\n')[0]}`);
    return;
  }

  // ── Type patient name ─────────────────────────────────────────────────────
  try {
    const filterInput = page.locator(SN.fillCliamName);
    await filterInput.waitFor({ state: 'visible' });
    await filterInput.fill(patientName);
  } catch (e) {
    log(`❌ Could not fill name filter: ${e.message.split('\n')[0]}`);
    return;
  }

  // ── Apply filter ──────────────────────────────────────────────────────────
  try {
    await page.locator(SN.applyButton).click();
  } catch (e) {
    log(`❌ Could not apply filter: ${e.message.split('\n')[0]}`);
    return;
  }

  await page.waitForTimeout(3000);

  // ── Click first result ────────────────────────────────────────────────────
  try {
    await page.click(SN.clickOnClaim);
  } catch (e) {
    log(`❌ Could not click claim row: ${e.message.split('\n')[0]}`);
    return;
  }

  // ── Verify patient name on form ───────────────────────────────────────────
  try {
    await page.waitForSelector(SN.verifyClaimNumber);
    const formName = await page.locator(SN.verifyClaimNumber).inputValue();
    log(`Form patient name: "${formName}"`);
    if (formName.trim() !== patientName) {
      log(`⚠️  Name mismatch — Expected: "${patientName}", Found: "${formName}"`);
      log('   Continuing anyway (name may differ in capitalisation/spacing)...');
    } else {
      log('✅ Patient name matched');
    }
  } catch (e) {
    log(`⚠️  Could not verify patient name on form: ${e.message.split('\n')[0]}`);
  }

  // ── Accept investigation button ───────────────────────────────────────────
  try {
    const acceptBtn = page.locator(S.acceptInvestigationButton);
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click();
      log('✅ Accept Investigation button clicked');
    } else {
      log('ℹ️  Accept Investigation button not visible — skipped');
    }
  } catch (e) {
    log(`⚠️  Accept button check failed: ${e.message.split('\n')[0]}`);
  }

  // ── Wait for form ─────────────────────────────────────────────────────────
  try {
    await page.waitForSelector(F.patient_visit_dropdown, { timeout: 15000 });
  } catch {
    log('❌ Form not loaded in 15 seconds. Stopping fill.');
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: PATIENT DETAILS
  // ═══════════════════════════════════════════════════════════════════════════
  log('\n-- Section 1: Patient Details --');
  await safeSelect(page, F.patient_visit_dropdown,    'YES');
  await safeFill  (page, F.patient_name,              reportValues['patient name']  || '');
  await safeFill  (page, F.relationship_with_insured, 'SELF');
  await safeFill  (page, F.age,                       getIntValue(reportValues['patient age']));
  await safeFill  (page, F.remarks,                   reportValues['patient part'] || '');
  await safeSelect(page, F.gender,                    toPascalCase(reportValues['sex'] || ''));

  log('\n-- Section 1: File Uploads --');
  await safeUpload(page, F.health_id_card_media,              file2, file1);
  await safeUpload(page, F.patient_photo_media,               file2, file1);
  await safeUpload(page, F.id_card_media,                     file2, file1);

  log('\n-- Section 1: Radio Buttons --');
  await safeCheck(page, F.relationship_same_as_in_policy_flag_yes);
  await safeCheck(page, F.ot_chart_collected_flag_no);
  await safeCheck(page, F.family_doctor_visited_flag_no);
  await safeCheck(page, F.opd_records_collected_flag_no);
  await safeCheck(page, F.work_place_checked_flag_no);
  await safeCheck(page, F.rc_of_vehicle_flag_no);
  await safeCheck(page, F.guilty_party_statement_flag_no);
  await safeCheck(page, F.cos_id_card_collected_for_corporate_cases_flag_no);
  await safeCheck(page, F.doctors_statement_flag_no);
  await safeCheck(page, F.progressive_chart_collected_flag_no);
  await safeCheck(page, F.hospital_bill_verified_flag_no);
  await safeCheck(page, F.previous_opd_consultations_flag_no);
  await safeCheck(page, F.previous_mri_xray_scans_flag_no);
  await safeCheck(page, F.post_hospitalisation_bills_or_prescriptions_flag_no);
  await safeCheck(page, F.first_consultation_papers_flag_no);
  await safeCheck(page, F.neighbors_visited_flag_no);
  await safeCheck(page, F.health_card_flag_no);
  await safeCheck(page, F.pharmacy_bills_verified_flag_no);
  await safeCheck(page, F.registration_of_vehicle_involved_in_accident_flag_no);
  await safeCheck(page, F.dl_of_driver_at_time_of_accident_flag_no);
  await safeCheck(page, F.id_matching_with_insured_physically_flag_no);
  await safeCheck(page, F.attendant_statement_flag_no);
  await safeCheck(page, F.nursing_note_collected_flag_no);
  await safeCheck(page, F.doctors_note_collected_flag_no);
  await safeCheck(page, F.family_member_statement_flag_no);
  await safeCheck(page, F.previous_hospitalisation_docs_flag_no);
  await safeCheck(page, F.id_proof_flag_no);
  await safeCheck(page, F.consent_letter_for_obtaining_icp_flag_no);
  await safeCheck(page, F.family_physician_nameand_address_flag_no);
  await safeCheck(page, F.anesthesia_chart_collected_flag_no);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: HOSPITAL DETAILS
  // ═══════════════════════════════════════════════════════════════════════════
  log('\n-- Section 2: Hospital Details --');
  await safeSelect(page, H.planned_admission_dropdown,           'NO');
  await safeSelect(page, H.patient_present_in_hospital_dropdown, 'YES');
  await safeFill  (page, H.room_category,        reportValues['type of']           || 'NA');
  await safeFill  (page, H.pathologist_name,     reportValues['pathologist doctor name'] || 'NA');
  await safeFill  (page, H.reg_no_of_hospital,   reportValues['hospital registration']         || '00');
  await safeFill  (page, H.current_bill,         reportValues['final bill of hospital']  || '00');
  await safeFill  (page, H.room_no,              '123');
  await safeFill  (page, H.treating_doctor_name, reportValues['treating doctor name']    || 'NA');
  await safeFill  (page, H.radiologist_name,     reportValues['radiologist doctor name'] || 'NA');
  await safeFill  (page, H.no_of_beds,           getIntValue(reportValues['no. of beds']));

  await fillDateField(page, H.expected_dod, getCurrentDateFormatted());

  log('\n-- Section 2: File Uploads --');
  await safeUploadMulti(page, H.other_documents_media, file2, file1);

  log('\n-- Section 2: Radio Buttons --');
  await safeCheck(page, H.treating_doctor_statement_flag_yes);
  await safeCheck(page, H.progress_notes_flag_no);
  await safeCheck(page, H.medication_chart_flag_no);
  await safeCheck(page, H.anesthesia_notes_flag_no);
  await safeCheck(page, H.lab_register_flag_no);
  await safeCheck(page, H.emergency_notes_flag_no);
  await safeCheck(page, H.admission_notes_flag_no);
  await safeCheck(page, H.vital_or_nursing_chart_flag_no);
  await safeCheck(page, H.ot_notes_flag_no);
  await safeCheck(page, H.post_op_notes_flag_no);
  await safeCheck(page, H.admission_register_flag_no);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: CLINICAL DETAILS
  // ═══════════════════════════════════════════════════════════════════════════
  log('\n-- Section 3: Clinical Details --');
  await safeFill  (page, C.reason_for_admission,  reportValues['presenting complaints'] || 'NA');
  await safeFill  (page, C.provisional_diagnosis, reportValues['provisional / final diagnosis']            || 'NA');
  await safeFill  (page, C.duration_of_illness,   getInclusiveDays(reportValues['doa'])  || '');
  await safeSelect(page, C.accident_case_dropdown, 'NO');


  await fillDateField(page, C.doa, reportValues['doa']);
  await fillDateField(page, C.dod, getCurrentDateFormatted());

  await safeUpload(page, C.clinical_evidence_media, file2, file1);

  log('\n-- Section 3: Radio Buttons --');
  await safeCheck (page, C.patient_statement_flag_no);
  await safeCheck (page, C.nearby_pathology_labs_flag_no);
  await safeCheck (page, C.get_well_soon_card_flag_no);
  await safeCheck (page, C.nearby_radiology_center_flag_no);
  await safeSelect(page, C.vicinity_check_dropdown,  'NO');
  await safeSelect(page, C.workplace_visit_dropdown,  'NO');
  await safeSelect(page, S.case_management_dropdown,  '0');

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: CONCLUSION
  // ═══════════════════════════════════════════════════════════════════════════
  log('\n-- Section 4: Conclusion --');
  await safeUpload     (page, CL.patients_signature_media,    file2, file1);
  await safeUploadMulti(page, CL.evidence_media,              file1, file1);
  await safeSelect     (page, CL.payable_dropdown,            'true');
  await safeFill       (page, CL.opinion,                     reportValues['any discrepancies & negative findings'] || '');
  await safeUpload     (page, CL.investigator_signature_media, file1, file1);

  log('\n✅ Form filled successfully!');
  log(`Claim processed: ${currentClaimNumber} | Patient: ${patientName}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────

async function doLogin(page, config) {
  const { username, password, login_url, selectors: sel } = config;
  log('🔐 Navigating to login page...');
  await page.goto(login_url);
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

  [SESSION_FILE, COOKIES_FILE].forEach(f => {
    if (fs.existsSync(f)) { fs.unlinkSync(f); log(`🗑️ Deleted stale file: ${f}`); }
  });

  await page.waitForSelector(sel.login.username, { timeout: 15000 });
  await page.fill(sel.login.username, username);
  await page.waitForTimeout(1000);
  await page.fill(sel.login.password, password);
  await page.waitForTimeout(1000);
  await page.click(sel.login.loginBtn);

  log('👉 Enter OTP manually in the browser...');
  await page.waitForURL(
    url => url.toString().includes('/Intranet/IntranetHome'),
    { timeout: 600000 }
  );
  log('✅ Login successful → Dashboard loaded');
}

async function saveSession(context) {
  await context.storageState({ path: SESSION_FILE });
  const cookies = await context.cookies();
  fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
  log('💾 Session saved');
}

async function isOnDashboard(page) {
  try {
    await page.locator('text=ClaimsLive Home').waitFor({ timeout: 10000 });
    log('✅ Dashboard detected');
    return true;
  } catch {
    log('❌ Dashboard not detected');
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

(async () => {
  let browser = null;
  try {
    log('🚀 Starting automation...');
    browser = await chromium.launch({ headless: false });

    const hasSession = fs.existsSync(SESSION_FILE);
    const context = hasSession
      ? await browser.newContext({ storageState: SESSION_FILE })
      : await browser.newContext();

    log(hasSession ? '🔁 Trying saved session...' : '🆕 Fresh session');

    const page = await context.newPage();
    await page.goto(S.login_url);

    const isDashboard = await isOnDashboard(page);
    if (isDashboard) {
      log('✅ Already logged in — skipping login');
    } else {
      log('🔐 Need to login');
      await doLogin(page, S);
      await saveSession(context);
    }

    // Run firstBucket (errors caught inside, never fatal)
    await firstBucket(page);

    // Run fillForm (errors caught per-field)
    await fillForm(page);

    log('\n🏁 Automation complete.');
    // process.exit(0);

  } catch (err) {
    log(`\n❌ FATAL ERROR: ${err.message}`);
    if (err.stack) log(err.stack);
    // process.exit(1);
  } finally {
    // Don't close browser — user may want to review the form
    // browser?.close();
  }
})();