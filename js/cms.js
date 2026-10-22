/**
 * ✏️ ระบบจัดการและแก้ไขข้อมูล SOP (Admin CMS Module V30)
 * รองรับ 7 หมวดหมู่แฟรนไชส์, การแนบวิดีโอสอนทำอาหาร (YouTube/Drive/MP4), มุมกล้อง POV/Top-down,
 * ตาราง Pass vs Fail, การแก้ปัญหาเฉพาะหน้า (Troubleshooting) และการบีบอัดภาพ WebP คมชัดสูงขึ้น Firebase Cloud
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
      docCode: "SOP-OPS-" + String(allSop.length + 1).padStart(3, "0"),
      title: "",
      category: currentCategory && currentCategory !== "all" ? currentCategory : "stage-2-prep",
      subCategory: subCategories[0] ? subCategories[0].id : "thigh",
      version: "1.0",
      targetRole: ["kitchen", "front", "admin"],
      updatedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      author: currentAuthorName,
      changeNotes: "กำหนดสูตร/ขั้นตอนมาตรฐาน",
      versionHistory: [],
      prepTime: "",
      cookTime: "",
      yield: "",
      sellingPrice: 0,
      summary: "",
      tags: [],
      specifications: [],
      qualityChecks: [],
      troubleshooting: [],
      ingredients: [],
      steps: [
        { stepNumber: 1, title: "", description: "", imageUrl: "", videoUrl: "", cameraAngle: "POV (มุมสายตาตัวเอง)", timerSeconds: 0, tip: "" }
      ]
    };

    if (sopId) {
      const found = allSop.find(s => s.id === sopId);
      if (found) {
        item = JSON.parse(JSON.stringify(found));
      }
    }

    item.category = normalizeCategoryStage(item.category);
    if (!Array.isArray(item.targetRole)) item.targetRole = ["kitchen", "front", "admin"];
    if (!Array.isArray(item.versionHistory)) item.versionHistory = [];
    if (!Array.isArray(item.ingredients)) item.ingredients = [];
    if (!Array.isArray(item.qualityChecks)) item.qualityChecks = [];
    if (!Array.isArray(item.troubleshooting)) item.troubleshooting = [];
    if (!Array.isArray(item.steps) || !item.steps.length) {
      item.steps = [{ stepNumber: 1, title: "", description: "", imageUrl: "", videoUrl: "", cameraAngle: "POV (มุมสายตาตัวเอง)", timerSeconds: 0, tip: "" }];
    }

    currentEditingSteps = item.steps;
    const isEdit = !!sopId;

    let suggestedVersion = item.version || "1.0";
    if (isEdit) {
      const vParts = String(suggestedVersion).split(".");
      if (vParts.length === 2 && !isNaN(parseInt(vParts[1]))) {
        suggestedVersion = `${vParts[0]}.${parseInt(vParts[1]) + 1}`;
      } else {
        suggestedVersion = suggestedVersion + ".1";
      }
    }

    const modalHtml = `
      <div class="modal-overlay" id="cmsModalOverlay">
        <div class="modal-card" style="max-width: 900px;">
          <div class="modal-header">
            <div>
              <h3 style="font-size: 1.3rem; color: #b45309;">${isEdit ? "✏️ แก้ไขคู่มือ SOP & มาตรฐานแฟรนไชส์" : "➕ เพิ่มคู่มือ SOP ใหม่"}</h3>
              <span style="font-size: 0.82rem; color: var(--text-muted);">รองรับการแนบรูปภาพความละเอียดสูง คลิปวิดีโอสั้น และซิงค์ขึ้น Cloud อัตโนมัติ</span>
            </div>
            <button type="button" onclick="closeModal('cmsModalOverlay')" style="background:none; border:none; color:var(--text-main); font-size:1.6rem; cursor:pointer;">&times;</button>
          </div>
          <form id="sopEditorForm" onsubmit="handleSaveSOP(event, '${item.id}')">
            
            <div style="display: grid; grid-template-columns: 180px 1fr; gap: 0.85rem;">
              <div class="form-group">
                <label class="form-label">รหัสเอกสาร (Doc Code)</label>
                <input type="text" id="editDocCode" class="form-input" value="${escapeHtml(item.docCode || 'SOP-OPS-001')}" placeholder="เช่น SOP-OPS-003" style="font-weight: 800;" />
              </div>
              <div class="form-group">
                <label class="form-label">ชื่อหัวข้อ SOP *</label>
                <input type="text" id="editTitle" class="form-input" value="${escapeHtml(item.title)}" placeholder="เช่น SOP กระบวนการคลุกแป้งและทอดไก่" required />
              </div>
            </div>

            <!-- Section: Audit Trail & Versioning Fields -->
            <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 1rem; border-radius: 12px; margin-bottom: 1rem;">
              <div style="font-size: 0.85rem; font-weight: 800; color: #b45309; margin-bottom: 0.6rem;">📜 ข้อมูลเวอร์ชันและการติดตามผู้ปรับปรุง (Recipe Version & Audit Log)</div>
              <div style="display: grid; grid-template-columns: 130px 1fr 1fr; gap: 0.75rem;">
                <div class="form-group" style="margin:0;">
                  <label class="form-label">เลขเวอร์ชัน</label>
                  <input type="text" id="editVersion" class="form-input" value="${escapeHtml(suggestedVersion)}" style="text-align: center; font-weight: 800; color: #b45309;" />
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label">ผู้ปรับปรุงข้อมูล (Author)</label>
                  <input type="text" id="editAuthor" class="form-input" value="${escapeHtml(currentAuthorName)}" />
                </div>
                <div class="form-group" style="margin:0;">
                  <label class="form-label">หมายเหตุการแก้ไข</label>
                  <input type="text" id="editChangeNotes" class="form-input" value="${escapeHtml(isEdit ? 'ปรับปรุงขั้นตอน/สัดส่วนสูตร' : 'กำหนดสูตรมาตรฐาน')}" />
                </div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">หมวดหมู่หลัก 7 ไทม์ไลน์ (Workflow Stage)</label>
                <select id="editCategory" class="form-select" onchange="updateSubCategoryDropdownOptions(this.value)">
                  <option value="stage-1-opening" ${item.category === 'stage-1-opening' ? 'selected' : ''}>🌅 หมวดที่ 1: ขั้นตอนการเปิดร้าน (Opening)</option>
                  <option value="stage-2-prep" ${item.category === 'stage-2-prep' ? 'selected' : ''}>🥩 หมวดที่ 2: การรับและเตรียมวัตถุดิบ (Raw Material & Prep)</option>
                  <option value="stage-3-frying" ${item.category === 'stage-3-frying' ? 'selected' : ''}>🔥 หมวดที่ 3: กระบวนการคลุกแป้งและทอด (Coating & Frying)</option>
                  <option value="stage-4-packing" ${item.category === 'stage-4-packing' ? 'selected' : ''}>📦 หมวดที่ 4: การจัดเก็บ คลุกซอส และแพ็กเกจจิ้ง (Holding & Packing)</option>
                  <option value="stage-5-delivery" ${item.category === 'stage-5-delivery' ? 'selected' : ''}>🛵 หมวดที่ 5: การบริการหน้าร้านและเดลิเวอรี (FOH & Delivery)</option>
                  <option value="stage-6-oil" ${item.category === 'stage-6-oil' ? 'selected' : ''}>🛢️ หมวดที่ 6: การจัดการน้ำมันและอุปกรณ์ (Oil & Equipment Care)</option>
                  <option value="stage-7-closing" ${item.category === 'stage-7-closing' ? 'selected' : ''}>🌙 หมวดที่ 7: ขั้นตอนการปิดร้าน (Closing Procedures)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">หมวดหมู่ย่อย / สเตชันย่อย</label>
                <div style="display: flex; gap: 0.4rem;">
                  <select id="editSubCategory" class="form-select"></select>
                  <button type="button" class="action-btn btn-secondary" onclick="openManageSubCategoriesModal()" style="width: auto; padding: 0.4rem 0.8rem; margin: 0; font-size: 0.8rem; white-space: nowrap;">
                    ⚙️ เพิ่มหมวดย่อย
                  </button>
                </div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.75rem;">
              <div class="form-group">
                <label class="form-label">เวลาเตรียม (Prep Time)</label>
                <input type="text" id="editPrepTime" class="form-input" value="${escapeHtml(item.prepTime)}" placeholder="เช่น 15 นาที" />
              </div>
              <div class="form-group">
                <label class="form-label">เวลาทอด/ปรุง (Cook Time)</label>
                <input type="text" id="editCookTime" class="form-input" value="${escapeHtml(item.cookTime)}" placeholder="เช่น 11:30 - 12:00 นาที" />
              </div>
              <div class="form-group">
                <label class="form-label">ปริมาณได้ (Yield)</label>
                <input type="text" id="editYield" class="form-input" value="${escapeHtml(item.yield)}" placeholder="เช่น 12 ชิ้น" />
              </div>
              <div class="form-group">
                <label class="form-label">มูลค่าขาย/Batch (คำนวณ GP)</label>
                <input type="number" id="editSellingPrice" class="form-input" value="${item.sellingPrice || 0}" placeholder="เช่น 450" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">คำอธิบายสรุปภาพรวม (Summary)</label>
              <textarea id="editSummary" class="form-textarea" rows="2" placeholder="สรุปเป้าหมายและจุดสำคัญของ SOP นี้">${escapeHtml(item.summary)}</textarea>
            </div>

            <div class="form-group">
              <label class="form-label">สิทธิ์พนักงานที่สามารถมองเห็นได้ (Target Roles)</label>
              <div style="display: flex; gap: 1.25rem; margin-top: 0.3rem; flex-wrap: wrap;">
                <label><input type="checkbox" id="roleKitchen" ${item.targetRole.includes('kitchen') ? 'checked' : ''} /> 🍳 ฝ่ายครัว & สเตชันทอด (Kitchen)</label>
                <label><input type="checkbox" id="roleFront" ${item.targetRole.includes('front') ? 'checked' : ''} /> 🛎️ ฝ่ายหน้าร้าน & แพ็กเดลิเวอรี (Front)</label>
                <label><input type="checkbox" id="roleAdmin" ${item.targetRole.includes('admin') ? 'checked' : ''} /> 👑 ผู้บริหาร / ผู้จัดการ (Admin)</label>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">🥗 รายการวัตถุดิบ (รูปแบบ: ชื่อ, ปริมาณ, หน่วย - บรรทัดละ 1 รายการ)</label>
                <textarea id="editIngredientsRaw" class="form-textarea" rows="3" placeholder="สะโพกไก่สดตัดแต่ง (130-150g/ชิ้น), 1500, g&#10;ผงหมักสูตรเข้มข้น ผมขอทอด, 45, g">${formatIngredientsForTextarea(item.ingredients)}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">⚙️ ค่ามาตรฐานจุดวิกฤต (รูปแบบ: หัวข้อ : ค่ามาตรฐาน - บรรทัดละ 1 ข้อ)</label>
                <textarea id="editSpecsRaw" class="form-textarea" rows="3" placeholder="อุณหภูมิน้ำมัน : 165°C&#10;อุณหภูมิแกนกลาง : ≥ 74°C">${formatSpecsForTextarea(item.specifications)}</textarea>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">✅ เกณฑ์ผ่าน vs ไม่ผ่าน (รูปแบบ: หัวข้อ | ผ่าน | ไม่ผ่าน - บรรทัดละ 1 ข้อ)</label>
                <textarea id="editQualityRaw" class="form-textarea" rows="3" placeholder="สีผิวไก่ | เหลืองทองสม่ำเสมอ | สีน้ำตาลไหม้หรือด่างขาว">${formatQualityChecksForTextarea(item.qualityChecks)}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">🛠️ การแก้ปัญหาหน้างาน (รูปแบบ: ปัญหา | วิธีแก้ไข - บรรทัดละ 1 ข้อ)</label>
                <textarea id="editTroubleRaw" class="form-textarea" rows="3" placeholder="แป้งนิ่มอมน้ำมัน | เช็กว่าใส่ไก่เกิน 12 ชิ้นหรือน้ำมันยังไม่ถึง 165°C">${formatTroubleshootingForTextarea(item.troubleshooting)}</textarea>
              </div>
            </div>

            <!-- Section: Interactive Step Builder with Image & Video Attachment -->
            <div style="border-top: 1px solid var(--border-color); padding-top: 1.25rem; margin-top: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <div>
                  <h4 style="font-size: 1.1rem; color: #b45309; font-weight: 800;">🖼️ จัดการขั้นตอน รูปภาพ และวิดีโอสั้น (Step & Media Builder)</h4>
                  <span style="font-size: 0.78rem; color: var(--text-muted);">รองรับไฟล์ภาพ JPG, PNG, ภาพถ่าย iPhone (.HEIC) และลิงก์วิดีโอ YouTube / Google Drive / MP4</span>
                </div>
                <button type="button" class="action-btn btn-secondary" onclick="addNewStepRow()" style="width: auto; padding: 0.45rem 0.95rem;">
                  ➕ เพิ่มขั้นตอนใหม่
                </button>
              </div>

              <div id="stepsBuilderList" style="display: flex; flex-direction: column; gap: 1rem;"></div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem; flex-wrap: wrap; gap: 0.75rem;">
              <div>
                ${isEdit ? `
                  <button type="button" class="action-btn btn-secondary" onclick="openVersionHistoryModal('${item.id}')" style="width:auto; display:inline-flex; margin-right:0.5rem;">
                    📜 ประวัติเวอร์ชัน (${item.versionHistory ? item.versionHistory.length : 0})
                  </button>
                  <button type="button" class="action-btn" style="background:#dc2626; color:white; width:auto; display:inline-flex;" onclick="deleteSOP('${item.id}')">
                    🗑️ ลบคู่มือนี้
                  </button>
                ` : ''}
              </div>
              <div style="display: flex; gap: 0.6rem;">
                <button type="button" class="action-btn btn-secondary" onclick="closeModal('cmsModalOverlay')" style="width:auto;">ยกเลิก</button>
                <button type="submit" class="action-btn btn-primary" style="width:auto;">💾 บันทึก SOP และซิงค์ขึ้น Cloud</button>
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

  const normStage = normalizeCategoryStage(stage);
  const allSubs = getSubCategoriesData().filter(s => normalizeCategoryStage(s.stage) === normStage);
  let html = "";
  allSubs.forEach(s => {
    const isSel = selectedSubId && selectedSubId === s.id ? "selected" : "";
    html += `<option value="${s.id}" ${isSel}>${escapeHtml(s.label)}</option>`;
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
    const angle = step.cameraAngle || "POV (มุมสายตาตัวเอง)";
    html += `
      <div class="step-builder-row" data-index="${index}" style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 1.1rem; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span style="font-weight: 800; color: #b45309; font-size: 1rem;">ขั้นตอนที่ ${index + 1}</span>
          ${currentEditingSteps.length > 1 ? `
            <button type="button" onclick="removeStepRow(${index})" style="background: none; border: none; color: #dc2626; font-weight: 800; cursor: pointer;">ลบขั้นตอนนี้ 🗑️</button>
          ` : ''}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 210px 130px; gap: 0.65rem; margin-bottom: 0.65rem;">
          <input type="text" class="form-input step-title-input" placeholder="หัวข้อขั้นตอน เช่น การคลุกแป้งรอบที่ 2 (Fold & Roll)" value="${escapeHtml(step.title || '')}" style="background:#fff;" />
          <select class="form-select step-angle-input" style="background:#fff; font-size:0.85rem;">
            <option value="POV (มุมสายตาตัวเอง)" ${angle.includes('POV') ? 'selected' : ''}>👁️ มุมกล้อง: POV (สายตาคนทำ)</option>
            <option value="Top-down 90° (มุมบน)" ${angle.includes('Top-down') ? 'selected' : ''}>📐 มุมกล้อง: Top-down 90°</option>
            <option value="Side-Angle / Close-up" ${angle.includes('Side-Angle') ? 'selected' : ''}>🔍 มุมกล้อง: Side-Angle ระยะใกล้</option>
          </select>
          <input type="number" class="form-input step-timer-input" placeholder="จับเวลา (วินาที)" value="${step.timerSeconds || ''}" style="background:#fff;" />
        </div>

        <div class="form-group" style="margin-bottom: 0.65rem;">
          <textarea class="form-textarea step-desc-input" rows="2" placeholder="รายละเอียดวิธีการปฏิบัติงานแบบระบุตัวเลขชัดเจน..." style="background:#fff;">${escapeHtml(step.description || '')}</textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; margin-bottom: 0.65rem;">
          <input type="text" class="form-input step-tip-input" placeholder="💡 จุดสังเกต / ข้อห้าม (Do's & Don'ts)" value="${escapeHtml(step.tip || '')}" style="background:#fff;" />
          <input type="text" class="form-input step-video-input" placeholder="🎬 ลิงก์วิดีโอสั้น YouTube / Google Drive / MP4 (ถ้ามี)" value="${escapeHtml(step.videoUrl || '')}" style="background:#fff; font-size:0.85rem;" />
        </div>

        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <input type="text" class="form-input step-img-input" id="stepImgUrl_${index}" placeholder="URL รูปภาพ หรือกดปุ่มอัปโหลดจากมือถือ/คอมพิวเตอร์ ➔" value="${escapeHtml(step.imageUrl || '')}" style="font-size: 0.82rem; background:#fff;" />
          <label class="action-btn btn-secondary" style="width: auto; padding: 0.5rem 0.9rem; cursor: pointer; white-space: nowrap; margin: 0; font-size: 0.82rem; background:#fff;">
            📸 อัปโหลดรูปภาพ
            <input type="file" accept="image/*,.heic,.heif" style="display: none;" onchange="handleStepImageUpload(event, ${index})" />
          </label>
        </div>

        ${step.imageUrl ? `
          <div style="margin-top: 0.6rem; display: flex; align-items: center; gap: 0.75rem; background: #ffffff; border: 1px solid var(--border-color); padding: 0.5rem 0.75rem; border-radius: 10px;">
            <img src="${step.imageUrl}" alt="Preview" style="height: 64px; width: 110px; border-radius: 6px; object-fit: cover;" />
            <span style="font-size: 0.82rem; color: #059669; font-weight: 700;">✓ แนบรูปภาพประกอบขั้นตอนนี้แล้ว</span>
            <button type="button" onclick="removeStepImage(${index})" style="margin-left: auto; background: none; border: none; color: #dc2626; cursor: pointer; font-size: 0.82rem; font-weight: 700;">ลบรูปภาพ</button>
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
    const angleInput = row.querySelector(".step-angle-input");
    const timerInput = row.querySelector(".step-timer-input");
    const descInput = row.querySelector(".step-desc-input");
    const tipInput = row.querySelector(".step-tip-input");
    const videoInput = row.querySelector(".step-video-input");
    const imgInput = row.querySelector(".step-img-input");

    result.push({
      stepNumber: index + 1,
      title: titleInput ? titleInput.value.trim() : `ขั้นตอนที่ ${index + 1}`,
      cameraAngle: angleInput ? angleInput.value : "POV (มุมสายตาตัวเอง)",
      description: descInput ? descInput.value.trim() : "",
      imageUrl: imgInput ? imgInput.value.trim() : "",
      videoUrl: videoInput ? videoInput.value.trim() : "",
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
    cameraAngle: "POV (มุมสายตาตัวเอง)",
    description: "",
    imageUrl: "",
    videoUrl: "",
    timerSeconds: 0,
    tip: ""
  });
  renderStepsBuilder();
}

function removeStepRow(index) {
  currentEditingSteps = syncCurrentStepsFromDOM();
  currentEditingSteps.splice(index, 1);
  currentEditingSteps.forEach((s, idx) => (s.stepNumber = idx + 1));
  renderStepsBuilder();
}

function removeStepImage(index) {
  currentEditingSteps = syncCurrentStepsFromDOM();
  if (currentEditingSteps[index]) {
    currentEditingSteps[index].imageUrl = "";
  }
  renderStepsBuilder();
}

async function handleStepImageUpload(event, index) {
  let file = event.target.files[0];
  if (!file) return;

  currentEditingSteps = syncCurrentStepsFromDOM();
  showToast("⏳ กำลังประมวลผลและปรับความคมชัดรูปภาพ...", "info", 2000);

  const fileNameLower = file.name ? file.name.toLowerCase() : "";
  const isHeic = fileNameLower.endsWith(".heic") || fileNameLower.endsWith(".heif") || (file.type && file.type.toLowerCase().includes("heic"));

  if (isHeic && typeof window.heic2any === "function") {
    try {
      showToast("📱 กำลังแปลงรูปภาพ .HEIC จาก iPhone...", "info", 2500);
      const convertedBlob = await window.heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.78
      });
      file = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    } catch (heicErr) {
      console.error("HEIC conversion error:", heicErr);
      showToast("⚠️ ไม่สามารถแปลงไฟล์ .HEIC ได้ กรุณาเลือกไฟล์ JPG หรือ PNG", "error", 4000);
      return;
    }
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = async () => {
      try {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        const MAX_WIDTH = 720;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // บีบอัดเป็น WebP ความคมชัดสูง (Fallback เป็น JPEG)
        let compressedDataUrl = canvas.toDataURL("image/webp", 0.72);
        if (!compressedDataUrl || compressedDataUrl.length < 50) {
          compressedDataUrl = canvas.toDataURL("image/jpeg", 0.72);
        }

        if (currentEditingSteps[index]) {
          currentEditingSteps[index].imageUrl = compressedDataUrl;
        }
        renderStepsBuilder();
        showToast("📸 อัปโหลดรูปภาพความละเอียดสูงเรียบร้อยแล้ว!");
      } catch (err) {
        if (currentEditingSteps[index]) {
          currentEditingSteps[index].imageUrl = e.target.result;
        }
        renderStepsBuilder();
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// =========================================================================
// Textarea Parsers & Formatters สำหรับ Ingredients, Specs, Pass/Fail, Troubleshooting
// =========================================================================

function formatIngredientsForTextarea(ingredients = []) {
  if (!ingredients || !ingredients.length) return "";
  return ingredients.map(ing => `${ing.name}, ${ing.amount}, ${ing.unit}`).join("\n");
}

function parseIngredientsFromTextarea(text) {
  if (!text) return [];
  return text.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
    const parts = line.split(",").map(p => p.trim());
    return {
      name: parts[0] || "วัตถุดิบ",
      amount: parseFloat(parts[1]) || 1,
      unit: parts[2] || "g"
    };
  });
}

function formatSpecsForTextarea(specs = []) {
  if (!specs || !specs.length) return "";
  return specs.map(s => `${s.label} : ${s.value}`).join("\n");
}

function parseSpecsFromTextarea(text) {
  if (!text) return [];
  return text.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
    const parts = line.split(":").map(p => p.trim());
    return {
      label: parts[0] || "หัวข้อ",
      value: parts.slice(1).join(": ") || "-"
    };
  });
}

function formatQualityChecksForTextarea(checks = []) {
  if (!checks || !checks.length) return "";
  return checks.map(c => `${c.topic} | ${c.pass} | ${c.fail}`).join("\n");
}

function parseQualityChecksFromTextarea(text) {
  if (!text) return [];
  return text.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
    const parts = line.split("|").map(p => p.trim());
    return {
      topic: parts[0] || "จุดตรวจ",
      pass: parts[1] || "ผ่านเกณฑ์",
      fail: parts[2] || "ไม่ผ่านเกณฑ์"
    };
  });
}

function formatTroubleshootingForTextarea(list = []) {
  if (!list || !list.length) return "";
  return list.map(t => `${t.problem} | ${t.solution}`).join("\n");
}

function parseTroubleshootingFromTextarea(text) {
  if (!text) return [];
  return text.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
    const parts = line.split("|").map(p => p.trim());
    return {
      problem: parts[0] || "ปัญหาที่พบ",
      solution: parts[1] || "แนวทางแก้ไข"
    };
  });
}

async function handleSaveSOP(event, id) {
  if (event) event.preventDefault();

  try {
    const allSop = getSOPData();

    const docCode = document.getElementById("editDocCode")?.value.trim() || "SOP-OPS";
    const title = document.getElementById("editTitle")?.value.trim() || "คู่มือ SOP ร้านผมขอทอด";
    const category = document.getElementById("editCategory")?.value || "stage-2-prep";
    const subCategory = document.getElementById("editSubCategory")?.value || "thigh";
    const version = document.getElementById("editVersion")?.value.trim() || "1.0";
    const author = document.getElementById("editAuthor")?.value.trim() || "Admin";
    const changeNotes = document.getElementById("editChangeNotes")?.value.trim() || "ปรับปรุงมาตรฐาน";
    const prepTime = document.getElementById("editPrepTime")?.value.trim() || "10 นาที";
    const cookTime = document.getElementById("editCookTime")?.value.trim() || "-";
    const yieldVal = document.getElementById("editYield")?.value.trim() || "1 Batch";
    const sellingPrice = parseFloat(document.getElementById("editSellingPrice")?.value) || 0;
    const summary = document.getElementById("editSummary")?.value.trim() || "";

    const targetRole = [];
    if (document.getElementById("roleKitchen")?.checked) targetRole.push("kitchen");
    if (document.getElementById("roleFront")?.checked) targetRole.push("front");
    if (document.getElementById("roleAdmin")?.checked) targetRole.push("admin");

    const ingredients = parseIngredientsFromTextarea(document.getElementById("editIngredientsRaw")?.value || "");
    const specifications = parseSpecsFromTextarea(document.getElementById("editSpecsRaw")?.value || "");
    const qualityChecks = parseQualityChecksFromTextarea(document.getElementById("editQualityRaw")?.value || "");
    const troubleshooting = parseTroubleshootingFromTextarea(document.getElementById("editTroubleRaw")?.value || "");
    const steps = syncCurrentStepsFromDOM();

    const existingIndex = allSop.findIndex(s => s.id === id);
    let versionHistory = [];
    let matrixTitle = "";
    let matrixHeaders = [];
    let matrixRows = [];

    if (existingIndex >= 0) {
      const existingSop = allSop[existingIndex];
      versionHistory = Array.isArray(existingSop.versionHistory) ? existingSop.versionHistory : [];
      matrixTitle = existingSop.matrixTitle || "";
      matrixHeaders = existingSop.matrixHeaders || [];
      matrixRows = existingSop.matrixRows || [];

      const oldSnapshot = JSON.parse(JSON.stringify(existingSop));
      delete oldSnapshot.versionHistory;

      versionHistory.unshift({
        version: existingSop.version || "1.0",
        updatedAt: existingSop.updatedAt || new Date().toISOString().replace("T", " ").substring(0, 16),
        author: existingSop.author || "Admin",
        changeNotes: existingSop.changeNotes || "เวอร์ชันก่อนหน้า",
        snapshot: oldSnapshot
      });
    }

    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16);

    const sopObj = {
      id,
      docCode,
      title,
      category,
      subCategory,
      version,
      updatedAt: nowStr,
      author,
      changeNotes,
      versionHistory,
      targetRole: targetRole.length ? targetRole : ["kitchen", "front", "admin"],
      prepTime,
      cookTime,
      yield: yieldVal,
      sellingPrice,
      summary,
      tags: [category, subCategory, docCode, title.substring(0, 15)],
      specifications: specifications.length ? specifications : [
        { label: "เวลาเตรียม", value: prepTime },
        { label: "เวลาปรุง/ทอด", value: cookTime }
      ],
      matrixTitle,
      matrixHeaders,
      matrixRows,
      qualityChecks,
      troubleshooting,
      ingredients,
      steps: steps.length ? steps : [{ stepNumber: 1, title: "ขั้นตอนปฏิบัติ", description: summary, imageUrl: "", videoUrl: "", cameraAngle: "POV (มุมสายตาตัวเอง)", timerSeconds: 0, tip: "" }]
    };

    if (existingIndex >= 0) {
      allSop[existingIndex] = sopObj;
    } else {
      allSop.push(sopObj);
    }

    saveSOPData(allSop);
    closeModal("cmsModalOverlay");

    renderSidebarNavigation();
    renderMainView();

    showToast(`☁️ บันทึกและซิงค์คู่มือ ${docCode} (v${version}) เรียบร้อยแล้ว!`);
  } catch (err) {
    console.error("Error saving SOP:", err);
    showToast("เกิดข้อผิดพลาดในการบันทึก: " + err.message, "error");
  }
}

async function deleteSOP(id, fallbackIdx) {
  if (confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบคู่มือ SOP นี้ออกจากระบบ?")) {
    let allSop = getSOPData();

    if (id && !id.startsWith("temp-") && id !== "undefined") {
      allSop = allSop.filter(s => s && s.id !== id && s.title !== "undefined");
    } else if (typeof fallbackIdx === "number" && fallbackIdx >= 0 && allSop[fallbackIdx]) {
      allSop.splice(fallbackIdx, 1);
    }

    saveSOPData(allSop);

    if (typeof isFirebaseConfigured === "function" && isFirebaseConfigured() && id) {
      await firestoreDeleteDocument("pkt_sops", id);
    }

    const client = initSupabaseClient();
    if (client && id && !id.startsWith("temp-")) {
      try { await client.from("sop_data").delete().eq("id", id); } catch (e) {}
    }

    closeModal("cmsModalOverlay");
    if (typeof backToGrid === "function") backToGrid();
    renderSidebarNavigation();
    renderMainView();
    showToast("🗑️ ลบคู่มือ SOP ออกจากระบบเรียบร้อยแล้ว", "success");
  }
}

function openManageSubCategoriesModal() {
  const subCategories = getSubCategoriesData();
  const stages = typeof WORKFLOW_STAGES_META !== "undefined" ? WORKFLOW_STAGES_META : [];

  const html = `
    <div class="modal-overlay" id="subCatModalOverlay">
      <div class="modal-card" style="max-width: 680px;">
        <div class="modal-header">
          <h3 style="font-size: 1.25rem; color: #b45309;">⚙️ จัดการหมวดหมู่ย่อยใน 7 ไทม์ไลน์หลัก</h3>
          <button type="button" onclick="closeModal('subCatModalOverlay')" style="background:none; border:none; color:var(--text-main); font-size:1.5rem; cursor:pointer;">&times;</button>
        </div>
        <div class="modal-body">
          <div style="background: #f8fafc; padding: 1rem; border-radius: 12px; margin-bottom: 1.25rem; border: 1px solid var(--border-color);">
            <h4 style="font-size: 0.95rem; color: var(--primary); margin-bottom: 0.75rem;">➕ เพิ่มหมวดหมู่ย่อย / สเตชันใหม่</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.6rem;">
              <select id="newSubStage" class="form-select">
                ${stages.map(st => `<option value="${st.id}">${st.icon} ${st.shortTitle}</option>`).join("")}
              </select>
              <input type="text" id="newSubLabel" class="form-input" placeholder="เช่น ทอดหนังไก่กรอบ, จัดเซ็ตปาร์ตี้" />
              <button type="button" class="action-btn btn-primary" onclick="handleAddSubCategorySubmit()" style="width: auto; padding: 0.6rem 1rem;">เพิ่ม</button>
            </div>
          </div>

          <div style="max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem;">
            ${subCategories.map(s => `
              <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid var(--border-color); padding: 0.6rem 0.9rem; border-radius: 10px;">
                <div>
                  <span style="font-weight: 700; color: var(--text-main);">${escapeHtml(s.label)}</span>
                  <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">(${getCategoryBadge(s.stage)})</span>
                </div>
                <button type="button" onclick="handleRemoveSubCategory('${s.id}')" style="background: none; border: none; color: #dc2626; font-size: 0.8rem; font-weight: 700; cursor: pointer;">ลบ 🗑️</button>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;

  const existing = document.getElementById("subCatModalOverlay");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", html);
}

function handleAddSubCategorySubmit() {
  const stage = document.getElementById("newSubStage")?.value || "stage-2-prep";
  const label = document.getElementById("newSubLabel")?.value.trim() || "";
  if (!label) {
    showToast("⚠️ กรุณาระบุชื่อหมวดหมู่ย่อย", "error");
    return;
  }
  addSubCategoryItem(stage, label);
  openManageSubCategoriesModal();
  renderSidebarNavigation();
  const editCat = document.getElementById("editCategory");
  if (editCat) updateSubCategoryDropdownOptions(editCat.value);
  showToast(`✅ เพิ่มหมวดย่อย "${label}" เรียบร้อยแล้ว!`);
}

function handleRemoveSubCategory(id) {
  if (confirm("ต้องการลบหมวดหมู่ย่อยนี้ใช่หรือไม่?")) {
    removeSubCategoryItem(id);
    openManageSubCategoriesModal();
    renderSidebarNavigation();
  }
}

function openVersionHistoryModal(sopId) {
  const allSop = getSOPData();
  const sop = allSop.find(s => s.id === sopId);
  if (!sop) return;

  const history = Array.isArray(sop.versionHistory) ? sop.versionHistory : [];

  const html = `
    <div class="modal-overlay" id="versionHistoryModalOverlay">
      <div class="modal-card" style="max-width: 650px;">
        <div class="modal-header">
          <div>
            <h3 style="font-size: 1.2rem; color: #b45309;">📜 ประวัติการแก้ไขสูตร: ${escapeHtml(sop.title)}</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">เวอร์ชันปัจจุบัน: v${escapeHtml(sop.version || '1.0')}</span>
          </div>
          <button type="button" onclick="closeModal('versionHistoryModalOverlay')" style="background:none; border:none; color:var(--text-main); font-size:1.5rem; cursor:pointer;">&times;</button>
        </div>
        <div class="modal-body">
          ${history.length === 0 ? `<p style="text-align:center; padding:2rem; color:var(--text-muted);">ยังไม่มีประวัติเวอร์ชันก่อนหน้า</p>` : `
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
              ${history.map((h, idx) => `
                <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:10px; padding:0.85rem 1rem; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-weight:800; color:#b45309;">เวอร์ชัน v${escapeHtml(h.version)} (${escapeHtml(h.updatedAt)})</div>
                    <div style="font-size:0.82rem; color:var(--text-muted);">ผู้แก้ไข: ${escapeHtml(h.author)} • หมายเหตุ: ${escapeHtml(h.changeNotes)}</div>
                  </div>
                </div>
              `).join("")}
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  const existing = document.getElementById("versionHistoryModalOverlay");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", html);
}

function exportSOPJSON() {
  const payload = {
    exportedAt: new Date().toISOString(),
    sopList: getSOPData(),
    subCategories: getSubCategoriesData(),
    branches: getBranchesData(),
    masterIngredients: getMasterIngredients(),
    dailyLogs: getDailyOperationsLogs(),
    deliveryClaims: getDeliveryClaimsData(),
    wasteLogs: getWasteLogsData()
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `PomKhorThod_Franchise_Backup_${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  showToast("📤 ส่งออกไฟล์สำรองข้อมูลทั้งระบบ (Full JSON Backup) เรียบร้อยแล้ว");
}

function importSOPJSON() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.sopList && Array.isArray(imported.sopList)) {
          saveSOPData(imported.sopList);
          if (imported.subCategories) saveSubCategoriesData(imported.subCategories);
          if (imported.masterIngredients) saveMasterIngredients(imported.masterIngredients);
          if (imported.dailyLogs) saveDailyOperationsLogs(imported.dailyLogs);
          if (imported.deliveryClaims) saveDeliveryClaimsData(imported.deliveryClaims);
          if (imported.wasteLogs) saveWasteLogsData(imported.wasteLogs);
          renderSidebarNavigation();
          renderMainView();
          showToast("📥 นำเข้าและอัปเดตข้อมูลทั้งระบบสำเร็จแล้ว!");
        } else if (Array.isArray(imported)) {
          saveSOPData(imported);
          renderSidebarNavigation();
          renderMainView();
          showToast("📥 นำเข้าข้อมูล SOP สำเร็จแล้ว!");
        }
      } catch (err) {
        showToast("รูปแบบไฟล์ JSON ไม่ถูกต้อง", "error");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

async function handleManualCloudPull() {
  if (typeof openFirebaseSetupModal === "function") {
    openFirebaseSetupModal();
  }
}

function resetToDefaultSOP() {
  if (confirm("⚠️ ต้องการรีเซ็ตข้อมูลคู่มือ SOP กลับเป็นชุดมาตรฐานแฟรนไชส์ 7 หมวดหมู่เริ่มต้นใช่หรือไม่?")) {
    localStorage.removeItem("PKT_SOP_DATA_V30");
    localStorage.removeItem("PKT_SUB_CATEGORIES_V30");
    renderSidebarNavigation();
    renderMainView();
    showToast("🔄 รีเซ็ตข้อมูลเป็นมาตรฐาน 7 หมวดหมู่เริ่มต้นเรียบร้อยแล้ว", "info");
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.remove();
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
