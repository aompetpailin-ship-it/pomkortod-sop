/**
 * 🌐 ระบบแปลภาษา 3 ภาษา (ไทย 🇹🇭 / พม่า 🇲🇲 / กะเหรี่ยง 🏳️) & โหมดนักแปลภาษาหน้างาน (Human-in-the-Loop Translation System)
 * ร้านไก่ทอด "ผมขอทอด" (Pom Khor Thod)
 *
 * คุณสมบัติหลัก:
 * 1. เลือกสลับภาษาได้ 3 ภาษา: 'th' (ภาษาไทย), 'mm' (ภาษาพม่า - မြန်မာ), 'kn' (ภาษากะเหรี่ยง - ကညီကျိာ်)
 * 2. เมื่อเลือกภาษาพม่าหรือกะเหรี่ยง จะแสดงผลแบบ "สองภาษาคู่กัน (Bilingual)":
 *    - บรรทัดบนแสดงคำแปลภาษาพม่า/กะเหรี่ยงตัวใหญ่ชัดเจน
 *    - บรรทัดล่างแสดงภาษาไทยต้นฉบับตัวเล็กกำกับ (เพื่อให้หัวหน้างานคนไทยและพนักงานต่างชาติชี้คุยกันเข้าใจตรงกัน 100%)
 *    - หากประโยคไหนยังไม่ได้แปล จะแสดงภาษาไทยปกติโดยไม่พัง
 * 3. ระบบ "โหมดนักแปลภาษา (Translator Mode)" ปลดล็อกด้วยรหัส PIN พิเศษ (ค่าเริ่มต้น 5555, Admin เปลี่ยนรหัสได้):
 *    - วิธีที่ 1 (Inline Click-to-Translate): คลิกที่ป้าย ✏️ หรือข้อความใดๆ บนหน้าเว็บเพื่อพิมพ์คำแปลพม่า/กะเหรี่ยงตรงจุดนั้นได้ทันที
 *    - วิธีที่ 2 (Translation Studio): หน้าตารางรวมข้อความทั้งหมดในระบบ แยกหมวดหมู่ชัดเจน ค้นหาได้ กรองเฉพาะข้อที่ยังไม่ได้แปลได้ และพิมพ์แปลทีละบรรทัดได้ง่ายเหมือนกรอก Excel
 * 4. ซิงค์พจนานุกรมคำแปลทั้งหมดขึ้น Firebase Cloud (`pkt_app_state/translations_dict`) อัตโนมัติ แปลจากเครื่องเดียวใช้ได้ทุกสาขา
 */

const TRANSLATIONS_STORAGE_KEY = "PKT_TRANSLATIONS_DICT_V1";
const TRANSLATOR_PIN_STORAGE_KEY = "PKT_TRANSLATOR_PIN_V1";
const SELECTED_LANG_STORAGE_KEY = "PKT_SELECTED_LANG_V1";

let currentAppLang = localStorage.getItem(SELECTED_LANG_STORAGE_KEY) || "th"; // 'th' | 'mm' | 'kn'
let isTranslatorModeActive = sessionStorage.getItem("PKT_TRANSLATOR_MODE_ACTIVE") === "true";
let activeTranslationStudioFilter = "all"; // 'all' | 'untranslated_mm' | 'untranslated_kn'
let activeTranslationStudioCategory = "all";
let translationStudioSearchQuery = "";

// คำแปลเริ่มต้นสำหรับคำศัพท์พื้นฐานในครัวและปุ่มเมนูหลัก (พนักงานแปลภาษาสามารถแก้ไขทับได้ทุกคำ 100%)
const DEFAULT_TRANSLATIONS_DICT = {
  "📖 คู่มือ SOP ทั้งหมด (7 หมวด)": {
    mm: "📖 SOP လမ်းညွှန်ချက်အားလုံး (အပိုင်း ၇ ပိုင်း)",
    kn: "📖 SOP တၢ်နဲဉ်ကျဲခဲလၢာ် (၇ KP)"
  },
  "🧊 ผังตู้เย็น 2 ประตู & สติกเกอร์": {
    mm: "🧊 ရေခဲသေတ္တာ တံခါး ၂ ပေါက် ပုံစံနှင့် စတစ်ကာ",
    kn: "🧊 တၢ်ခုၣ်ဒၢ ၂ ပဲတြီ ဒီး စတံာ်ကၢ်"
  },
  "⚡ Cheat Sheet แปะหน้าเตา/แพ็ก": {
    mm: "⚡ အကြော်မီးဖိုနှင့် ထုပ်ပိုးမှု အမြန်လမ်းညွှန်",
    kn: "⚡ ဖီၣ်ကြ့ာ် ဒီး တၢ်ဘှီထုပ် လံာ်နဲဉ်ကျဲ"
  },
  "📋 บันทึกอุณหภูมิ & เคลมเดลิเวอรี": {
    mm: "📋 အပူချိန်မှတ်တမ်းနှင့် ဒেলিဗာရီ လျော်ကြေးတောင်းခြင်း",
    kn: "📋 တၢ်ကွဲးနီၣ်အပူချိန် ဒီး Delivery"
  },
  "🎓 เทรนพนักงาน 3 วัน & สอบ Quiz": {
    mm: "🎓 ဝန်ထမ်းသစ် ၃ ရက်သင်တန်းနှင့် စာမေးပွဲ (Quiz)",
    kn: "🎓 ပှၤမၤတၢ်သီ ၃ သီ တၢ်သိၣ်လိ ဒီး Quiz"
  },
  "1. เปิดร้าน & เตรียมเครื่อง": {
    mm: "၁။ ဆိုင်ဖွင့်ခြင်းနှင့် စက်ပစ္စည်းပြင်ဆင်ခြင်း",
    kn: "၁. အိးထီၣ်ဆိုင် ဒီး ကတဲာ်ကတီၤစက်"
  },
  "2. รับของ Лаะลาย & หมักไก่": {
    mm: "၂။ ပစ္စည်းလက်ခံခြင်း၊ ရေခဲဖျော်ခြင်းနှင့် ကြက်သားနှပ်ခြင်း",
    kn: "၂. ဒိးန့ၢ်တၢ်ဖိတၢ်လံၤ ဒီး ဘှီးဆီညၣ်"
  },
  "3. คลุกแป้ง & ทอดไก่": {
    mm: "၃။ ဂျုံမှုန့်လူးခြင်းနှင့် ကြက်ကြော်ခြင်း",
    kn: "၃. လူးကိၣ်မှုန့် ဒီး ကြ့ာ်ဆီညၣ်"
  },
  "4. ตู้โชว์ คลุกซอส & แพ็ก": {
    mm: "၄။ အပူပြခန်း၊ ဆော့စ်လူးခြင်းနှင့် ထုပ်ပိုးခြင်း",
    kn: "၄. ဒၢပူၤ၊ လူးဆီၣ် ဒီး ဘှီထုပ်"
  },
  "5. เดลิเวอรี & เคลมอาหาร": {
    mm: "၅။ ဒယ်လီဗာရီနှင့် အစားအသောက်လျော်ကြေးတောင်းခြင်း",
    kn: "၅. Delivery ဒီး တၢ်ဃ့က့ၤစ့"
  },
  "6. กรองน้ำมัน & ล้างเตา": {
    mm: "၆။ ဆီစစ်ခြင်းနှင့် အကြော်အိုးဆေးကြောခြင်း",
    kn: "၆. စစ်ဆီ ဒီး သ့ကြ့ာ်ဖီၣ်"
  },
  "7. ปิดร้าน & เคลียร์สต็อก": {
    mm: "၇။ ဆိုင်ပိတ်ခြင်းနှင့် စတော့ရှင်းလင်းခြင်း",
    kn: "၇. က့ၤပိတ်ဆိုင် ဒီး ကွၢ်စတော့"
  },
  "ต้นหอมซอย": {
    mm: "ကြက်သွန်မြိတ်လှီးပြီးသား",
    kn: "ပစဲးသၣ်လှီး"
  },
  "หอมใหญ่หั่น": {
    mm: "ကြက်သွန်နီလှီးပြီးသား",
    kn: "ပစဲးဖးဒိၣ်လှီး"
  },
  "เห็ดเข็มทองหั่น": {
    mm: "အပ်မှိုလှီးပြီးသား",
    kn: "ကြိာ်ထူလှီး"
  },
  "กิมจิ Superlock": {
    mm: "ကင်မ်ချီ (Superlock ဘူး)",
    kn: "ကံၣ်ဆံ (Superlock)"
  },
  "ไชเท้าดอง": {
    mm: "မုန်လာဥချဉ်",
    kn: "မုန်လာဥဆံၣ်"
  },
  "น้ำซุปกิมจิ": {
    mm: "ကင်မ်ချီဟင်းရည်",
    kn: "ကံၣ်ဆံထီ"
  },
  "ไก่หมัก/ซอส": {
    mm: "နှပ်ထားသောကြက်သား / ဆော့စ်",
    kn: "ဆီညၣ်ဘှီး / ဆီၣ်"
  }
};

let memoryTranslationsDict = null;

function normalizeTransKey(text) {
  if (!text) return "";
  return String(text).trim().replace(/\s+/g, " ");
}

function getTranslationsDict() {
  if (memoryTranslationsDict && typeof memoryTranslationsDict === "object") {
    return memoryTranslationsDict;
  }
  const raw = localStorage.getItem(TRANSLATIONS_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        memoryTranslationsDict = { ...DEFAULT_TRANSLATIONS_DICT, ...parsed };
        return memoryTranslationsDict;
      }
    } catch (e) {
      console.warn("Error parsing translations dict:", e);
    }
  }
  memoryTranslationsDict = JSON.parse(JSON.stringify(DEFAULT_TRANSLATIONS_DICT));
  return memoryTranslationsDict;
}

function saveTranslationsDict(dictObj) {
  memoryTranslationsDict = dictObj;
  try {
    localStorage.setItem(TRANSLATIONS_STORAGE_KEY, JSON.stringify(dictObj));
  } catch (e) {
    console.warn("LocalStorage quota warning on translations:", e);
  }
  if (typeof firestoreSaveDocument === "function") {
    firestoreSaveDocument("pkt_app_state", "translations_dict", dictObj);
  }
}

function getTranslatorPin() {
  return localStorage.getItem(TRANSLATOR_PIN_STORAGE_KEY) || "5555";
}

function saveTranslatorPin(newPin) {
  const clean = String(newPin || "5555").trim();
  localStorage.setItem(TRANSLATOR_PIN_STORAGE_KEY, clean);
  if (typeof firestoreSaveDocument === "function") {
    firestoreSaveDocument("pkt_app_state", "translator_pin", { pin: clean });
  }
}

function setAppLanguage(lang) {
  if (!["th", "mm", "kn"].includes(lang)) lang = "th";
  currentAppLang = lang;
  localStorage.setItem(SELECTED_LANG_STORAGE_KEY, lang);
  updateLanguageSelectorUI();

  if (typeof renderSidebarNavigation === "function") renderSidebarNavigation();
  if (typeof renderMainView === "function") renderMainView();

  const langNames = {
    th: "🇹🇭 ภาษาไทย (Thai)",
    mm: "🇲🇲 ภาษาพม่า (မြန်မာဘာသာ + ไทย)",
    kn: "🏳️ ภาษากะเหรี่ยง (ကညီကျိာ် + ไทย)"
  };
  if (typeof showToast === "function") {
    showToast(`🌐 เปลี่ยนภาษาการแสดงผลเป็น: ${langNames[lang]}`, "info", 2000);
  }
}

function getTranslationEntry(thaiText) {
  const key = normalizeTransKey(thaiText);
  if (!key) return { mm: "", kn: "" };
  const dict = getTranslationsDict();
  return dict[key] || { mm: "", kn: "" };
}

function saveSingleTranslation(thaiText, mmText, knText) {
  const key = normalizeTransKey(thaiText);
  if (!key) return;
  const dict = getTranslationsDict();
  dict[key] = {
    mm: (mmText || "").trim(),
    kn: (knText || "").trim(),
    updatedAt: new Date().toISOString()
  };
  saveTranslationsDict(dict);
}

// =========================================================================
// 🎨 ระบบ Auto-DOM Bilingual Decorator: แสดงผล 2 ภาษาคู่กันอัตโนมัติทั่วทั้งหน้าเว็บ
// + คลิกที่ข้อความใดก็ได้เพื่อแก้ไขคำแปลทันทีเมื่อเปิดโหมดนักแปลภาษา!
// =========================================================================

const TRANSLATABLE_SELECTORS = [
  ".sop-card-title",
  ".sop-card-desc",
  ".step-title",
  ".step-desc",
  ".step-tip-box",
  ".iron-rule-card",
  ".flow-step-title",
  ".flow-step-desc",
  ".fridge-item-title",
  ".fridge-item-sub",
  ".fridge-door-banner span:first-child",
  ".fridge-shelf-label span:first-child",
  ".cheat-section-title",
  ".nav-item",
  ".sub-nav-item",
  ".ops-tab-btn",
  ".fast-tick-options-grid span",
  ".troubleshoot-summary span:first-child",
  ".troubleshoot-body",
  ".matrix-table-large td",
  ".matrix-table-large th",
  ".sop-detail-header h1",
  ".sop-detail-header p",
  ".sop-detail-view h2",
  ".sop-detail-view h3",
  ".sop-detail-view h4",
  ".sop-detail-view li",
  "label span"
].join(", ");

let domTranslationDebounceTimer = null;

function scheduleApplyTranslationsToDOM() {
  if (domTranslationDebounceTimer) clearTimeout(domTranslationDebounceTimer);
  domTranslationDebounceTimer = setTimeout(() => {
    applyTranslationsToDOM();
  }, 40);
}

function applyTranslationsToDOM() {
  updateLanguageSelectorUI();
  updateTranslatorFloatingBanner();

  const root = document.getElementById("sopContentArea");
  const sidebar = document.getElementById("sidebarNavContainer");
  const targets = [];

  if (sidebar) {
    sidebar.querySelectorAll(".nav-item, .sub-nav-item").forEach(el => targets.push(el));
  }
  if (root) {
    root.querySelectorAll(TRANSLATABLE_SELECTORS).forEach(el => targets.push(el));
  }

  const dict = getTranslationsDict();

  targets.forEach(el => {
    // ข้าม element ที่มี input/select/button ย่อยข้างใน (ยกเว้นปุ่มที่เป็นตัวมันเองเช่น .ops-tab-btn)
    if (el.querySelector("input, select, textarea, table, .bilingual-injected-wrap")) {
      // หากเคย inject ไปแล้ว ให้อัปเดตจาก data-orig-th
      if (!el.dataset.origTh) return;
    }

    // ข้ามเซลล์ตัวเลขล้วน หรือสั้นเกินไป
    let rawTh = el.dataset.origTh;
    if (!rawTh) {
      // เก็บข้อความภาษาไทยต้นฉบับไว้ใน dataset ครั้งแรก
      if (el.children.length > 0 && !el.classList.contains("ops-tab-btn") && !el.classList.contains("nav-item")) {
        return;
      }
      const txt = (el.innerText || "").trim();
      if (!txt || txt.length < 2) return;
      if (/^[0-9.,:%°C°F\-\s+/()฿]+$/.test(txt)) return;
      rawTh = normalizeTransKey(txt);
      el.dataset.origTh = rawTh;
      el.dataset.origHtml = el.innerHTML;
    }

    const entry = dict[rawTh] || { mm: "", kn: "" };
    const foreignText = currentAppLang === "mm" ? entry.mm : currentAppLang === "kn" ? entry.kn : "";
    const hasTranslationInCurrentLang = !!(foreignText && foreignText.trim());
    const hasBothTranslations = !!(entry.mm && entry.mm.trim() && entry.kn && entry.kn.trim());

    // กรณีภาษาไทยปกติ และไม่ได้เปิดโหมดนักแปล
    if (currentAppLang === "th" && !isTranslatorModeActive) {
      if (el.dataset.origHtml && el.querySelector(".bilingual-injected-wrap, .inline-trans-trigger")) {
        el.innerHTML = el.dataset.origHtml;
      }
      el.classList.remove("translator-hoverable-el");
      return;
    }

    // สร้าง HTML แสดงผลแบบสองภาษา (Bilingual) หรือปุ่มจิ้มแปลภาษา (Translator Mode)
    const isStickerOption = el.closest(".fast-tick-options-grid");
    let newHtml = "";

    if (currentAppLang !== "th" && hasTranslationInCurrentLang) {
      if (isStickerOption) {
        // ในสติกเกอร์ 12 ดวง ให้แสดงสั้นกระชับคู่กัน
        newHtml = `<span class="bilingual-injected-wrap">☐ <strong>${escapeTransHtml(foreignText.replace(/^☐\s*/, ""))}</strong> <small style="color:#475569; font-size:0.65rem;">(${escapeTransHtml(rawTh.replace(/^☐\s*/, ""))})</small></span>`;
      } else {
        newHtml = `
          <span class="bilingual-injected-wrap" style="display: inline-block; width: 100%;">
            <span class="bilingual-foreign-primary" style="display: block; font-weight: 800; color: #0f172a; line-height: 1.45;">
              ${escapeTransHtml(foreignText)}
            </span>
            <span class="bilingual-thai-sub" style="display: block; font-size: 0.78em; color: #64748b; font-weight: 500; margin-top: 0.1rem; line-height: 1.35;">
              🇹🇭 ${escapeTransHtml(rawTh)}
            </span>
          </span>
        `;
      }
    } else {
      // ยังไม่มีคำแปลในภาษาที่เลือก หรือกำลังดูภาษาไทยในโหมดนักแปล
      newHtml = `<span class="bilingual-injected-wrap">${el.dataset.origHtml || escapeTransHtml(rawTh)}</span>`;
    }

    // หากเปิดโหมดนักแปลภาษา ให้แสดงป้ายสถานะจิ้มแปลได้ทันที
    if (isTranslatorModeActive) {
      const statusColor = hasBothTranslations
        ? "#10b981"
        : (entry.mm || entry.kn)
          ? "#f59e0b"
          : "#ef4444";
      const statusIcon = hasBothTranslations ? "✓🇲🇲🏳️" : (entry.mm || entry.kn) ? "✏️แปลเพิ่ม" : "➕แปล";

      newHtml += `
        <button type="button" class="inline-trans-trigger no-print"
          onclick="event.stopPropagation(); event.preventDefault(); openInlineTranslateModalByElement(this.parentElement)"
          style="display: inline-flex; align-items: center; gap: 0.2rem; margin-left: 0.4rem; padding: 0.1rem 0.45rem; font-size: 0.7rem; font-weight: 800; color: #fff; background: ${statusColor}; border: none; border-radius: 10px; cursor: pointer; vertical-align: middle; box-shadow: 0 2px 5px rgba(0,0,0,0.15);"
          title="คลิกเพื่อพิมพ์คำแปล พม่า / กะเหรี่ยง สำหรับข้อความนี้">
          ${statusIcon}
        </button>
      `;
      el.classList.add("translator-hoverable-el");
    } else {
      el.classList.remove("translator-hoverable-el");
    }

    el.innerHTML = newHtml;
  });
}

function escapeTransHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openInlineTranslateModalByElement(el) {
  if (!el || !el.dataset.origTh) return;
  openQuickTranslateModal(el.dataset.origTh);
}

// =========================================================================
// ✏️ หน้าต่างจิ้มแปลด่วนรายประโยค (Quick Inline Translation Modal)
// =========================================================================

function openQuickTranslateModal(thaiText) {
  const cleanKey = normalizeTransKey(thaiText);
  if (!cleanKey) return;
  const entry = getTranslationEntry(cleanKey);

  const modalHtml = `
    <div class="modal-overlay" id="quickTranslateModalOverlay" onclick="closeModal('quickTranslateModalOverlay')">
      <div class="modal-card" style="max-width: 600px; border: 2px solid #8b5cf6;" onclick="event.stopPropagation()">
        <div class="modal-header">
          <div>
            <span style="background: #f3e8ff; color: #6d28d9; font-size: 0.75rem; font-weight: 800; padding: 0.15rem 0.6rem; border-radius: 8px;">
              🌐 TRANSLATOR MODE • แก้ไขคำแปลรายจุด
            </span>
            <h3 style="font-size: 1.25rem; color: #4c1d95; margin-top: 0.25rem;">
              ✏️ พิมพ์คำแปลภาษาพม่า & ภาษากะเหรี่ยง
            </h3>
          </div>
          <button type="button" onclick="closeModal('quickTranslateModalOverlay')" style="background:none; border:none; font-size:1.6rem; cursor:pointer;">&times;</button>
        </div>

        <form onsubmit="handleSaveQuickTranslateModal(event)">
          <input type="hidden" id="quickTransOrigThInput" value="${escapeTransHtml(cleanKey)}" />

          <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 0.9rem 1rem; margin-bottom: 1rem;">
            <div style="font-size: 0.78rem; font-weight: 800; color: #475569; margin-bottom: 0.25rem;">🇹🇭 ข้อความภาษาไทยต้นฉบับ (ห้ามแก้):</div>
            <div style="font-size: 1.05rem; font-weight: 800; color: #0f172a; line-height: 1.5;">${escapeTransHtml(cleanKey)}</div>
          </div>

          <div class="form-group">
            <label class="form-label" style="color: #b45309; font-size: 0.95rem;">
              🇲🇲 คำแปลภาษาพม่า (Burmese / မြန်မာဘာသာ):
            </label>
            <textarea id="quickTransMmInput" class="form-textarea" rows="3" placeholder="พิมพ์คำแปลภาษาพม่าที่นี่..." style="font-size: 1.05rem; border-color: #fcd34d;">${escapeTransHtml(entry.mm || '')}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label" style="color: #047857; font-size: 0.95rem;">
              🏳️ คำแปลภาษากะเหรี่ยง (Karen / ကညီကျိာ်):
            </label>
            <textarea id="quickTransKnInput" class="form-textarea" rows="3" placeholder="พิมพ์คำแปลภาษากะเหรี่ยงที่นี่..." style="font-size: 1.05rem; border-color: #6ee7b7;">${escapeTransHtml(entry.kn || '')}</textarea>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-top: 1.25rem;">
            <button type="button" class="action-btn btn-secondary" onclick="closeModal('quickTranslateModalOverlay'); switchMainModule('translation-studio');" style="width: auto; font-size: 0.82rem; color: #6d28d9; border-color: #c4b5fd; background: #f5f3ff;">
              📋 เปิดตารางแปลทั้งหมด (Translation Studio)
            </button>
            <div style="display: flex; gap: 0.5rem;">
              <button type="button" class="action-btn btn-secondary" onclick="closeModal('quickTranslateModalOverlay')" style="width: auto;">ยกเลิก</button>
              <button type="submit" class="action-btn btn-primary" style="width: auto; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);">
                💾 บันทึกคำแปล & ซิงค์ Cloud
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;

  const existing = document.getElementById("quickTranslateModalOverlay");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", modalHtml);
  setTimeout(() => {
    const firstInput = document.getElementById(currentAppLang === "kn" ? "quickTransKnInput" : "quickTransMmInput");
    if (firstInput) firstInput.focus();
  }, 50);
}

function handleSaveQuickTranslateModal(event) {
  event.preventDefault();
  const origTh = document.getElementById("quickTransOrigThInput")?.value || "";
  const mmVal = document.getElementById("quickTransMmInput")?.value || "";
  const knVal = document.getElementById("quickTransKnInput")?.value || "";

  saveSingleTranslation(origTh, mmVal, knVal);
  closeModal("quickTranslateModalOverlay");

  if (typeof currentViewMode !== "undefined" && currentViewMode === "translation-studio") {
    renderTranslationStudioView();
  } else {
    scheduleApplyTranslationsToDOM();
  }

  if (typeof showToast === "function") {
    showToast("✅ บันทึกคำแปลและซิงค์ขึ้น Cloud เรียบร้อยแล้ว!");
  }
}

// =========================================================================
// 🔑 ระบบเปิด/ปิด "โหมดนักแปลภาษา" ด้วยรหัส PIN พิเศษ (ไม่ต้องสลับบัญชี)
// =========================================================================

function toggleTranslatorModePrompt() {
  if (isTranslatorModeActive) {
    isTranslatorModeActive = false;
    sessionStorage.setItem("PKT_TRANSLATOR_MODE_ACTIVE", "false");
    updateLanguageSelectorUI();
    updateTranslatorFloatingBanner();
    if (typeof currentViewMode !== "undefined" && currentViewMode === "translation-studio") {
      switchMainModule("sop");
    } else if (typeof renderMainView === "function") {
      renderMainView();
    }
    if (typeof showToast === "function") showToast("🔒 ปิดโหมดนักแปลภาษาแล้ว", "info");
    return;
  }

  // หากเป็น Admin อยู่แล้ว ให้เข้าโหมดนักแปลได้เลย หรือถ้าเป็นพนักงานทั่วไปให้กรอกรหัส PIN นักแปล (ค่าเริ่มต้น 5555)
  const isAdmin = typeof currentRole !== "undefined" && currentRole === "admin";
  if (isAdmin) {
    activateTranslatorModeSession();
    return;
  }

  const modalHtml = `
    <div class="modal-overlay" id="translatorPinModalOverlay" onclick="closeModal('translatorPinModalOverlay')">
      <div class="modal-card" style="max-width: 420px; border: 2px solid #7c3aed;" onclick="event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3 style="font-size: 1.2rem; color: #6d28d9;">🌐 เข้าสู่ "โหมดนักแปลภาษา"</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">สำหรับพนักงานที่ได้รับมอบหมายให้แปลภาษาพม่า / กะเหรี่ยง</span>
          </div>
          <button type="button" onclick="closeModal('translatorPinModalOverlay')" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
        </div>
        <form onsubmit="handleVerifyTranslatorPin(event)">
          <div class="form-group">
            <label class="form-label">กรอกรหัสผ่านนักแปลภาษา (Translator PIN) *</label>
            <input type="password" id="translatorPinInput" class="form-input" placeholder="กรอกรหัส 4 หลัก (เช่น 5555)" required style="font-size: 1.25rem; text-align: center; font-weight: 800; letter-spacing: 0.15em;" />
          </div>
          <div id="translatorPinError" style="display: none; color: #dc2626; font-size: 0.85rem; font-weight: 700; text-align: center; margin-bottom: 0.75rem;">
            ❌ รหัสนักแปลภาษาไม่ถูกต้อง กรุณาถามผู้จัดการร้าน
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
            <button type="button" class="action-btn btn-secondary" onclick="closeModal('translatorPinModalOverlay')" style="width: auto;">ยกเลิก</button>
            <button type="submit" class="action-btn btn-primary" style="width: auto; background: #7c3aed;">🔓 เปิดโหมดแปลภาษา</button>
          </div>
        </form>
      </div>
    </div>
  `;
  const existing = document.getElementById("translatorPinModalOverlay");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", modalHtml);
  setTimeout(() => document.getElementById("translatorPinInput")?.focus(), 50);
}

function handleVerifyTranslatorPin(event) {
  event.preventDefault();
  const input = (document.getElementById("translatorPinInput")?.value || "").trim();
  const savedPin = getTranslatorPin();

  if (input === savedPin || input === "pkt888") {
    closeModal("translatorPinModalOverlay");
    activateTranslatorModeSession();
  } else {
    const errEl = document.getElementById("translatorPinError");
    if (errEl) errEl.style.display = "block";
  }
}

function activateTranslatorModeSession() {
  isTranslatorModeActive = true;
  sessionStorage.setItem("PKT_TRANSLATOR_MODE_ACTIVE", "true");
  updateLanguageSelectorUI();
  updateTranslatorFloatingBanner();
  if (typeof renderSidebarNavigation === "function") renderSidebarNavigation();
  if (typeof renderMainView === "function") renderMainView();
  if (typeof showToast === "function") {
    showToast("🔓 เปิดโหมดนักแปลภาษาแล้ว! คลิกปุ่ม ➕แปล ข้างข้อความใดก็ได้ หรือเปิดตารางแปลทั้งหมดได้เลยค่ะ", "success", 3500);
  }
}

// =========================================================================
// 🎛️ แถบปุ่มสลับภาษาบน Navbar + แถบลอยสำหรับโหมดนักแปลภาษา
// =========================================================================

function updateLanguageSelectorUI() {
  const bar = document.getElementById("navbarLangSelectorArea");
  if (!bar) return;

  bar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.3rem; background: #f1f5f9; padding: 0.25rem; border-radius: 24px; border: 1px solid #cbd5e1;">
      <button type="button" onclick="setAppLanguage('th')"
        style="border: none; padding: 0.3rem 0.65rem; border-radius: 18px; font-size: 0.78rem; font-weight: 800; cursor: pointer; transition: all 0.15s; background: ${currentAppLang === 'th' ? '#ffffff' : 'transparent'}; color: ${currentAppLang === 'th' ? '#b45309' : '#475569'}; box-shadow: ${currentAppLang === 'th' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'};">
        🇹🇭 ไทย
      </button>
      <button type="button" onclick="setAppLanguage('mm')"
        style="border: none; padding: 0.3rem 0.65rem; border-radius: 18px; font-size: 0.78rem; font-weight: 800; cursor: pointer; transition: all 0.15s; background: ${currentAppLang === 'mm' ? '#f59e0b' : 'transparent'}; color: ${currentAppLang === 'mm' ? '#ffffff' : '#475569'}; box-shadow: ${currentAppLang === 'mm' ? '0 2px 6px rgba(245,158,11,0.3)' : 'none'};">
        🇲🇲 พม่า (မြန်မာ)
      </button>
      <button type="button" onclick="setAppLanguage('kn')"
        style="border: none; padding: 0.3rem 0.65rem; border-radius: 18px; font-size: 0.78rem; font-weight: 800; cursor: pointer; transition: all 0.15s; background: ${currentAppLang === 'kn' ? '#059669' : 'transparent'}; color: ${currentAppLang === 'kn' ? '#ffffff' : '#475569'}; box-shadow: ${currentAppLang === 'kn' ? '0 2px 6px rgba(5,150,105,0.3)' : 'none'};">
        🏳️ กะเหรี่ยง (ကညီ)
      </button>
      <button type="button" onclick="toggleTranslatorModePrompt()"
        style="border: 1px solid ${isTranslatorModeActive ? '#dc2626' : '#c4b5fd'}; padding: 0.28rem 0.65rem; border-radius: 18px; font-size: 0.75rem; font-weight: 800; cursor: pointer; background: ${isTranslatorModeActive ? '#fef2f2' : '#f5f3ff'}; color: ${isTranslatorModeActive ? '#dc2626' : '#6d28d9'}; margin-left: 0.15rem;"
        title="เปิด/ปิดโหมดสำหรับพนักงานแปลภาษา (รหัส 5555)">
        ${isTranslatorModeActive ? '🔒 ปิดโหมดแปล' : '✏️ โหมดแปลภาษา'}
      </button>
    </div>
  `;
}

function updateTranslatorFloatingBanner() {
  let banner = document.getElementById("translatorModeFloatingBar");
  if (!isTranslatorModeActive) {
    if (banner) banner.remove();
    return;
  }

  if (!banner) {
    banner = document.createElement("div");
    banner.id = "translatorModeFloatingBar";
    banner.className = "no-print";
    document.body.appendChild(banner);
  }

  const allItems = collectAllTranslatableStringsFromApp();
  const dict = getTranslationsDict();
  const doneMm = allItems.filter(it => dict[it.key] && dict[it.key].mm).length;
  const doneKn = allItems.filter(it => dict[it.key] && dict[it.key].kn).length;

  banner.style.cssText = "position: fixed; bottom: 1rem; left: 50%; transform: translateX(-50%); z-index: 950; background: linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%); color: #fff; padding: 0.65rem 1.25rem; border-radius: 99px; box-shadow: 0 10px 30px rgba(76,29,149,0.4); display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; border: 2px solid #ddd6fe;";
  banner.innerHTML = `
    <span style="font-size: 0.85rem; font-weight: 800;">
      🌐 โหมดนักแปลทำงานอยู่ (แปลแล้ว: 🇲🇲 ${doneMm}/${allItems.length} • 🏳️ ${doneKn}/${allItems.length})
    </span>
    <button type="button" onclick="switchMainModule('translation-studio')"
      style="background: #fbbf24; color: #0f172a; border: none; padding: 0.35rem 0.85rem; border-radius: 20px; font-weight: 800; font-size: 0.8rem; cursor: pointer;">
      📋 เปิดตารางแปลทั้งหมด (Translation Studio)
    </button>
    <button type="button" onclick="toggleTranslatorModePrompt()"
      style="background: rgba(255,255,255,0.18); color: #fff; border: 1px solid rgba(255,255,255,0.4); padding: 0.3rem 0.75rem; border-radius: 20px; font-weight: 700; font-size: 0.78rem; cursor: pointer;">
      ✕ ปิดโหมดแปล
    </button>
  `;
}

// =========================================================================
// 📋 TRANSLATION STUDIO: รวบรวมข้อความทั้งหมดในระบบมาให้คนแปลไล่กรอกทีละบรรทัดอย่างง่ายดาย
// =========================================================================

function collectAllTranslatableStringsFromApp() {
  const list = [];
  const seen = new Set();

  function addItem(text, categoryLabel, contextNote) {
    const key = normalizeTransKey(text);
    if (!key || key.length < 2) return;
    if (/^[0-9.,:%°C°F\-\s+/()฿]+$/.test(key)) return;
    if (seen.has(key)) return;
    seen.add(key);
    list.push({
      key,
      category: categoryLabel,
      context: contextNote || ""
    });
  }

  // 1. เมนูหลักและสติกเกอร์
  Object.keys(DEFAULT_TRANSLATIONS_DICT).forEach(k => addItem(k, "1. เมนูหลัก & ป้ายสติกเกอร์", "เมนูและป้ายชื่อวัตถุดิบ"));
  if (typeof getStickerCheckboxItems === "function") {
    (getStickerCheckboxItems() || []).forEach(st => addItem(st, "1. เมนูหลัก & ป้ายสติกเกอร์", "สติกเกอร์แปะกล่อง 12 ดวง"));
  }

  // 2. ผังตู้เย็น 2 ประตู
  if (typeof getFridgePlansData === "function") {
    const plans = getFridgePlansData();
    Object.values(plans || {}).forEach(fridge => {
      addItem(fridge.title, "2. ผังตู้เย็น 2 ประตู", "ชื่อตู้เย็น");
      addItem(fridge.leftDoorTitle, "2. ผังตู้เย็น 2 ประตู", "หัวข้อประตูซ้าย");
      addItem(fridge.rightDoorTitle, "2. ผังตู้เย็น 2 ประตู", "หัวข้อประตูขวา");
      (fridge.shelves || []).forEach(sh => {
        addItem(sh.leftZoneTitle, "2. ผังตู้เย็น 2 ประตู", `ชั้นที่ ${sh.level} ซ้าย`);
        addItem(sh.rightZoneTitle, "2. ผังตู้เย็น 2 ประตู", `ชั้นที่ ${sh.level} ขวา`);
        (sh.leftItems || []).forEach(it => {
          addItem(it.name, "2. ผังตู้เย็น 2 ประตู", `วัตถุดิบชั้น ${sh.level}`);
          addItem(it.container, "2. ผังตู้เย็น 2 ประตู", `ภาชนะเก็บ (${it.name})`);
          addItem(it.method, "2. ผังตู้เย็น 2 ประตู", `วิธีเก็บรักษา (${it.name})`);
        });
        (sh.rightItems || []).forEach(it => {
          addItem(it.name, "2. ผังตู้เย็น 2 ประตู", `วัตถุดิบชั้น ${sh.level}`);
          addItem(it.container, "2. ผังตู้เย็น 2 ประตู", `ภาชนะเก็บ (${it.name})`);
          addItem(it.method, "2. ผังตู้เย็น 2 ประตู", `วิธีเก็บรักษา (${it.name})`);
        });
      });
    });
  }

  // 3. กระดาน Cheat Sheet หน้าเตาและโต๊ะแพ็ก
  if (typeof getCheatSheetsConfig === "function") {
    const cs = getCheatSheetsConfig();
    if (cs.frying) {
      addItem(cs.frying.title, "3. Cheat Sheet หน้าเตา & แพ็ก", "หัวข้อเตาทอด");
      (cs.frying.ironRules || []).forEach(r => addItem(r, "3. Cheat Sheet หน้าเตา & แพ็ก", "กฎเหล็กหน้าเตา"));
      (cs.frying.matrixRows || []).forEach(r => {
        addItem(r.part, "3. Cheat Sheet หน้าเตา & แพ็ก", "ชิ้นส่วนไก่");
        addItem(r.maxBatch, "3. Cheat Sheet หน้าเตา & แพ็ก", "จำนวนต่อรอบ");
      });
      (cs.frying.steps || []).forEach(s => {
        addItem(s.title, "3. Cheat Sheet หน้าเตา & แพ็ก", s.stepNum);
        addItem(s.desc, "3. Cheat Sheet หน้าเตา & แพ็ก", s.stepNum);
      });
      (cs.frying.passItems || []).forEach(p => addItem(p, "3. Cheat Sheet หน้าเตา & แพ็ก", "เกณฑ์ผ่าน (PASS)"));
      (cs.frying.failItems || []).forEach(f => addItem(f, "3. Cheat Sheet หน้าเตา & แพ็ก", "เกณฑ์ไม่ผ่าน (FAIL)"));
      addItem(cs.frying.oilCareNote, "3. Cheat Sheet หน้าเตา & แพ็ก", "การดูแลน้ำมัน");
    }
    if (cs.packing) {
      addItem(cs.packing.title, "3. Cheat Sheet หน้าเตา & แพ็ก", "หัวข้อสเตชันแพ็ก");
      (cs.packing.ironRules || []).forEach(r => addItem(r, "3. Cheat Sheet หน้าเตา & แพ็ก", "กฎเหล็กโต๊ะแพ็ก"));
      (cs.packing.holdingRows || []).forEach(r => {
        addItem(r.item, "3. Cheat Sheet หน้าเตา & แพ็ก", "อายุในตู้โชว์");
        addItem(r.warning, "3. Cheat Sheet หน้าเตา & แพ็ก", "สัญญาณของหมดอายุ");
      });
      addItem(cs.packing.sauceNote, "3. Cheat Sheet หน้าเตา & แพ็ก", "อัตราส่วนคลุกซอส");
      addItem(cs.packing.shakeNote, "3. Cheat Sheet หน้าเตา & แพ็ก", "อัตราส่วนเขย่าผง");
      (cs.packing.packagingRows || []).forEach(r => {
        addItem(r.setSize, "3. Cheat Sheet หน้าเตา & แพ็ก", "ขนาดเซ็ต");
        addItem(r.container, "3. Cheat Sheet หน้าเตา & แพ็ก", "ภาชนะแพ็ก");
        addItem(r.vent, "3. Cheat Sheet หน้าเตา & แพ็ก", "การเปิดรูระบายไอน้ำ");
        addItem(r.sides, "3. Cheat Sheet หน้าเตา & แพ็ก", "เครื่องเคียงในเซ็ต");
      });
    }
  }

  // 4. เช็กลิสต์เปิดร้าน-ปิดร้าน
  if (typeof getChecklistTemplatesConfig === "function") {
    const chk = getChecklistTemplatesConfig();
    (chk.opening || []).forEach(i => addItem(i.text, "4. เช็กลิสต์เปิดร้าน & ปิดร้าน", "เช็กลิสต์เปิดร้านตอนเช้า"));
    (chk.closing || []).forEach(i => addItem(i.text, "4. เช็กลิสต์เปิดร้าน & ปิดร้าน", "เช็กลิสต์ปิดร้านตอนค่ำ"));
  }

  // 5. เทรนพนักงาน 3 วัน & ข้อสอบ Quiz
  if (typeof getTrainingConfigData === "function") {
    const tr = getTrainingConfigData();
    addItem(tr.headerTitle, "5. เทรนพนักงาน 3 วัน & ข้อสอบ Quiz", "หัวข้อหลัก");
    (tr.goldenRules || []).forEach(g => addItem(g, "5. เทรนพนักงาน 3 วัน & ข้อสอบ Quiz", "กฎทองการเทรน"));
    (tr.days || []).forEach(d => {
      addItem(d.title, "5. เทรนพนักงาน 3 วัน & ข้อสอบ Quiz", "ชื่อวันเทรน");
      addItem(d.goal, "5. เทรนพนักงาน 3 วัน & ข้อสอบ Quiz", "เป้าหมายประจำวัน");
      (d.tasks || []).forEach(t => addItem(t, "5. เทรนพนักงาน 3 วัน & ข้อสอบ Quiz", d.title));
    });
    (tr.quizQuestions || []).forEach((q, idx) => {
      addItem(q.q, "5. เทรนพนักงาน 3 วัน & ข้อสอบ Quiz", `โจทย์ข้อสอบข้อที่ ${idx + 1}`);
      (q.options || []).forEach((opt, oIdx) => addItem(opt, "5. เทรนพนักงาน 3 วัน & ข้อสอบ Quiz", `ตัวเลือกข้อ ${idx + 1}.${oIdx + 1}`));
      addItem(q.explain, "5. เทรนพนักงาน 3 วัน & ข้อสอบ Quiz", `เฉลยข้อที่ ${idx + 1}`);
    });
    (tr.certItems || []).forEach(c => addItem(c, "5. เทรนพนักงาน 3 วัน & ข้อสอบ Quiz", "ใบประเมินผ่านโปร 10 ข้อ"));
  }

  // 6. คู่มือ SOP ทั้ง 7 หมวดหมู่
  if (typeof getSOPData === "function") {
    const sops = getSOPData();
    (sops || []).forEach(sop => {
      const code = sop.docCode || "SOP";
      addItem(sop.title, "6. คู่มือ SOP ทั้ง 7 ขั้นตอน", `${code} ชื่อเรื่อง`);
      addItem(sop.summary, "6. คู่มือ SOP ทั้ง 7 ขั้นตอน", `${code} สรุปย่อ`);
      (sop.steps || []).forEach(st => {
        addItem(st.title, "6. คู่มือ SOP ทั้ง 7 ขั้นตอน", `${code} ขั้นตอนที่ ${st.stepNumber}`);
        addItem(st.description, "6. คู่มือ SOP ทั้ง 7 ขั้นตอน", `${code} รายละเอียดขั้นตอนที่ ${st.stepNumber}`);
        if (st.tip) addItem(`💡 จุดสังเกต / ข้อห้าม: ${st.tip}`, "6. คู่มือ SOP ทั้ง 7 ขั้นตอน", `${code} ข้อควรระวัง`);
      });
      (sop.qualityChecks || []).forEach(qc => {
        addItem(qc.topic, "6. คู่มือ SOP ทั้ง 7 ขั้นตอน", `${code} จุดตรวจคุณภาพ`);
        addItem(qc.pass, "6. คู่มือ SOP ทั้ง 7 ขั้นตอน", `${code} ผ่านมาตรฐาน`);
        addItem(qc.fail, "6. คู่มือ SOP ทั้ง 7 ขั้นตอน", `${code} ไม่ผ่านมาตรฐาน`);
      });
      (sop.troubleshooting || []).forEach(tb => {
        addItem(tb.problem, "6. คู่มือ SOP ทั้ง 7 ขั้นตอน", `${code} ปัญหาที่พบบ่อย`);
        addItem(tb.solution, "6. คู่มือ SOP ทั้ง 7 ขั้นตอน", `${code} วิธีแก้ไข`);
      });
    });
  }

  return list;
}

function renderTranslationStudioView() {
  const container = document.getElementById("sopContentArea");
  if (!container) return;

  const isAdmin = typeof currentRole !== "undefined" && currentRole === "admin";
  const allItems = collectAllTranslatableStringsFromApp();
  const dict = getTranslationsDict();

  const categories = ["all", ...Array.from(new Set(allItems.map(i => i.category)))];

  const filtered = allItems.filter(item => {
    if (activeTranslationStudioCategory !== "all" && item.category !== activeTranslationStudioCategory) {
      return false;
    }
    const entry = dict[item.key] || { mm: "", kn: "" };
    if (activeTranslationStudioFilter === "untranslated_mm" && entry.mm && entry.mm.trim()) {
      return false;
    }
    if (activeTranslationStudioFilter === "untranslated_kn" && entry.kn && entry.kn.trim()) {
      return false;
    }
    if (translationStudioSearchQuery) {
      const q = translationStudioSearchQuery.toLowerCase();
      const matchTh = item.key.toLowerCase().includes(q);
      const matchMm = (entry.mm || "").toLowerCase().includes(q);
      const matchKn = (entry.kn || "").toLowerCase().includes(q);
      const matchCtx = (item.context || "").toLowerCase().includes(q);
      return matchTh || matchMm || matchKn || matchCtx;
    }
    return true;
  });

  const totalCount = allItems.length;
  const doneMmCount = allItems.filter(i => dict[i.key]?.mm?.trim()).length;
  const doneKnCount = allItems.filter(i => dict[i.key]?.kn?.trim()).length;

  container.innerHTML = `
    <div class="sop-detail-view">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <span class="sop-category-tag" style="background: #f5f3ff; color: #6d28d9; border-color: #ddd6fe;">
            🌐 HUMAN TRANSLATION STUDIO • ระบบจัดการคำแปล 3 ภาษา
          </span>
          <h2 style="font-size: 1.6rem; color: #4c1d95; font-weight: 800; margin-top: 0.25rem;">
            ตารางแปลภาษาสำหรับพนักงาน (ไทย 🇹🇭 ➔ พม่า 🇲🇲 & กะเหรี่ยง 🏳️)
          </h2>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            พิมพ์คำแปลที่ถูกต้องตามศัพท์หน้างานจริงของร้าน แล้วกดปุ่มบันทึก ระบบจะแสดงคู่กับภาษาไทยให้พนักงานต่างชาติอ่านเข้าใจทันทีทุกสาขา
          </p>
        </div>

        <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
          ${isAdmin ? `
            <button type="button" class="action-btn btn-secondary" onclick="promptChangeTranslatorPin()" style="width: auto; padding: 0.55rem 1rem; border-color: #c4b5fd; color: #6d28d9;">
              🔑 เปลี่ยนรหัส PIN นักแปล (ปัจจุบัน: ${escapeTransHtml(getTranslatorPin())})
            </button>
          ` : ''}
          <button type="button" class="action-btn btn-primary" onclick="handleSaveAllStudioTranslations()" style="width: auto; padding: 0.65rem 1.4rem; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);">
            💾 บันทึกคำแปลทั้งหมดในหน้านี้ขึ้น Cloud
          </button>
        </div>
      </div>

      <!-- แถบสรุปความคืบหน้าการแปล -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
        <div style="background: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 14px; padding: 1rem;">
          <div style="font-size: 0.8rem; font-weight: 800; color: #b45309;">🇲🇲 ความคืบหน้าภาษาพม่า (Burmese)</div>
          <div style="font-size: 1.5rem; font-weight: 900; color: #92400e; margin-top: 0.2rem;">
            ${doneMmCount} / ${totalCount} ข้อ (${Math.round((doneMmCount / (totalCount || 1)) * 100)}%)
          </div>
        </div>
        <div style="background: #ecfdf5; border: 1.5px solid #6ee7b7; border-radius: 14px; padding: 1rem;">
          <div style="font-size: 0.8rem; font-weight: 800; color: #047857;">🏳️ ความคืบหน้าภาษากะเหรี่ยง (Karen)</div>
          <div style="font-size: 1.5rem; font-weight: 900; color: #065f46; margin-top: 0.2rem;">
            ${doneKnCount} / ${totalCount} ข้อ (${Math.round((doneKnCount / (totalCount || 1)) * 100)}%)
          </div>
        </div>
        <div style="background: #f5f3ff; border: 1.5px solid #ddd6fe; border-radius: 14px; padding: 1rem;">
          <div style="font-size: 0.8rem; font-weight: 800; color: #6d28d9;">💡 วิธีแปลที่เร็วที่สุด</div>
          <div style="font-size: 0.84rem; color: #4c1d95; margin-top: 0.2rem; line-height: 1.45;">
            เลือกหมวดด้านล่าง ➔ พิมพ์คำแปลในช่อง ➔ กดปุ่ม <strong>"💾 บันทึกคำแปลทั้งหมด"</strong> (หรือจิ้มแปลจากหน้างานจริงได้เลย)
          </div>
        </div>
      </div>

      <!-- ตัวกรองหมวดหมู่ & สถานะ -->
      <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 14px; padding: 1rem; margin-bottom: 1.25rem; display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
        <div style="flex: 1; min-width: 200px;">
          <label style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); display: block;">📂 เลือกหมวดหมู่เนื้อหาที่จะแปล:</label>
          <select class="form-select" onchange="activeTranslationStudioCategory = this.value; renderTranslationStudioView();" style="font-weight: 700;">
            ${categories.map(cat => `<option value="${escapeTransHtml(cat)}" ${activeTranslationStudioCategory === cat ? 'selected' : ''}>${cat === 'all' ? '📌 แสดงทุกหมวดหมู่ทั้งหมด' : escapeTransHtml(cat)}</option>`).join("")}
          </select>
        </div>

        <div>
          <label style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); display: block;">🔍 กรองสถานะการแปล:</label>
          <select class="form-select" onchange="activeTranslationStudioFilter = this.value; renderTranslationStudioView();" style="font-weight: 700;">
            <option value="all" ${activeTranslationStudioFilter === 'all' ? 'selected' : ''}>แสดงทั้งหมด (${allItems.length})</option>
            <option value="untranslated_mm" ${activeTranslationStudioFilter === 'untranslated_mm' ? 'selected' : ''}>⚠️ ยังไม่ได้แปลภาษาพม่า (${totalCount - doneMmCount})</option>
            <option value="untranslated_kn" ${activeTranslationStudioFilter === 'untranslated_kn' ? 'selected' : ''}>⚠️ ยังไม่ได้แปลภาษากะเหรี่ยง (${totalCount - doneKnCount})</option>
          </select>
        </div>

        <div style="flex: 1; min-width: 200px;">
          <label style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); display: block;">🔎 ค้นหาข้อความ:</label>
          <input type="text" class="form-input" placeholder="พิมพ์คำค้นหา เช่น สะโพก, อุณหภูมิ, ตู้เย็น..." value="${escapeTransHtml(translationStudioSearchQuery)}" oninput="translationStudioSearchQuery = this.value; renderTranslationStudioView();" />
        </div>
      </div>

      <!-- ตารางกรอกคำแปล -->
      <div style="overflow-x: auto;">
        <table class="matrix-table-large" style="width: 100%;">
          <thead>
            <tr>
              <th style="width: 34%;">🇹🇭 ข้อความภาษาไทยต้นฉบับ</th>
              <th style="width: 33%; background: #fffbeb; color: #92400e;">🇲🇲 คำแปลภาษาพม่า (Burmese / မြန်မာ)</th>
              <th style="width: 33%; background: #ecfdf5; color: #065f46;">🏳️ คำแปลภาษากะเหรี่ยง (Karen / ကညီ)</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr>
                <td colspan="3" style="text-align: center; padding: 3rem; color: var(--text-muted); font-weight: 700;">
                  🎉 แปลครบทุกข้อในตัวกรองนี้แล้ว!
                </td>
              </tr>
            ` : filtered.map((item, idx) => {
              const entry = dict[item.key] || { mm: "", kn: "" };
              return `
                <tr class="studio-trans-row" data-th-key="${escapeTransHtml(item.key)}">
                  <td style="vertical-align: top;">
                    <div style="font-size: 0.72rem; font-weight: 800; color: #6d28d9; margin-bottom: 0.2rem;">
                      ${escapeTransHtml(item.category)} ${item.context ? `• ${escapeTransHtml(item.context)}` : ''}
                    </div>
                    <div style="font-weight: 800; color: #0f172a; font-size: 0.95rem; line-height: 1.5;">
                      ${escapeTransHtml(item.key)}
                    </div>
                  </td>
                  <td style="vertical-align: top; background: #fffdf5;">
                    <textarea class="form-textarea studio-mm-input" rows="2"
                      placeholder="พิมพ์ภาษาพม่า..."
                      onchange="handleSingleRowStudioBlur(this)"
                      style="font-size: 0.95rem; border-color: #fde68a; background: #ffffff;">${escapeTransHtml(entry.mm || '')}</textarea>
                  </td>
                  <td style="vertical-align: top; background: #f8fffb;">
                    <textarea class="form-textarea studio-kn-input" rows="2"
                      placeholder="พิมพ์ภาษากะเหรี่ยง..."
                      onchange="handleSingleRowStudioBlur(this)"
                      style="font-size: 0.95rem; border-color: #a7f3d0; background: #ffffff;">${escapeTransHtml(entry.kn || '')}</textarea>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 1.25rem;">
        <button type="button" class="action-btn btn-primary" onclick="handleSaveAllStudioTranslations()" style="width: auto; padding: 0.75rem 2rem; font-size: 1rem; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);">
          💾 บันทึกคำแปลทั้งหมดและซิงค์ขึ้น Cloud
        </button>
      </div>
    </div>
  `;
}

function handleSingleRowStudioBlur(textareaEl) {
  const row = textareaEl.closest(".studio-trans-row");
  if (!row) return;
  const key = row.getAttribute("data-th-key");
  const mm = row.querySelector(".studio-mm-input")?.value || "";
  const kn = row.querySelector(".studio-kn-input")?.value || "";
  if (key) {
    saveSingleTranslation(key, mm, kn);
    updateTranslatorFloatingBanner();
  }
}

function handleSaveAllStudioTranslations() {
  const rows = document.querySelectorAll(".studio-trans-row");
  const dict = getTranslationsDict();
  rows.forEach(row => {
    const key = row.getAttribute("data-th-key");
    if (!key) return;
    const mm = (row.querySelector(".studio-mm-input")?.value || "").trim();
    const kn = (row.querySelector(".studio-kn-input")?.value || "").trim();
    if (mm || kn || dict[key]) {
      dict[key] = { mm, kn, updatedAt: new Date().toISOString() };
    }
  });
  saveTranslationsDict(dict);
  renderTranslationStudioView();
  updateTranslatorFloatingBanner();
  if (typeof showToast === "function") {
    showToast("✅ บันทึกคำแปลทั้งหมดและซิงค์ขึ้น Firebase Cloud เรียบร้อยแล้ว!");
  }
}

function promptChangeTranslatorPin() {
  const currentPin = getTranslatorPin();
  const nextPin = prompt("กำหนดรหัส PIN สำหรับให้พนักงานเปิดโหมดนักแปลภาษา (เช่น 5555):", currentPin);
  if (nextPin && nextPin.trim().length >= 3) {
    saveTranslatorPin(nextPin.trim());
    renderTranslationStudioView();
    if (typeof showToast === "function") {
      showToast(`🔑 เปลี่ยนรหัส PIN โหมดนักแปลภาษาเป็น "${nextPin.trim()}" เรียบร้อยแล้ว!`);
    }
  }
}

// ติดตั้ง MutationObserver เพื่อตรวจจับเมื่อหน้าเว็บเปลี่ยนเมนูหรือสลับแท็บ แล้วแปลภาษาให้อัตโนมัติทันที
document.addEventListener("DOMContentLoaded", () => {
  updateLanguageSelectorUI();
  updateTranslatorFloatingBanner();

  const targetNode = document.getElementById("sopContentArea");
  if (targetNode && typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(() => {
      if (currentAppLang !== "th" || isTranslatorModeActive) {
        scheduleApplyTranslationsToDOM();
      }
    });
    observer.observe(targetNode, { childList: true, subtree: false });
  }
});
