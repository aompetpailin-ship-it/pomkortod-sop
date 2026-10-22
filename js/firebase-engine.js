/**
 * 🔥 ระบบฐานข้อมูลคลาวด์ Firebase Firestore (Spark Free Plan 100%)
 * รองรับการซิงค์ข้อมูลเรียลไทม์ข้ามสาขา + แยกเก็บไฟล์รูปภาพ WebP ใน Collection แยกเพื่อไม่ให้ติดลิมิต 1MB
 * พร้อมระบบ Auto-Migrate ดึงข้อมูลจากฐานข้อมูลเดิมเข้าสู่ Firebase ในคลิกเดียว
 */

const FIREBASE_STORAGE_KEY = "PKT_FIREBASE_CONFIG_V1";

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

let firestoreRestBaseUrl = null;
let currentFirebaseConfig = null;
let firebasePollingTimer = null;

function getSavedFirebaseConfig() {
  const raw = localStorage.getItem(FIREBASE_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.projectId) return parsed;
    } catch (e) {
      console.warn("Invalid Firebase config in localStorage:", e);
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
}

function saveFirebaseConfigToLocal(configObj) {
  localStorage.setItem(FIREBASE_STORAGE_KEY, JSON.stringify(configObj));
  currentFirebaseConfig = configObj;
  initFirebaseEngine();
}

function isFirebaseConfigured() {
  const cfg = getSavedFirebaseConfig();
  return !!(cfg && cfg.projectId && cfg.projectId.trim().length > 2);
}

function initFirebaseEngine() {
  currentFirebaseConfig = getSavedFirebaseConfig();
  if (isFirebaseConfigured()) {
    const pid = currentFirebaseConfig.projectId.trim();
    firestoreRestBaseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(pid)}/databases/(default)/documents`;
    updateCloudStatusBadgeUI("firebase", pid);
    startFirebaseRealtimePolling();
    return true;
  } else {
    firestoreRestBaseUrl = null;
    updateCloudStatusBadgeUI("hybrid");
    return false;
  }
}

function updateCloudStatusBadgeUI(mode, projectId = "") {
  const badge = document.getElementById("cloudStatusBadge");
  if (!badge) return;

  if (mode === "firebase") {
    badge.style.background = "#fff7ed";
    badge.style.borderColor = "#fdba74";
    badge.style.color = "#c2410c";
    badge.innerHTML = `
      <span style="width: 8px; height: 8px; background-color: #f97316; border-radius: 50%; display: inline-block; box-shadow: 0 0 6px #f97316;"></span>
      <span>🔥 Firebase Cloud: ${escapeHtmlText(projectId)}</span>
    `;
  } else {
    badge.style.background = "#ecfdf5";
    badge.style.borderColor = "#a7f3d0";
    badge.style.color = "#047857";
    badge.innerHTML = `
      <span style="width: 8px; height: 8px; background-color: #10b981; border-radius: 50%; display: inline-block; box-shadow: 0 0 6px #10b981;"></span>
      <span>☁️ Cloud DB พร้อมใช้งาน (ตั้งค่า Firebase ได้)</span>
    `;
  }
}

function escapeHtmlText(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// =========================================================================
// 🔄 Firestore REST API Helper (ไม่ต้องพึ่งพา NPM Build / ทำงานผ่านเบราว์เซอร์ได้ 100%)
// =========================================================================

async function firestoreSaveDocument(collectionName, docId, dataObj) {
  if (!isFirebaseConfigured() || !firestoreRestBaseUrl) return false;
  try {
    const apiKeyParam = currentFirebaseConfig.apiKey ? `?key=${encodeURIComponent(currentFirebaseConfig.apiKey)}` : "";
    const url = `${firestoreRestBaseUrl}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}${apiKeyParam}`;
    const body = {
      fields: {
        id: { stringValue: String(docId) },
        updatedAt: { stringValue: new Date().toISOString() },
        payloadJson: { stringValue: JSON.stringify(dataObj) }
      }
    };

    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    return res.ok;
  } catch (err) {
    console.warn(`Firestore Save Error (${collectionName}/${docId}):`, err);
    return false;
  }
}

async function firestoreGetDocument(collectionName, docId) {
  if (!isFirebaseConfigured() || !firestoreRestBaseUrl) return null;
  try {
    const apiKeyParam = currentFirebaseConfig.apiKey ? `?key=${encodeURIComponent(currentFirebaseConfig.apiKey)}` : "";
    const url = `${firestoreRestBaseUrl}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}${apiKeyParam}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.fields && json.fields.payloadJson && json.fields.payloadJson.stringValue) {
      return JSON.parse(json.fields.payloadJson.stringValue);
    }
  } catch (err) {
    console.warn(`Firestore Get Error (${collectionName}/${docId}):`, err);
  }
  return null;
}

async function firestoreListDocuments(collectionName) {
  if (!isFirebaseConfigured() || !firestoreRestBaseUrl) return null;
  try {
    const apiKeyParam = currentFirebaseConfig.apiKey ? `?key=${encodeURIComponent(currentFirebaseConfig.apiKey)}&pageSize=200` : "?pageSize=200";
    const url = `${firestoreRestBaseUrl}/${encodeURIComponent(collectionName)}${apiKeyParam}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.documents || !Array.isArray(json.documents)) return [];
    const results = [];
    for (const doc of json.documents) {
      if (doc.fields && doc.fields.payloadJson && doc.fields.payloadJson.stringValue) {
        try {
          results.push(JSON.parse(doc.fields.payloadJson.stringValue));
        } catch (e) {
          console.warn("Error parsing Firestore doc payload:", e);
        }
      }
    }
    return results;
  } catch (err) {
    console.warn(`Firestore List Error (${collectionName}):`, err);
    return null;
  }
}

async function firestoreDeleteDocument(collectionName, docId) {
  if (!isFirebaseConfigured() || !firestoreRestBaseUrl) return false;
  try {
    const apiKeyParam = currentFirebaseConfig.apiKey ? `?key=${encodeURIComponent(currentFirebaseConfig.apiKey)}` : "";
    const url = `${firestoreRestBaseUrl}/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}${apiKeyParam}`;
    const res = await fetch(url, { method: "DELETE" });
    return res.ok;
  } catch (err) {
    console.warn(`Firestore Delete Error (${collectionName}/${docId}):`, err);
    return false;
  }
}

// =========================================================================
// 🖼️ ระบบแยกเก็บรูปภาพ WebP ใน Collection 'pkt_media' (ป้องกัน Document เกิน 1MB)
// =========================================================================

async function saveMediaAssetToCloud(mediaId, dataUrl) {
  try {
    localStorage.setItem(`PKT_MEDIA_${mediaId}`, dataUrl);
  } catch (e) {
    // หาก LocalStorage เต็ม ให้เก็บในคลาวด์อย่างเดียว
  }
  if (isFirebaseConfigured()) {
    await firestoreSaveDocument("pkt_media", mediaId, { id: mediaId, dataUrl, createdAt: new Date().toISOString() });
  }
  return mediaId;
}

async function resolveMediaAssetUrl(imageUrlOrRef) {
  if (!imageUrlOrRef) return "";
  if (!imageUrlOrRef.startsWith("media://")) return imageUrlOrRef;
  const mediaId = imageUrlOrRef.replace("media://", "");
  const local = localStorage.getItem(`PKT_MEDIA_${mediaId}`);
  if (local) return local;
  if (isFirebaseConfigured()) {
    const cloudMedia = await firestoreGetDocument("pkt_media", mediaId);
    if (cloudMedia && cloudMedia.dataUrl) {
      try { localStorage.setItem(`PKT_MEDIA_${mediaId}`, cloudMedia.dataUrl); } catch (e) {}
      return cloudMedia.dataUrl;
    }
  }
  return "";
}

// =========================================================================
// 🔄 ซิงค์ข้อมูลทั้งหมดของระบบ (SOPs, Daily Logs, Claims, Onboarding, Ingredients)
// =========================================================================

async function syncAllAppDataToFirebase() {
  if (!isFirebaseConfigured()) return false;
  try {
    const allSops = typeof getSOPData === "function" ? getSOPData() : [];
    const subCats = typeof getSubCategoriesData === "function" ? getSubCategoriesData() : [];
    const branches = typeof getBranchesData === "function" ? getBranchesData() : [];
    const masterIngs = typeof getMasterIngredients === "function" ? getMasterIngredients() : [];
    const dailyLogs = typeof getDailyOperationsLogs === "function" ? getDailyOperationsLogs() : {};
    const claimLogs = typeof getDeliveryClaimsData === "function" ? getDeliveryClaimsData() : [];
    const wasteLogs = typeof getWasteLogsData === "function" ? getWasteLogsData() : [];
    const trainingData = typeof getOnboardingProgressData === "function" ? getOnboardingProgressData() : {};
    const accounts = typeof getUserAccounts === "function" ? getUserAccounts() : [];

    // บันทึกแต่ละ SOP แยกเป็น Document ย่อยใน Collection 'pkt_sops' เพื่อความเร็วและไม่ติดขนาด 1MB
    for (const sop of allSops) {
      if (sop && sop.id) {
        await firestoreSaveDocument("pkt_sops", sop.id, sop);
      }
    }

    // บันทึกข้อมูลตั้งค่าและ Log ประจำวันใน Collection 'pkt_app_state'
    await firestoreSaveDocument("pkt_app_state", "sub_categories", subCats);
    await firestoreSaveDocument("pkt_app_state", "branches", branches);
    await firestoreSaveDocument("pkt_app_state", "master_ingredients", masterIngs);
    await firestoreSaveDocument("pkt_app_state", "daily_logs", dailyLogs);
    await firestoreSaveDocument("pkt_app_state", "delivery_claims", claimLogs);
    await firestoreSaveDocument("pkt_app_state", "waste_logs", wasteLogs);
    await firestoreSaveDocument("pkt_app_state", "onboarding_progress", trainingData);
    await firestoreSaveDocument("pkt_app_state", "user_accounts", accounts);

    return true;
  } catch (err) {
    console.error("Error syncing all app data to Firebase:", err);
    return false;
  }
}

async function pullAllAppDataFromFirebase() {
  if (!isFirebaseConfigured()) return false;
  try {
    const sops = await firestoreListDocuments("pkt_sops");
    if (sops && sops.length > 0) {
      const cleaned = typeof filterInvalidSOPs === "function" ? filterInvalidSOPs(sops) : sops;
      localStorage.setItem("PKT_SOP_DATA_V30", JSON.stringify(cleaned));
    }

    const subCats = await firestoreGetDocument("pkt_app_state", "sub_categories");
    if (subCats && Array.isArray(subCats)) {
      localStorage.setItem("PKT_SUB_CATEGORIES_V30", JSON.stringify(subCats));
    }

    const branches = await firestoreGetDocument("pkt_app_state", "branches");
    if (branches && Array.isArray(branches)) {
      localStorage.setItem("PKT_BRANCHES_V30", JSON.stringify(branches));
    }

    const masterIngs = await firestoreGetDocument("pkt_app_state", "master_ingredients");
    if (masterIngs && Array.isArray(masterIngs)) {
      localStorage.setItem("PKT_MASTER_INGREDIENTS_V30", JSON.stringify(masterIngs));
    }

    const dailyLogs = await firestoreGetDocument("pkt_app_state", "daily_logs");
    if (dailyLogs && typeof dailyLogs === "object") {
      localStorage.setItem("PKT_DAILY_OPS_LOGS_V30", JSON.stringify(dailyLogs));
    }

    const claimLogs = await firestoreGetDocument("pkt_app_state", "delivery_claims");
    if (claimLogs && Array.isArray(claimLogs)) {
      localStorage.setItem("PKT_DELIVERY_CLAIMS_V30", JSON.stringify(claimLogs));
    }

    const wasteLogs = await firestoreGetDocument("pkt_app_state", "waste_logs");
    if (wasteLogs && Array.isArray(wasteLogs)) {
      localStorage.setItem("PKT_WASTE_LOGS_V30", JSON.stringify(wasteLogs));
    }

    const trainingData = await firestoreGetDocument("pkt_app_state", "onboarding_progress");
    if (trainingData && typeof trainingData === "object") {
      localStorage.setItem("PKT_ONBOARDING_DATA_V30", JSON.stringify(trainingData));
    }

    const accounts = await firestoreGetDocument("pkt_app_state", "user_accounts");
    if (accounts && Array.isArray(accounts)) {
      localStorage.setItem("PKT_USER_ACCOUNTS", JSON.stringify(accounts));
    }

    return !!(sops && sops.length > 0);
  } catch (err) {
    console.warn("Error pulling data from Firebase:", err);
    return false;
  }
}

function startFirebaseRealtimePolling() {
  if (firebasePollingTimer) clearInterval(firebasePollingTimer);
  if (!isFirebaseConfigured()) return;
  firebasePollingTimer = setInterval(async () => {
    await pullAllAppDataFromFirebase();
  }, 45000);
}

// =========================================================================
// 🛠️ หน้าต่างตั้งค่าเชื่อมต่อ Firebase Cloud + ปุ่ม Auto-Migrate ข้อมูลเดิม
// =========================================================================

function openFirebaseSetupModal() {
  const cfg = getSavedFirebaseConfig();
  const isConnected = isFirebaseConfigured();

  const modalHtml = `
    <div class="modal-overlay" id="firebaseSetupModalOverlay">
      <div class="modal-card" style="max-width: 720px;">
        <div class="modal-header">
          <div>
            <h3 style="font-size: 1.3rem; color: #ea580c; display: flex; align-items: center; gap: 0.5rem;">
              🔥 ตั้งค่าฐานข้อมูล Firebase Cloud (Spark Plan ฟรี 100%)
            </h3>
            <span style="font-size: 0.82rem; color: var(--text-muted);">
              เชื่อมต่อ Google Cloud Firestore เพื่อซิงค์สูตร SOP, บันทึกอุณหภูมิน้ำมัน 4 สาขา และประวัติการเคลมเดลิเวอรี
            </span>
          </div>
          <button type="button" onclick="closeModal('firebaseSetupModalOverlay')" style="background:none; border:none; color:var(--text-main); font-size:1.6rem; cursor:pointer;">&times;</button>
        </div>

        <div style="background: #fff7ed; border: 1px solid #fed7aa; padding: 1rem 1.25rem; border-radius: 12px; margin-bottom: 1.25rem; font-size: 0.85rem; color: #9a3412;">
          <div style="font-weight: 800; font-size: 0.95rem; margin-bottom: 0.4rem;">📌 วิธีสร้างโปรเจกต์ Firebase ฟรี (ใช้เวลา 1 นาที ไม่ต้องใช้บัตรเครดิต):</div>
          <ol style="padding-left: 1.2rem; line-height: 1.65;">
            <li>เปิดไปที่ <a href="https://console.firebase.google.com/" target="_blank" style="color: #ea580c; font-weight: 800; text-decoration: underline;">console.firebase.google.com</a> แล้วกด <b>"Create a project" (สร้างโปรเจกต์)</b></li>
            <li>ไปที่เมนูซ้ายมือ <b>Build ➔ Firestore Database</b> กด <b>"Create database"</b> เลือกโหมด <b>Start in test mode (หรือเปิด Rules ให้ read/write)</b></li>
            <li>ไปที่ <b>⚙️ Project Settings</b> กดไอคอน <b>&lt;/&gt; (Web App)</b> แล้วก๊อปปี้โค้ด <code>firebaseConfig</code> มาวางในช่องด้านล่างได้เลยค่ะ!</li>
          </ol>
        </div>

        <form onsubmit="handleSaveFirebaseSetup(event)">
          <div class="form-group">
            <label class="form-label">📋 วางโค้ด <code>firebaseConfig</code> ทั้งก้อน (ระบบจะดึงค่าให้อัตโนมัติ) หรือกรอกเฉพาะ Project ID:</label>
            <textarea id="fbRawSnippetInput" class="form-textarea" rows="4" placeholder='วางโค้ด เช่น const firebaseConfig = { apiKey: "AIza...", projectId: "pkt-sop-franchise", ... };' oninput="parseFirebaseSnippetAuto(this.value)" style="font-family: monospace; font-size: 0.82rem;"></textarea>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Firebase Project ID * (สำคัญที่สุด)</label>
              <input type="text" id="fbProjectIdInput" class="form-input" value="${escapeHtmlText(cfg.projectId || '')}" placeholder="เช่น pkt-sop-franchise" required />
            </div>
            <div class="form-group">
              <label class="form-label">Web API Key (ถ้ามี)</label>
              <input type="text" id="fbApiKeyInput" class="form-input" value="${escapeHtmlText(cfg.apiKey || '')}" placeholder="เช่น AIzaSyB..." />
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-main);">🔄 ย้ายข้อมูลจากฐานข้อมูลเดิมเข้าสู่ Firebase (1-Click Migration)</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">ดึงข้อมูลสูตรเดิมจาก Supabase + รวมกับ SOP มาตรฐานแฟรนไชส์ 7 หมวดหมู่ แล้วอัปโหลดขึ้น Firebase ทันที</div>
            </div>
            <button type="button" class="action-btn btn-secondary" onclick="handleOneClickMigrateToFirebase()" style="width: auto; padding: 0.55rem 1rem; border-color: #ea580c; color: #ea580c; font-weight: 800;">
              🚀 ดึงข้อมูลเดิม & อัปขึ้น Firebase
            </button>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            <div>
              ${isConnected ? `
                <span style="font-size: 0.82rem; color: #059669; font-weight: 700;">✅ เชื่อมต่อกับโปรเจกต์ <code>${escapeHtmlText(cfg.projectId)}</code> อยู่</span>
              ` : `
                <span style="font-size: 0.82rem; color: #64748b;">ℹ️ ปัจจุบันทำงานด้วยระบบ Hybrid Cloud + Local Cache</span>
              `}
            </div>
            <div style="display: flex; gap: 0.6rem;">
              <button type="button" class="action-btn btn-secondary" onclick="closeModal('firebaseSetupModalOverlay')" style="width: auto;">ปิดหน้าต่าง</button>
              <button type="submit" class="action-btn btn-primary" style="width: auto; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);">
                💾 บันทึกและเชื่อมต่อ Firebase
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;

  const existing = document.getElementById("firebaseSetupModalOverlay");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function parseFirebaseSnippetAuto(rawText) {
  if (!rawText) return;
  const pidMatch = rawText.match(/projectId\s*:\s*["']([^"']+)["']/i);
  const keyMatch = rawText.match(/apiKey\s*:\s*["']([^"']+)["']/i);

  if (pidMatch && pidMatch[1]) {
    const pidEl = document.getElementById("fbProjectIdInput");
    if (pidEl) pidEl.value = pidMatch[1].trim();
  }
  if (keyMatch && keyMatch[1]) {
    const keyEl = document.getElementById("fbApiKeyInput");
    if (keyEl) keyEl.value = keyMatch[1].trim();
  }
}

async function handleSaveFirebaseSetup(event) {
  if (event) event.preventDefault();
  const projectId = (document.getElementById("fbProjectIdInput")?.value || "").trim();
  const apiKey = (document.getElementById("fbApiKeyInput")?.value || "").trim();

  if (!projectId) {
    if (typeof showToast === "function") showToast("⚠️ กรุณาระบุ Firebase Project ID", "error");
    return;
  }

  saveFirebaseConfigToLocal({
    projectId,
    apiKey,
    authDomain: `${projectId}.firebaseapp.com`,
    storageBucket: `${projectId}.appspot.com`
  });

  if (typeof showToast === "function") showToast("⏳ กำลังเชื่อมต่อและซิงค์ข้อมูลขึ้น Firebase Firestore...", "info", 2000);

  const ok = await syncAllAppDataToFirebase();
  const modal = document.getElementById("firebaseSetupModalOverlay");
  if (modal) modal.remove();

  if (ok) {
    if (typeof showToast === "function") showToast(`🔥 เชื่อมต่อ Firebase (${projectId}) และซิงค์ข้อมูลสำเร็จ!`);
  } else {
    if (typeof showToast === "function") showToast(`✅ บันทึกค่า Firebase (${projectId}) แล้ว (กรุณาตรวจสอบว่าเปิด Firestore Test Mode แล้ว)`, "info", 4000);
  }
}

async function handleOneClickMigrateToFirebase() {
  const projectId = (document.getElementById("fbProjectIdInput")?.value || "").trim();
  const apiKey = (document.getElementById("fbApiKeyInput")?.value || "").trim();

  if (projectId) {
    saveFirebaseConfigToLocal({
      projectId,
      apiKey,
      authDomain: `${projectId}.firebaseapp.com`,
      storageBucket: `${projectId}.appspot.com`
    });
  }

  if (typeof showToast === "function") showToast("⏳ กำลังดึงข้อมูลเดิมจาก Supabase มารวมกับระบบใหม่...", "info", 2500);

  // 1. ดึงข้อมูลเดิมจาก Supabase (ถ้ามี)
  let legacySops = [];
  if (typeof fetchLegacySupabaseSOPs === "function") {
    legacySops = await fetchLegacySupabaseSOPs();
  }

  // 2. รวมกับ SOP มาตรฐานแฟรนไชส์ 7 หมวดหมู่โดยไม่ให้ข้อมูลเดิมหาย
  const currentSops = typeof getSOPData === "function" ? getSOPData() : [];
  const mergedMap = new Map();
  currentSops.forEach(s => { if (s && s.id) mergedMap.set(s.id, s); });
  if (Array.isArray(legacySops)) {
    legacySops.forEach(oldSop => {
      if (oldSop && oldSop.id && !mergedMap.has(oldSop.id)) {
        mergedMap.set(oldSop.id, oldSop);
      }
    });
  }

  const finalSopList = Array.from(mergedMap.values());
  if (typeof saveSOPData === "function") {
    saveSOPData(finalSopList);
  }

  // 3. อัปโหลดขึ้น Firebase Firestore
  if (isFirebaseConfigured()) {
    const synced = await syncAllAppDataToFirebase();
    if (synced) {
      if (typeof showToast === "function") showToast(`🎉 ย้ายข้อมูลและซิงค์ขึ้น Firebase สำเร็จครบ ${finalSopList.length} หมวดคู่มือ!`);
    } else {
      if (typeof showToast === "function") showToast(`💾 รวมข้อมูลสำเร็จ (${finalSopList.length} รายการ) กรุณาเปิด Firestore Rules เพื่อซิงค์ขึ้นคลาวด์`, "info", 3500);
    }
  } else {
    if (typeof showToast === "function") showToast(`✅ รวมข้อมูลเข้าสู่ระบบใหม่สำเร็จ (${finalSopList.length} รายการ)!`);
  }

  if (typeof renderSidebarNavigation === "function") renderSidebarNavigation();
  if (typeof renderSOPList === "function") renderSOPList();
}
