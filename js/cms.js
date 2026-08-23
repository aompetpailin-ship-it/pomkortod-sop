/**
 * ระบบจัดการและแก้ไขข้อมูล SOP (Admin CMS Module)
 * เพิ่มระบบแปลงรูปภาพ HEIC / iPhone / รูปขนาดใหญ่ ให้เป็น JPEG มาตรฐานอัตโนมัติ (Auto Canvas JPEG Converter)
 */

let currentEditingSteps = [];

function openAddSOPModal() {
  try {
    openEditSOPModal(null);
  } catch (err) {
    console.error("Error in openAddSOPModal:", err);
    showToast("เกิดข้อผิดพลาดในการเปิดหน้าเพิ่ม SOP: " + err.message, "error");
  }
}

function openEditSOPModal(sopId = null) {
  try {
    const allSop = getSOPData();
    const subCategories = getSubCategoriesData();
    const currentUser = getCurrentUserSession();
    const currentAuthorName = currentUser ? currentUser.name : "Admin / Owner";

    let item = {
      id: "sop-" + Date.now(),
      title: "",
      category: "prep",
      subCategory: subCategories[0] ? subCategories[0].id : "thigh",
      version: "1.0",
      targetRole: ["kitchen", "front", "admin"],
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      author: currentAuthorName,
      changeNotes: "กำหนดสูตร/ขั้นตอนครั้งแรก",
      versionHistory: [],
      prepTime: "",
      cookTime: "",
      yield: "",
      summary: "",
      tags: [],
      specifications: [],
      ingredients: [],
      steps: [
        { stepNumber: 1, title: "", description: "", imageUrl: "", timerSeconds: 0, tip: "" }
      ]
    };

    if (sopId) {
      const found = allSop.find(s => s.id === sopId);
      if (found) {
        item = JSON.parse(JSON.stringify(found));
      }
    }

    if (!Array.isArray(item.targetRole)) item.targetRole = ["kitchen", "front", "admin"];
    if (!Array.isArray(item.versionHistory)) item.versionHistory = [];
    if (!Array.isArray(item.ingredients)) item.ingredients = [];
    if (!Array.isArray(item.steps)) item.steps = [];
    if (!item.steps.length) item.steps = [{ stepNumber: 1, title: "", description: "", imageUrl: "", timerSeconds: 0, tip: "" }];

    currentEditingSteps = item.steps;

    const isEdit = !!sopId;

    let suggestedVersion = item.version || "1.0";
    if (isEdit) {
      const vParts = String(suggestedVersion).split('.');
      if (vParts.length === 2 && !isNaN(parseInt(vParts[1]))) {
        suggestedVersion = `${vParts[0]}.${parseInt(vParts[1]) + 1}`;
      } else {
        suggestedVersion = suggestedVersion + ".1";
      }
    }

    const modalHtml = `
      <div class="modal-overlay" id="cmsModalOverlay">
        <div class="modal-card" style="max-width: 850px;">
          <div class="modal-header">
            <div>
              <h3 style="font-size: 1.25rem; color: #fbbf24;">${isEdit ? "✏️ แก้ไขคู่มือ SOP & สูตรอาหาร" : "➕ เพิ่มคู่มือ SOP ใหม่"}</h3>
              <span style="font-size: 0.8rem; color: var(--text-muted);">รองรับการแปลงรูปถ่าย iPhone (.HEIC) เป็น JPEG อัตโนมัติ</span>
            </div>
            <button type="button" onclick="closeModal('cmsModalOverlay')" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">&times;</button>
          </div>
          <form id="sopEditorForm" onsubmit="handleSaveSOP(event, '${item.id}')">
            
            <div class="form-group">
              <label class="form-label">ชื่อหัวข้อ SOP *</label>
              <input type="text" id="editTitle" class="form-input" value="${escapeHtml(item.title)}" placeholder="เช่น SOP การเตรียมสะโพกไก่ดิบ หรือ SOP การทอดปีกไก่" />
            </div>

            <!-- Section: Audit Trail & Versioning Fields -->
            <div style="background: rgba(217, 119, 6, 0.1); border: 1px solid rgba(217, 119, 6, 0.3); padding: 1rem; border-radius: 10px; margin-bottom: 1rem;">
              <div style="font-size: 0.85rem; font-weight: 700; color: #fbbf24; margin-bottom: 0.6rem;">📜 ข้อมูลเวอร์ชันและการติดตามผู้ปรับปรุง (Recipe Version & Audit Log)</div>
              <div style="display: grid; grid-template-columns: 140px 1fr 1fr; gap: 0.75rem;">
                <div class="form-group" style="margin:0;">
                  <label class="form-label">เลขเวอร์ชัน (Version)</label>
                  <input type="text" id="editVersion" class="form-input" value="${escapeHtml(suggestedVersion)}" style="text-align: center; font-weight: bold; color: #fbbf24;" />
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label">ผู้ปรับปรุงข้อมูล (Author)</label>
                  <input type="text" id="editAuthor" class="form-input" value="${escapeHtml(currentAuthorName)}" />
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label">หมายเหตุการแก้ไข (Reason/Notes)</label>
                  <input type="text" id="editChangeNotes" class="form-input" placeholder="เช่น ปรับเวลาหมัก, เพิ่มผงหมัก" value="${escapeHtml(isEdit ? 'ปรับปรุงขั้นตอน/สัดส่วนสูตร' : 'กำหนดสูตรครั้งแรก')}" />
                </div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">หมวดหมู่หลัก (Workflow Stage)</label>
                <select id="editCategory" class="form-select" onchange="updateSubCategoryDropdownOptions(this.value)">
                  <option value="prep" ${item.category === 'prep' ? 'selected' : ''}>🥩 1. การเตรียมวัตถุดิบ (Prep)</option>
                  <option value="cooking" ${item.category === 'cooking' ? 'selected' : ''}>🍳 2. การปรุงและการทอด (Cooking & Frying)</option>
                  <option value="serving-packaging" ${item.category === 'serving-packaging' ? 'selected' : ''}>📦 3. การเสิร์ฟและการแพ็ก (Serving & Packaging)</option>
                  <option value="hygiene" ${item.category === 'hygiene' ? 'selected' : ''}>🧹 4. สุขอนามัยและความปลอดภัย (Hygiene)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">หมวดหมู่ย่อย / ชื่อวัตถุดิบหรือกระบวนการ</label>
                <div style="display: flex; gap: 0.4rem;">
                  <select id="editSubCategory" class="form-select"></select>
                  <button type="button" class="action-btn btn-secondary" onclick="openManageSubCategoriesModal()" style="width: auto; padding: 0.4rem 0.8rem; margin: 0; font-size: 0.8rem; white-space: nowrap;">
                    ⚙️ เพิ่มวัตถุดิบใหม่
                  </button>
                </div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
              <div class="form-group">
                <label class="form-label">เวลาเตรียม</label>
                <input type="text" id="editPrepTime" class="form-input" value="${escapeHtml(item.prepTime)}" placeholder="เช่น 15 นาที" />
              </div>
              <div class="form-group">
                <label class="form-label">เวลาทอด/ปรุง</label>
                <input type="text" id="editCookTime" class="form-input" value="${escapeHtml(item.cookTime)}" placeholder="เช่น 8.5 นาที" />
              </div>
              <div class="form-group">
                <label class="form-label">ปริมาณได้ (Yield)</label>
                <input type="text" id="editYield" class="form-input" value="${escapeHtml(item.yield)}" placeholder="เช่น 10 ชิ้น" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">คำอธิบายสรุปภาพรวม (Summary)</label>
              <textarea id="editSummary" class="form-textarea" rows="2" placeholder="สรุปภาพรวมของขั้นตอน SOP นี้">${escapeHtml(item.summary)}</textarea>
            </div>

            <div class="form-group">
              <label class="form-label">สิทธิ์พนักงานที่สามารถมองเห็นได้ (Target Roles)</label>
              <div style="display: flex; gap: 1rem; margin-top: 0.3rem;">
                <label><input type="checkbox" id="roleKitchen" ${item.targetRole.includes('kitchen') ? 'checked' : ''} /> 🍳 ฝ่ายครัว (Kitchen)</label>
                <label><input type="checkbox" id="roleFront" ${item.targetRole.includes('front') ? 'checked' : ''} /> 🛎️ ฝ่ายเสิร์ฟ/หน้าร้าน (Front)</label>
                <label><input type="checkbox" id="roleAdmin" ${item.targetRole.includes('admin') ? 'checked' : ''} /> 👑 Admin/Manager</label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">รายการวัตถุดิบ (รูปแบบ: ชื่อ, ปริมาณ, หน่วย - บรรทัดละ 1 รายการ)</label>
              <textarea id="editIngredientsRaw" class="form-textarea" rows="3" placeholder="สะโพกไก่สด, 1.5, kg&#10;ผงหมักผมขอทอด, 45, g">${formatIngredientsForTextarea(item.ingredients)}</textarea>
            </div>

            <!-- Section: Interactive Step Builder with Image Attachment -->
            <div style="border-top: 1px solid var(--border-color); padding-top: 1.25rem; margin-top: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <div>
                  <h4 style="font-size: 1.1rem; color: #fbbf24;">🖼️ จัดการขั้นตอนและรูปภาพประกอบ (Step Builder)</h4>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">รองรับรูปภาพ JPG, PNG และภาพถ่าย iPhone (แปลงอัตโนมัติ)</span>
                </div>
                <button type="button" class="action-btn btn-secondary" onclick="addNewStepRow()" style="width: auto; padding: 0.4rem 0.8rem;">
                  ➕ เพิ่มขั้นตอนใหม่
                </button>
              </div>

              <div id="stepsBuilderList" style="display: flex; flex-direction: column; gap: 1rem;"></div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
              <div>
                ${isEdit ? `
                  <button type="button" class="action-btn btn-secondary" onclick="openVersionHistoryModal('${item.id}')" style="width:auto; display:inline-flex; margin-right:0.5rem;">
                    📜 ประวัติเวอร์ชัน (${item.versionHistory ? item.versionHistory.length : 0})
                  </button>
                  <button type="button" class="action-btn" style="background:#dc2626; color:white; width:auto; display:inline-flex;" onclick="deleteSOP('${item.id}')">
                    🗑️ ลบ
                  </button>
                ` : ''}
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <button type="button" class="action-btn btn-secondary" onclick="closeModal('cmsModalOverlay')">ยกเลิก</button>
                <button type="submit" class="action-btn btn-primary" style="width:auto;">💾 บันทึก SOP เวอร์ชันใหม่</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;

    const existing = document.getElementById("cmsModalOverlay");
    if (existing) existing.remove();

    document.body.insertAdjacentHTML("beforeend", modalHtml);
    updateSubCategoryDropdownOptions(item.category, item.subCategory);
    renderStepsBuilder();
  } catch (err) {
    console.error("Error in openEditSOPModal:", err);
    showToast("เกิดข้อผิดพลาดในการโหลดหน้าต่างแก้ไข: " + err.message, "error");
  }
}

function updateSubCategoryDropdownOptions(stage, selectedSubId = null) {
  const dropdown = document.getElementById("editSubCategory");
  if (!dropdown) return;

  const allSubs = getSubCategoriesData().filter(s => s.stage === stage);
  let html = "";
  allSubs.forEach(s => {
    const isSel = (selectedSubId && selectedSubId === s.id) ? "selected" : "";
    html += `<option value="${s.id}" ${isSel}>${s.label}</option>`;
  });

  if (!html) {
    html = `<option value="general">ทั่วไป</option>`;
  }

  dropdown.innerHTML = html;
}

function renderStepsBuilder() {
  const container = document.getElementById("stepsBuilderList");
  if (!container) return;

  let html = "";
  currentEditingSteps.forEach((step, index) => {
    html += `
      <div class="step-builder-row" data-index="${index}" style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span style="font-weight: 700; color: var(--primary); font-size: 1rem;">ขั้นตอนที่ ${index + 1}</span>
          ${currentEditingSteps.length > 1 ? `
            <button type="button" onclick="removeStepRow(${index})" style="background: none; border: none; color: #ef4444; font-weight: bold; cursor: pointer;">ลบขั้นตอนนี้ 🗑️</button>
          ` : ''}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 140px; gap: 0.75rem; margin-bottom: 0.75rem;">
          <input type="text" class="form-input step-title-input" placeholder="หัวข้อขั้นตอน เช่น การหมักไก่" value="${escapeHtml(step.title || '')}" />
          <input type="number" class="form-input step-timer-input" placeholder="จับเวลา (วินาที)" value="${step.timerSeconds || ''}" />
        </div>

        <div class="form-group" style="margin-bottom: 0.75rem;">
          <textarea class="form-textarea step-desc-input" rows="2" placeholder="รายละเอียดวิธีการปฏิบัติงานในขั้นตอนนี้...">${escapeHtml(step.description || '')}</textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
          <input type="text" class="form-input step-tip-input" placeholder="💡 ข้อควรระวัง / Tip (ถ้ามี)" value="${escapeHtml(step.tip || '')}" />
          
          <div>
            <div style="display: flex; gap: 0.4rem;">
              <input type="text" class="form-input step-img-input" id="stepImgUrl_${index}" placeholder="URL ภาพ หรืออัปโหลดจากเครื่อง ➔" value="${escapeHtml(step.imageUrl || '')}" style="font-size: 0.8rem;" />
              <label class="action-btn btn-secondary" style="width: auto; padding: 0.4rem 0.6rem; cursor: pointer; white-space: nowrap; margin: 0; font-size: 0.8rem;">
                📁 เลือกภาพ
                <input type="file" accept="image/*,.heic,.heif" style="display: none;" onchange="handleStepImageUpload(event, ${index})" />
              </label>
            </div>
          </div>
        </div>

        ${step.imageUrl ? `
          <div style="margin-top: 0.5rem; display: flex; align-items: center; gap: 0.75rem; background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 8px;">
            <img src="${step.imageUrl}" alt="Preview" style="max-height: 70px; max-width: 120px; border-radius: 6px; object-fit: cover;" />
            <span style="font-size: 0.8rem; color: #10b981;">✓ มีรูปภาพประกอบขั้นตอนนี้แล้ว</span>
            <button type="button" onclick="removeStepImage(${index})" style="margin-left: auto; background: none; border: none; color: #ef4444; cursor: pointer; font-size: 0.8rem;">ลบรูปภาพ</button>
          </div>
        ` : ''}

      </div>
    `;
  });

  container.innerHTML = html;
}

function syncCurrentStepsFromDOM() {
  const stepRows = document.querySelectorAll(".step-builder-row");
  const result = [];
  stepRows.forEach((row, index) => {
    const titleInput = row.querySelector(".step-title-input");
    const timerInput = row.querySelector(".step-timer-input");
    const descInput = row.querySelector(".step-desc-input");
    const tipInput = row.querySelector(".step-tip-input");
    const imgInput = row.querySelector(".step-img-input");

    result.push({
      stepNumber: index + 1,
      title: titleInput ? titleInput.value.trim() : `ขั้นตอนที่ ${index + 1}`,
      description: descInput ? descInput.value.trim() : "",
      imageUrl: imgInput ? imgInput.value.trim() : "",
      timerSeconds: timerInput ? parseInt(timerInput.value) || 0 : 0,
      tip: tipInput ? tipInput.value.trim() : ""
    });
  });
  return result;
}

function addNewStepRow() {
  currentEditingSteps = syncCurrentStepsFromDOM();
  currentEditingSteps.push({
    stepNumber: currentEditingSteps.length + 1,
    title: "",
    description: "",
    imageUrl: "",
    timerSeconds: 0,
    tip: ""
  });
  renderStepsBuilder();
}

function removeStepRow(index) {
  currentEditingSteps = syncCurrentStepsFromDOM();
  currentEditingSteps.splice(index, 1);
  currentEditingSteps.forEach((s, idx) => s.stepNumber = idx + 1);
  renderStepsBuilder();
}

function removeStepImage(index) {
  currentEditingSteps = syncCurrentStepsFromDOM();
  if (currentEditingSteps[index]) {
    currentEditingSteps[index].imageUrl = "";
  }
  renderStepsBuilder();
}

/**
 * ฟังก์ชันจัดการอัปโหลดภาพ พร้อมระบบแปลงไฟล์ HEIC/iPhone เป็น JPEG มาตรฐานอัตโนมัติผ่าน Canvas
 */
function handleStepImageUpload(event, index) {
  const file = event.target.files[0];
  if (!file) return;

  currentEditingSteps = syncCurrentStepsFromDOM();

  showToast("⏳ กำลังประมวลผลและแปลงรูปภาพเป็น JPEG...", "info", 1500);

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      try {
        // ใช้ Canvas แปลงรูปเป็น JPEG มาตรฐาน และบีบอัดขนาดไม่เกิน 1200px
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        const MAX_WIDTH = 1200;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // แปลงเป็น JPEG Data URL คมชัด น้ำหนักเบา แสดงได้ทุกอุปกรณ์ 100%
        const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.85);

        if (currentEditingSteps[index]) {
          currentEditingSteps[index].imageUrl = jpegDataUrl;
        }
        renderStepsBuilder();
        showToast("📸 อัปโหลดและแปลงรูปภาพเป็น JPEG เรียบร้อยแล้ว!");
      } catch (err) {
        console.error("Canvas convert error:", err);
        // Fallback หากแปลง Canvas ล้มเหลว
        if (currentEditingSteps[index]) {
          currentEditingSteps[index].imageUrl = e.target.result;
        }
        renderStepsBuilder();
      }
    };

    img.onerror = () => {
      showToast("⚠️ รูปภาพ .HEIC จาก iPhone ต้องแปลงเป็น JPG ก่อน หรือเปลี่ยนการตั้งค่ากล้องเป็น Most Compatible", "error", 4000);
    };

    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
}

function openManageSubCategoriesModal() {
  try {
    const subCategories = getSubCategoriesData();

    let html = `
      <div class="modal-overlay" id="subCatModalOverlay">
        <div class="modal-card" style="max-width: 650px;">
          <div class="modal-header">
            <h3 style="font-size: 1.25rem; color: #fbbf24;">⚙️ จัดการหมวดหมู่ย่อยและชื่อวัตถุดิบ (Category Builder)</h3>
            <button type="button" onclick="closeModal('subCatModalOverlay')" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">&times;</button>
          </div>
          <div class="modal-body">
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
              คุณสามารถเพิ่มรายชื่อวัตถุดิบดิบใหม่ หรือขั้นตอนการปรุงใหม่ เพื่อรองรับเมนูใหม่ๆ ที่เพิ่มขึ้นในอนาคต
            </p>

            <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 10px; margin-bottom: 1.25rem; border: 1px solid var(--border-color);">
              <h4 style="font-size: 0.95rem; color: var(--primary); margin-bottom: 0.75rem;">➕ เพิ่มวัตถุดิบ / กระบวนการใหม่</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.6rem;">
                <select id="newSubStage" class="form-select">
                  <option value="prep">🥩 1. การเตรียมวัตถุดิบ</option>
                  <option value="cooking">🍳 2. การปรุงและการทอด</option>
                  <option value="serving-packaging">📦 3. การเสิร์ฟและแพ็ก</option>
                  <option value="hygiene">🧹 4. สุขอนามัย</option>
                </select>
                <input type="text" id="newSubLabel" class="form-input" placeholder="เช่น น่องไก่ดิบ, หนังไก่กรอบ" />
                <button type="button" class="action-btn btn-primary" onclick="handleAddSubCategorySubmit()" style="width: auto; padding: 0.6rem 1rem; margin: 0;">เพิ่ม</button>
              </div>
            </div>

            <h4 style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.5rem;">📋 รายการวัตถุดิบและขั้นตอนปัจจุบัน:</h4>
            <div style="max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem;">
              ${subCategories.map(s => `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 0.6rem 0.8rem; border-radius: 8px;">
                  <div>
                    <span style="font-weight: 700; color: #fbbf24;">${s.label}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">(${getStageLabelText(s.stage)})</span>
                  </div>
                  <button type="button" onclick="handleRemoveSubCategory('${s.id}')" style="background: none; border: none; color: #ef4444; font-size: 0.8rem; cursor: pointer;">ลบ 🗑️</button>
                </div>
              `).join('')}
            </div>
          </div>

          <div style="margin-top: 1.5rem; text-align: right;">
            <button type="button" class="action-btn btn-secondary" onclick="closeModal('subCatModalOverlay')" style="width: auto; display: inline-block;">ปิดหน้าต่าง</button>
          </div>
        </div>
      </div>
    `;

    const existing = document.getElementById("subCatModalOverlay");
    if (existing) existing.remove();

    document.body.insertAdjacentHTML("beforeend", html);
  } catch (err) {
    console.error("Error in openManageSubCategoriesModal:", err);
    showToast("เกิดข้อผิดพลาดในการเปิดหน้าจัดการวัตถุดิบ: " + err.message, "error");
  }
}

function handleAddSubCategorySubmit() {
  try {
    const stageEl = document.getElementById("newSubStage");
    const labelEl = document.getElementById("newSubLabel");

    const stage = stageEl ? stageEl.value : "prep";
    const label = labelEl ? labelEl.value.trim() : "";

    if (!label) {
      showToast("⚠️ กรุณาระบุชื่อวัตถุดิบหรือกระบวนการ", "error");
      return;
    }

    addSubCategoryItem(stage, label);
    openManageSubCategoriesModal();
    renderSidebarNavigation();
    renderSOPList();
    
    const editCat = document.getElementById("editCategory");
    if (editCat) updateSubCategoryDropdownOptions(editCat.value);

    showToast(`✅ เพิ่มวัตถุดิบ/กระบวนการ "${label}" เรียบร้อยแล้ว!`);
  } catch (err) {
    console.error("Error adding sub category:", err);
    showToast("เกิดข้อผิดพลาดในการเพิ่มวัตถุดิบ: " + err.message, "error");
  }
}

function handleRemoveSubCategory(id) {
  if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ย่อยนี้?")) {
    removeSubCategoryItem(id);
    openManageSubCategoriesModal();
    renderSidebarNavigation();
    renderSOPList();
    showToast("🗑️ ลบหมวดหมู่ย่อยแล้ว", "info");
  }
}

function getStageLabelText(stage) {
  switch (stage) {
    case "prep": return "การเตรียมวัตถุดิบ";
    case "cooking": return "การปรุงและการทอด";
    case "serving-packaging": return "การเสิร์ฟและการแพ็ก";
    case "hygiene": return "สุขอนามัย";
    default: return stage;
  }
}

function formatIngredientsForTextarea(ingredients = []) {
  if (!ingredients || !ingredients.length) return "";
  return ingredients.map(ing => `${ing.name}, ${ing.amount}, ${ing.unit}`).join("\n");
}

function parseIngredientsFromTextarea(text) {
  const lines = text.split("\n");
  const result = [];
  lines.forEach(line => {
    const parts = line.split(",").map(p => p.trim());
    if (parts[0]) {
      result.push({
        name: parts[0],
        amount: parseFloat(parts[1]) || 1,
        unit: parts[2] || "ชิ้น"
      });
    }
  });
  return result;
}

function handleSaveSOP(event, id) {
  if (event) event.preventDefault();
  
  try {
    const allSop = getSOPData();

    const titleEl = document.getElementById("editTitle");
    const categoryEl = document.getElementById("editCategory");
    const subCategoryEl = document.getElementById("editSubCategory");
    const versionEl = document.getElementById("editVersion");
    const authorEl = document.getElementById("editAuthor");
    const changeNotesEl = document.getElementById("editChangeNotes");
    const prepTimeEl = document.getElementById("editPrepTime");
    const cookTimeEl = document.getElementById("editCookTime");
    const yieldEl = document.getElementById("editYield");
    const summaryEl = document.getElementById("editSummary");

    const title = titleEl && titleEl.value.trim() ? titleEl.value.trim() : "คู่มือ SOP ไก่ทอด";
    const category = categoryEl ? categoryEl.value : "prep";
    const subCategory = subCategoryEl ? subCategoryEl.value : "thigh";
    const version = versionEl && versionEl.value.trim() ? versionEl.value.trim() : "1.0";
    const author = authorEl && authorEl.value.trim() ? authorEl.value.trim() : "Admin";
    const changeNotes = changeNotesEl && changeNotesEl.value.trim() ? changeNotesEl.value.trim() : "ปรับปรุงขั้นตอน/สูตรอาหาร";
    const prepTime = prepTimeEl ? prepTimeEl.value.trim() : "";
    const cookTime = cookTimeEl ? cookTimeEl.value.trim() : "";
    const yieldVal = yieldEl ? yieldEl.value.trim() : "";
    const summary = summaryEl ? summaryEl.value.trim() : "";

    const targetRole = [];
    if (document.getElementById("roleKitchen")?.checked) targetRole.push("kitchen");
    if (document.getElementById("roleFront")?.checked) targetRole.push("front");
    if (document.getElementById("roleAdmin")?.checked) targetRole.push("admin");

    const ingredients = parseIngredientsFromTextarea(document.getElementById("editIngredientsRaw")?.value || "");

    const steps = syncCurrentStepsFromDOM();

    const existingIndex = allSop.findIndex(s => s.id === id);
    let versionHistory = [];

    if (existingIndex >= 0) {
      const existingSop = allSop[existingIndex];
      versionHistory = Array.isArray(existingSop.versionHistory) ? existingSop.versionHistory : [];

      const oldSnapshot = JSON.parse(JSON.stringify(existingSop));
      delete oldSnapshot.versionHistory;

      versionHistory.unshift({
        version: existingSop.version || "1.0",
        updatedAt: existingSop.updatedAt || new Date().toISOString().replace('T', ' ').substring(0, 16),
        author: existingSop.author || "Admin",
        changeNotes: existingSop.changeNotes || "สูตรเวอร์ชันก่อนหน้า",
        snapshot: oldSnapshot
      });
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const sopObj = {
      id: id,
      title: title,
      category: category,
      subCategory: subCategory,
      version: version,
      updatedAt: nowStr,
      author: author,
      changeNotes: changeNotes,
      versionHistory: versionHistory,
      targetRole: targetRole.length ? targetRole : ["kitchen", "front", "admin"],
      prepTime: prepTime || "10 นาที",
      cookTime: cookTime || "-",
      yield: yieldVal || "1 เสิร์ฟ",
      summary: summary,
      tags: [category, subCategory, title.substring(0, 10)],
      specifications: [
        { label: "เวลาเตรียม", value: prepTime || "10 นาที" },
        { label: "เวลาปรุง/ทอด", value: cookTime || "-" }
      ],
      ingredients: ingredients,
      steps: steps.length ? steps : [{ stepNumber: 1, title: "ขั้นตอนปฏิบัติ", description: summary, imageUrl: "", timerSeconds: 0, tip: "" }]
    };

    if (existingIndex >= 0) {
      allSop[existingIndex] = sopObj;
    } else {
      allSop.push(sopObj);
    }

    saveSOPData(allSop);
    
    closeModal("cmsModalOverlay");

    renderSidebarNavigation();
    renderSOPList();

    showToast(`💾 บันทึก SOP เวอร์ชัน v${version} เรียบร้อยแล้ว!`);
  } catch (err) {
    console.error("Error saving SOP:", err);
    showToast("เกิดข้อผิดพลาดในการบันทึก: " + err.message, "error");
  }
}

function deleteSOP(id) {
  if (confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบ SOP นี้ออกจากระบบ?")) {
    const allSop = getSOPData().filter(s => s.id !== id);
    saveSOPData(allSop);
    closeModal("cmsModalOverlay");
    renderSidebarNavigation();
    renderSOPList();
    showToast("🗑️ ลบข้อมูลเรียบร้อยแล้ว", "error");
  }
}

function exportSOPJSON() {
  const data = getSOPData();
  const subCats = getSubCategoriesData();
  const exportPayload = { sopList: data, subCategories: subCats };
  
  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PomKhorThod_SOP_Full_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  showToast("📤 ส่งออกไฟล์สำรอง JSON แล้ว");
}

function importSOPJSON() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.sopList && Array.isArray(imported.sopList)) {
          saveSOPData(imported.sopList);
          if (imported.subCategories) saveSubCategoriesData(imported.subCategories);
          renderSidebarNavigation();
          renderSOPList();
          showToast("📥 นำเข้าข้อมูล SOP และประวัติสูตรสำเร็จแล้ว!");
        } else if (Array.isArray(imported)) {
          saveSOPData(imported);
          renderSidebarNavigation();
          renderSOPList();
          showToast("📥 นำเข้าข้อมูล SOP สำเร็จแล้ว!");
        } else {
          showToast("รูปแบบไฟล์ JSON ไม่ถูกต้อง", "error");
        }
      } catch (err) {
        showToast("เกิดข้อผิดพลาดในการอ่านไฟล์ JSON", "error");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function resetToDefaultSOP() {
  if (confirm("⚠️ คุณต้องการรีเซ็ตข้อมูล SOP และหมวดหมู่ย่อยทั้งหมดกลับเป็นค่าเริ่มต้นใช่หรือไม่?")) {
    localStorage.removeItem("PKT_SOP_DATA_V6");
    localStorage.removeItem("PKT_SUB_CATEGORIES_V1");
    renderSidebarNavigation();
    renderSOPList();
    showToast("🔄 รีเซ็ตข้อมูล SOP กลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว", "info");
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.remove();
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
