/**
 * แอปพลิเคชันหลักระบบ SOP ร้านไก่ทอด "ผมขอทอด" (Pom Khor Thod)
 * รองรับการดึงข้อมูลและซิงค์คลาวด์เรียลไทม์ (Centralized Cloud Database Sync)
 */

let currentRole = "none";
let currentCategory = "all";
let currentSubCategory = "all";
let searchQuery = "";
let currentActiveSopId = null;

document.addEventListener("DOMContentLoaded", async () => {
  renderSidebarNavigation();
  initEventListeners();

  // ดึงข้อมูลล่าสุดจาก Cloud Database มาแสดงผลให้อัตโนมัติทุกครั้งที่เปิดหน้าเว็บ
  if (typeof fetchSOPDataFromCloud === "function") {
    await fetchSOPDataFromCloud();
    renderSidebarNavigation();
  }
  
  // ตรวจสอบสถานะการเข้าสู่ระบบ
  const currentUser = getCurrentUserSession();
  if (currentUser) {
    currentRole = currentUser.role;
    updateNavbarAuthUI(currentUser);
    renderSOPList();
  } else {
    showLoginModal();
  }
});

// ฟังก์ชันแจ้งเตือน Toast ลอยมุมขวาบน หายไปเองใน 2 วินาที (ไม่ต้องกด Close)
function showToast(message, type = 'success', duration = 2000) {
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

function renderSidebarNavigation() {
  const container = document.getElementById("sidebarNavContainer");
  if (!container) return;

  const subCategories = getSubCategoriesData();

  const getSubItems = (stageKey) => {
    return subCategories.filter(s => s.stage === stageKey);
  };

  const prepSubs = getSubItems("prep");
  const cookingSubs = getSubItems("cooking");
  const servingSubs = getSubItems("serving-packaging");
  const hygieneSubs = getSubItems("hygiene");

  let html = `
    <a class="nav-item ${currentCategory === 'all' ? 'active' : ''}" data-category="all">
      <span>📖</span> SOP ทั้งหมด
    </a>

    <!-- Stage 1: การเตรียมวัตถุดิบ -->
    <div class="nav-group">
      <a class="nav-item nav-parent ${currentCategory === 'prep' && currentSubCategory === 'all' ? 'active' : ''}" data-category="prep">
        <span>🥩</span> 1. การเตรียมวัตถุดิบ
      </a>
      <div class="sub-nav-list">
        ${prepSubs.map(s => `
          <a class="sub-nav-item ${currentCategory === 'prep' && currentSubCategory === s.id ? 'active' : ''}" data-category="prep" data-sub="${s.id}">▫️ ${s.label}</a>
        `).join('')}
      </div>
    </div>

    <!-- Stage 2: การปรุงและการทอด -->
    <div class="nav-group">
      <a class="nav-item nav-parent ${currentCategory === 'cooking' && currentSubCategory === 'all' ? 'active' : ''}" data-category="cooking">
        <span>🍳</span> 2. การปรุงและการทอด
      </a>
      <div class="sub-nav-list">
        ${cookingSubs.map(s => `
          <a class="sub-nav-item ${currentCategory === 'cooking' && currentSubCategory === s.id ? 'active' : ''}" data-category="cooking" data-sub="${s.id}">▫️ ${s.label}</a>
        `).join('')}
      </div>
    </div>

    <!-- Stage 3: การเสิร์ฟและการแพ็ก -->
    <div class="nav-group">
      <a class="nav-item nav-parent ${currentCategory === 'serving-packaging' && currentSubCategory === 'all' ? 'active' : ''}" data-category="serving-packaging">
        <span>📦</span> 3. การเสิร์ฟและการแพ็ก
      </a>
      <div class="sub-nav-list">
        ${servingSubs.map(s => `
          <a class="sub-nav-item ${currentCategory === 'serving-packaging' && currentSubCategory === s.id ? 'active' : ''}" data-category="serving-packaging" data-sub="${s.id}">▫️ ${s.label}</a>
        `).join('')}
      </div>
    </div>

    <!-- Stage 4: สุขอนามัยและความปลอดภัย -->
    <div class="nav-group">
      <a class="nav-item ${currentCategory === 'hygiene' ? 'active' : ''}" data-category="hygiene">
        <span>🧹</span> 4. สุขอนามัยและความปลอดภัย
      </a>
      ${hygieneSubs.length > 0 ? `
        <div class="sub-nav-list">
          ${hygieneSubs.map(s => `
            <a class="sub-nav-item ${currentCategory === 'hygiene' && currentSubCategory === s.id ? 'active' : ''}" data-category="hygiene" data-sub="${s.id}">▫️ ${s.label}</a>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  container.innerHTML = html;
  initNavEvents();
}

function initNavEvents() {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".nav-item, .sub-nav-item").forEach(n => n.classList.remove("active"));
      item.classList.add("active");
      
      currentCategory = item.dataset.category || "all";
      currentSubCategory = "all";
      currentActiveSopId = null;
      renderSOPList();
    });
  });

  const subNavItems = document.querySelectorAll(".sub-nav-item");
  subNavItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".nav-item, .sub-nav-item").forEach(n => n.classList.remove("active"));
      item.classList.add("active");

      const parentNav = item.closest(".nav-group") ? item.closest(".nav-group").querySelector(".nav-parent") : null;
      if (parentNav) parentNav.classList.add("active");

      currentCategory = item.dataset.category;
      currentSubCategory = item.dataset.sub;
      currentActiveSopId = null;
      renderSOPList();
    });
  });
}

function initEventListeners() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderSOPList();
    });
  }
}

function updateUIPermissions() {
  const adminTools = document.querySelectorAll(".admin-only");
  adminTools.forEach(el => {
    if (currentRole === "admin") {
      el.style.display = "block";
    } else {
      el.style.display = "none";
    }
  });
}

function renderSOPList() {
  const container = document.getElementById("sopContentArea");
  if (!container) return;

  const currentUser = getCurrentUserSession();
  if (!currentUser) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
        <h2 style="color: #fbbf24;">กรุณาเข้าสู่ระบบพนักงานก่อนรับชมคู่มือ SOP</h2>
        <p>ระบบถูกล็อกเพื่อป้องกันความลับและสูตรอาหารของร้านรั่วไหล</p>
      </div>
    `;
    return;
  }

  const allSop = getSOPData();

  const filtered = allSop.filter(item => {
    if (currentCategory !== "all" && item.category !== currentCategory) {
      return false;
    }
    if (currentSubCategory !== "all" && item.subCategory !== currentSubCategory) {
      return false;
    }
    if (currentRole !== "admin" && item.targetRole && !item.targetRole.includes(currentRole)) {
      return false;
    }
    if (searchQuery) {
      const titleMatch = item.title.toLowerCase().includes(searchQuery);
      const descMatch = item.summary.toLowerCase().includes(searchQuery);
      const tagMatch = item.tags && item.tags.some(t => t.toLowerCase().includes(searchQuery));
      return titleMatch || descMatch || tagMatch;
    }
    return true;
  });

  if (currentActiveSopId) {
    renderSOPDetail(currentActiveSopId);
    return;
  }

  let html = `
    <div class="content-header">
      <div>
        <h2 style="font-size: 1.5rem; color: #fbbf24; font-weight: 800;">
          ${getCategoryTitleText(currentCategory, currentSubCategory)}
        </h2>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          คู่มือปฏิบัติงานมาตรฐานสำหรับพนักงานร้าน "ผมขอทอด" (${filtered.length} รายการ)
        </p>
      </div>

      ${currentRole === 'admin' ? `
        <button class="action-btn btn-primary admin-only" onclick="openAddSOPModal()" style="width: auto; padding: 0.6rem 1.2rem;">
          ➕ เพิ่ม SOP ใหม่
        </button>
      ` : ''}
    </div>
  `;

  if (filtered.length === 0) {
    html += `
      <div style="text-align: center; padding: 3rem; background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border-color); color: var(--text-muted);">
        <p style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</p>
        <p style="font-size: 1.1rem;">ไม่พบข้อมูล SOP ในหมวดหมู่นี้ คุณสามารถกดเพิ่ม SOP หรือวัตถุดิบใหม่ได้ทุกเมื่อ</p>
        ${currentRole === 'admin' ? `
          <button class="action-btn btn-primary" onclick="openAddSOPModal()" style="width: auto; display: inline-block; margin-top: 1rem;">➕ เพิ่ม SOP ในหมวดนี้</button>
        ` : ''}
      </div>
    `;
  } else {
    html += `<div class="sop-grid">`;
    filtered.forEach(item => {
      html += `
        <div class="sop-card" onclick="viewSOPDetail('${item.id}')">
          <div>
            <div class="sop-card-header">
              <span class="sop-category-tag">${getCategoryBadge(item.category)}</span>
              <span style="font-size: 0.75rem; background: rgba(251, 191, 36, 0.15); color: #fbbf24; padding: 0.15rem 0.5rem; border-radius: 10px; font-weight: bold;">v${item.version || '1.0'}</span>
            </div>
            <h3 class="sop-card-title">${item.title}</h3>
            <p class="sop-card-desc">${item.summary || 'ไม่มีคำอธิบายสรุป'}</p>
          </div>

          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">
              👤 โดย: <strong style="color: var(--text-main);">${item.author || 'Admin'}</strong> (${item.updatedAt})
            </div>
            <div class="sop-card-meta">
              <div class="meta-item">⏱️ ${item.cookTime || item.prepTime || '-'}</div>
              <div class="meta-item">📦 ${item.yield || '1 เสิร์ฟ'}</div>
              <div class="meta-item" style="margin-left: auto; color: #fbbf24; font-weight: bold;">อ่านต่อ ➔</div>
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

function viewSOPDetail(sopId) {
  currentActiveSopId = sopId;
  renderSOPDetail(sopId);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderSOPDetail(sopId) {
  const container = document.getElementById("sopContentArea");
  const allSop = getSOPData();
  const sop = allSop.find(item => item.id === sopId);

  if (!sop) {
    currentActiveSopId = null;
    renderSOPList();
    return;
  }

  let html = `
    <div class="sop-detail-view">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
        <button class="back-btn" onclick="backToGrid()">⬅️ กลับไปหน้ารวม SOP</button>
        
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
          <button class="action-btn btn-secondary" onclick="openVersionHistoryModal('${sop.id}')" style="width: auto; padding: 0.5rem 1rem;">
            📜 ประวัติสูตรย้อนหลัง (${sop.versionHistory ? sop.versionHistory.length : 0})
          </button>

          ${sop.ingredients && sop.ingredients.length > 0 ? `
            <button class="action-btn btn-secondary" onclick="openBatchCalculatorModal('${sop.id}')" style="width: auto; padding: 0.5rem 1rem;">
              🧮 คำนวณวัตถุดิบ (Batch Calc)
            </button>
          ` : ''}
          
          ${currentRole === 'admin' ? `
            <button class="action-btn btn-primary admin-only" onclick="openEditSOPModal('${sop.id}')" style="width: auto; padding: 0.5rem 1rem;">
              ✏️ แก้ไข SOP นี้
            </button>
          ` : ''}
        </div>
      </div>

      <div class="sop-detail-header">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
          <span class="sop-category-tag">${getCategoryBadge(sop.category)}</span>
          <span style="background: #f59e0b; color: #000; font-size: 0.8rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 12px;">
            เวอร์ชัน v${sop.version || '1.0'}
          </span>
        </div>
        <h1 class="sop-detail-title">${sop.title}</h1>
        <p style="color: var(--text-muted); font-size: 1rem;">${sop.summary}</p>
        
        <div style="display: flex; gap: 1.5rem; margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted); flex-wrap: wrap; background: rgba(0,0,0,0.2); padding: 0.75rem 1rem; border-radius: 8px;">
          <div>👤 ผู้ปรับปรุงล่าสุด: <strong style="color:#fbbf24;">${sop.author || 'Admin'}</strong></div>
          <div>📅 วันเวลาแก้ไข: <strong style="color:var(--text-main);">${sop.updatedAt}</strong></div>
          <div>📝 หมายเหตุการเปลี่ยน: <strong style="color:var(--text-main);">${sop.changeNotes || 'บันทึกสูตรมาตรฐาน'}</strong></div>
        </div>
      </div>

      <!-- Specs Grid -->
      ${sop.specifications && sop.specifications.length > 0 ? `
        <h3 style="font-size: 1.1rem; color: #fbbf24; margin-bottom: 0.5rem;">⚙️ ค่ามาตรฐานควบคุม (Key Specifications)</h3>
        <div class="specs-grid">
          ${sop.specifications.map(s => `
            <div class="spec-card">
              <span class="spec-label">${s.label}</span>
              <span class="spec-value">${s.value}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Ingredients Box -->
      ${sop.ingredients && sop.ingredients.length > 0 ? `
        <div class="ingredients-box">
          <h3 style="font-size: 1.1rem; color: var(--primary-hover); display: flex; align-items: center; justify-content: space-between;">
            <span>🥗 วัตถุดิบและส่วนผสมมาตรฐาน (Standard Recipe Yield: ${sop.yield || '1 Batch'})</span>
          </h3>
          <ul class="ingredients-list">
            ${sop.ingredients.map(ing => `
              <li class="ingredient-item">
                <span>▪️ ${ing.name}</span>
                <strong style="color: #fbbf24;">${ing.amount} ${ing.unit}</strong>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Step Timeline -->
      <h3 style="font-size: 1.2rem; color: #fbbf24; margin-bottom: 1.25rem;">📝 ขั้นตอนการปฏิบัติงานพร้อมรูปภาพประกอบ (Step-by-Step Procedure)</h3>
      <div class="steps-container">
        ${sop.steps.map(step => `
          <div class="step-card">
            <div class="step-number">${step.stepNumber}</div>
            <div class="step-body">
              <h4 class="step-title">${step.title}</h4>
              <p class="step-desc">${step.description}</p>

              <!-- Step Image Preview -->
              ${step.imageUrl ? `
                <div class="step-image-wrapper" style="margin: 0.75rem 0;" onclick="openImageLightboxByStepId('${sop.id}', ${step.stepNumber})">
                  <img src="${step.imageUrl}" alt="${escapeHtml(step.title)}" class="step-image-thumb" />
                  <div class="step-image-overlay">🔍 คลิกเพื่อขยายรูปภาพตัวอย่าง</div>
                </div>
              ` : ''}

              ${step.tip ? `
                <div class="step-tip">💡 <strong>ข้อควรระวัง / Tip:</strong> ${step.tip}</div>
              ` : ''}

              <div class="step-actions">
                ${step.timerSeconds && step.timerSeconds > 0 ? `
                  <button class="timer-start-btn" onclick="startKitchenTimer(${step.timerSeconds}, '${escapeQuotes(step.title)}')">
                    ⏱️ เริ่มจับเวลา (${formatSeconds(step.timerSeconds)})
                  </button>
                ` : ''}
                
                <label style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: var(--text-muted); cursor: pointer; margin-left: auto;">
                  <input type="checkbox" onchange="toggleStepDone(this)" /> ทำเสร็จแล้ว
                </label>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;
  updateUIPermissions();
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
      <div style="max-width: 90vw; max-height: 90vh; position: relative; text-align: center;" onclick="event.stopPropagation()">
        <img id="lightboxTargetImg" alt="Expanded Step Image" style="max-width: 100%; max-height: 80vh; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); border: 2px solid var(--primary);" />
        <div style="margin-top: 0.75rem; color: #fbbf24; font-size: 1.1rem; font-weight: bold;">${escapeHtml(title)}</div>
        <button onclick="closeModal('lightboxModalOverlay')" style="position: absolute; top: -15px; right: -15px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 36px; height: 36px; font-weight: bold; cursor: pointer; font-size: 1.2rem;">&times;</button>
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
  const card = checkbox.closest('.step-card');
  if (checkbox.checked) {
    card.style.opacity = '0.6';
    card.style.borderLeft = '4px solid var(--accent-green)';
  } else {
    card.style.opacity = '1';
    card.style.borderLeft = '1px solid var(--border-color)';
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

  switch (cat) {
    case "prep": return "🥩 1. หมวดการเตรียมวัตถุดิบ (Ingredient Preparation)";
    case "cooking": return "🍳 2. หมวดการปรุงอาหารและการทอด (Cooking & Frying)";
    case "serving-packaging": return "📦 3. หมวดการเสิร์ฟและการแพ็กอาหาร (Serving & Packaging)";
    case "hygiene": return "🧹 4. หมวดสุขอนามัยและความปลอดภัย (Food Safety & Hygiene)";
    default: return "📖 คู่มือ SOP ทั้งหมด (All Standard Procedures)";
  }
}

function getCategoryBadge(cat) {
  switch (cat) {
    case "prep": return "การเตรียมวัตถุดิบ";
    case "cooking": return "การปรุง/ทอด";
    case "serving-packaging": return "การเสิร์ฟ/แพ็ก";
    case "hygiene": return "สุขอนามัย";
    default: return "ทั่วไป";
  }
}

function getRoleLabel(role) {
  switch (role) {
    case "kitchen": return "🍳 ห้องครัว";
    case "front": return "🛎️ หน้าร้าน/เสิร์ฟ";
    case "admin": return "👑 Admin";
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
  if (!str) return '';
  return str.replace(/'/g, "\\'");
}

function toggleTheme() {
  document.body.classList.toggle("light-theme");
}
