/**
 * เครื่องมือคำนวณปริมาณวัตถุดิบอัตโนมัติ (Batch Recipe Calculator)
 */

function openBatchCalculatorModal(sopId) {
  const allSop = getSOPData();
  const sop = allSop.find(item => item.id === sopId);
  if (!sop || !sop.ingredients || sop.ingredients.length === 0) {
    alert("รายการนี้ไม่มีตารางวัตถุดิบสำหรับคำนวณ");
    return;
  }

  const modalHtml = `
    <div class="modal-overlay" id="calcModalOverlay">
      <div class="modal-card">
        <div class="modal-header">
          <h3 style="font-size: 1.2rem; color: #fbbf24;">🧮 คำนวณวัตถุดิบ (Batch Scaling): ${sop.title}</h3>
          <button onclick="closeModal('calcModalOverlay')" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">
            ระบุปริมาณที่ต้องการทำในครั้งนี้ ระบบจะปรับสัดส่วนเครื่องหมักและวัตถุดิบให้อัตโนมัติ
          </p>

          <div class="form-group" style="display: flex; gap: 1rem; align-items: center;">
            <label class="form-label" style="margin:0;">ตัวคูณสัดส่วน (Batch Factor):</label>
            <input type="number" id="batchMultiplier" class="form-input" value="1" min="0.1" step="0.5" style="width: 100px; text-align: center; font-weight: bold; font-size: 1.1rem;" oninput="updateCalculatedIngredients('${sop.id}')" />
            <span style="font-size:0.85rem; color:var(--text-muted);">(เช่น 2 = ทำปริมาณ 2 เท่า)</span>
          </div>

          <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 1rem; margin-top: 1.25rem;">
            <h4 style="font-size: 0.95rem; margin-bottom: 0.75rem; color: var(--primary);">📋 สรุปรายการวัตถุดิบที่ต้องใช้:</h4>
            <div id="calcResultsList"></div>
          </div>
        </div>
        <div style="margin-top: 1.5rem; text-align: right;">
          <button class="action-btn btn-secondary" onclick="closeModal('calcModalOverlay')" style="display: inline-flex; width: auto;">ปิดหน้าต่าง</button>
        </div>
      </div>
    </div>
  `;

  // ลบ modal เก่าถ้ามี
  const existing = document.getElementById("calcModalOverlay");
  if (existing) existing.remove();

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  updateCalculatedIngredients(sopId);
}

function updateCalculatedIngredients(sopId) {
  const allSop = getSOPData();
  const sop = allSop.find(item => item.id === sopId);
  const factorInput = document.getElementById("batchMultiplier");
  const factor = parseFloat(factorInput.value) || 1;

  const listContainer = document.getElementById("calcResultsList");
  if (!sop || !listContainer) return;

  let html = `<table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
    <thead>
      <tr style="border-bottom: 1px solid var(--border-color); text-align: left; color: var(--text-muted);">
        <th style="padding: 0.5rem;">ชื่อวัตถุดิบ</th>
        <th style="padding: 0.5rem; text-align: right;">สูตรมาตรฐาน (1x)</th>
        <th style="padding: 0.5rem; text-align: right; color: #fbbf24;">คำนวณแล้ว (${factor}x)</th>
      </tr>
    </thead>
    <tbody>`;

  sop.ingredients.forEach(ing => {
    const scaledAmount = (ing.amount * factor).toFixed(2).replace(/\.00$/, '');
    html += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 0.6rem 0.5rem; color: var(--text-main); font-weight: 500;">${ing.name}</td>
        <td style="padding: 0.6rem 0.5rem; text-align: right; color: var(--text-muted);">${ing.amount} ${ing.unit}</td>
        <td style="padding: 0.6rem 0.5rem; text-align: right; color: #fbbf24; font-weight: 700; font-size: 1rem;">${scaledAmount} ${ing.unit}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  listContainer.innerHTML = html;
}
