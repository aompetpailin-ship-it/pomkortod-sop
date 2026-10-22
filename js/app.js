/**
 * 🍗 แอปพลิเคชันหลักระบบ SOP แฟรนไชส์ร้านไก่ทอด "ผมขอทอด" (Pom Khor Thod V30 Enterprise)
 * รองรับ:
 * - โครงสร้าง 7 หมวดหมู่ตามไทม์ไลน์การทำงานจริง (7-Stage Operational Workflow)
 * - หน้าจอ SOP 3 ส่วน (Quick Spec Matrix + Action Cards & Pass/Fail + Troubleshooting Accordion)
 * - กระดาน Cheat Sheet ประจำสเตชัน, บันทึกอุณหภูมิ/น้ำมัน/เคลมเดลิเวอรี, เทรนพนักงาน 3 วัน & Quiz, และคำนวณ Food Cost
 * - ป้องกันการคัดลอกข้อความ (Anti-Copy) สำหรับพนักงานทั่วไป โดยไม่มีลายน้ำบังรูปอาหาร
 */

let currentRole = "none";
let currentViewMode = "sop"; // 'sop' | 'cheatsheets' | 'daily-logs' | 'onboarding' | 'food-cost'
let currentCategory = "all";
let currentSubCategory = "all";
let searchQuery = "";
let currentActiveSopId = null;

document.addEventListener("DOMContentLoaded", async () => {
  initAntiCopyProtection();
  renderSidebarNavigation();
  initEventListeners();

  // ดึงข้อมูลล่าสุดจาก Firebase / Cloud
  if (typeof fetchSOPDataFromCloud === "function") {
    const cloudSops = await fetchSOPDataFromCloud();
    if (cloudSops) {
      renderSidebarNavigation();
    }
  }

  const currentUser = getCurrentUserSession();
  if (currentUser) {
    currentRole = currentUser.role;
    if (currentUser.branchCode && typeof selectedOpsBranch !== "undefined") {
      selectedOpsBranch = currentUser.branchCode;
    }
    updateNavbarAuthUI(currentUser);
  } else {
    showLoginModal();
  }

  renderSidebarNavigation();
  renderMainView();
});

// ระบบป้องกันการคัดลอกข้อความและคลิกขวาสำหรับพนักงานทั่วไป (ไม่มีลายน้ำบังรูปอาหารตามที่กำหนด)
function initAntiCopyProtection() {
  document.addEventListener("contextmenu", (e) => {
    if (currentRole !== "admin" && !e.target.closest("input, textarea")) {
      e.preventDefault();
    }
  });

  document.addEventListener("copy", (e) => {
    if (currentRole !== "admin" && !e.target.closest("input, textarea")) {
      e.preventDefault();
      showToast("🔒 เนื้อหาสูตรอาหารได้รับการคุ้มครองลิขสิทธิ์", "info", 2000);
    }
  });
}

function showToast(message, type = "success", duration = 2500) {
  let toast = document.getElementById("appToastNotification");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "appToastNotification";
    document.body.appendChild(toast);
  }

  toast.className = `toast-notification toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

async function forceRefreshFromCloud() {
  showToast("⏳ กำลังซิงค์ข้อมูลล่าสุดจาก Cloud Database...", "info", 1500);
  if (typeof fetchSOPDataFromCloud === "function") {
    const cloudData = await fetchSOPDataFromCloud();
    if (cloudData && cloudData.length > 0) {
      currentActiveSopId = null;
      renderSidebarNavigation();
      renderMainView();
      showToast(`✅ อัปเดตข้อมูลล่าสุดสำเร็จ! (${cloudData.length} หมวดคู่มือ)`);
    } else {
      showToast("ℹ️ ข้อมูลเป็นเวอร์ชันล่าสุดแล้ว", "info");
    }
  }
}

function switchMainModule(mode) {
  currentViewMode = mode;
  currentActiveSopId = null;
  renderSidebarNavigation();
  renderMainView();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderMainView() {
  const currentUser = getCurrentUserSession();
  const container = document.getElementById("sopContentArea");
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted); background: #fff; border-radius: 16px; border: 1px solid var(--border-color);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
        <h2 style="color: #b45309;">กรุณาเข้าสู่ระบบพนักงานก่อนใช้งานระบบ SOP แฟรนไชส์</h2>
        <p style="margin-bottom: 1.25rem;">ระบบจำกัดสิทธิ์ตามตำแหน่งและสาขาเพื่อปกป้องสูตรลับทางการค้าของร้าน "ผมขอทอด"</p>
        <button class="action-btn btn-primary" onclick="showLoginModal()" style="width: auto; padding: 0.7rem 1.75rem;">🔑 เข้าสู่ระบบพนักงาน</button>
      </div>
    `;
    return;
  }

  if (currentViewMode === "cheatsheets" && typeof renderStationCheatSheetsView === "function") {
    renderStationCheatSheetsView();
    return;
  }
  if (currentViewMode === "daily-logs" && typeof renderDailyOperationsLogsView === "function") {
    renderDailyOperationsLogsView();
    return;
  }
  if (currentViewMode === "onboarding" && typeof renderOnboardingAndQuizView === "function") {
    renderOnboardingAndQuizView();
    return;
  }
  if (currentViewMode === "food-cost" && typeof renderFoodCostingAdminView === "function") {
    renderFoodCostingAdminView();
    return;
  }

  renderSOPList();
}

function renderSidebarNavigation() {
  const container = document.getElementById("sidebarNavContainer");
  if (!container) return;

  const subCategories = getSubCategoriesData();
  const stages = typeof WORKFLOW_STAGES_META !== "undefined" ? WORKFLOW_STAGES_META : [];

  let html = `
    <!-- โมดูลปฏิบัติการแฟรนไชส์ -->
    <div style="margin-bottom: 1rem; padding-bottom: 0.85rem; border-bottom: 1px solid var(--border-color);">
      <div class="sidebar-title" style="margin-bottom: 0.5rem; color: #b45309;">🚀 ระบบปฏิบัติการแฟรนไชส์</div>
      <a class="nav-item ${currentViewMode === 'sop' && currentCategory === 'all' ? 'active' : ''}" href="#" onclick="event.preventDefault(); selectSopStage('all', 'all')">
        <span>📖</span> คู่มือ SOP ทั้งหมด (7 หมวด)
      </a>
      <a class="nav-item ${currentViewMode === 'cheatsheets' ? 'active' : ''}" href="#" onclick="event.preventDefault(); switchMainModule('cheatsheets')">
        <span>⚡</span> Cheat Sheet แปะหน้าเตา/แพ็ก
      </a>
      <a class="nav-item ${currentViewMode === 'daily-logs' ? 'active' : ''}" href="#" onclick="event.preventDefault(); switchMainModule('daily-logs')">
        <span>📋</span> บันทึกอุณหภูมิ & เคลมเดลิเวอรี
      </a>
      <a class="nav-item ${currentViewMode === 'onboarding' ? 'active' : ''}" href="#" onclick="event.preventDefault(); switchMainModule('onboarding')">
        <span>🎓</span> เทรนพนักงาน 3 วัน & สอบ Quiz
      </a>
      ${currentRole === 'admin' ? `
        <a class="nav-item ${currentViewMode === 'food-cost' ? 'active' : ''}" href="#" onclick="event.preventDefault(); switchMainModule('food-cost')" style="border: 1px dashed #f59e0b; background: ${currentViewMode === 'food-cost' ? 'var(--primary-gradient)' : '#fffbeb'};">
          <span>💰</span> คำนวณต้นทุน Food Cost (Admin)
        </a>
      ` : ''}
    </div>

    <div class="sidebar-title" style="margin-bottom: 0.5rem;">🗂️ ไทม์ไลน์ SOP 7 หมวดหมู่หลัก</div>
  `;

  stages.forEach(st => {
    const subs = subCategories.filter(s => normalizeCategoryStage(s.stage) === st.id);
    const isParentActive = currentViewMode === "sop" && currentCategory === st.id;
    html += `
      <div class="nav-group">
        <a class="nav-item nav-parent ${isParentActive && currentSubCategory === 'all' ? 'active' : ''}" href="#" onclick="event.preventDefault(); selectSopStage('${st.id}', 'all')">
          <span>${st.icon}</span> ${st.shortTitle}
        </a>
        ${subs.length > 0 ? `
          <div class="sub-nav-list" style="display: ${isParentActive ? 'flex' : 'none'};">
            ${subs.map(s => `
              <a class="sub-nav-item ${isParentActive && currentSubCategory === s.id ? 'active' : ''}" href="#" onclick="event.preventDefault(); selectSopStage('${st.id}', '${s.id}')">▫️ ${s.label}</a>
            `).join("")}
          </div>
        ` : ""}
      </div>
    `;
  });

  container.innerHTML = html;
  updateUIPermissions();
}

function selectSopStage(cat, sub) {
  currentViewMode = "sop";
  currentCategory = cat || "all";
  currentSubCategory = sub || "all";
  currentActiveSopId = null;
  renderSidebarNavigation();
  renderSOPList();
}

function initEventListeners() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      if (currentViewMode !== "sop") {
        currentViewMode = "sop";
        currentActiveSopId = null;
        renderSidebarNavigation();
      }
      renderSOPList();
    });
  }
}

function updateUIPermissions() {
  const adminTools = document.querySelectorAll(".admin-only");
  adminTools.forEach(el => {
    el.style.display = currentRole === "admin" ? "inline-flex" : "none";
  });
}

function renderSOPList() {
  const container = document.getElementById("sopContentArea");
  if (!container) return;

  const currentUser = getCurrentUserSession();
  if (!currentUser) {
    renderMainView();
    return;
  }

  if (currentActiveSopId) {
    renderSOPDetail(currentActiveSopId);
    return;
  }

  const allSop = getSOPData();

  const filtered = allSop.filter(item => {
    const itemCat = normalizeCategoryStage(item.category);
    if (currentCategory !== "all" && itemCat !== currentCategory) {
      return false;
    }
    if (currentSubCategory !== "all" && item.subCategory !== currentSubCategory) {
      return false;
    }
    if (currentRole !== "admin" && item.targetRole && !item.targetRole.includes(currentRole)) {
      return false;
    }
    if (searchQuery) {
      const titleMatch = (item.title || "").toLowerCase().includes(searchQuery);
      const descMatch = (item.summary || "").toLowerCase().includes(searchQuery);
      const codeMatch = (item.docCode || "").toLowerCase().includes(searchQuery);
      const tagMatch = item.tags && item.tags.some(t => t.toLowerCase().includes(searchQuery));
      return titleMatch || descMatch || codeMatch || tagMatch;
    }
    return true;
  });

  const stageMeta = (typeof WORKFLOW_STAGES_META !== "undefined")
    ? WORKFLOW_STAGES_META.find(s => s.id === currentCategory)
    : null;

  let html = `
    <!-- Quick Action Banner Bar -->
    <div class="ops-quick-strip no-print">
      <div class="ops-quick-card" onclick="switchMainModule('cheatsheets')">
        <span style="font-size: 1.5rem;">🔥</span>
        <div>
          <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-main);">Cheat Sheet หน้าเตา & แพ็ก</div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">ตารางอุณหภูมิทอด & พิมพ์ A4</div>
        </div>
      </div>
      <div class="ops-quick-card" onclick="switchMainModule('daily-logs')">
        <span style="font-size: 1.5rem;">🌡️</span>
        <div>
          <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-main);">บันทึกอุณหภูมิ 4 รอบ & น้ำมัน</div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">วัดแกนกลาง ≥74°C & ค่า TPM</div>
        </div>
      </div>
      <div class="ops-quick-card" onclick="activeDailyLogTab='claims'; switchMainModule('daily-logs')">
        <span style="font-size: 1.5rem;">🛵</span>
        <div>
          <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-main);">เคลมอาหารเดลิเวอรี 100%</div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">บันทึกเคลม & ก๊อปปี้สคริปต์ด่วน</div>
        </div>
      </div>
      <div class="ops-quick-card" onclick="switchMainModule('onboarding')">
        <span style="font-size: 1.5rem;">🎓</span>
        <div>
          <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-main);">เทรนพนักงาน 3 วัน & Quiz</div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">แผนฝึกงานไว & สอบวัดผล</div>
        </div>
      </div>
    </div>

    <div class="content-header" style="flex-wrap: wrap; gap: 1rem;">
      <div>
        <h2 style="font-size: 1.45rem; color: #b45309; font-weight: 800;">
          ${getCategoryTitleText(currentCategory, currentSubCategory)}
        </h2>
        <p style="color: var(--text-muted); font-size: 0.88rem;">
          ${stageMeta ? `🎯 เป้าหมาย: ${stageMeta.goal}` : `คู่มือปฏิบัติงานมาตรฐานแฟรนไชส์ร้าน "ผมขอทอด" (${filtered.length} หมวดคู่มือ)`}
        </p>
      </div>

      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <button class="action-btn btn-secondary" onclick="forceRefreshFromCloud()" style="width: auto; padding: 0.55rem 1rem; color: #047857; border-color: #10b981; background: #ecfdf5;">
          🔄 ซิงค์ข้อมูลล่าสุด
        </button>

        ${currentRole === 'admin' ? `
          <button class="action-btn btn-primary admin-only" onclick="openAddSOPModal()" style="width: auto; padding: 0.55rem 1.2rem;">
            ➕ เพิ่มคู่มือ SOP ใหม่
          </button>
        ` : ''}
      </div>
    </div>
  `;

  if (filtered.length === 0) {
    html += `
      <div style="text-align: center; padding: 3rem; background: var(--card-bg); border-radius: 14px; border: 1px solid var(--border-color); color: var(--text-muted);">
        <p style="font-size: 2.2rem; margin-bottom: 0.5rem;">🔍</p>
        <p style="font-size: 1.05rem; font-weight: 600;">ยังไม่มีคู่มือ SOP ในหมวดหมู่ย่อยนี้</p>
        ${currentRole === 'admin' ? `
          <button class="action-btn btn-primary" onclick="openAddSOPModal()" style="width: auto; display: inline-flex; margin-top: 1rem;">➕ เพิ่ม SOP ในหมวดนี้ทันที</button>
        ` : ''}
      </div>
    `;
  } else {
    html += `<div class="sop-grid">`;
    filtered.forEach((item, idx) => {
      const safeId = item.id || `temp-${idx}`;
      const stepCount = Array.isArray(item.steps) ? item.steps.length : 0;
      const hasMatrix = Array.isArray(item.matrixRows) && item.matrixRows.length > 0;

      // คำนวณต้นทุนต่อ Batch แสดงเฉพาะ Admin
      let adminCostBadge = "";
      if (currentRole === "admin" && item.ingredients && item.ingredients.length > 0) {
        const batchCost = item.ingredients.reduce((acc, ing) => acc + calculateIngredientLineCost(ing.name, ing.amount, ing.unit), 0);
        adminCostBadge = `<span style="font-size: 0.72rem; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 0.12rem 0.5rem; border-radius: 10px; font-weight: 800;">💰 ต้นทุน ${batchCost.toFixed(0)}฿</span>`;
      }

      html += `
        <div class="sop-card" onclick="viewSOPDetail('${safeId}', ${idx})">
          <div>
            <div class="sop-card-header" style="flex-wrap: wrap; gap: 0.35rem;">
              <span class="sop-category-tag">${item.docCode ? `${item.docCode} • ` : ''}${getCategoryBadge(item.category)}</span>
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                ${adminCostBadge}
                <span style="font-size: 0.72rem; background: #f1f5f9; color: #475569; padding: 0.15rem 0.5rem; border-radius: 10px; font-weight: 700;">v${item.version || '1.0'}</span>
                ${currentRole === 'admin' ? `
                  <button type="button" onclick="event.stopPropagation(); deleteSOP('${safeId}', ${idx})" style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: 6px; padding: 0.12rem 0.45rem; font-size: 0.72rem; font-weight: 700; cursor: pointer;" title="ลบ SOP นี้">🗑️</button>
                ` : ''}
              </div>
            </div>
            <h3 class="sop-card-title">${escapeHtml(item.title || 'คู่มือ SOP')}</h3>
            <p class="sop-card-desc">${escapeHtml(item.summary || 'ไม่มีคำอธิบายสรุป')}</p>
          </div>

          <div>
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.55rem;">
              <span style="font-size: 0.72rem; background: #ecfdf5; color: #047857; padding: 0.12rem 0.5rem; border-radius: 8px; font-weight: 700;">📝 ${stepCount} ขั้นตอน</span>
              ${hasMatrix ? `<span style="font-size: 0.72rem; background: #eff6ff; color: #1d4ed8; padding: 0.12rem 0.5rem; border-radius: 8px; font-weight: 700;">📊 มีตาราง Matrix</span>` : ''}
              ${item.qualityChecks && item.qualityChecks.length > 0 ? `<span style="font-size: 0.72rem; background: #fffbeb; color: #b45309; padding: 0.12rem 0.5rem; border-radius: 8px; font-weight: 700;">✅ Pass/Fail</span>` : ''}
            </div>
            <div class="sop-card-meta">
              <div class="meta-item">⏱️ ${escapeHtml(item.cookTime && item.cookTime !== '-' ? item.cookTime : item.prepTime || '-')}</div>
              <div class="meta-item">📦 ${escapeHtml(item.yield || 'มาตรฐาน')}</div>
              <div class="meta-item" style="margin-left: auto; color: #d97706; font-weight: 800;">เปิดอ่าน ➔</div>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  container.innerHTML = html;
  updateUIPermissions();
}

function viewSOPDetail(sopId, fallbackIdx) {
  currentActiveSopId = sopId;
  renderSOPDetail(sopId, fallbackIdx);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderSOPDetail(sopId, fallbackIdx) {
  const container = document.getElementById("sopContentArea");
  const allSop = getSOPData();
  let sop = allSop.find(item => item && item.id === sopId);
  if (!sop && typeof fallbackIdx === "number" && allSop[fallbackIdx]) {
    sop = allSop[fallbackIdx];
  }

  if (!sop) {
    currentActiveSopId = null;
    renderSOPList();
    return;
  }

  // คำนวณ Food Cost เฉพาะ Admin
  let totalBatchCost = 0;
  if (currentRole === "admin" && sop.ingredients && sop.ingredients.length > 0) {
    totalBatchCost = sop.ingredients.reduce((acc, ing) => acc + calculateIngredientLineCost(ing.name, ing.amount, ing.unit), 0);
  }

  let html = `
    <div class="sop-detail-view">
      <!-- Top Action Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.25rem;" class="no-print">
        <button class="back-btn" style="margin-bottom: 0;" onclick="backToGrid()">⬅️ กลับไปหน้ารวม SOP</button>
        
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="action-btn btn-secondary" onclick="window.print()" style="width: auto; padding: 0.5rem 1rem;">
            🖨️ พิมพ์คู่มือ A4
          </button>

          <button class="action-btn btn-secondary" onclick="openVersionHistoryModal('${sop.id}')" style="width: auto; padding: 0.5rem 1rem;">
            📜 ประวัติเวอร์ชัน (${sop.versionHistory ? sop.versionHistory.length : 0})
          </button>

          ${sop.ingredients && sop.ingredients.length > 0 ? `
            <button class="action-btn btn-secondary" onclick="openBatchCalculatorModal('${sop.id}')" style="width: auto; padding: 0.5rem 1rem;">
              🧮 คำนวณวัตถุดิบ (Batch Calc)
            </button>
          ` : ''}
          
          ${currentRole === 'admin' ? `
            <button class="action-btn btn-primary admin-only" onclick="openEditSOPModal('${sop.id}')" style="width: auto; padding: 0.5rem 1.15rem;">
              ✏️ แก้ไข SOP / อัปโหลดรูป
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Header Metadata -->
      <div class="sop-detail-header">
        <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem; flex-wrap: wrap;">
          ${sop.docCode ? `<span style="background: #0f172a; color: #fff; font-size: 0.78rem; font-weight: 800; padding: 0.2rem 0.7rem; border-radius: 8px;">รหัสเอกสาร: ${escapeHtml(sop.docCode)}</span>` : ''}
          <span class="sop-category-tag">${getCategoryBadge(sop.category)}</span>
          <span style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-size: 0.78rem; font-weight: 800; padding: 0.2rem 0.65rem; border-radius: 12px;">
            เวอร์ชัน v${escapeHtml(sop.version || '1.0')}
          </span>
        </div>
        <h1 class="sop-detail-title">${escapeHtml(sop.title)}</h1>
        <p style="color: var(--text-muted); font-size: 1rem;">${escapeHtml(sop.summary)}</p>
        
        <div style="display: flex; gap: 1.5rem; margin-top: 1rem; font-size: 0.84rem; color: var(--text-muted); flex-wrap: wrap; background: #f8fafc; border: 1px solid var(--border-color); padding: 0.75rem 1rem; border-radius: 10px;">
          <div>👤 ผู้รับผิดชอบ/ปรับปรุง: <strong style="color:var(--text-main);">${escapeHtml(sop.author || 'Admin')}</strong></div>
          <div>📅 อัปเดตล่าสุด: <strong style="color:var(--text-main);">${escapeHtml(sop.updatedAt)}</strong></div>
          <div>📝 หมายเหตุ: <strong style="color:#b45309;">${escapeHtml(sop.changeNotes || 'มาตรฐานแฟรนไชส์')}</strong></div>
        </div>
      </div>

      <!-- ================================================================== -->
      <!-- โซนที่ 1: ส่วนบน (QUICK SPEC & MATRIX TABLE สำหรับเหลือบมองขณะทำงาน) -->
      <!-- ================================================================== -->
      ${sop.specifications && sop.specifications.length > 0 ? `
        <h3 style="font-size: 1.12rem; color: #b45309; margin-top: 1.5rem; margin-bottom: 0.5rem; font-weight: 800;">
          ⚙️ ส่วนที่ 1: ค่ามาตรฐานควบคุมจุดวิกฤต (Quick Specifications)
        </h3>
        <div class="specs-grid" style="margin-top: 0.5rem;">
          ${sop.specifications.map(s => `
            <div class="spec-card">
              <span class="spec-label">${escapeHtml(s.label)}</span>
              <span class="spec-value">${escapeHtml(s.value)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${sop.matrixRows && sop.matrixRows.length > 0 ? `
        <div style="margin: 1.5rem 0;">
          <h3 style="font-size: 1.12rem; color: #b45309; margin-bottom: 0.65rem; font-weight: 800;">
            ${escapeHtml(sop.matrixTitle || '📊 ตารางมาตรฐานควบคุม (Standard Control Matrix)')}
          </h3>
          <div style="overflow-x: auto;">
            <table class="matrix-table-large">
              <thead>
                <tr>
                  ${(sop.matrixHeaders || []).map(h => `<th>${escapeHtml(h)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${sop.matrixRows.map(row => `
                  <tr>
                    ${row.map((cell, cIdx) => `<td>${cIdx === 0 ? `<strong>${escapeHtml(cell)}</strong>` : escapeHtml(cell)}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- Ingredients & Admin Food Cost Box -->
      ${sop.ingredients && sop.ingredients.length > 0 ? `
        <div class="ingredients-box">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <h3 style="font-size: 1.1rem; color: var(--primary-hover); font-weight: 800;">
              🥗 วัตถุดิบและอัตราส่วนมาตรฐาน (Yield: ${escapeHtml(sop.yield || '1 Batch')})
            </h3>
            ${currentRole === 'admin' ? `
              <div style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 0.3rem 0.85rem; border-radius: 20px; font-size: 0.84rem; font-weight: 800;">
                👑 ต้นทุนรวม Batch นี้ (เฉพาะ Admin): ${totalBatchCost.toFixed(2)} บาท
              </div>
            ` : ''}
          </div>
          <ul class="ingredients-list">
            ${sop.ingredients.map(ing => {
              const lineCost = currentRole === "admin" ? calculateIngredientLineCost(ing.name, ing.amount, ing.unit) : 0;
              return `
                <li class="ingredient-item">
                  <span>▪️ ${escapeHtml(ing.name)}</span>
                  <div style="text-align: right;">
                    <strong style="color: #b45309;">${ing.amount} ${escapeHtml(ing.unit)}</strong>
                    ${currentRole === 'admin' && lineCost > 0 ? `<div style="font-size: 0.74rem; color: #dc2626;">(ทุน ${lineCost.toFixed(2)} ฿)</div>` : ''}
                  </div>
                </li>
              `;
            }).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- ================================================================== -->
      <!-- โซนที่ 2: ส่วนกลาง (ACTION CARDS + VIDEO/GIF + PASS vs FAIL TABLE) -->
      <!-- ================================================================== -->
      <h3 style="font-size: 1.2rem; color: #b45309; margin-bottom: 1rem; font-weight: 800;">
        📝 ส่วนที่ 2: ลำดับขั้นตอนการปฏิบัติงาน (Standard Action Cards)
      </h3>
      <div class="steps-container">
        ${(sop.steps || []).map(step => `
          <div class="step-card">
            <div class="step-number">${step.stepNumber}</div>
            <div class="step-body">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.4rem;">
                <h4 class="step-title" style="margin-bottom: 0;">${escapeHtml(step.title)}</h4>
                ${step.cameraAngle ? `
                  <span style="font-size: 0.74rem; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 0.15rem 0.6rem; border-radius: 12px; font-weight: 700;">
                    🎥 มุมกล้อง: ${escapeHtml(step.cameraAngle)}
                  </span>
                ` : ''}
              </div>
              <p class="step-desc" style="white-space: pre-line;">${escapeHtml(step.description)}</p>

              <!-- Step Image Preview (Clean, No Watermark Obscuring Food) -->
              ${step.imageUrl ? `
                <div class="step-image-wrapper" style="margin: 0.75rem 0;" onclick="openImageLightboxByStepId('${sop.id}', ${step.stepNumber})">
                  <img src="${step.imageUrl}" alt="${escapeHtml(step.title)}" class="step-image-thumb" />
                  <div style="background: #f8fafc; padding: 0.4rem 0.75rem; font-size: 0.78rem; color: var(--text-muted); font-weight: 700; border-top: 1px solid var(--border-color);">
                    🔍 คลิกเพื่อขยายดูภาพขนาดเต็มจอ
                  </div>
                </div>
              ` : ''}

              <!-- Step Video / Short Clip / YouTube Embed -->
              ${step.videoUrl ? renderStepVideoEmbedHtml(step.videoUrl) : ''}

              ${step.tip ? `
                <div class="step-tip">💡 <strong>จุดสังเกต / ข้อห้ามสำคัญ (Do's & Don'ts):</strong> ${escapeHtml(step.tip)}</div>
              ` : ''}

              <div class="step-actions" style="display: flex; align-items: center; gap: 0.75rem; margin-top: 0.85rem;">
                ${step.timerSeconds && step.timerSeconds > 0 ? `
                  <button class="timer-start-btn" onclick="startKitchenTimer(${step.timerSeconds}, '${escapeQuotes(step.title)}')">
                    ⏱️ เริ่มจับเวลา (${formatSeconds(step.timerSeconds)})
                  </button>
                ` : ''}
                
                <label style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: var(--text-muted); cursor: pointer; margin-left: auto; font-weight: 700;">
                  <input type="checkbox" onchange="toggleStepDone(this)" style="width: 17px; height: 17px;" /> ทำขั้นตอนนี้เสร็จแล้ว
                </label>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Pass vs Fail Quality Check Table -->
      ${sop.qualityChecks && sop.qualityChecks.length > 0 ? `
        <div style="margin-top: 2rem;">
          <h3 style="font-size: 1.15rem; color: #b45309; margin-bottom: 0.75rem; font-weight: 800;">
            ⚖️ เกณฑ์ตรวจสอบคุณภาพและข้อห้าม (Quality Check: Pass ✅ vs Fail ❌)
          </h3>
          <div style="overflow-x: auto;">
            <table class="matrix-table-large">
              <thead>
                <tr>
                  <th style="width: 22%;">หัวข้อตรวจสอบ</th>
                  <th style="width: 39%; background: #ecfdf5; color: #047857;">✅ ผ่านมาตรฐาน (Pass)</th>
                  <th style="width: 39%; background: #fef2f2; color: #b91c1c;">❌ ไม่ผ่าน / ต้องแก้ไขทันที (Fail)</th>
                </tr>
              </thead>
              <tbody>
                ${sop.qualityChecks.map(qc => `
                  <tr>
                    <td><strong>${escapeHtml(qc.topic)}</strong></td>
                    <td style="background: #f0fdf4; color: #065f46; font-weight: 600;">✅ ${escapeHtml(qc.pass)}</td>
                    <td style="background: #fef2f2; color: #991b1b; font-weight: 600;">❌ ${escapeHtml(qc.fail)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- ================================================================== -->
      <!-- โซนที่ 3: ส่วนล่าง (TROUBLESHOOTING ACCORDION แก้ปัญหาเฉพาะหน้า) -->
      <!-- ================================================================== -->
      ${sop.troubleshooting && sop.troubleshooting.length > 0 ? `
        <div style="margin-top: 2rem;">
          <h3 style="font-size: 1.15rem; color: #b45309; margin-bottom: 0.75rem; font-weight: 800;">
            🛠️ ส่วนที่ 3: การแก้ปัญหาเฉพาะหน้าหน้างาน (Troubleshooting Guide)
          </h3>
          <div style="display: flex; flex-direction: column; gap: 0.65rem;">
            ${sop.troubleshooting.map((tr, tIdx) => `
              <details class="troubleshoot-accordion" ${tIdx === 0 ? 'open' : ''}>
                <summary class="troubleshoot-summary">
                  <span>❓ <strong>ปัญหา:</strong> ${escapeHtml(tr.problem)}</span>
                  <span style="font-size: 0.8rem; color: #b45309;">คลิกดูวิธีแก้ ▾</span>
                </summary>
                <div class="troubleshoot-body">
                  <strong>✅ วิธีแก้ไขตามมาตรฐานแฟรนไชส์:</strong> ${escapeHtml(tr.solution)}
                </div>
              </details>
            `).join('')}
          </div>
        </div>
      ` : ''}

    </div>
  `;

  container.innerHTML = html;
  updateUIPermissions();
}

function renderStepVideoEmbedHtml(url) {
  if (!url) return "";
  const cleanUrl = url.trim();
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  if (ytMatch && ytMatch[1]) {
    return `
      <div style="margin: 0.75rem 0; max-width: 520px; border-radius: 14px; overflow: hidden; border: 1px solid var(--border-color); box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
        <iframe width="100%" height="290" src="https://www.youtube.com/embed/${ytMatch[1]}" title="SOP Video Tutorial" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
    `;
  }
  if (cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".webm") || cleanUrl.endsWith(".mov")) {
    return `
      <div style="margin: 0.75rem 0; max-width: 520px;">
        <video src="${escapeHtml(cleanUrl)}" controls loop muted playsinline style="width: 100%; border-radius: 14px; border: 1px solid var(--border-color);"></video>
      </div>
    `;
  }
  return `
    <div style="margin: 0.75rem 0;">
      <a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener" class="action-btn btn-secondary" style="width: auto; display: inline-flex; padding: 0.5rem 1rem; color: #2563eb; border-color: #93c5fd; background: #eff6ff;">
        🎬 เปิดดูคลิปวิดีโอสาธิตขั้นตอนนี้ ↗
      </a>
    </div>
  `;
}

function openImageLightboxByStepId(sopId, stepNumber) {
  const allSop = getSOPData();
  const sop = allSop.find(s => s.id === sopId);
  if (!sop) return;
  const step = sop.steps.find(st => st.stepNumber === stepNumber);
  if (!step || !step.imageUrl) return;

  openImageLightbox(step.imageUrl, step.title);
}

function openImageLightbox(imgUrl, title) {
  const modalHtml = `
    <div class="modal-overlay" id="lightboxModalOverlay" onclick="closeModal('lightboxModalOverlay')">
      <div style="max-width: 92vw; max-height: 92vh; position: relative; text-align: center;" onclick="event.stopPropagation()">
        <img id="lightboxTargetImg" alt="Expanded Step Image" style="max-width: 100%; max-height: 82vh; border-radius: 14px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border: 2px solid var(--primary); background: #fff;" />
        <div style="margin-top: 0.75rem; color: #ffffff; font-size: 1.1rem; font-weight: 800; text-shadow: 0 2px 6px rgba(0,0,0,0.8);">${escapeHtml(title)}</div>
        <button onclick="closeModal('lightboxModalOverlay')" style="position: absolute; top: -15px; right: -15px; background: #dc2626; color: white; border: none; border-radius: 50%; width: 38px; height: 38px; font-weight: bold; cursor: pointer; font-size: 1.3rem;">&times;</button>
      </div>
    </div>
  `;
  const existing = document.getElementById("lightboxModalOverlay");
  if (existing) existing.remove();

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  const imgEl = document.getElementById("lightboxTargetImg");
  if (imgEl) imgEl.src = imgUrl;
}

function backToGrid() {
  currentActiveSopId = null;
  renderSOPList();
}

function toggleStepDone(checkbox) {
  const card = checkbox.closest(".step-card");
  if (checkbox.checked) {
    card.style.opacity = "0.65";
    card.style.borderLeft = "5px solid var(--accent-green)";
  } else {
    card.style.opacity = "1";
    card.style.borderLeft = "1px solid var(--border-color)";
  }
}

function getCategoryTitleText(cat, sub) {
  if (sub !== "all") {
    const subCategories = getSubCategoriesData();
    const foundSub = subCategories.find(s => s.id === sub);
    if (foundSub) {
      return `📌 ${foundSub.label}`;
    }
  }

  const normalized = normalizeCategoryStage(cat);
  if (typeof WORKFLOW_STAGES_META !== "undefined") {
    const foundStage = WORKFLOW_STAGES_META.find(s => s.id === normalized);
    if (foundStage && cat !== "all") {
      return `${foundStage.icon} ${foundStage.fullTitle}`;
    }
  }
  return "📖 คู่มือปฏิบัติงานมาตรฐานแฟรนไชส์ทั้งหมด (7 หมวดหมู่หลัก)";
}

function getCategoryBadge(cat) {
  const normalized = normalizeCategoryStage(cat);
  switch (normalized) {
    case "stage-1-opening": return "1. เปิดร้าน";
    case "stage-2-prep": return "2. เตรียมวัตถุดิบ";
    case "stage-3-frying": return "3. คลุกแป้ง & ทอด";
    case "stage-4-packing": return "4. ตู้โชว์ & แพ็กเกจ";
    case "stage-5-delivery": return "5. เดลิเวอรี & เคลม";
    case "stage-6-oil": return "6. ดูแลน้ำมัน & เตา";
    case "stage-7-closing": return "7. ปิดร้าน & Waste";
    default: return "มาตรฐานทั่วไป";
  }
}

function getRoleLabel(role) {
  switch (role) {
    case "kitchen": return "🍳 ฝ่ายครัว & สเตชันทอด";
    case "front": return "🛎️ ฝ่ายหน้าร้าน & แพ็กเดลิเวอรี";
    case "admin": return "👑 ผู้บริหาร / เจ้าของแฟรนไชส์";
    default: return role;
  }
}

function formatSeconds(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m > 0 && s > 0) return `${m} นาที ${s} วินาที`;
  if (m > 0) return `${m} นาที`;
  return `${s} วินาที`;
}

function escapeQuotes(str) {
  if (!str) return "";
  return String(str).replace(/'/g, "\\'");
}
