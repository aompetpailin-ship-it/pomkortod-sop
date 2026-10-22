/**
 * 🚀 โมดูลปฏิบัติการแฟรนไชส์ "ผมขอทอด" (Franchise Operations Suite V30)
 * ประกอบด้วย:
 * 1. กระดาน Cheat Sheet ประจำสเตชัน (เตาทอด, สเตชันแพ็ก, เดลิเวอรี Prep Time) + สั่งพิมพ์ A4
 * 2. ระบบบันทึกปฏิบัติงานรายวัน 4 สาขา (Daily Frying & Oil Log, เช็คลิสต์เปิด-ปิดร้าน, เคลมเดลิเวอรี, Waste Log)
 * 3. ระบบเทรนพนักงานใหม่ 3 วัน (Fast-Track Onboarding), แบบประเมิน 10 ข้อ และข้อสอบ SOP Quiz
 * 4. ระบบคลังราคาวัตถุดิบกลางและคำนวณต้นทุนอาหาร (Master Food Costing - เฉพาะ Admin)
 */

let activeCheatSheetTab = "frying";
let activeDailyLogTab = "temp-oil";
let activeTrainingTab = "plan-3day";
let selectedOpsBranch = "B1";
let selectedOpsDate = getThaiTodayStr();

function getThaiTodayStr() {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const y = parts.find(p => p.type === "year")?.value || "2026";
    const m = parts.find(p => p.type === "month")?.value || "10";
    const d = parts.find(p => p.type === "day")?.value || "22";
    return `${y}-${m}-${d}`;
  } catch (e) {
    return new Date().toISOString().split("T")[0];
  }
}

// =========================================================================
// 📦 Storage Helpers สำหรับข้อมูลบันทึกประจำวัน เคลมเดลิเวอรี Waste และการเทรน
// =========================================================================

function getDailyOperationsLogs() {
  const raw = localStorage.getItem("PKT_DAILY_OPS_LOGS_V30");
  if (raw) {
    try { return JSON.parse(raw); } catch (e) {}
  }
  return {};
}

function saveDailyOperationsLogs(logsObj) {
  localStorage.setItem("PKT_DAILY_OPS_LOGS_V30", JSON.stringify(logsObj));
  if (typeof firestoreSaveDocument === "function") {
    firestoreSaveDocument("pkt_app_state", "daily_logs", logsObj);
  }
}

function getBranchDateLogRecord(branchCode, dateStr) {
  const all = getDailyOperationsLogs();
  const key = `${branchCode}_${dateStr}`;
  if (!all[key]) {
    all[key] = {
      branchCode,
      dateStr,
      supervisor: "",
      tempChecks: [
        { round: "รอบ 1 (เช้า)", time: "11:30", part: "สะโพกไก่", oilTemp: "165", coreTemp: "76", pass: true, inspector: "" },
        { round: "รอบ 2 (บ่าย)", time: "14:30", part: "น่องไก่", oilTemp: "165", coreTemp: "75", pass: true, inspector: "" },
        { round: "รอบ 3 (เย็น)", time: "18:30", part: "สะโพกไก่", oilTemp: "165", coreTemp: "", pass: true, inspector: "" },
        { round: "รอบ 4 (ค่ำ)", time: "20:30", part: "ปีกเต็ม", oilTemp: "170", coreTemp: "", pass: true, inspector: "" }
      ],
      oilLogs: [
        { fryer: "เตา 1 (ไก่ชิ้นหลัก)", skimMorning: true, skimAfternoon: false, filterNoon: false, tpmPercent: "14", action: "ใช้ต่อ", staff: "" },
        { fryer: "เตา 2 (ไก่ชิ้นสำรอง)", skimMorning: true, skimAfternoon: false, filterNoon: false, tpmPercent: "12", action: "ใช้ต่อ", staff: "" },
        { fryer: "เตา 3 (ของทานเล่น/ฟรายส์)", skimMorning: true, skimAfternoon: false, filterNoon: false, tpmPercent: "10", action: "ใช้ต่อ", staff: "" }
      ],
      openingChecklist: {},
      closingChecklist: {}
    };
  }
  return all[key];
}

function getDeliveryClaimsData() {
  const raw = localStorage.getItem("PKT_DELIVERY_CLAIMS_V30");
  if (raw) {
    try { return JSON.parse(raw); } catch (e) {}
  }
  const initialClaims = [
    {
      id: "claim-sample-1",
      dateStr: getThaiTodayStr(),
      branchCode: "B1",
      platform: "GrabFood",
      orderId: "#GF-99201",
      itemsSummary: "ไก่ทอดคลุกซอสเกาหลี 6 ชิ้น",
      amount: 280,
      readyTime: "12:15",
      cancelTime: "13:05",
      ticketNo: "TK-448210",
      status: "ยื่นเคลมแล้ว",
      staffName: "พนักงานหน้าร้าน B1",
      photo1: "",
      photo2: "",
      photo3: ""
    }
  ];
  localStorage.setItem("PKT_DELIVERY_CLAIMS_V30", JSON.stringify(initialClaims));
  return initialClaims;
}

function saveDeliveryClaimsData(list) {
  localStorage.setItem("PKT_DELIVERY_CLAIMS_V30", JSON.stringify(list));
  if (typeof firestoreSaveDocument === "function") {
    firestoreSaveDocument("pkt_app_state", "delivery_claims", list);
  }
}

function getWasteLogsData() {
  const raw = localStorage.getItem("PKT_WASTE_LOGS_V30");
  if (raw) {
    try { return JSON.parse(raw); } catch (e) {}
  }
  return [];
}

function saveWasteLogsData(list) {
  localStorage.setItem("PKT_WASTE_LOGS_V30", JSON.stringify(list));
  if (typeof firestoreSaveDocument === "function") {
    firestoreSaveDocument("pkt_app_state", "waste_logs", list);
  }
}

function getOnboardingProgressData() {
  const raw = localStorage.getItem("PKT_ONBOARDING_DATA_V30");
  if (raw) {
    try { return JSON.parse(raw); } catch (e) {}
  }
  return {
    milestones: {},
    certChecks: {},
    quizScores: []
  };
}

function saveOnboardingProgressData(data) {
  localStorage.setItem("PKT_ONBOARDING_DATA_V30", JSON.stringify(data));
  if (typeof firestoreSaveDocument === "function") {
    firestoreSaveDocument("pkt_app_state", "onboarding_progress", data);
  }
}

// =========================================================================
// 1️⃣ กระดาน CHEAT SHEET ประจำสเตชัน (แปะข้างเตาทอด / โต๊ะแพ็ก / เดลิเวอรี)
// =========================================================================

function renderStationCheatSheetsView() {
  const container = document.getElementById("sopContentArea");
  if (!container) return;

  let html = `
    <div class="sop-detail-view">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;" class="no-print">
        <div>
          <span class="sop-category-tag">📌 STATION QUICK GUIDES (CHEAT SHEETS)</span>
          <h2 style="font-size: 1.6rem; color: #b45309; font-weight: 800; margin-top: 0.25rem;">
            กระดานสรุปหน้าเตา & สเตชันแพ็กเกจจิ้ง (อ่านจบใน 5 วินาที)
          </h2>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            ออกแบบตัวเลขใหญ่พิเศษสำหรับเปิดค้างไว้บนแท็บเล็ตประจำสเตชัน หรือกดสั่งพิมพ์ A4 เคลือบพลาสติกแปะผนังสแตนเลส
          </p>
        </div>
        <div style="display: flex; gap: 0.6rem;">
          <button class="action-btn btn-primary" onclick="window.print()" style="width: auto; padding: 0.65rem 1.25rem;">
            🖨️ พิมพ์แผ่น Cheat Sheet นี้ (A4)
          </button>
        </div>
      </div>

      <!-- Sub-navigation Tabs -->
      <div class="ops-tabs-bar no-print">
        <button class="ops-tab-btn ${activeCheatSheetTab === 'frying' ? 'active' : ''}" onclick="switchCheatSheetTab('frying')">
          🔥 1. สเตชันเตาทอดไก่ (SOP-OPS-03)
        </button>
        <button class="ops-tab-btn ${activeCheatSheetTab === 'packing' ? 'active' : ''}" onclick="switchCheatSheetTab('packing')">
          📦 2. สเตชันจัดเซ็ต & แพ็กเกจ (SOP-OPS-04)
        </button>
        <button class="ops-tab-btn ${activeCheatSheetTab === 'delivery' ? 'active' : ''}" onclick="switchCheatSheetTab('delivery')">
          🛵 3. ตั้งค่า Prep Time & รับมือไรเดอร์มาช้า
        </button>
      </div>

      <div id="cheatSheetBodyArea"></div>
    </div>
  `;

  container.innerHTML = html;
  renderActiveCheatSheetContent();
}

function switchCheatSheetTab(tab) {
  activeCheatSheetTab = tab;
  renderStationCheatSheetsView();
}

function renderActiveCheatSheetContent() {
  const body = document.getElementById("cheatSheetBodyArea");
  if (!body) return;

  if (activeCheatSheetTab === "frying") {
    body.innerHTML = `
      <div class="cheat-sheet-board">
        <div class="cheat-banner-header">
          <div>
            <div style="font-size: 0.8rem; font-weight: 800; color: #fde68a; letter-spacing: 0.06em;">FRYING STATION QUICK GUIDE • [SOP-OPS-03]</div>
            <h3 style="font-size: 1.5rem; font-weight: 900; color: #ffffff;">🔥 QUICK GUIDE: สเตชันเตาทอดไก่ (FRYING CHEAT SHEET)</h3>
          </div>
          <span style="background: #dc2626; color: white; padding: 0.35rem 0.9rem; border-radius: 20px; font-weight: 800; font-size: 0.85rem;">แปะระดับสายตา 140-150 ซม.</span>
        </div>

        <!-- 3 Iron Rules -->
        <div class="iron-rules-box">
          <div style="font-weight: 900; color: #991b1b; font-size: 1.05rem; margin-bottom: 0.5rem;">⚠️ กฎเหล็ก 3 ข้อหน้าเตาทอด (ห้ามฝ่าฝืนเด็ดขาด):</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.75rem;">
            <div class="iron-rule-card"><strong>1. ไฟต้อง READY:</strong> อุณหภูมิน้ำมันต้องถึงเกณฑ์และไฟ READY ติดก่อนลงไก่เสมอ</div>
            <div class="iron-rule-card"><strong>2. แกนกลาง ≥ 74°C:</strong> วัดอุณหภูมิเนื้อส่วนหนาสุดหลังทอดต้องได้ ≥ 74°C (165°F) ทุกครั้ง</div>
            <div class="iron-rule-card"><strong>3. สะเด็ดน้ำมัน 30 วิ:</strong> ยกตะแกรงเขย่าสะเด็ดน้ำมัน 30 วินาทีก่อนนำขึ้นตู้โชว์เสมอ</div>
          </div>
        </div>

        <!-- 1. Frying Matrix Table -->
        <h4 class="cheat-section-title">1. ตารางควบคุมเวลาและอุณหภูมิ (Frying Matrix) — แตะปุ่มเพื่อเริ่มจับเวลาทอดทันที</h4>
        <div style="overflow-x: auto; margin-bottom: 1.5rem;">
          <table class="matrix-table-large">
            <thead>
              <tr>
                <th>ชิ้นส่วนไก่</th>
                <th>อุณหภูมิน้ำมัน</th>
                <th>เวลาทอดมาตรฐาน</th>
                <th>ปริมาณสูงสุด/แบทช์</th>
                <th>อุณหภูมิแกนกลาง</th>
                <th class="no-print">จับเวลาด่วน</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>🍗 สะโพก / น่องติดกระดูก</strong></td>
                <td><span class="temp-pill">165°C</span></td>
                <td><strong style="font-size: 1.2rem; color: #b45309;">11:30 - 12:00 นาที</strong></td>
                <td>ไม่เกิน 12 ชิ้น</td>
                <td><span class="pass-pill">≥ 74°C</span></td>
                <td class="no-print"><button class="timer-start-btn" onclick="startKitchenTimer(690, 'ทอดสะโพก/น่อง (11:30 น.)')">⏱️ จับเวลา 11:30 น.</button></td>
              </tr>
              <tr>
                <td><strong>🥩 อกไก่ / สันในชิ้นใหญ่</strong></td>
                <td><span class="temp-pill">165°C</span></td>
                <td><strong style="font-size: 1.2rem; color: #b45309;">09:30 - 10:00 นาที</strong></td>
                <td>ไม่เกิน 12 ชิ้น</td>
                <td><span class="pass-pill">≥ 74°C</span></td>
                <td class="no-print"><button class="timer-start-btn" onclick="startKitchenTimer(600, 'ทอดอกไก่/ชิ้นใหญ่ (10:00 น.)')">⏱️ จับเวลา 10:00 น.</button></td>
              </tr>
              <tr>
                <td><strong>🪽 ปีกเต็ม / ปีกบน-กลาง</strong></td>
                <td><span class="temp-pill">170°C</span></td>
                <td><strong style="font-size: 1.2rem; color: #b45309;">08:00 - 08:30 นาที</strong></td>
                <td>ไม่เกิน 18 ชิ้น</td>
                <td><span class="pass-pill">≥ 74°C</span></td>
                <td class="no-print"><button class="timer-start-btn" onclick="startKitchenTimer(510, 'ทอดปีกไก่ (8:30 น.)')">⏱️ จับเวลา 08:30 น.</button></td>
              </tr>
              <tr>
                <td><strong>🍿 ไก่ป๊อป / สันในไร้กระดูก</strong></td>
                <td><span class="temp-pill">175°C</span></td>
                <td><strong style="font-size: 1.2rem; color: #b45309;">04:00 - 04:30 นาที</strong></td>
                <td>ไม่เกิน 500 กรัม</td>
                <td><span class="pass-pill">≥ 74°C</span></td>
                <td class="no-print"><button class="timer-start-btn" onclick="startKitchenTimer(270, 'ทอดไก่ป๊อป (4:30 น.)')">⏱️ จับเวลา 04:30 น.</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 2. 4-Step Hand Technique -->
        <h4 class="cheat-section-title">2. สูตรลับจังหวะมือ (4 สเต็ปสร้างเกล็ดกรอบสม่ำเสมอ)</h4>
        <div class="flow-steps-grid">
          <div class="flow-step-box">
            <div class="flow-step-num">STEP 1</div>
            <div class="flow-step-title">คลุกแป้งรอบแรก</div>
            <div class="flow-step-desc">กวาดแป้งกลบ พลิกกดเบาๆ <strong>7-10 ครั้ง</strong> (ห้ามบีบเนื้อไก่)</div>
          </div>
          <div class="flow-step-box">
            <div class="flow-step-num">STEP 2</div>
            <div class="flow-step-title">จุ่มน้ำสะอาด</div>
            <div class="flow-step-desc">แช่ในตะแกรง <strong>3-5 วินาที</strong> ยกขึ้นพักสะเด็ดน้ำ <strong>5 วินาที</strong></div>
          </div>
          <div class="flow-step-box">
            <div class="flow-step-num">STEP 3</div>
            <div class="flow-step-title">ตลบแป้งรอบสอง (Fold & Roll)</div>
            <div class="flow-step-desc">สอดมือตลบแป้งหมุนวน <strong>10-12 ครั้ง</strong> ให้เกิดริ้วเกล็ดฟู</div>
          </div>
          <div class="flow-step-box">
            <div class="flow-step-num">STEP 4</div>
            <div class="flow-step-title">สะบัดลงเตาทอด</div>
            <div class="flow-step-desc">เคาะข้อมือ <strong>2 ครั้ง</strong> หย่อนออกจากตัวเข้าหาด้านในหม้อ</div>
          </div>
        </div>

        <!-- 3. Pass vs Fail Visual Check -->
        <h4 class="cheat-section-title">3. จุดเช็กคุณภาพหน้าเตา (Pass ✅ vs Fail ❌ Visual Check)</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
          <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 14px; padding: 1.1rem;">
            <div style="font-weight: 900; color: #047857; font-size: 1.05rem; margin-bottom: 0.5rem;">✅ ผ่านมาตรฐาน (PASS)</div>
            <ul style="padding-left: 1.2rem; color: #065f46; font-size: 0.92rem; line-height: 1.7;">
              <li><strong>สีเหลืองทอง (Golden Brown)</strong> สม่ำเสมอทั่วทั้งชิ้น</li>
              <li><strong>เกล็ดแป้งกรอบฟูบาง</strong> ไม่แข็งกระด้างเป็นก้อน</li>
              <li><strong>ผ่าดูเนื้อในขาวฉ่ำ</strong> ไม่มีน้ำเลือดแดงซึมที่ข้อกระดูก</li>
            </ul>
          </div>
          <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 14px; padding: 1.1rem;">
            <div style="font-weight: 900; color: #b91c1c; font-size: 1.05rem; margin-bottom: 0.5rem;">❌ ไม่ผ่าน / ห้ามเสิร์ฟ (FAIL)</div>
            <ul style="padding-left: 1.2rem; color: #991b1b; font-size: 0.92rem; line-height: 1.7;">
              <li><strong>สีน้ำตาลเข้ม/ดำคล้ำ</strong> (น้ำมันเก่าหรือไฟแรงเกินไป)</li>
              <li><strong>แป้งเกาะเป็นก้อนหนาแข็ง</strong> (ไม่ได้ร่อนแป้งทุก 4 รอบ หรือบีบไก่แรง)</li>
              <li><strong>น้ำมันเยิ้มแฉะ</strong> (ลงไก่ตอนอุณหภูมิตก หรือใส่ไก่เกินจำนวนต่อแบทช์)</li>
            </ul>
          </div>
        </div>

        <!-- 4. Oil Care Rules -->
        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem 1.25rem; font-size: 0.9rem;">
          <strong style="color: #b45309;">🛢️ 4. กฎรอบเวลา & การดูแลน้ำมัน (Oil Care & Quality):</strong>
          <span style="margin-left: 0.5rem;">• <strong>ร่อนแป้ง (Sift Flour):</strong> ทุกๆ 4 รอบการคลุก</span>
          <span style="margin-left: 0.75rem;">• <strong>ช้อนเศษกาก (Skim Floaties):</strong> ทุกครั้งหลังยกไก่ขึ้น</span>
          <span style="margin-left: 0.75rem;">• <strong>อายุในตู้ Holding:</strong> เก็บได้ไม่เกิน 45 นาที (เกินเวลาคัดทิ้งลง Waste Log ทันที)</span>
        </div>
      </div>
    `;
  } else if (activeCheatSheetTab === "packing") {
    body.innerHTML = `
      <div class="cheat-sheet-board">
        <div class="cheat-banner-header" style="background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%);">
          <div>
            <div style="font-size: 0.8rem; font-weight: 800; color: #bfdbfe; letter-spacing: 0.06em;">PACKING & ASSEMBLY STATION • [SOP-OPS-04]</div>
            <h3 style="font-size: 1.5rem; font-weight: 900; color: #ffffff;">📦 PACKING & ASSEMBLY CHEAT SHEET (สเตชันจัดเซ็ต & แพ็กเกจ)</h3>
          </div>
          <span style="background: #f59e0b; color: #000; padding: 0.35rem 0.9rem; border-radius: 20px; font-weight: 800; font-size: 0.85rem;">Zero Missing Items</span>
        </div>

        <div class="iron-rules-box" style="background: #eff6ff; border-color: #93c5fd;">
          <div style="font-weight: 900; color: #1e40af; font-size: 1.05rem; margin-bottom: 0.5rem;">⚠️ 3 กฎเหล็กป้องกันลูกค้าเคลม:</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.75rem;">
            <div class="iron-rule-card"><strong>1. เปิดรูระบายไอน้ำเสมอ:</strong> ห้ามปิดฝากล่องทึบสนิททันที เพื่อป้องกันไอน้ำทำให้ไก่แฉะนิ่ม</div>
            <div class="iron-rule-card"><strong>2. ตรวจบิล POS แบบ Tick-off:</strong> เช็กสินค้าในถุงเทียบกับใบเสร็จชิ้นต่อชิ้นก่อนปิดถุง</div>
            <div class="iron-rule-card"><strong>3. ห้ามส่งของหมดอายุ:</strong> ของทอดในตู้โชว์ที่เกินเวลา Holding ห้ามส่งให้ลูกค้าเด็ดขาด</div>
          </div>
        </div>

        <h4 class="cheat-section-title">1. ตารางควบคุมอายุอาหารในตู้โชว์ (Holding Time Limit)</h4>
        <div style="overflow-x: auto; margin-bottom: 1.5rem;">
          <table class="matrix-table-large">
            <thead>
              <tr>
                <th>เมนูอาหาร</th>
                <th>อุณหภูมิตู้เก็บ</th>
                <th>เวลาสูงสุดในตู้</th>
                <th>สัญญาณเตือนคุณภาพตก (ต้องคัดทิ้งลง Waste Log)</th>
                <th class="no-print">จับเวลาอายุตู้โชว์</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>🍗 ไก่ทอดติดกระดูก (น่อง/สะโพก)</strong></td>
                <td>60°C - 65°C</td>
                <td><strong style="color: #dc2626; font-size: 1.15rem;">45 นาที</strong></td>
                <td>หนังเริ่มเหี่ยว หนังนิ่ม ไม่กรอบ</td>
                <td class="no-print"><button class="timer-start-btn" onclick="startKitchenTimer(2700, 'อายุสะโพก/น่องในตู้โชว์ (45 น.)')">⏳ จับเวลา 45 น.</button></td>
              </tr>
              <tr>
                <td><strong>🍗 ไก่ไม่มีกระดูก / สันใน / วิงส์</strong></td>
                <td>60°C - 65°C</td>
                <td><strong style="color: #dc2626; font-size: 1.15rem;">30 นาที</strong></td>
                <td>เนื้อเริ่มแห้งกระด้าง สีเข้มขึ้น</td>
                <td class="no-print"><button class="timer-start-btn" onclick="startKitchenTimer(1800, 'อายุวิงส์/สันในตู้โชว์ (30 น.)')">⏳ จับเวลา 30 น.</button></td>
              </tr>
              <tr>
                <td><strong>🍿 ไก่ป๊อป</strong></td>
                <td>60°C - 65°C</td>
                <td><strong style="color: #dc2626; font-size: 1.15rem;">20 นาที</strong></td>
                <td>แป้งเริ่มแข็งกระด้าง เคี้ยวเหนียว</td>
                <td class="no-print"><button class="timer-start-btn" onclick="startKitchenTimer(1200, 'อายุไก่ป๊อปในตู้โชว์ (20 น.)')">⏳ จับเวลา 20 น.</button></td>
              </tr>
              <tr>
                <td><strong>🍟 เฟรนช์ฟรายส์ / ของทานเล่น</strong></td>
                <td>โคมไฟความร้อน</td>
                <td><strong style="color: #dc2626; font-size: 1.15rem;">15 นาที</strong></td>
                <td>เหี่ยวนิ่ม อมน้ำมัน เย็นชืด</td>
                <td class="no-print"><button class="timer-start-btn" onclick="startKitchenTimer(900, 'อายุเฟรนช์ฟรายส์ (15 น.)')">⏳ จับเวลา 15 น.</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 class="cheat-section-title">2. สูตรอัตราส่วนซอสเคลือบ & ผงเขย่า (Sauce & Seasoning Ratio)</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
          <div style="background: #fffbeb; border: 2px solid #f59e0b; border-radius: 14px; padding: 1.1rem;">
            <div style="font-weight: 900; color: #b45309; font-size: 1.05rem; margin-bottom: 0.4rem;">🍗 ไก่คลุกซอส (Glazed Chicken)</div>
            <p style="font-size: 0.92rem; margin-bottom: 0.3rem;">• <strong>ขนาด 3-4 ชิ้น:</strong> ซอส 1 ทัพพีมาตรฐาน (<strong>30 ml</strong>)</p>
            <p style="font-size: 0.92rem; margin-bottom: 0.4rem;">• <strong>ขนาด 6 ชิ้น:</strong> ซอส 2 ทัพพีมาตรฐาน (<strong>60 ml</strong>)</p>
            <div style="font-size: 0.84rem; color: #92400e; background: #fef3c7; padding: 0.45rem 0.7rem; border-radius: 8px;">
              💡 <strong>เทคนิค:</strong> ทา/คลุกเร็วภายใน 10 วินาที ห้ามแช่ไก่ค้างในกระทะซอส (แป้งจะหลุด)
            </div>
          </div>
          <div style="background: #fdf4ff; border: 2px solid #d946ef; border-radius: 14px; padding: 1.1rem;">
            <div style="font-weight: 900; color: #a21caf; font-size: 1.05rem; margin-bottom: 0.4rem;">🌶️ ไก่เขย่าผง (Seasoning Shake)</div>
            <p style="font-size: 0.92rem; margin-bottom: 0.3rem;">• <strong>ไก่ป๊อป 1 ที่:</strong> ผงปรุง 1 ช้อนตวง (<strong>5 g</strong>)</p>
            <p style="font-size: 0.92rem; margin-bottom: 0.4rem;">• <strong>เฟรนช์ฟรายส์ 1 ที่:</strong> ผงปรุง 1.5 ช้อนตวง (<strong>7.5 g</strong>)</p>
            <div style="font-size: 0.84rem; color: #86198f; background: #fae8ff; padding: 0.45rem 0.7rem; border-radius: 8px;">
              💡 <strong>เทคนิค:</strong> เขย่าในโถปิดฝา 5 ครั้ง ➔ พัก 2 วินาที ➔ เขย่าซ้ำอีก 3 ครั้งให้ผงกระจายทั่ว
            </div>
          </div>
        </div>

        <h4 class="cheat-section-title">3. มาตรฐานการเลือกบรรจุภัณฑ์ (Packaging Matrix) & 4 ขั้นตอน Double-Check</h4>
        <div style="overflow-x: auto; margin-bottom: 1.25rem;">
          <table class="matrix-table-large">
            <thead>
              <tr>
                <th>ขนาดเซ็ต</th>
                <th>ภาชนะที่ใช้</th>
                <th>การเปิดรูระบายอากาศ</th>
                <th>เครื่องเคียงในชุดมาตรฐาน (Default)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>เซ็ตเดี่ยว (1-2 ชิ้น)</strong></td>
                <td>ซองกระดาษกันน้ำมัน หรือ กล่อง S</td>
                <td>พับปากซองหลวมๆ</td>
                <td>ซอสจิ้ม 1 ถ้วย + ทิชชู่ 2 แผ่น</td>
              </tr>
              <tr>
                <td><strong>เซ็ตกลาง (4-6 ชิ้น)</strong></td>
                <td>กล่องกระดาษล็อกไซส์ M</td>
                <td>เปิดรูระบาย 2 ข้าง</td>
                <td>ซอสจิ้ม 2 ถ้วย + ถุงมือพลาสติก 2 คู่</td>
              </tr>
              <tr>
                <td><strong>บักเก็ตครอบครัว (8+ ชิ้น)</strong></td>
                <td>ถัง Bucket กระดาษ</td>
                <td>ฝาเจาะรูระบายไอน้ำ</td>
                <td>ซอสจิ้ม 3-4 ถ้วย + ถุงมือพลาสติก 4 คู่</td>
              </tr>
              <tr>
                <td><strong>ของทอดทานเล่น / เฟรนช์ฟรายส์</strong></td>
                <td>ซองกระดาษทรงสูง</td>
                <td>ห้ามพับปิดปากถุง</td>
                <td>ซอสมะเขือเทศ 2 ซอง</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flow-steps-grid">
          <div class="flow-step-box"><div class="flow-step-num">CHECK 1</div><div class="flow-step-title">อ่านบิล POS</div><div class="flow-step-desc">ไฮไลต์รสชาติซอสและจำนวนชิ้น</div></div>
          <div class="flow-step-box"><div class="flow-step-num">CHECK 2</div><div class="flow-step-title">ตรวจเครื่องเคียง</div><div class="flow-step-desc">ซอสจิ้ม, ช้อนส้อม, ถุงมือ, ทิชชู่ครบ</div></div>
          <div class="flow-step-box"><div class="flow-step-num">CHECK 3</div><div class="flow-step-title">แยกอุณหภูมิ</div><div class="flow-step-desc">ห้ามวางน้ำเย็นทับกล่องไก่ร้อน (แยกถุง)</div></div>
          <div class="flow-step-box"><div class="flow-step-num">CHECK 4</div><div class="flow-step-title">ปิดซีล Tamper Seal</div><div class="flow-step-desc">ติดสติกเกอร์กันแกะ + เขียน Order ID</div></div>
        </div>
      </div>
    `;
  } else {
    body.innerHTML = `
      <div class="cheat-sheet-board">
        <div class="cheat-banner-header" style="background: linear-gradient(135deg, #065f46 0%, #059669 100%);">
          <div>
            <div style="font-size: 0.8rem; font-weight: 800; color: #a7f3d0; letter-spacing: 0.06em;">DELIVERY & PREP TIME MANAGEMENT • [SOP-OPS-05]</div>
            <h3 style="font-size: 1.5rem; font-weight: 900; color: #ffffff;">🛵 คู่มือตั้งค่า Prep Time 4 แอป & ไทม์ไลน์รับมือไรเดอร์มารับช้า</h3>
          </div>
          <span style="background: #ffffff; color: #065f46; padding: 0.35rem 0.9rem; border-radius: 20px; font-weight: 800; font-size: 0.85rem;">สูตร Base Prep = 18-20 นาที</span>
        </div>

        <div class="iron-rules-box" style="background: #ecfdf5; border-color: #6ee7b7;">
          <div style="font-weight: 900; color: #065f46; font-size: 1.05rem; margin-bottom: 0.4rem;">📐 สูตรคำนวณเวลาเตรียมอาหาร (Base Prep Time) ร้านผมขอทอด:</div>
          <div style="font-size: 1rem; font-weight: 800; color: #047857;">
            Prep Time = เวลารับบิลและคลุกแป้ง (3 นาที) + เวลาทอดชิ้นใหญ่สุด (12 นาที) + เวลาพักสะเด็ด/จัดเซ็ต (3 นาที) = 18 - 20 นาที
          </div>
        </div>

        <h4 class="cheat-section-title">1. ตารางกลยุทธ์การปรับ Prep Time ตามสถานะหน้าร้านจริง</h4>
        <div style="overflow-x: auto; margin-bottom: 1.5rem;">
          <table class="matrix-table-large">
            <thead>
              <tr>
                <th>สถานการณ์ในครัว</th>
                <th>ค่า Prep Time ที่ควรตั้ง</th>
                <th>การบริหารจัดการไก่ทอดและไรเดอร์</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>🟢 มีไก่สำรองในตู้ Holding ครบ</strong></td>
                <td><strong style="color: #059669; font-size: 1.15rem;">12 - 15 นาที</strong></td>
                <td>จัดเซ็ตคลุกซอสและแพ็กได้ทันที ไรเดอร์มาถึงรับของไปได้เลย</td>
              </tr>
              <tr>
                <td><strong>🟡 ทอดใหม่ตามสั่ง (Made-to-Order)</strong></td>
                <td><strong style="color: #d97706; font-size: 1.15rem;">18 - 20 นาที</strong></td>
                <td>ไรเดอร์จะมาถึงตอนไก่เหลือเวลาทอดอีก 2-3 นาทีพอดี ได้ไก่ร้อนกรอบที่สุด</td>
              </tr>
              <tr>
                <td><strong>🔴 ชั่วโมงเร่งด่วน (Peak 11:30-13:30 / 17:30-19:30)</strong></td>
                <td><strong style="color: #dc2626; font-size: 1.15rem;">25 - 30 นาที</strong></td>
                <td>เปิดโหมด Busy Mode ใน Grab / ปรับเวลาต่อบิลใน LINE MAN ลดความตึงเครียดหน้าร้าน</td>
              </tr>
              <tr>
                <td><strong>🌧️ ฝนตกหนัก (ไรเดอร์ขาดแคลน)</strong></td>
                <td><strong style="color: #2563eb; font-size: 1.15rem;">20 นาที + เก็บในตู้ Holding</strong></td>
                <td>อย่าเพิ่งนำกล่องไก่ใส่ถุงมัดปากจนกว่าไรเดอร์จะมารายงานตัวหน้าร้าน</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 class="cheat-section-title">2. ไทม์ไลน์ปฏิบัติการเมื่อไรเดอร์เดลิเวอรีมารับอาหารช้า</h4>
        <div class="flow-steps-grid">
          <div class="flow-step-box">
            <div class="flow-step-num">นาทีที่ 0 - 15</div>
            <div class="flow-step-title">เก็บในตู้ Holding 60°C</div>
            <div class="flow-step-desc">ใส่กล่องที่เปิดรูระบายไอน้ำ วางในตู้โชว์ 60°C <strong>ห้ามใส่ถุงมัดปากเด็ดขาด</strong></div>
          </div>
          <div class="flow-step-box">
            <div class="flow-step-num">นาทีที่ 15 - 20</div>
            <div class="flow-step-title">กดแจ้งเตือน / โทรตาม</div>
            <div class="flow-step-desc">เช็กแอป Merchant กดปุ่ม <strong>"รายงานคนขับมาช้า"</strong> หรือโทรติดต่อไรเดอร์ทันที</div>
          </div>
          <div class="flow-step-box">
            <div class="flow-step-num">นาทีที่ 30 (วิกฤต)</div>
            <div class="flow-step-title">ตรวจสอบความกรอบ</div>
            <div class="flow-step-desc">หากไรเดอร์ยังไม่มาและไก่เริ่มนิ่ม ให้เตรียมแบทช์สำรองและบันทึก Waste Log</div>
          </div>
          <div class="flow-step-box">
            <div class="flow-step-num">นาทีที่ 45 ขึ้นไป</div>
            <div class="flow-step-title">คัดทิ้ง & ทอดใหม่ / ยื่นเคลม</div>
            <div class="flow-step-desc">ห้ามส่งไก่เก่าที่นิ่มแล้วเด็ดขาด! ถ่ายรูปคู่บิล 3 มุมเพื่อยื่นเคลมค่าอาหาร 100%</div>
          </div>
        </div>
      </div>
    `;
  }
}

// =========================================================================
// 2️⃣ ระบบบันทึกปฏิบัติงานรายวัน 4 สาขา (Daily Logs, Checklists, Delivery Claim, Waste)
// =========================================================================

function renderDailyOperationsLogsView() {
  const container = document.getElementById("sopContentArea");
  if (!container) return;

  const branches = getBranchesData();

  let html = `
    <div class="sop-detail-view">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;" class="no-print">
        <div>
          <span class="sop-category-tag">📋 DAILY FRANCHISE LOGBOOK & TRACEABILITY</span>
          <h2 style="font-size: 1.6rem; color: #b45309; font-weight: 800; margin-top: 0.25rem;">
            ระบบบันทึกปฏิบัติงานรายวัน & เคลมเดลิเวอรี (แยกตามสาขา)
          </h2>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            บันทึกอุณหภูมิไก่ 4 รอบ/วัน, คุณภาพน้ำมัน (TPM), เช็คลิสต์เปิด-ปิดร้าน, Waste Log และระบบเคลมอาหารเดลิเวอรีพร้อมสคริปต์อัตโนมัติ
          </p>
        </div>

        <div style="display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; background: #f8fafc; padding: 0.6rem 0.9rem; border-radius: 14px; border: 1px solid var(--border-color);">
          <div>
            <label style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); display: block;">🏪 เลือกสาขา:</label>
            <select id="opsBranchSelect" class="form-select" style="padding: 0.4rem 0.75rem; font-weight: 700; font-size: 0.85rem;" onchange="handleOpsFilterChange()">
              ${branches.map(b => `<option value="${b.code}" ${b.code === selectedOpsBranch ? 'selected' : ''}>${b.name}</option>`).join("")}
            </select>
          </div>
          <div>
            <label style="font-size: 0.72rem; font-weight: 800; color: var(--text-muted); display: block;">📅 วันที่บันทึก (เวลาไทย):</label>
            <input type="date" id="opsDateSelect" class="form-input" style="padding: 0.38rem 0.75rem; font-weight: 700; font-size: 0.85rem;" value="${selectedOpsDate}" onchange="handleOpsFilterChange()" />
          </div>
          <button class="action-btn btn-secondary" onclick="window.print()" style="width: auto; padding: 0.5rem 0.9rem; margin-top: 0.9rem;">
            🖨️ พิมพ์ฟอร์ม A4
          </button>
        </div>
      </div>

      <!-- 4 Sub-tabs for Daily Logs -->
      <div class="ops-tabs-bar no-print">
        <button class="ops-tab-btn ${activeDailyLogTab === 'temp-oil' ? 'active' : ''}" onclick="switchDailyLogTab('temp-oil')">
          🌡️ 1. อุณหภูมิไก่ 4 รอบ & น้ำมัน (TPM)
        </button>
        <button class="ops-tab-btn ${activeDailyLogTab === 'checklists' ? 'active' : ''}" onclick="switchDailyLogTab('checklists')">
          ✅ 2. เช็คลิสต์เปิดร้าน - ปิดร้าน
        </button>
        <button class="ops-tab-btn ${activeDailyLogTab === 'claims' ? 'active' : ''}" onclick="switchDailyLogTab('claims')">
          🛵 3. บันทึกเคลมเดลิเวอรี + สคริปต์
        </button>
        <button class="ops-tab-btn ${activeDailyLogTab === 'waste' ? 'active' : ''}" onclick="switchDailyLogTab('waste')">
          🗑️ 4. บันทึกของเสีย (Waste Log)
        </button>
      </div>

      <div id="dailyLogTabContentArea"></div>
    </div>
  `;

  container.innerHTML = html;
  renderActiveDailyLogTabContent();
}

function handleOpsFilterChange() {
  const bEl = document.getElementById("opsBranchSelect");
  const dEl = document.getElementById("opsDateSelect");
  if (bEl) selectedOpsBranch = bEl.value;
  if (dEl) selectedOpsDate = dEl.value;
  renderActiveDailyLogTabContent();
}

function switchDailyLogTab(tab) {
  activeDailyLogTab = tab;
  renderDailyOperationsLogsView();
}

function renderActiveDailyLogTabContent() {
  const area = document.getElementById("dailyLogTabContentArea");
  if (!area) return;

  const record = getBranchDateLogRecord(selectedOpsBranch, selectedOpsDate);

  if (activeDailyLogTab === "temp-oil") {
    area.innerHTML = `
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <strong style="color: #b45309; font-size: 1rem;">📋 ใบบันทึกอุณหภูมิน้ำมันและความสุกเนื้อไก่ประจำวัน (DAILY FRYING & OIL LOG)</strong>
          <div style="font-size: 0.82rem; color: #92400e;">สาขา: <strong>${selectedOpsBranch}</strong> • วันที่: <strong>${selectedOpsDate}</strong> • เกณฑ์สำคัญ: อุณหภูมิแกนกลางไก่ ≥ 74°C และค่า TPM น้ำมัน ≤ 25%</div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 0.82rem; font-weight: 700;">หัวหน้ากะผู้รับผิดชอบ:</span>
          <input type="text" id="logSupervisorInput" class="form-input" style="width: 180px; padding: 0.4rem 0.7rem; background: #fff;" placeholder="ระบุชื่อหัวหน้ากะ" value="${escapeHtml(record.supervisor || '')}" />
        </div>
      </div>

      <h4 class="cheat-section-title">ตารางที่ 1: ตรวจวัดอุณหภูมิเนื้อไก่และความพร้อมเตาทอด (สุ่มตรวจอย่างน้อย 4 รอบ/วัน)</h4>
      <div style="overflow-x: auto; margin-bottom: 1.25rem;">
        <table class="matrix-table-large">
          <thead>
            <tr>
              <th>รอบตรวจ</th>
              <th>เวลาตรวจ</th>
              <th>ชิ้นส่วนที่วัด</th>
              <th>อุณหภูมิน้ำมัน (°C)</th>
              <th>อุณหภูมิแกนกลาง (ต้อง ≥ 74°C)</th>
              <th>ผลประเมินอัตโนมัติ</th>
              <th>ผู้ตรวจ</th>
            </tr>
          </thead>
          <tbody>
            ${record.tempChecks.map((row, idx) => {
              const coreVal = parseFloat(row.coreTemp);
              const isEntered = !isNaN(coreVal) && row.coreTemp !== "";
              const isPass = !isEntered || coreVal >= 74;
              return `
                <tr>
                  <td><strong>${row.round}</strong></td>
                  <td><input type="text" class="form-input temp-time-${idx}" value="${escapeHtml(row.time)}" style="width: 85px; padding: 0.35rem 0.5rem; text-align: center;" /></td>
                  <td><input type="text" class="form-input temp-part-${idx}" value="${escapeHtml(row.part)}" style="width: 120px; padding: 0.35rem 0.5rem;" /></td>
                  <td><input type="number" class="form-input temp-oil-${idx}" value="${escapeHtml(row.oilTemp)}" placeholder="165" style="width: 90px; padding: 0.35rem 0.5rem; text-align: center; font-weight: 700;" /> °C</td>
                  <td><input type="number" class="form-input temp-core-${idx}" value="${escapeHtml(row.coreTemp)}" placeholder="≥ 74" style="width: 90px; padding: 0.35rem 0.5rem; text-align: center; font-weight: 800; color: ${isPass ? '#059669' : '#dc2626'};" oninput="saveTempAndOilLogForm(false)" /> °C</td>
                  <td>
                    ${!isEntered ? `<span style="color: #64748b; font-size: 0.8rem;">รอตรวจวัด</span>` : isPass ? `<span class="pass-pill">✅ ผ่านเกณฑ์ (≥74°C)</span>` : `<span style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; padding:0.2rem 0.6rem; border-radius:12px; font-weight:800; font-size:0.78rem;">❌ ตก! ทอดซ้ำ 2 นาทีทันที</span>`}
                  </td>
                  <td><input type="text" class="form-input temp-insp-${idx}" value="${escapeHtml(row.inspector)}" placeholder="ชื่อผู้วัด" style="width: 110px; padding: 0.35rem 0.5rem;" /></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <h4 class="cheat-section-title">ตารางที่ 2: บันทึกคุณภาพและการจัดการน้ำมันทอดประจำวัน (Oil Quality & TPM Log)</h4>
      <div style="overflow-x: auto; margin-bottom: 1.25rem;">
        <table class="matrix-table-large">
          <thead>
            <tr>
              <th>เตาทอดเบอร์</th>
              <th>ช้อนกากรอบเช้า</th>
              <th>ช้อนกากรอบบ่าย</th>
              <th>กรองน้ำมันกลางวัน</th>
              <th>ค่า TPM (%) / สีน้ำมัน</th>
              <th>คำสั่งการ (คงเดิม / เปลี่ยนใหม่)</th>
              <th>ผู้ลงชื่อ</th>
            </tr>
          </thead>
          <tbody>
            ${record.oilLogs.map((oil, idx) => {
              const tpmVal = parseFloat(oil.tpmPercent);
              const isHighTpm = !isNaN(tpmVal) && tpmVal > 25;
              return `
                <tr>
                  <td><strong>${oil.fryer}</strong></td>
                  <td style="text-align: center;"><label><input type="checkbox" class="oil-morn-${idx}" ${oil.skimMorning ? 'checked' : ''} /> เรียบร้อย</label></td>
                  <td style="text-align: center;"><label><input type="checkbox" class="oil-aft-${idx}" ${oil.skimAfternoon ? 'checked' : ''} /> เรียบร้อย</label></td>
                  <td style="text-align: center;"><label><input type="checkbox" class="oil-filt-${idx}" ${oil.filterNoon ? 'checked' : ''} /> กรองแล้ว</label></td>
                  <td>
                    <input type="number" class="form-input oil-tpm-${idx}" value="${escapeHtml(oil.tpmPercent)}" placeholder="%" style="width: 80px; padding: 0.35rem 0.5rem; text-align: center; font-weight: 800;" oninput="saveTempAndOilLogForm(false)" /> %
                    ${isHighTpm ? `<div style="color:#dc2626; font-size:0.72rem; font-weight:800;">⚠️ เกิน 25% ต้องเปลี่ยนทันที!</div>` : ''}
                  </td>
                  <td>
                    <select class="form-select oil-act-${idx}" style="padding: 0.35rem 0.5rem; font-weight: 700; color: ${isHighTpm || oil.action === 'เปลี่ยนใหม่' ? '#dc2626' : '#059669'};">
                      <option value="ใช้ต่อ" ${!isHighTpm && oil.action === 'ใช้ต่อ' ? 'selected' : ''}>🟢 ใช้ต่อ (ปกติ)</option>
                      <option value="เปลี่ยนใหม่" ${isHighTpm || oil.action === 'เปลี่ยนใหม่' ? 'selected' : ''}>🔴 ถ่ายทิ้ง & เปลี่ยนน้ำมันใหม่</option>
                    </select>
                  </td>
                  <td><input type="text" class="form-input oil-staff-${idx}" value="${escapeHtml(oil.staff)}" placeholder="ชื่อผู้ตรวจ" style="width: 110px; padding: 0.35rem 0.5rem;" /></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <div style="display: flex; justify-content: flex-end;" class="no-print">
        <button class="action-btn btn-primary" onclick="saveTempAndOilLogForm(true)" style="width: auto; padding: 0.75rem 1.75rem;">
          💾 บันทึกข้อมูลอุณหภูมิและน้ำมันประจำวัน (${selectedOpsBranch})
        </button>
      </div>
    `;
  } else if (activeDailyLogTab === "checklists") {
    const openItems = [
      { id: "op1", text: "ตรวจสายไฟ ท่อแก๊ส ระบบดูดควัน และระบบดับเพลิงอัตโนมัติพร้อมใช้งาน" },
      { id: "op2", text: "เปิดเครื่องทอด (Deep/Pressure Fryer) ตั้งค่า Pre-heat 165°C-175°C จนไฟ READY ติด" },
      { id: "op3", text: "ตรวจระดับน้ำมันอยู่ระหว่างขีด Min-Max น้ำมันใส ไม่เหม็นหืน ค่า TPM ≤ 25%" },
      { id: "op4", text: "เปิดตู้โชว์อุ่นไก่ (Holding Cabinet) วอร์มอุณหภูมิแตะ ≥ 60°C" },
      { id: "op5", text: "ตรวจเช็กอุณหภูมิตู้ชิลเลอร์เก็บไก่หมัก (2°C - 4°C) และป้าย Use-by Label ครบทุกกล่อง" },
      { id: "op6", text: "เปิดเครื่อง POS นับเงินทอนตั้งต้นครบถ้วน และเปิดรับออร์เดอร์แอปเดลิเวอรีครบ 4 ค่าย" },
      { id: "op7", text: "พนักงานทุกคนสวมหมวกคลุมผม หน้ากากอนามัย ผ้ากันเปื้อน เล็บสั้น และล้างมือครบ 7 ขั้นตอน" }
    ];
    const closeItems = [
      { id: "cl1", text: "นับจำนวนไก่ทอดที่เหลือค้างในตู้โชว์และบันทึกลงใน Waste Log ครบถ้วน" },
      { id: "cl2", text: "ซีลปิดฝากล่องไก่หมักและซอสทั้งหมด เก็บเข้าตู้เย็นตามผัง FIFO (ไก่ดิบอยู่ชั้นล่างสุด)" },
      { id: "cl3", text: "ถอดล้างถาดพักไก่ ตะแกรงคลุกแป้ง อ่างสแตนเลส และเช็ดทำความสะอาดตู้โชว์อุ่นไก่" },
      { id: "cl4", text: "เช็ดคราบน้ำมันตามซอกเครื่องทอดและใต้โต๊ะสแตนเลสจนสะอาด" },
      { id: "cl5", text: "ขูดล้างทำความสะอาดพื้นครัวและรางระบายน้ำ ไม่ให้มีคราบมันลื่น" },
      { id: "cl6", text: "เปิดถาดดักไขมัน (Grease Trap) ตักกากไขมันและเศษอาหารทิ้งเรียบร้อย" },
      { id: "cl7", text: "ปิดวาล์วแก๊สหลัก ปิดเบรกเกอร์เตาทอด กระทบยอดขาย POS และล็อกประตูร้าน" }
    ];

    area.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem;">
        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem;">
          <h4 style="font-size: 1.15rem; font-weight: 800; color: #047857; margin-bottom: 1rem;">🌅 เช็คลิสต์ขั้นตอนการเปิดร้าน (${selectedOpsBranch} • ${selectedOpsDate})</h4>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${openItems.map(item => `
              <label style="display: flex; align-items: flex-start; gap: 0.75rem; background: #fff; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); cursor: pointer;">
                <input type="checkbox" onchange="toggleChecklistItem('opening', '${item.id}', this.checked)" ${record.openingChecklist && record.openingChecklist[item.id] ? 'checked' : ''} style="width: 18px; height: 18px; margin-top: 0.2rem;" />
                <span style="font-size: 0.92rem; font-weight: 600;">${item.text}</span>
              </label>
            `).join("")}
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem;">
          <h4 style="font-size: 1.15rem; font-weight: 800; color: #b45309; margin-bottom: 1rem;">🌙 เช็คลิสต์ขั้นตอนการปิดร้าน (${selectedOpsBranch} • ${selectedOpsDate})</h4>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${closeItems.map(item => `
              <label style="display: flex; align-items: flex-start; gap: 0.75rem; background: #fff; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); cursor: pointer;">
                <input type="checkbox" onchange="toggleChecklistItem('closing', '${item.id}', this.checked)" ${record.closingChecklist && record.closingChecklist[item.id] ? 'checked' : ''} style="width: 18px; height: 18px; margin-top: 0.2rem;" />
                <span style="font-size: 0.92rem; font-weight: 600;">${item.text}</span>
              </label>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  } else if (activeDailyLogTab === "claims") {
    const claims = getDeliveryClaimsData();
    area.innerHTML = `
      <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 14px; padding: 1.25rem; margin-bottom: 1.5rem;" class="no-print">
        <h4 style="font-size: 1.1rem; font-weight: 800; color: #6d28d9; margin-bottom: 0.75rem;">➕ บันทึกรายการเคลมค่าอาหารเดลิเวอรีใหม่ & สร้างสคริปต์ส่ง Help Center</h4>
        <form onsubmit="handleAddDeliveryClaim(event)">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.85rem; margin-bottom: 0.85rem;">
            <div>
              <label class="form-label">แพลตฟอร์ม</label>
              <select id="claimPlatform" class="form-select">
                <option value="GrabFood">🟢 GrabFood</option>
                <option value="LINE MAN">🟢 LINE MAN</option>
                <option value="ShopeeFood">🟠 ShopeeFood</option>
                <option value="Robinhood">🟣 Robinhood</option>
              </select>
            </div>
            <div>
              <label class="form-label">เลข Order ID *</label>
              <input type="text" id="claimOrderId" class="form-input" placeholder="เช่น #GF-99201" required />
            </div>
            <div>
              <label class="form-label">รายการอาหารที่เสียหาย *</label>
              <input type="text" id="claimItems" class="form-input" placeholder="เช่น เซ็ตครอบครัว 8 ชิ้น" required />
            </div>
            <div>
              <label class="form-label">ยอดเงินที่ขอเคลม (บาท) *</label>
              <input type="number" id="claimAmount" class="form-input" placeholder="เช่น 450" required />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.85rem; margin-bottom: 1rem;">
            <div>
              <label class="form-label">เวลาที่ทำอาหารเสร็จ (กดพร้อมส่ง)</label>
              <input type="time" id="claimReadyTime" class="form-input" value="12:15" required />
            </div>
            <div>
              <label class="form-label">เวลาที่ถูกยกเลิก / ไรเดอร์ไม่มา</label>
              <input type="time" id="claimCancelTime" class="form-input" value="13:00" required />
            </div>
            <div>
              <label class="form-label">เลข Ticket เคลม (ถ้ามี)</label>
              <input type="text" id="claimTicketNo" class="form-input" placeholder="เช่น TK-448210" />
            </div>
            <div>
              <label class="form-label">ผู้บันทึก</label>
              <input type="text" id="claimStaff" class="form-input" placeholder="ชื่อพนักงาน" required />
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" class="action-btn btn-secondary" onclick="previewClaimScriptFromForm()" style="width: auto;">
              📋 สร้างสคริปต์ส่ง Help Center ทันที
            </button>
            <button type="submit" class="action-btn btn-primary" style="width: auto; background: #7c3aed;">
              💾 บันทึกลง Delivery Claim Log
            </button>
          </div>
        </form>

        <div id="claimScriptPreviewBox" style="display: none; margin-top: 1rem; background: #ffffff; border: 2px dashed #8b5cf6; border-radius: 12px; padding: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <strong style="color: #6d28d9; font-size: 0.9rem;">✨ ข้อความสำหรับส่งศูนย์ช่วยเหลือ (Help Center) — กดคัดลอกไปวางในแอปได้เลย:</strong>
            <button type="button" class="action-btn btn-primary" onclick="copyGeneratedClaimScript()" style="width: auto; padding: 0.35rem 0.9rem; font-size: 0.8rem;">📋 คัดลอกข้อความ</button>
          </div>
          <textarea id="generatedClaimScriptText" class="form-textarea" rows="5" readonly style="font-size: 0.88rem; background: #f8fafc;"></textarea>
        </div>
      </div>

      <h4 class="cheat-section-title">📝 ตารางติดตามสถานะการเคลมค่าอาหารเดลิเวอรี (DELIVERY CLAIM LOG SHEET)</h4>
      <div style="overflow-x: auto;">
        <table class="matrix-table-large">
          <thead>
            <tr>
              <th>วันที่ / สาขา</th>
              <th>แพลตฟอร์ม</th>
              <th>เลข Order ID</th>
              <th>รายการอาหาร / ยอดเงิน</th>
              <th>เวลาเสร็จ - ยกเลิก</th>
              <th>สถานะการเคลม</th>
              <th>เลข Ticket / ผู้บันทึก</th>
              <th class="no-print">สคริปต์ / จัดการ</th>
            </tr>
          </thead>
          <tbody>
            ${claims.map((c, idx) => `
              <tr>
                <td><strong>${c.dateStr}</strong><br><span style="font-size:0.78rem; color:var(--text-muted);">${c.branchCode}</span></td>
                <td><strong>${c.platform}</strong></td>
                <td><code style="font-weight:800; color:#6d28d9;">${escapeHtml(c.orderId)}</code></td>
                <td>${escapeHtml(c.itemsSummary)}<br><strong style="color:#059669;">${c.amount} บาท</strong></td>
                <td>${c.readyTime} - ${c.cancelTime} น.</td>
                <td>
                  <select class="form-select" style="padding: 0.3rem 0.5rem; font-size: 0.8rem; font-weight: 700;" onchange="updateClaimStatus(${idx}, this.value)">
                    <option value="ยื่นเคลมแล้ว" ${c.status === 'ยื่นเคลมแล้ว' ? 'selected' : ''}>⏳ ยื่นเคลมแล้ว (รอโอน)</option>
                    <option value="โอนเงินคืนสำเร็จ" ${c.status === 'โอนเงินคืนสำเร็จ' ? 'selected' : ''}>✅ โอนเงินคืนสำเร็จ</option>
                    <option value="รออนุมัติ" ${c.status === 'รออนุมัติ' ? 'selected' : ''}>🕒 รออนุมัติ</option>
                  </select>
                </td>
                <td>${escapeHtml(c.ticketNo || '-')}<br><span style="font-size:0.75rem; color:var(--text-muted);">โดย: ${escapeHtml(c.staffName)}</span></td>
                <td class="no-print">
                  <button class="action-btn btn-secondary" onclick="copyClaimScriptByIndex(${idx})" style="width:auto; padding:0.3rem 0.6rem; font-size:0.75rem;">📋 สคริปต์</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  } else {
    const wastes = getWasteLogsData();
    const totalWasteCost = wastes.reduce((sum, w) => sum + (parseFloat(w.estimatedCost) || 0), 0);
    area.innerHTML = `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 14px; padding: 1.25rem; margin-bottom: 1.5rem;" class="no-print">
        <h4 style="font-size: 1.1rem; font-weight: 800; color: #b91c1c; margin-bottom: 0.75rem;">🗑️ บันทึกรายการอาหารคัดทิ้ง / หมดอายุตู้โชว์ (Waste & Discard Log)</h4>
        <form onsubmit="handleAddWasteLog(event)" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.85rem; align-items: end;">
          <div>
            <label class="form-label">รายการอาหารที่คัดทิ้ง *</label>
            <select id="wasteItemName" class="form-select">
              <option value="สะโพกไก่ทอด (ต้นทุน ~18บ./ชิ้น)" data-cost="18">🍗 สะโพกไก่ทอด (~18 บ./ชิ้น)</option>
              <option value="น่องไก่ทอด (ต้นทุน ~15บ./ชิ้น)" data-cost="15">🍗 น่องไก่ทอด (~15 บ./ชิ้น)</option>
              <option value="ปีกไก่ทอด (ต้นทุน ~9บ./ชิ้น)" data-cost="9">🪽 ปีกไก่ทอด (~9 บ./ชิ้น)</option>
              <option value="ไก่ป๊อป 1 เสิร์ฟ (ต้นทุน ~22บ.)" data-cost="22">🍿 ไก่ป๊อป 1 เสิร์ฟ (~22 บ.)</option>
              <option value="เฟรนช์ฟรายส์ 1 เสิร์ฟ (ต้นทุน ~15บ.)" data-cost="15">🍟 เฟรนช์ฟรายส์ 1 เสิร์ฟ (~15 บ.)</option>
            </select>
          </div>
          <div>
            <label class="form-label">จำนวนที่ทิ้ง (ชิ้น/เสิร์ฟ) *</label>
            <input type="number" id="wasteQty" class="form-input" value="1" min="1" required />
          </div>
          <div>
            <label class="form-label">สาเหตุการคัดทิ้ง *</label>
            <select id="wasteReason" class="form-select">
              <option value="เกินเวลา Holding Time ในตู้โชว์ (45 นาที)">⏳ เกินเวลาตู้โชว์ Holding</option>
              <option value="ไรเดอร์ไม่มารับเกิน 45 นาที">🛵 ไรเดอร์ไม่มารับ/ยกเลิก</option>
              <option value="ทอดไม่ได้มาตรฐาน (ไหม้/แป้งหลุด)">🔥 ทอดไม่ได้มาตรฐาน</option>
              <option value="เหลือค้างตอนปิดร้าน">🌙 เหลือค้างตอนปิดร้าน</option>
            </select>
          </div>
          <div>
            <label class="form-label">ผู้บันทึก *</label>
            <input type="text" id="wasteStaff" class="form-input" placeholder="ชื่อพนักงาน" required />
          </div>
          <div>
            <button type="submit" class="action-btn btn-primary" style="background: #dc2626;">➕ บันทึก Waste Log</button>
          </div>
        </form>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <h4 class="cheat-section-title" style="margin:0;">📊 ประวัติรายการคัดทิ้ง (Waste Log)</h4>
        <div style="background: #fef2f2; color: #dc2626; font-weight: 800; padding: 0.4rem 0.9rem; border-radius: 20px; border: 1px solid #fecaca; font-size: 0.88rem;">
          มูลค่าสูญเสียสะสม: ${totalWasteCost.toFixed(2)} บาท
        </div>
      </div>

      <div style="overflow-x: auto;">
        <table class="matrix-table-large">
          <thead>
            <tr>
              <th>วันที่ / สาขา</th>
              <th>รายการที่คัดทิ้ง</th>
              <th>จำนวน</th>
              <th>สาเหตุ</th>
              <th>ต้นทุนสูญเสียโดยประมาณ</th>
              <th>ผู้บันทึก</th>
            </tr>
          </thead>
          <tbody>
            ${wastes.length === 0 ? `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">🎉 ยังไม่มีรายการอาหารเสียหรือคัดทิ้ง</td></tr>` : wastes.map(w => `
              <tr>
                <td><strong>${w.dateStr}</strong> (${w.branchCode})</td>
                <td><strong>${escapeHtml(w.itemName)}</strong></td>
                <td><strong>${w.qty}</strong></td>
                <td>${escapeHtml(w.reason)}</td>
                <td><strong style="color:#dc2626;">${Number(w.estimatedCost).toFixed(2)} บาท</strong></td>
                <td>${escapeHtml(w.staff)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
}

function saveTempAndOilLogForm(showNotification = true) {
  const all = getDailyOperationsLogs();
  const key = `${selectedOpsBranch}_${selectedOpsDate}`;
  const record = getBranchDateLogRecord(selectedOpsBranch, selectedOpsDate);

  const supEl = document.getElementById("logSupervisorInput");
  if (supEl) record.supervisor = supEl.value.trim();

  record.tempChecks.forEach((row, idx) => {
    const t = document.querySelector(`.temp-time-${idx}`);
    const p = document.querySelector(`.temp-part-${idx}`);
    const o = document.querySelector(`.temp-oil-${idx}`);
    const c = document.querySelector(`.temp-core-${idx}`);
    const i = document.querySelector(`.temp-insp-${idx}`);
    if (t) row.time = t.value;
    if (p) row.part = p.value;
    if (o) row.oilTemp = o.value;
    if (c) row.coreTemp = c.value;
    if (i) row.inspector = i.value;
    const coreNum = parseFloat(row.coreTemp);
    row.pass = isNaN(coreNum) || coreNum >= 74;
  });

  record.oilLogs.forEach((oil, idx) => {
    const m = document.querySelector(`.oil-morn-${idx}`);
    const a = document.querySelector(`.oil-aft-${idx}`);
    const f = document.querySelector(`.oil-filt-${idx}`);
    const tpm = document.querySelector(`.oil-tpm-${idx}`);
    const act = document.querySelector(`.oil-act-${idx}`);
    const st = document.querySelector(`.oil-staff-${idx}`);
    if (m) oil.skimMorning = m.checked;
    if (a) oil.skimAfternoon = a.checked;
    if (f) oil.filterNoon = f.checked;
    if (tpm) oil.tpmPercent = tpm.value;
    if (act) oil.action = act.value;
    if (st) oil.staff = st.value;
  });

  all[key] = record;
  saveDailyOperationsLogs(all);

  if (showNotification) {
    renderActiveDailyLogTabContent();
    if (typeof showToast === "function") showToast(`✅ บันทึกข้อมูลอุณหภูมิและน้ำมันสาขา ${selectedOpsBranch} เรียบร้อยแล้ว!`);
  }
}

function toggleChecklistItem(type, itemId, isChecked) {
  const all = getDailyOperationsLogs();
  const key = `${selectedOpsBranch}_${selectedOpsDate}`;
  const record = getBranchDateLogRecord(selectedOpsBranch, selectedOpsDate);
  if (type === "opening") {
    if (!record.openingChecklist) record.openingChecklist = {};
    record.openingChecklist[itemId] = isChecked;
  } else {
    if (!record.closingChecklist) record.closingChecklist = {};
    record.closingChecklist[itemId] = isChecked;
  }
  all[key] = record;
  saveDailyOperationsLogs(all);
  if (typeof showToast === "function") showToast("☑️ อัปเดตสถานะเช็คลิสต์แล้ว", "info", 1200);
}

function buildHelpCenterClaimScript(platform, orderId, readyTime, cancelTime) {
  return `หัวข้อ: ขอรับเงินชดเชยค่าอาหาร เนื่องจากคนขับไม่มารับสินค้าจนอาหารเสียหาย\nเรียน ทีมสนับสนุน ${platform},\n• หมายเลขคำสั่งซื้อ (Order ID): ${orderId}\n• เวลาที่อาหารทำเสร็จ: ${readyTime} น.\n• เวลาที่คำสั่งซื้อถูกยกเลิก / ไรเดอร์ไม่มา: ${cancelTime} น.\nทางร้านได้เตรียมอาหารสดใหม่ตามคำสั่งซื้อเสร็จสมบูรณ์และกดสถานะ "อาหารพร้อมส่ง" ตามเวลา แต่ไม่มีคนขับเข้ามารับสินค้าจนเวลาล่วงเลยเกิน 40 นาที ส่งผลให้อาหารทอดหมดอายุความร้อนและความกรอบ ไม่สามารถนำส่งต่อได้ ทางร้านได้แนบรูปถ่ายอาหารคู่กับใบเสร็จยืนยันความเสียหายมา ณ ที่นี้ จึงขอความกรุณาพิจารณาชดเชยค่าสินค้าตามมูลค่าคำสั่งซื้อดังกล่าวด้วยครับ/ค่ะ`;
}

function previewClaimScriptFromForm() {
  const platform = document.getElementById("claimPlatform")?.value || "GrabFood";
  const orderId = document.getElementById("claimOrderId")?.value || "#ORDER-ID";
  const readyTime = document.getElementById("claimReadyTime")?.value || "12:15";
  const cancelTime = document.getElementById("claimCancelTime")?.value || "13:00";

  const box = document.getElementById("claimScriptPreviewBox");
  const txt = document.getElementById("generatedClaimScriptText");
  if (box && txt) {
    box.style.display = "block";
    txt.value = buildHelpCenterClaimScript(platform, orderId, readyTime, cancelTime);
  }
}

function copyGeneratedClaimScript() {
  const txt = document.getElementById("generatedClaimScriptText");
  if (!txt) return;
  navigator.clipboard.writeText(txt.value);
  if (typeof showToast === "function") showToast("📋 คัดลอกสคริปต์ส่ง Help Center เรียบร้อยแล้ว!");
}

function copyClaimScriptByIndex(idx) {
  const claims = getDeliveryClaimsData();
  const c = claims[idx];
  if (!c) return;
  const script = buildHelpCenterClaimScript(c.platform, c.orderId, c.readyTime, c.cancelTime);
  navigator.clipboard.writeText(script);
  if (typeof showToast === "function") showToast(`📋 คัดลอกสคริปต์เคลมของ Order ${c.orderId} แล้ว!`);
}

function handleAddDeliveryClaim(event) {
  event.preventDefault();
  const claims = getDeliveryClaimsData();
  const newClaim = {
    id: "claim-" + Date.now(),
    dateStr: selectedOpsDate,
    branchCode: selectedOpsBranch,
    platform: document.getElementById("claimPlatform")?.value || "GrabFood",
    orderId: document.getElementById("claimOrderId")?.value.trim() || "",
    itemsSummary: document.getElementById("claimItems")?.value.trim() || "",
    amount: parseFloat(document.getElementById("claimAmount")?.value) || 0,
    readyTime: document.getElementById("claimReadyTime")?.value || "12:15",
    cancelTime: document.getElementById("claimCancelTime")?.value || "13:00",
    ticketNo: document.getElementById("claimTicketNo")?.value.trim() || "-",
    status: "ยื่นเคลมแล้ว",
    staffName: document.getElementById("claimStaff")?.value.trim() || "พนักงาน"
  };
  claims.unshift(newClaim);
  saveDeliveryClaimsData(claims);
  renderActiveDailyLogTabContent();
  if (typeof showToast === "function") showToast("✅ บันทึกรายการเคลมเดลิเวอรีเรียบร้อยแล้ว!");
}

function updateClaimStatus(idx, newStatus) {
  const claims = getDeliveryClaimsData();
  if (claims[idx]) {
    claims[idx].status = newStatus;
    saveDeliveryClaimsData(claims);
    if (typeof showToast === "function") showToast(`✅ อัปเดตสถานะเคลมเป็น "${newStatus}" แล้ว`);
  }
}

function handleAddWasteLog(event) {
  event.preventDefault();
  const sel = document.getElementById("wasteItemName");
  const itemName = sel?.value || "ไก่ทอด";
  const unitCost = parseFloat(sel?.selectedOptions[0]?.dataset?.cost || "18");
  const qty = parseInt(document.getElementById("wasteQty")?.value) || 1;
  const reason = document.getElementById("wasteReason")?.value || "";
  const staff = document.getElementById("wasteStaff")?.value.trim() || "พนักงาน";

  const wastes = getWasteLogsData();
  wastes.unshift({
    id: "waste-" + Date.now(),
    dateStr: selectedOpsDate,
    branchCode: selectedOpsBranch,
    itemName,
    qty,
    reason,
    estimatedCost: unitCost * qty,
    staff
  });
  saveWasteLogsData(wastes);
  renderActiveDailyLogTabContent();
  if (typeof showToast === "function") showToast("🗑️ บันทึกข้อมูลของเสีย (Waste Log) เรียบร้อยแล้ว");
}

// =========================================================================
// 3️⃣ ระบบเทรนพนักงานใหม่ 3 วัน (Onboarding) + แบบประเมิน 10 ข้อ + ข้อสอบ SOP Quiz
// =========================================================================

const SOP_QUIZ_QUESTIONS = [
  {
    q: "1. อุณหภูมิเนื้อแกนกลางของไก่ทอดทุกชิ้นหลังทอดเสร็จ ต้องได้ไม่ต่ำกว่ากี่องศาเซลเซียส?",
    options: ["60°C", "68°C", "≥ 74°C (165°F)", "85°C"],
    answer: 2,
    explain: "ตามมาตรฐานความปลอดภัยอาหาร อุณหภูมิแกนกลางเนื้อไก่ส่วนที่หนาที่สุดต้อง ≥ 74°C (165°F) ทุกแบทช์"
  },
  {
    q: "2. การทอด 'สะโพกไก่ / น่องติดกระดูก' ต้องตั้งอุณหภูมิเตาทอดเท่าไหร่ และใช้เวลาทอดกี่นาที?",
    options: ["165°C เวลา 11:30 - 12:00 นาที", "170°C เวลา 08:00 - 08:30 นาที", "175°C เวลา 04:00 - 04:30 นาที", "180°C เวลา 15:00 นาที"],
    answer: 0,
    explain: "สะโพกและน่องติดกระดูก ทอดที่ 165°C เวลา 11:30 - 12:00 นาที (จำกัดไม่เกิน 12 ชิ้น/รอบ)"
  },
  {
    q: "3. เทคนิคการคลุกแป้งรอบที่ 2 เพื่อสร้างเกล็ดกรอบ (Fold & Roll) ต้องทำอย่างไร?",
    options: ["บีบอัดแป้งเข้าเนื้อไก่แรงๆ 20 ครั้ง", "สอดมือตลบแป้งหมุนวน 10-12 ครั้ง แล้วสะบัดเคาะข้อมือ 2 ครั้ง", "จุ่มน้ำซ้ำ 3 รอบแล้วโยนลงหม้อทอด", "เขย่าในถุงพลาสติก 50 ครั้ง"],
    answer: 1,
    explain: "ห้ามบีบเนื้อไก่แรงเกินไป ให้สอดมือใต้กองแป้งตลบหมุนวน 10-12 ครั้ง แล้วสะบัดข้อมือ 2 ครั้งให้เกล็ดฟู"
  },
  {
    q: "4. ไก่ทอดติดกระดูก (น่อง/สะโพก) เก็บในตู้โชว์อุ่นไก่ (Holding Cabinet 60-65°C) ได้นานสูงสุดไม่เกินกี่นาที?",
    options: ["15 นาที", "20 นาที", "45 นาที", "2 ชั่วโมง"],
    answer: 2,
    explain: "ไก่ติดกระดูกเก็บในตู้ Holding ได้สูงสุด 45 นาที (วิงส์/สันใน 30 นาที, ไก่ป๊อป 20 นาที, เฟรนช์ฟรายส์ 15 นาที)"
  },
  {
    q: "5. ต้องร่อนแป้งชุบทอดเพื่อคัดก้อนแป้งเปียกทิ้งทุกรอบเท่าไหร่?",
    options: ["ทุกๆ 4 รอบการคลุก", "ร่อนสัปดาห์ละ 1 ครั้ง", "ร่อนเฉพาะตอนปิดร้าน", "ไม่ต้องร่อนเลย"],
    answer: 0,
    explain: "ต้องร่อนแป้งทุกๆ 4 รอบการคลุก เพื่อไม่ให้ก้อนแป้งเปียกไปเกาะตัวไก่จนแข็งกระด้าง"
  },
  {
    q: "6. กฎเหล็กข้อที่ 1 ในการขอเคลมเงินชดเชยกับแอปเดลิเวอรี (เมื่อไรเดอร์ไม่มารับอาหาร) คือข้อใด?",
    options: ["ร้านต้องรีบกดปุ่มยกเลิกออร์เดอร์เองทันที", "ร้านต้องกดปุ่ม 'อาหารพร้อมส่ง (Food Ready)' ทันทีที่ทำเสร็จ และห้ามกดยกเลิกเองเด็ดขาด", "ไม่ต้องถ่ายรูปใบเสร็จเก็บไว้", "นำไก่ที่รอนาน 1 ชั่วโมงส่งให้ไรเดอร์คนถัดไป"],
    answer: 1,
    explain: "ต้องกดสถานะ 'อาหารพร้อมส่ง' ก่อนที่ระบบจะตัดยกเลิก และห้ามร้านเป็นฝ่ายกดยกเลิกเองเด็ดขาด + ถ่ายรูปหลักฐานครบ 3 มุม"
  },
  {
    q: "7. เมื่อตรวจวัดค่าความเสื่อมของน้ำมันทอด (TPM Test Strip) เกินกี่เปอร์เซ็นต์ จึงต้องสั่งเปลี่ยนถ่ายน้ำมันใหม่ทันที?",
    options: ["เกิน 5%", "เกิน 10%", "เกิน 25%", "เกิน 60%"],
    answer: 2,
    explain: "เกณฑ์ปลดระวางน้ำมันทอดคือ ค่า TPM เกิน 25% หรือเกิดควันขาวที่อุณหภูมิต่ำกว่า 170°C"
  },
  {
    q: "8. อุณหภูมิเนื้อไก่สดตอนตรวจรับมอบจากซัพพลายเออร์ ต้องไม่เกินกี่องศาเซลเซียส?",
    options: ["ไม่เกิน 4°C", "ไม่เกิน 15°C", "ไม่เกิน 25°C", "เท่าไหร่ก็ได้"],
    answer: 0,
    explain: "เนื้อไก่สดตอนรับมอบต้องอุณหภูมิ ≤ 4°C เพื่อป้องกันการเจริญเติบโตของเชื้อแบคทีเรีย"
  }
];

function renderOnboardingAndQuizView() {
  const container = document.getElementById("sopContentArea");
  if (!container) return;

  let html = `
    <div class="sop-detail-view">
      <div style="margin-bottom: 1.5rem;">
        <span class="sop-category-tag">🎓 3-DAY FAST-TRACK ONBOARDING & LMS</span>
        <h2 style="font-size: 1.6rem; color: #b45309; font-weight: 800; margin-top: 0.25rem;">
          ระบบเทรนพนักงานใหม่ให้เป็นงานใน 3 วัน & สอบวัดผลมาตรฐาน SOP
        </h2>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          โมเดลการฝึก: ดูภาพ/คลิปสั้น (Watch) ➔ ทำตามพี่เลี้ยง (Shadow) ➔ ลองทำเดี่ยว (Perform) ➔ ประเมินผ่านโปร (Verify)
        </p>
      </div>

      <div class="ops-tabs-bar no-print">
        <button class="ops-tab-btn ${activeTrainingTab === 'plan-3day' ? 'active' : ''}" onclick="switchTrainingTab('plan-3day')">
          📅 1. ตารางเทรน 3 วัน & กฎการถ่ายสื่อ SOP
        </button>
        <button class="ops-tab-btn ${activeTrainingTab === 'quiz' ? 'active' : ''}" onclick="switchTrainingTab('quiz')">
          📝 2. แบบทดสอบความรู้ SOP (Staff Quiz)
        </button>
        <button class="ops-tab-btn ${activeTrainingTab === 'cert-10' ? 'active' : ''}" onclick="switchTrainingTab('cert-10')">
          🏅 3. ใบประเมินผ่านโปร 10 ข้อ (สำหรับผู้จัดการ)
        </button>
      </div>

      <div id="trainingTabContentArea"></div>
    </div>
  `;

  container.innerHTML = html;
  renderActiveTrainingTabContent();
}

function switchTrainingTab(tab) {
  activeTrainingTab = tab;
  renderOnboardingAndQuizView();
}

function renderActiveTrainingTabContent() {
  const area = document.getElementById("trainingTabContentArea");
  if (!area) return;

  const progress = getOnboardingProgressData();

  if (activeTrainingTab === "plan-3day") {
    area.innerHTML = `
      <div class="iron-rules-box" style="margin-bottom: 1.5rem;">
        <div style="font-weight: 900; color: #b45309; font-size: 1.05rem; margin-bottom: 0.5rem;">🏆 กฎทอง 4 ข้อเพื่อให้การเทรนพนักงานใหม่ 3 วันได้ผลจริง:</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 0.75rem;">
          <div class="iron-rule-card"><strong>1. ห้ามให้อ่านตัวหนังสือเกิน 15 นาที:</strong> ให้ดูรูป/คลิปสั้น 10 วินาทีแล้วลงมือขยับกล้ามเนื้อทำตามทันที</div>
          <div class="iron-rule-card"><strong>2. ติด Cheat Sheet ระดับสายตา:</strong> แปะตาราง Frying Matrix และรูป Pass/Fail ข้างเตาทอดและโต๊ะแพ็ก</div>
          <div class="iron-rule-card"><strong>3. ระบบพี่เลี้ยง 1:1 (Buddy):</strong> ช่วง 3 วันแรกพี่เลี้ยงต้องประกบเพื่อหยุดความผิดพลาดก่อนไก่เสีย</div>
          <div class="iron-rule-card"><strong>4. ผิดต้องชี้ที่รูป ไม่ใช่ดุตัวบุคคล:</strong> พาไปเทียบภาพ Pass vs Fail แล้วถามให้พนักงานสังเกตจุดต่างด้วยตนเอง</div>
        </div>
      </div>

      <h4 class="cheat-section-title">📅 แผนการเทรน Onboarding 3 วัน (Fast-Track Training Plan)</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.25rem; margin-bottom: 1.75rem;">
        <!-- Day 1 -->
        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-top: 4px solid #059669; border-radius: 14px; padding: 1.25rem;">
          <div style="font-weight: 900; color: #059669; font-size: 1.1rem; margin-bottom: 0.5rem;">🟢 วันที่ 1: สุขอนามัย การเตรียมของ & ปิดร้าน</div>
          <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 0.75rem;">เป้าหมาย: คุ้นเคยพื้นที่ร้าน วินัย FIFO และเก็บร้านสะอาด 100%</p>
          <ul style="padding-left: 1.1rem; font-size: 0.88rem; line-height: 1.65; color: var(--text-main);">
            <li><strong>ช่วงเช้า (ชม. 1-3):</strong> ดูรูปการแต่งกาย ล้างมือ 7 ขั้นตอน จัดตู้แช่ FIFO (ไก่ดิบล่างสุด) และฝึกตรวจรับไก่สด ≤ 4°C</li>
            <li><strong>ช่วงบ่าย (ชม. 4-6):</strong> ลงมือชั่งผงหมัก บากเนื้อสะโพก 2 รอย นวดไก่ 3 นาที และติดป้าย Use-by Label</li>
            <li><strong>ช่วงเย็น (ชม. 7-8):</strong> เดินตรวจความสะอาดตาม Checklist ปิดร้าน ล้างซอกเตาทอดและตักบ่อดักไขมัน</li>
          </ul>
        </div>

        <!-- Day 2 -->
        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-top: 4px solid #d97706; border-radius: 14px; padding: 1.25rem;">
          <div style="font-weight: 900; color: #d97706; font-size: 1.1rem; margin-bottom: 0.5rem;">🟠 วันที่ 2: สเตชันทอด (Frying Station)</div>
          <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 0.75rem;">เป้าหมาย: ทอดไก่สีทอง เกล็ดฟู สุกทั่วถึง ≥ 74°C</p>
          <ul style="padding-left: 1.1rem; font-size: 0.88rem; line-height: 1.65; color: var(--text-main);">
            <li><strong>ช่วงเช้า (ชม. 1-3):</strong> ซ้อมท่าตลบแป้ง Fold & Roll 10-12 ครั้ง + สะบัดข้อมือ 2 ครั้ง และท่องจำตาราง Frying Matrix</li>
            <li><strong>ช่วงบ่าย (ชม. 4-6):</strong> ลงเตาทอดจริง 3 แบทช์ (สะโพก, ปีก, ไก่ป๊อป) หย่อนไก่จากใกล้ตัวไปไกลตัว + วัดโพรบ ≥ 74°C</li>
            <li><strong>ช่วงเย็น (ชม. 7-8):</strong> เทียบไก่ทอดจริงกับกระดาน Pass vs Fail ฝึกช้อนกากแป้ง กรองน้ำมัน และวัดค่า TPM</li>
          </ul>
        </div>

        <!-- Day 3 -->
        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-top: 4px solid #2563eb; border-radius: 14px; padding: 1.25rem;">
          <div style="font-weight: 900; color: #2563eb; font-size: 1.1rem; margin-bottom: 0.5rem;">🔵 วันที่ 3: ตู้โชว์ แพ็กเกจ & สอบ Solo Run</div>
          <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 0.75rem;">เป้าหมาย: จัดออร์เดอร์ไม่ผิด คัดของหมดอายุตรงเวลา</p>
          <ul style="padding-left: 1.1rem; font-size: 0.88rem; line-height: 1.65; color: var(--text-main);">
            <li><strong>ช่วงเช้า (ชม. 1-3):</strong> คุมอายุอาหารในตู้โชว์ (45/30/20/15 นาที) ฝึกคลุกซอสใน 10 วิ เขย่าผง และเปิดรูระบายกล่อง</li>
            <li><strong>ช่วงบ่าย (ชม. 4-6):</strong> ยืนสเตชันเดี่ยวช่วง Off-Peak (Solo Run) โดยมีพี่เลี้ยงดูห่างๆ</li>
            <li><strong>ช่วงเย็น (ชม. 7-8):</strong> สอบทำ Quiz ออนไลน์ และผู้จัดการประเมิน 3-Day Certification 10 ข้อเพื่อมอบป้ายชื่อ</li>
          </ul>
        </div>
      </div>

      <h4 class="cheat-section-title">📸 คู่มือการถ่ายภาพและวิดีโอสั้นประกอบ SOP ร้านผมขอทอด (Zero-Error Visual Guide)</h4>
      <div style="overflow-x: auto;">
        <table class="matrix-table-large">
          <thead>
            <tr>
              <th>มุมกล้องมาตรฐาน</th>
              <th>เหมาะสำหรับงานประเภทไหน</th>
              <th>ตัวอย่างการใช้งานจริงในร้านผมขอทอด</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>👁️ POV (Point of View - มุมสายตาคนทำ)</strong></td>
              <td>งานที่ต้องใช้ 2 มือ หรือจำจังหวะการเคลื่อนไหว (คลิป 5-10 วิ / GIF Loop)</td>
              <td>จังหวะสองมือตลบแป้ง Fold & Roll 10-12 ครั้ง, การสะบัดข้อมือ 2 ครั้ง, การหย่อนไก่ลงเตา</td>
            </tr>
            <tr>
              <td><strong>📐 Top-down (มุมมองจากด้านบน 90°)</strong></td>
              <td>งานจัดวางสัดส่วน การเรียงลำดับ หรือเช็กลิสต์</td>
              <td>การวางไก่และเครื่องเคียงลงกล่องเดลิเวอรี, ผังการจัดโต๊ะแพ็ก One-Way Flow</td>
            </tr>
            <tr>
              <td><strong>🔍 Side-Angle / Close-up (มุมข้างระยะใกล้)</strong></td>
              <td>งานที่ต้องการดูระดับ ความลึก หรือตำแหน่งจุดวิกฤต</td>
              <td>การดูระดับน้ำมัน Min-Max, ตำแหน่งเสียบโพรบวัดอุณหภูมิแกนกลางสะโพกไก่ (≥74°C)</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  } else if (activeTrainingTab === "quiz") {
    area.innerHTML = `
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 14px; padding: 1.25rem; margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h4 style="font-size: 1.15rem; font-weight: 800; color: #b45309;">📝 แบบทดสอบมาตรฐาน SOP แฟรนไชส์ร้านผมขอทอด (เกณฑ์ผ่าน 80% ขึ้นไป)</h4>
            <p style="font-size: 0.85rem; color: #92400e;">พนักงานใหม่ทุกคนต้องทำแบบทดสอบนี้ให้ผ่านเกณฑ์ก่อนยืนสเตชันจริงในวันที่ 3</p>
          </div>
          <div style="display: flex; gap: 0.6rem; align-items: center;">
            <input type="text" id="quizStaffNameInput" class="form-input" placeholder="ระบุชื่อพนักงานผู้เข้าสอบ *" style="width: 210px; background: #fff;" />
          </div>
        </div>
      </div>

      <form onsubmit="handleSubmitSopQuiz(event)">
        <div style="display: flex; flex-direction: column; gap: 1.1rem; margin-bottom: 1.5rem;">
          ${SOP_QUIZ_QUESTIONS.map((qItem, qIdx) => `
            <div class="quiz-question-card" id="quizCard_${qIdx}" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 14px; padding: 1.25rem;">
              <div style="font-weight: 800; font-size: 1rem; color: var(--text-main); margin-bottom: 0.75rem;">${qItem.q}</div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.6rem;">
                ${qItem.options.map((opt, optIdx) => `
                  <label style="display: flex; align-items: center; gap: 0.6rem; padding: 0.65rem 0.9rem; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 10px; cursor: pointer; font-size: 0.9rem; font-weight: 600;">
                    <input type="radio" name="quiz_q_${qIdx}" value="${optIdx}" required />
                    <span>${opt}</span>
                  </label>
                `).join("")}
              </div>
              <div id="quizExplain_${qIdx}" style="display: none; margin-top: 0.75rem; padding: 0.6rem 0.9rem; border-radius: 8px; font-size: 0.85rem; font-weight: 700;"></div>
            </div>
          `).join("")}
        </div>

        <div id="quizResultBanner" style="display: none; margin-bottom: 1.25rem; padding: 1.25rem; border-radius: 14px; font-weight: 800; text-align: center; font-size: 1.15rem;"></div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button type="submit" class="action-btn btn-primary" style="width: auto; padding: 0.8rem 2rem; font-size: 1rem;">
            ✅ ส่งคำตอบและตรวจคะแนนทันที
          </button>
        </div>
      </form>

      ${progress.quizScores && progress.quizScores.length > 0 ? `
        <div style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
          <h4 class="cheat-section-title">🏆 ประวัติคะแนนสอบพนักงาน (Staff Quiz History)</h4>
          <table class="matrix-table-large">
            <thead>
              <tr>
                <th>วันที่สอบ</th>
                <th>ชื่อพนักงาน</th>
                <th>สาขา</th>
                <th>คะแนนที่ได้</th>
                <th>ผลการประเมิน</th>
              </tr>
            </thead>
            <tbody>
              ${progress.quizScores.map(s => `
                <tr>
                  <td>${s.dateStr}</td>
                  <td><strong>${escapeHtml(s.staffName)}</strong></td>
                  <td>${s.branchCode}</td>
                  <td><strong>${s.score} / ${s.total} (${s.percent}%)</strong></td>
                  <td>${s.passed ? `<span class="pass-pill">🎉 ผ่านเกณฑ์มาตรฐาน</span>` : `<span style="color:#dc2626; font-weight:800;">❌ ไม่ผ่าน (ต้องสอบซ้ำ)</span>`}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : ''}
    `;
  } else {
    const certItems = [
      "1. แต่งกายถูกระเบียบ 100% ล้างมือครบ 7 ขั้นตอน และไม่สัมผัสอาหารพร้อมทานด้วยมือเปล่า",
      "2. ตรวจรับไก่สดวัดอุณหภูมิ ≤ 4°C และจัดเรียงเข้าตู้แช่ตามหลัก FIFO ได้ถูกต้อง",
      "3. ชั่งตวงผงหมัก บากเนื้อสะโพกไก่ 2 รอย และติดสติกเกอร์ Use-by Label ครบทุกกล่อง",
      "4. คลุกแป้งด้วยเทคนิค Fold & Roll 10-12 ครั้ง + สะบัดข้อมือ 2 ครั้ง ได้เกล็ดแป้งฟูสวยไม่เป็นก้อนแข็ง",
      "5. ร่อนแป้งทุกๆ 4 รอบการคลุก และหย่อนไก่ลงเตาทอดจากด้านใกล้ตัวไปไกลตัวได้อย่างปลอดภัย",
      "6. ตั้งอุณหภูมิและเวลาทอดตามตาราง Frying Matrix ได้แม่นยำโดยไม่ต้องก้มหาเอกสาร",
      "7. เขย่าสะเด็ดน้ำมัน 30 วินาที และเสียบโพรบวัดอุณหภูมิแกนกลางเนื้อไก่ได้ ≥ 74°C ทุกแบทช์",
      "8. คลุกซอสเสร็จภายใน 10 วินาที / เขย่าผงครบจังหวะ และเปิดรูระบายไอน้ำข้างกล่องทุกใบ",
      "9. ตรวจบิล POS เทียบสินค้าแบบ Tick-off ครบถ้วน แยกถุงเครื่องดื่มเย็น และติดสติกเกอร์ Tamper Seal",
      "10. ช้อนกากแป้ง กรองน้ำมัน วัดค่า TPM บันทึก Waste Log และทำ Deep Clean ปิดร้านได้ครบสมบูรณ์"
    ];

    area.innerHTML = `
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 14px; padding: 1.25rem; margin-bottom: 1.25rem;">
        <h4 style="font-size: 1.15rem; font-weight: 800; color: #047857;">🏅 ใบประเมินผลปฏิบัติจริงวันที่ 3 (3-Day Certification Checklist 10 ข้อ)</h4>
        <p style="font-size: 0.86rem; color: #065f46;">ผู้จัดการสาขาใช้ตรวจประเมินพนักงานใหม่ในช่วงเย็นวันที่ 3 ก่อนมอบป้ายชื่อพนักงานอย่างเป็นทางการ</p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.65rem; margin-bottom: 1.5rem;">
        ${certItems.map((txt, idx) => `
          <label style="display: flex; align-items: center; gap: 0.8rem; background: #fff; padding: 0.85rem 1.1rem; border-radius: 12px; border: 1px solid var(--border-color); cursor: pointer;">
            <input type="checkbox" onchange="toggleCertCheckItem(${idx}, this.checked)" ${progress.certChecks && progress.certChecks[idx] ? 'checked' : ''} style="width: 20px; height: 20px;" />
            <span style="font-weight: 700; font-size: 0.94rem;">${txt}</span>
          </label>
        `).join("")}
      </div>
    `;
  }
}

function handleSubmitSopQuiz(event) {
  event.preventDefault();
  const staffName = (document.getElementById("quizStaffNameInput")?.value || "").trim() || "พนักงานทดสอบ";
  let score = 0;
  const total = SOP_QUIZ_QUESTIONS.length;

  SOP_QUIZ_QUESTIONS.forEach((qItem, qIdx) => {
    const selected = document.querySelector(`input[name="quiz_q_${qIdx}"]:checked`);
    const chosenIdx = selected ? parseInt(selected.value) : -1;
    const explainEl = document.getElementById(`quizExplain_${qIdx}`);
    const cardEl = document.getElementById(`quizCard_${qIdx}`);

    if (chosenIdx === qItem.answer) {
      score++;
      if (cardEl) cardEl.style.borderColor = "#10b981";
      if (explainEl) {
        explainEl.style.display = "block";
        explainEl.style.background = "#ecfdf5";
        explainEl.style.color = "#047857";
        explainEl.innerText = `✅ ถูกต้อง! ${qItem.explain}`;
      }
    } else {
      if (cardEl) cardEl.style.borderColor = "#ef4444";
      if (explainEl) {
        explainEl.style.display = "block";
        explainEl.style.background = "#fef2f2";
        explainEl.style.color = "#dc2626";
        explainEl.innerText = `❌ คำตอบที่ถูกคือ "${qItem.options[qItem.answer]}" — ${qItem.explain}`;
      }
    }
  });

  const percent = Math.round((score / total) * 100);
  const passed = percent >= 80;

  const banner = document.getElementById("quizResultBanner");
  if (banner) {
    banner.style.display = "block";
    banner.style.background = passed ? "#ecfdf5" : "#fef2f2";
    banner.style.color = passed ? "#047857" : "#dc2626";
    banner.style.border = `2px solid ${passed ? '#10b981' : '#ef4444'}`;
    banner.innerHTML = passed
      ? `🎉 ยินดีด้วยคุณ ${escapeHtml(staffName)}! สอบได้ ${score}/${total} คะแนน (${percent}%) — ผ่านเกณฑ์มาตรฐาน SOP!`
      : `⚠️ คุณ ${escapeHtml(staffName)} สอบได้ ${score}/${total} คะแนน (${percent}%) — ยังไม่ถึงเกณฑ์ 80% กรุณาทบทวนจุดที่ผิดแล้วสอบใหม่อีกครั้งค่ะ`;
  }

  const progress = getOnboardingProgressData();
  if (!Array.isArray(progress.quizScores)) progress.quizScores = [];
  progress.quizScores.unshift({
    dateStr: getThaiTodayStr(),
    staffName,
    branchCode: selectedOpsBranch,
    score,
    total,
    percent,
    passed
  });
  saveOnboardingProgressData(progress);
}

function toggleCertCheckItem(idx, checked) {
  const progress = getOnboardingProgressData();
  if (!progress.certChecks) progress.certChecks = {};
  progress.certChecks[idx] = checked;
  saveOnboardingProgressData(progress);
}

// =========================================================================
// 4️⃣ ระบบคลังราคาวัตถุดิบกลางและคำนวณต้นทุน (Master Ingredient & Food Cost - เฉพาะ Admin)
// =========================================================================

function renderFoodCostingAdminView() {
  const container = document.getElementById("sopContentArea");
  if (!container) return;

  if (typeof currentRole !== "undefined" && currentRole !== "admin") {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem;">
        <div style="font-size: 3rem;">🔒</div>
        <h3 style="color: #dc2626;">เฉพาะผู้บริหาร (Admin) เท่านั้นที่สามารถเข้าถึงข้อมูลต้นทุนและกำไรได้</h3>
      </div>
    `;
    return;
  }

  const masterIngs = getMasterIngredients();
  const allSops = getSOPData().filter(s => s.ingredients && s.ingredients.length > 0);

  let html = `
    <div class="sop-detail-view">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <span class="sop-category-tag" style="background:#fef2f2; color:#dc2626; border-color:#fecaca;">👑 ADMIN SECRET • MASTER FOOD COSTING</span>
          <h2 style="font-size: 1.6rem; color: #b45309; font-weight: 800; margin-top: 0.25rem;">
            💰 คลังราคาวัตถุดิบกลาง & วิเคราะห์ต้นทุนสูตรอาหาร (Food Cost %)
          </h2>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            อัปเดตราคาซื้อวัตถุดิบที่ตารางด้านล่างเพียงครั้งเดียว ระบบจะคำนวณต้นทุนต่อ Batch และ % Food Cost ของทุกสูตรให้อัตโนมัติ (ซ่อนจากพนักงานทั่วไป 100%)
          </p>
        </div>
      </div>

      <!-- Recipe Cost Summary Cards -->
      <h4 class="cheat-section-title">📊 สรุปต้นทุนและกำไรขั้นต้นแยกตามสูตร SOP (Recipe Cost & GP Breakdown)</h4>
      <div style="overflow-x: auto; margin-bottom: 2rem;">
        <table class="matrix-table-large">
          <thead>
            <tr>
              <th>ชื่อสูตร SOP</th>
              <th>ปริมาณที่ได้ (Yield)</th>
              <th>ต้นทุนวัตถุดิบรวม / Batch</th>
              <th>มูลค่าขายรวมต่อ Batch (ประมาณการ)</th>
              <th>กำไรขั้นต้น (Gross Profit)</th>
              <th>% Food Cost</th>
            </tr>
          </thead>
          <tbody>
            ${allSops.map((sop, sIdx) => {
              const batchCost = (sop.ingredients || []).reduce((acc, ing) => acc + calculateIngredientLineCost(ing.name, ing.amount, ing.unit), 0);
              const sellPrice = parseFloat(sop.sellingPrice) || (batchCost * 3);
              const gp = sellPrice - batchCost;
              const fcPercent = sellPrice > 0 ? (batchCost / sellPrice) * 100 : 0;
              return `
                <tr>
                  <td><strong>${escapeHtml(sop.title)}</strong></td>
                  <td>${escapeHtml(sop.yield || '1 Batch')}</td>
                  <td><strong style="color: #dc2626; font-size: 1.05rem;">${batchCost.toFixed(2)} บาท</strong></td>
                  <td>
                    <input type="number" class="form-input" value="${sellPrice.toFixed(0)}" style="width: 100px; padding: 0.3rem 0.5rem; font-weight: 700; display: inline-block;" onchange="updateSopSellingPrice('${sop.id}', this.value)" /> บาท
                  </td>
                  <td><strong style="color: #059669;">+${gp.toFixed(2)} บาท</strong></td>
                  <td>
                    <span style="padding: 0.25rem 0.65rem; border-radius: 12px; font-weight: 800; font-size: 0.82rem; background: ${fcPercent <= 35 ? '#ecfdf5' : '#fef2f2'}; color: ${fcPercent <= 35 ? '#047857' : '#dc2626'};">
                      ${fcPercent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <!-- Master Ingredient Price Table -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <h4 class="cheat-section-title" style="margin:0;">🥩 คลังราคาวัตถุดิบกลาง (Master Ingredient Price List)</h4>
        <button class="action-btn btn-primary" onclick="handleSaveMasterIngredientPrices()" style="width: auto; padding: 0.55rem 1.25rem;">
          💾 บันทึกราคาวัตถุดิบกลางทั้งหมด
        </button>
      </div>

      <div style="overflow-x: auto; margin-bottom: 1.25rem;">
        <table class="matrix-table-large">
          <thead>
            <tr>
              <th>ชื่อวัตถุดิบมาตรฐาน</th>
              <th>หมวด</th>
              <th>ขนาดบรรจุที่ซื้อ</th>
              <th>หน่วย</th>
              <th>ราคาซื้อต่อแพ็ก/กก. (บาท)</th>
              <th>ต้นทุนต่อกรัม/มล./ชุด</th>
            </tr>
          </thead>
          <tbody>
            ${masterIngs.map((ing, idx) => `
              <tr>
                <td><input type="text" class="form-input ming-name-${idx}" value="${escapeHtml(ing.name)}" style="padding: 0.35rem 0.6rem; font-weight: 700;" /></td>
                <td>${escapeHtml(ing.category || 'ทั่วไป')}</td>
                <td><input type="number" class="form-input ming-size-${idx}" value="${ing.packSize}" style="width: 95px; padding: 0.35rem 0.5rem; text-align: center;" /></td>
                <td><input type="text" class="form-input ming-unit-${idx}" value="${escapeHtml(ing.unit)}" style="width: 65px; padding: 0.35rem 0.5rem; text-align: center;" /></td>
                <td><input type="number" step="0.5" class="form-input ming-price-${idx}" value="${ing.packPrice}" style="width: 110px; padding: 0.35rem 0.5rem; text-align: right; font-weight: 800; color: #b45309;" /> บาท</td>
                <td><strong style="color: #059669;">${(ing.packPrice / (ing.packSize || 1)).toFixed(4)} บาท / ${ing.unit}</strong></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem; display: flex; gap: 0.75rem; align-items: end; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 200px;">
          <label class="form-label">➕ เพิ่มวัตถุดิบใหม่เข้าคลังกลาง</label>
          <input type="text" id="newMingName" class="form-input" placeholder="เช่น ผงชีสเชดดาร์, ถุงหิ้วเดลิเวอรี" />
        </div>
        <div style="width: 120px;">
          <label class="form-label">ขนาดบรรจุ</label>
          <input type="number" id="newMingSize" class="form-input" value="1000" />
        </div>
        <div style="width: 90px;">
          <label class="form-label">หน่วย</label>
          <input type="text" id="newMingUnit" class="form-input" value="g" />
        </div>
        <div style="width: 140px;">
          <label class="form-label">ราคาซื้อ (บาท)</label>
          <input type="number" id="newMingPrice" class="form-input" placeholder="เช่น 250" />
        </div>
        <button type="button" class="action-btn btn-secondary" onclick="handleAddMasterIngredient()" style="width: auto;">
          ➕ เพิ่มเข้าคลัง
        </button>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function handleSaveMasterIngredientPrices() {
  const list = getMasterIngredients();
  list.forEach((ing, idx) => {
    const n = document.querySelector(`.ming-name-${idx}`);
    const s = document.querySelector(`.ming-size-${idx}`);
    const u = document.querySelector(`.ming-unit-${idx}`);
    const p = document.querySelector(`.ming-price-${idx}`);
    if (n) ing.name = n.value.trim();
    if (s) ing.packSize = parseFloat(s.value) || 1;
    if (u) ing.unit = u.value.trim() || "g";
    if (p) ing.packPrice = parseFloat(p.value) || 0;
    ing.costPerUnit = ing.packPrice / ing.packSize;
  });
  saveMasterIngredients(list);
  renderFoodCostingAdminView();
  if (typeof showToast === "function") showToast("💰 อัปเดตราคาวัตถุดิบกลางและคำนวณต้นทุนทุกสูตรใหม่เรียบร้อยแล้ว!");
}

function handleAddMasterIngredient() {
  const name = (document.getElementById("newMingName")?.value || "").trim();
  const packSize = parseFloat(document.getElementById("newMingSize")?.value) || 1000;
  const unit = (document.getElementById("newMingUnit")?.value || "g").trim();
  const packPrice = parseFloat(document.getElementById("newMingPrice")?.value) || 0;

  if (!name) {
    if (typeof showToast === "function") showToast("⚠️ กรุณาระบุชื่อวัตถุดิบ", "error");
    return;
  }

  const list = getMasterIngredients();
  list.push({
    id: "ing-" + Date.now(),
    name,
    category: "กำหนดเอง",
    packSize,
    unit,
    packPrice,
    costPerUnit: packPrice / packSize
  });
  saveMasterIngredients(list);
  renderFoodCostingAdminView();
  if (typeof showToast === "function") showToast(`✅ เพิ่ม "${name}" เข้าคลังราคาวัตถุดิบกลางแล้ว!`);
}

function updateSopSellingPrice(sopId, newPriceVal) {
  const allSops = getSOPData();
  const found = allSops.find(s => s.id === sopId);
  if (found) {
    found.sellingPrice = parseFloat(newPriceVal) || 0;
    saveSOPData(allSops);
    renderFoodCostingAdminView();
    if (typeof showToast === "function") showToast("💰 อัปเดตราคาขายและคำนวณ % Food Cost แล้ว");
  }
}

// =========================================================================
// 5️⃣ ระบบแผนผังจัดเก็บตู้เย็น 2 ประตู (Interactive Fridge Plan) + เช็กลิสต์ตรวจตู้เย็นรายวัน + พิมพ์สติกเกอร์ Fast-Tick 12 ดวง/A4
// =========================================================================

let activeFridgeSubTab = "diagram"; // 'diagram' | 'checklist' | 'stickers'
let selectedFridgeId = "chiller-1"; // 'chiller-1' | 'chiller-2'
let selectedStickerColorTheme = "blue"; // 'blue' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | 'usefirst'

const DEFAULT_FRIDGE_PLANS = {
  "chiller-1": {
    id: "chiller-1",
    title: "ตู้ที่ 1: ตู้แช่เย็น 2 ประตู (Chiller วัตถุดิบสด / ผัก / ของหมักดอง / เครื่องดื่ม)",
    tempRange: "1°C – 4°C (ห้ามเกิน 5°C)",
    posterImage: "assets/fridge-plan-diagram.png",
    leftDoorTitle: "ประตูซ้าย : ฝั่งวัตถุดิบเตรียม / ใช้บ่อย (High Frequency & Mise en place)",
    rightDoorTitle: "ประตูขวา : ฝั่งสต็อกสำรอง / ของหมักดอง (Bulk Stock & Pickled)",
    shelves: [
      {
        level: 1,
        leftZoneTitle: "ชั้น 1 บนสุด : พร้อมเสิร์ฟ / หยิบง่าย",
        rightZoneTitle: "ชั้น 1 บนสุด : เครื่องดื่มกระป๋อง",
        leftItems: [
          {
            id: "f1-l1-1",
            icon: "🥢",
            name: "กิมจิ แพ็คถ้วยเล็ก + ถ้วยใหญ่",
            badge: "เรียง FIFO",
            container: "ถ้วยแพ็คพร้อมเสิร์ฟปิดฝาสนิท",
            method: "วางเรียงตามระบบ FIFO (ของแพ็คก่อนไว้หน้า ของใหม่ไว้หลัง) ชั้นบนหยิบไวสุด ไม่ต้องก้ม"
          },
          {
            id: "f1-l1-2",
            icon: "🧊",
            name: "ไชเท้าดอง แพ็คถ้วยเล็ก + ถ้วยใหญ่",
            badge: "เรียง FIFO",
            container: "ถ้วยแพ็คพร้อมเสิร์ฟปิดฝาสนิท",
            method: "วางเรียงตามระบบ FIFO (ของแพ็คก่อนไว้หน้า ของใหม่ไว้หลัง) หยิบลงถุงเดลิเวอรีได้ทันที"
          }
        ],
        rightItems: [
          {
            id: "f1-r1-1",
            icon: "🥤",
            name: "โค้กกระป๋อง",
            badge: "เรียงแถวแนวลึก",
            container: "กระป๋องอลูมิเนียม",
            method: "เรียงเป็นแถวตอนลึก รับไอเย็นสม่ำเสมอ หยิบเติมง่าย ไม่กระทบต่อการไหลของลมแอร์"
          }
        ]
      },
      {
        level: 2,
        leftZoneTitle: "ชั้น 2 : วัตถุดิบเตรียมเสร็จ (Mise en place)",
        rightZoneTitle: "ชั้น 2 : กล่องตักเสิร์ฟหลัก (Daily Use)",
        leftItems: [
          {
            id: "f1-l2-1",
            icon: "🌿",
            name: "ต้นหอม ซอยแล้ว",
            badge: "กล่องมีตะแกรงรองน้ำ",
            container: "กล่อง Food Grade มีตะแกรงรองก้นกล่อง + ทิชชู่ซับน้ำ",
            method: "ใส่กล่อง Food Grade ปิดสนิท ใส่แผ่นตะแกรงรองก้นกล่องและเปลี่ยนกระดาษทิชชู่ซับน้ำทุกเย็น กันน้ำผักนองจนเน่าเละ"
          },
          {
            id: "f1-l2-2",
            icon: "🧅",
            name: "หอมใหญ่ หั่นแล้ว",
            badge: "กล่องปิดสนิท",
            container: "กล่อง Food Grade ปิดฝาล็อกสนิท",
            method: "ใส่กล่อง Food Grade ปิดสนิท ติดสติกเกอร์ระบุวันที่หั่นและวันหมดอายุชัดเจน"
          },
          {
            id: "f1-l2-3",
            icon: "🍄",
            name: "เห็ดเข็มทอง หั่นแต่งโคนแล้ว",
            badge: "กล่องซับทิชชู่",
            container: "กล่อง Food Grade รองและคลุมทิชชู่ฟู้ดเกรด",
            method: "รองทิชชู่ซับอาหารฟู้ดเกรดใต้กล่องและคลุมด้านบน ปิดฝาเพื่อคุมไม่ให้เห็ดดูดความชื้นจนเปลี่ยนเป็นสีน้ำตาล (เปลี่ยนทิชชู่ทุกเย็น)"
          }
        ],
        rightItems: [
          {
            id: "f1-r2-1",
            icon: "🌶️",
            name: "กิมจิ แบบใส่ Superlock",
            badge: "ล็อกกลิ่น 100%",
            container: "กล่อง Superlock มีขอบยางซิลิโคน",
            method: "ล็อกกลิ่นไม่ให้ฟุ้งในตู้ หยิบออกมาตักแบ่งได้สะดวกตามรอบการทำงาน (เช็ดคราบน้ำหมักดองรอบขอบยางก่อนปิดล็อกทุกเย็น)"
          },
          {
            id: "f1-r2-2",
            icon: "💛",
            name: "ไชเท้าดอง แบบใส่ Superlock",
            badge: "ล็อกกลิ่น 100%",
            container: "กล่อง Superlock มีขอบยางซิลิโคน",
            method: "ล็อกกลิ่นและคงความกรอบ หยิบออกมาตักแพ็คถ้วยตามรอบการทำงาน เช็ดขอบยางกล่องให้สะอาดเสมอ"
          }
        ]
      },
      {
        level: 3,
        leftZoneTitle: "ชั้น 3 : วัตถุดิบสดพร้อมปรุง / บอบบาง",
        rightZoneTitle: "ชั้น 3 : วัตถุดิบพร้อมปรุง / กึ่งสำเร็จรูป",
        leftItems: [
          {
            id: "f1-l3-1",
            icon: "🥚",
            name: "เต้าหู้หลอด",
            badge: "ห้ามซ้อนเกิน 2 ชั้น",
            container: "ถาดเรียบเรียงแนวราบ",
            method: "วางนอนราบเป็นระเบียบ ห้ามวางซ้อนเกิน 2 ชั้น หรือถูกวัตถุดิบหนักทับ เพื่อป้องกันหลอดแตก"
          },
          {
            id: "f1-l3-2",
            icon: "🍄",
            name: "เห็ดเข็มทอง แบบแพ็ค",
            badge: "คงถุงสุญญากาศเดิม",
            container: "บรรจุภัณฑ์สุญญากาศเดิม",
            method: "คงบรรจุภัณฑ์สุญญากาศเดิมไว้ หลีกเลี่ยงการโดนลมแอร์เป่าตรงๆ"
          }
        ],
        rightItems: [
          {
            id: "f1-r3-1",
            icon: "🍲",
            name: "น้ำซุปกิมจิ",
            badge: "โถมีฝา/วาล์วเท",
            container: "โถ/กล่อง Food Grade ปิดฝาแน่นหนา",
            method: "เก็บในภาชนะ Food Grade ปิดฝาแน่นหนา ระบุวันที่ผลิตและวันหมดอายุบนป้ายสติกเกอร์ชัดเจน"
          },
          {
            id: "f1-r3-2",
            icon: "📦",
            name: "ไชเท้าดอง แบบถุงซีล (สต็อกสำรอง)",
            badge: "สต็อกสำรอง",
            container: "ถุงซีลสุญญากาศจากโรงงาน",
            method: "วางนอนเรียงซ้อนกันเป็นสต็อกสำรองสำหรับแกะเติมลงกล่อง Superlock ตามระบบ FIFO"
          }
        ]
      },
      {
        level: 4,
        leftZoneTitle: "ชั้น 4 ล่างสุด : ผักสดทั้งต้น / ของหนัก",
        rightZoneTitle: "ชั้น 4 ล่างสุด : สต็อกหนัก / หมักดอง",
        leftItems: [
          {
            id: "f1-l4-1",
            icon: "🥬",
            name: "ต้นหอม แบบต้น",
            badge: "ห่อกระดาษซับชื้น",
            container: "ห่อกระดาษอเนกประสงค์หนา + ถุงโปร่ง",
            method: "ไม่ต้องล้างก่อนแช่ ห่อโคนและลำต้นด้วยกระดาษอเนกประสงค์หนา ใส่ถุงโปร่งกันความชื้นสะสม"
          },
          {
            id: "f1-l4-2",
            icon: "🧺",
            name: "หอมใหญ่ แบบเป็นลูก",
            badge: "ตะกร้าโปร่งมีรูระบาย",
            container: "ตะกร้าพลาสติกโปร่งระบายอากาศ",
            method: "ใส่ตะกร้าพลาสติกโปร่งที่มีช่องระบายอากาศ อย่าวางชิดกิมจิหรือกองบนพื้นตู้โดยตรง"
          }
        ],
        rightItems: [
          {
            id: "f1-r4-1",
            icon: "🏋️",
            name: "กิมจิ แบบลัง (น้ำหนักเยอะ)",
            badge: "วางติดพื้นตู้",
            container: "ลังพลาสติก/กล่องสต็อกหนัก",
            method: "ของหนักที่สุดวางล่างสุดติดพื้นตู้เพื่อความปลอดภัยตามหลัก Ergonomics และป้องกันการตกหล่น"
          }
        ]
      }
    ]
  },
  "chiller-2": {
    id: "chiller-2",
    title: "ตู้ที่ 2: ตู้แช่เย็น 2 ประตู (Chiller ไก่หมัก / ไก่สด / ซอสคลุกไก่ & แป้งชุบทอด)",
    tempRange: "1°C – 4°C (ควบคุมความเย็นเนื้อไก่ ≤ 4°C)",
    posterImage: "assets/fridge-plan-diagram.png",
    leftDoorTitle: "ประตูซ้าย : ฝั่งไก่หมักพร้อมทอด / ใช้บ่อยตามรอบ FIFO",
    rightDoorTitle: "ประตูขวา : ฝั่งสต็อกซอสคลุกไก่ / น้ำเย็นจัดผสมแป้ง",
    shelves: [
      {
        level: 1,
        leftZoneTitle: "ชั้น 1 บนสุด : ซอสพร้อมทา & เครื่องปรุงแบ่งใช้",
        rightZoneTitle: "ชั้น 1 บนสุด : น้ำเย็นจัดชุบแป้ง & ท็อปปิ้งคุมชื้น",
        leftItems: [
          {
            id: "f2-l1-1",
            icon: "🍯",
            name: "ซอสคลุกไก่พร้อมใช้ (เกาหลี / น้ำปลา / กระเทียม)",
            badge: "หยิบไว ไม่ต้องก้ม",
            container: "ขวดบีบ / กล่องตักแบ่ง Food Grade",
            method: "เรียงตามระบบ FIFO ปิดฝาสนิททุกครั้งหลังตักแบ่งไปสเตชันคลุกซอส"
          }
        ],
        rightItems: [
          {
            id: "f2-r1-1",
            icon: "💧",
            name: "น้ำเย็นจัดสำหรับผสมแป้งชุบทอด (0°C - 4°C)",
            badge: "คุมความกรอบแป้ง",
            container: "เหยือก/ขวดน้ำดื่มแช่เย็นจัด",
            method: "แช่เตรียมไว้ล่วงหน้าเพื่อให้แป้งแบทเทอร์จับตัวเป็นเกล็ดกรอบฟูสม่ำเสมอ"
          }
        ]
      },
      {
        level: 2,
        leftZoneTitle: "ชั้น 2 : ไก่หมักพร้อมทอดรอบวันนี้ (Ready-to-Fry FIFO)",
        rightZoneTitle: "ชั้น 2 : ซอสดิป & มายองเนสพร้อมเสิร์ฟ",
        leftItems: [
          {
            id: "f2-l2-1",
            icon: "🍗",
            name: "สะโพกไร้กระดูก & น่องไก่หมักพร้อมทอด",
            badge: "USE FIRST ไว้หน้า",
            container: "กล่องใส Food Grade ปิดฝาสนิท",
            method: "ไก่ที่หมักครบเวลาแล้ว เรียงกล่องที่หมักก่อนไว้ด้านหน้าสุด (FIFO) ติดป้าย Prep Label ครบทุกกล่อง"
          },
          {
            id: "f2-l2-2",
            icon: "🪽",
            name: "ปีกกลาง & ปีกบนหมักพร้อมทอด",
            badge: "เรียง FIFO",
            container: "กล่องใส Food Grade ปิดฝาสนิท",
            method: "แยกกล่องตามชิ้นส่วนชัดเจน ห้ามซ้อนทับจนบังช่องลมแอร์ (เว้นระยะ 5-10 ซม.)"
          }
        ],
        rightItems: [
          {
            id: "f2-r2-1",
            icon: "🥣",
            name: "ซอสดิป / ชีสซอส / มายองเนส (กล่อง Superlock)",
            badge: "ติดป้ายวันหมดอายุ",
            container: "กล่อง Superlock ปิดสนิท",
            method: "เช็ดขอบกล่องให้สะอาดก่อนปิดฝา ดึงถุงที่เปิดก่อนมาใช้ด้านหน้าเสมอ"
          }
        ]
      },
      {
        level: 3,
        leftZoneTitle: "ชั้น 3 : ไก่หมักรอเข้าเนื้อ (Resting / Marinating Batch)",
        rightZoneTitle: "ชั้น 3 : โถสต็อกซอสเคี่ยวสำเร็จสำรอง",
        leftItems: [
          {
            id: "f2-l3-1",
            icon: "⏳",
            name: "กล่องไก่หมักรอบใหม่ (รอครบเวลาหมัก 4-12 ชม.)",
            badge: "ห้ามหยิบข้ามรอบ",
            container: "กล่องหมักขนาดมาตรฐานปิดฝาล็อก",
            method: "แยกชั้นออกจากไก่พร้อมทอดชั้น 2 เพื่อป้องกันพนักงานหยิบไก่ที่ยังหมักไม่เข้าเนื้อไปทอดก่อน"
          }
        ],
        rightItems: [
          {
            id: "f2-r3-1",
            icon: "🫙",
            name: "โถสต็อกซอสเกาหลี & ซอสน้ำปลาเคี่ยวสำเร็จ",
            badge: "พักเย็นก่อนแช่",
            container: "โถ Food Grade มีฝาล็อก",
            method: "ต้องพักซอสให้คลายร้อนสนิทก่อนนำเข้าตู้เย็นเพื่อไม่ให้อุณหภูมิตู้พุ่งเกิน 4°C"
          }
        ]
      },
      {
        level: 4,
        leftZoneTitle: "ชั้น 4 ล่างสุด : เนื้อไก่สดรอหมัก / กำลังละลายน้ำแข็ง (Raw Zone)",
        rightZoneTitle: "ชั้น 4 ล่างสุด : แกลลอนซอสหนัก / สต็อกสำรอง",
        leftItems: [
          {
            id: "f2-l4-1",
            icon: "🥩",
            name: "เนื้อไก่สดรอหมัก / ถาดละลายน้ำแข็ง",
            badge: "ชั้นล่างสุดเท่านั้น!",
            container: "ถาดลึกพร้อมตะแกรงรองน้ำเลือดไก่",
            method: "กฎเหล็ก Food Safety: เนื้อสัตว์ดิบต้องอยู่ชั้นล่างสุดเสมอ เพื่อป้องกันน้ำเลือดไก่หยดปนเปื้อนลงใส่วัตถุดิบอื่นเด็ดขาด"
          }
        ],
        rightItems: [
          {
            id: "f2-r4-1",
            icon: "🛢️",
            name: "ถัง/แกลลอนซอสขนาดใหญ่ (น้ำหนักมาก)",
            badge: "วางติดพื้นตู้",
            container: "แกลลอน/ถัง Food Grade",
            method: "วางชั้นล่างสุดตามหลัก Ergonomics ยกเข้า-ออกปลอดภัย ไม่เสี่ยงตกหล่น"
          }
        ]
      }
    ]
  }
};

function getFridgePlansData() {
  const local = localStorage.getItem("PKT_FRIDGE_PLANS");
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (parsed && parsed["chiller-1"]) return parsed;
    } catch (e) {
      console.error(e);
    }
  }
  return JSON.parse(JSON.stringify(DEFAULT_FRIDGE_PLANS));
}

function saveFridgePlansData(plans) {
  localStorage.setItem("PKT_FRIDGE_PLANS", JSON.stringify(plans));
  if (typeof firestoreSaveDocument === "function") {
    firestoreSaveDocument("pkt_app_state", "fridge_plans", plans);
  }
}

function getFridgeChecklistLogs() {
  const local = localStorage.getItem("PKT_FRIDGE_DAILY_LOGS");
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {
      console.error(e);
    }
  }
  return {};
}

function saveFridgeChecklistLogs(logs) {
  localStorage.setItem("PKT_FRIDGE_DAILY_LOGS", JSON.stringify(logs));
  if (typeof firestoreSaveDocument === "function") {
    firestoreSaveDocument("pkt_app_state", "fridge_daily_logs", logs);
  }
}

function getFridgeDailyRecord(branchCode, dateStr, fridgeId) {
  const all = getFridgeChecklistLogs();
  const key = `${branchCode}_${dateStr}_${fridgeId}`;
  if (all[key]) return all[key];
  return {
    branchCode,
    dateStr,
    fridgeId,
    opening: {
      checkTime: "09:00",
      tempC: "3.0",
      tempPass: true,
      lidsClosed: false,
      fifoRestocked: false,
      waterWiped: false,
      inspector: ""
    },
    closing: {
      checkTime: "21:30",
      tempC: "3.2",
      expiryChecked: false,
      fifoPulledFront: false,
      gasketAndDoorClosed: false,
      paperTowelChanged: false,
      inspector: "",
      supervisor: ""
    }
  };
}

function renderFridgeManagementView() {
  const container = document.getElementById("sopContentArea");
  if (!container) return;

  const plans = getFridgePlansData();
  const currentFridge = plans[selectedFridgeId] || plans["chiller-1"];

  let html = `
    <div class="sop-detail-view">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;" class="no-print">
        <div>
          <span class="sop-category-tag" style="background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe;">🧊 COMMERCIAL REFRIGERATOR SOP • FIFO & FOOD SAFETY</span>
          <h2 style="font-size: 1.6rem; color: #0f172a; font-weight: 800; margin-top: 0.25rem;">
            ผังจัดวางของในตู้เย็น 2 ประตู, เช็กลิสต์ตรวจตู้เย็น & พิมพ์สติกเกอร์ Prep Label
          </h2>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            ออกแบบตาม 3 ปัจจัยหลัก: ความปลอดภัยทางอาหาร (Food Safety & FIFO), การไหลเวียนความเย็น (1°C – 4°C), และความเร็วในการหยิบใช้งาน (Ergonomics)
          </p>
        </div>

        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="action-btn btn-primary" onclick="window.print()" style="width: auto; padding: 0.6rem 1.2rem; background: #0f172a;">
            🖨️ พิมพ์หน้านี้ลง A4 (${activeFridgeSubTab === 'stickers' ? 'สติกเกอร์ 12 ดวง' : 'ผังแปะหน้าตู้เย็น'})
          </button>
        </div>
      </div>

      <!-- Sub-Navigation Tabs -->
      <div class="ops-tabs-bar no-print">
        <button class="ops-tab-btn ${activeFridgeSubTab === 'diagram' ? 'active' : ''}" onclick="switchFridgeSubTab('diagram')">
          🧊 1. ผังจัดวางตู้เย็น 2 ประตู (Interactive + พิมพ์แปะหน้าตู้)
        </button>
        <button class="ops-tab-btn ${activeFridgeSubTab === 'checklist' ? 'active' : ''}" onclick="switchFridgeSubTab('checklist')">
          ✅ 2. เช็กลิสต์ตรวจตู้เย็นประจำวัน (กะเปิดร้าน & กะปิดร้าน)
        </button>
        <button class="ops-tab-btn ${activeFridgeSubTab === 'stickers' ? 'active' : ''}" onclick="switchFridgeSubTab('stickers')">
          🏷️ 3. พิมพ์สติกเกอร์แปะกล่อง (Fast-Tick 12 ดวง/หน้า A4)
        </button>
      </div>

      <div id="fridgeModuleContentArea"></div>
    </div>
  `;

  container.innerHTML = html;
  renderActiveFridgeSubTabContent(currentFridge);
}

function switchFridgeSubTab(tab) {
  activeFridgeSubTab = tab;
  renderFridgeManagementView();
}

function switchSelectedFridgePlan(fridgeId) {
  selectedFridgeId = fridgeId;
  renderFridgeManagementView();
}

function renderActiveFridgeSubTabContent(currentFridge) {
  const area = document.getElementById("fridgeModuleContentArea");
  if (!area) return;

  if (activeFridgeSubTab === "diagram") {
    renderFridgeDiagramTab(area, currentFridge);
  } else if (activeFridgeSubTab === "checklist") {
    renderFridgeDailyChecklistTab(area);
  } else if (activeFridgeSubTab === "stickers") {
    renderFridgeBlankStickersTab(area);
  }
}

function renderFridgeDiagramTab(area, currentFridge) {
  const isAdmin = typeof currentRole !== "undefined" && currentRole === "admin";

  // รวบรวมรายการทั้งหมดในตู้มาสร้างตารางสรุปรายละเอียดด้านล่าง
  const allItemsFlat = [];
  (currentFridge.shelves || []).forEach(sh => {
    (sh.leftItems || []).forEach(it => {
      allItemsFlat.push({ ...it, posLabel: `ฝั่งซ้าย ชั้น ${sh.level} (${sh.level === 1 ? 'บนสุด' : sh.level === 4 ? 'ล่างสุด' : 'กลาง'})` });
    });
    (sh.rightItems || []).forEach(it => {
      allItemsFlat.push({ ...it, posLabel: `ฝั่งขวา ชั้น ${sh.level} (${sh.level === 1 ? 'บนสุด' : sh.level === 4 ? 'ล่างสุด' : 'กลาง'})` });
    });
  });

  area.innerHTML = `
    <!-- ตัวเลือกสลับตู้ที่ 1 / ตู้ที่ 2 -->
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.25rem;" class="no-print">
      <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
        <button class="action-btn ${selectedFridgeId === 'chiller-1' ? 'btn-primary' : 'btn-secondary'}" onclick="switchSelectedFridgePlan('chiller-1')" style="width: auto; padding: 0.55rem 1.15rem;">
          🥬 ตู้ที่ 1: ผักสด / กิมจิ / ไชเท้าดอง / ซุปกิมจิ / โค้ก (ตาม PDF)
        </button>
        <button class="action-btn ${selectedFridgeId === 'chiller-2' ? 'btn-primary' : 'btn-secondary'}" onclick="switchSelectedFridgePlan('chiller-2')" style="width: auto; padding: 0.55rem 1.15rem;">
          🍗 ตู้ที่ 2: ไก่หมัก / ไก่สด / ซอสคลุกไก่ & แป้งชุบทอด
        </button>
      </div>

      ${isAdmin ? `
        <div style="display: flex; gap: 0.5rem;">
          <button class="action-btn btn-secondary" onclick="openAddFridgeShelfItemModal('${currentFridge.id}')" style="width: auto; padding: 0.5rem 1rem; border-color: #f59e0b; background: #fffbeb; color: #b45309; font-weight: 800;">
            ➕ เพิ่มวัตถุดิบลงชั้นวาง
          </button>
          <button class="action-btn btn-secondary" onclick="resetFridgePlansToDefault()" style="width: auto; padding: 0.5rem 0.9rem; color: #dc2626;">
            🔄 รีเซ็ตผังเริ่มต้น
          </button>
        </div>
      ` : ''}
    </div>

    <!-- บอร์ดผังตู้เย็น 2 ประตู (Visual 2-Door Commercial Chiller Blueprint) -->
    <div class="cheat-sheet-board" style="border-color: #0284c7; margin-bottom: 1.5rem;">
      <div class="cheat-header" style="background: linear-gradient(135deg, #0f172a, #0369a1); border-bottom: 4px solid #38bdf8;">
        <div>
          <span class="cheat-badge" style="background: #38bdf8; color: #0f172a;">REFRIGERATOR PLAN DIAGRAM (FIFO & FOOD SAFETY)</span>
          <h3 style="font-size: 1.45rem;">${escapeHtml(currentFridge.title)}</h3>
          <p style="color: #e0f2fe; font-size: 0.86rem; margin-top: 0.25rem;">
            💡 แตะที่กล่องวัตถุดิบแต่ละชิ้นเพื่อดูวิธีเก็บรักษาและภาชนะที่ต้องใช้ • เว้นระยะห่างจากช่องลมแอร์ 5–10 ซม. เสมอ
          </p>
        </div>
        <div class="cheat-temp-box" style="background: #0284c7; border-color: #7dd3fc;">
          <div style="font-size: 0.75rem; font-weight: 700;">อุณหภูมิมาตรฐาน</div>
          <div style="font-size: 1.55rem; font-weight: 900;">1°C – 4°C</div>
          <div style="font-size: 0.72rem; color: #bae6fd;">ห้ามเกิน 5°C เด็ดขาด</div>
        </div>
      </div>

      <div class="cheat-body" style="background: #f0f9ff; padding: 1.25rem;">
        <!-- หัวประตูซ้าย & ประตูขวา -->
        <div class="fridge-doors-header-grid">
          <div class="fridge-door-banner left-door">
            <span>🚪 ${escapeHtml(currentFridge.leftDoorTitle)}</span>
            <span style="font-size: 0.75rem; background: #dcfce7; color: #166534; padding: 0.15rem 0.55rem; border-radius: 10px;">หยิบไว / ใช้บ่อย</span>
          </div>
          <div class="fridge-door-banner right-door">
            <span>🚪 ${escapeHtml(currentFridge.rightDoorTitle)}</span>
            <span style="font-size: 0.75rem; background: #fef3c7; color: #92400e; padding: 0.15rem 0.55rem; border-radius: 10px;">สต็อกสำรอง / ล็อกกลิ่น</span>
          </div>
        </div>

        <!-- ชั้นวาง 1 ถึง 4 -->
        <div style="display: flex; flex-direction: column; gap: 0.9rem;">
          ${(currentFridge.shelves || []).map(shelf => `
            <div class="fridge-shelf-row">
              <!-- ฝั่งประตูซ้าย -->
              <div class="fridge-shelf-cell left-cell">
                <div class="fridge-shelf-label">
                  <span>📌 ${escapeHtml(shelf.leftZoneTitle)}</span>
                  ${isAdmin ? `<button class="no-print" onclick="openAddFridgeShelfItemModal('${currentFridge.id}', ${shelf.level}, 'left')" style="background:none; border:none; color:#0284c7; font-size:0.76rem; font-weight:800; cursor:pointer;">+ เพิ่มซ้ายชั้น ${shelf.level}</button>` : ''}
                </div>
                <div class="fridge-items-wrap">
                  ${(shelf.leftItems || []).map(item => `
                    <div class="fridge-item-box" onclick="openFridgeItemDetailModal('${currentFridge.id}', ${shelf.level}, 'left', '${item.id}')">
                      <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.4rem;">
                        <span style="font-size: 1.35rem;">${item.icon || '📦'}</span>
                        <span class="fridge-fifo-pill">${escapeHtml(item.badge || 'FIFO')}</span>
                      </div>
                      <div class="fridge-item-title">${escapeHtml(item.name)}</div>
                      <div class="fridge-item-sub">${escapeHtml(item.container || '')}</div>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- ฝั่งประตูขวา -->
              <div class="fridge-shelf-cell right-cell">
                <div class="fridge-shelf-label">
                  <span>📌 ${escapeHtml(shelf.rightZoneTitle)}</span>
                  ${isAdmin ? `<button class="no-print" onclick="openAddFridgeShelfItemModal('${currentFridge.id}', ${shelf.level}, 'right')" style="background:none; border:none; color:#0284c7; font-size:0.76rem; font-weight:800; cursor:pointer;">+ เพิ่มขวาชั้น ${shelf.level}</button>` : ''}
                </div>
                <div class="fridge-items-wrap">
                  ${(shelf.rightItems || []).map(item => `
                    <div class="fridge-item-box" onclick="openFridgeItemDetailModal('${currentFridge.id}', ${shelf.level}, 'right', '${item.id}')">
                      <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.4rem;">
                        <span style="font-size: 1.35rem;">${item.icon || '📦'}</span>
                        <span class="fridge-fifo-pill" style="background:#fef3c7; color:#b45309; border-color:#fde68a;">${escapeHtml(item.badge || 'Stock')}</span>
                      </div>
                      <div class="fridge-item-title">${escapeHtml(item.name)}</div>
                      <div class="fridge-item-sub">${escapeHtml(item.container || '')}</div>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>
          `).join("")}
        </div>

        <!-- กฎเหล็กประจำตู้เย็น 3 ข้อ (พิมพ์แปะคู่กับผัง) -->
        <div style="margin-top: 1.25rem; background: #ffffff; border: 2px solid #0f172a; border-radius: 14px; padding: 1rem 1.25rem;">
          <h4 style="font-size: 1rem; font-weight: 900; color: #dc2626; margin-bottom: 0.5rem;">
            🚨 กฎเหล็กประจำตู้เย็นสำหรับพนักงาน (พิมพ์แปะคู่กับผังหน้าตู้เย็น)
          </h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.75rem; font-size: 0.88rem;">
            <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 0.6rem 0.85rem; border-radius: 8px;">
              <strong>1. First-In, First-Out (FIFO):</strong><br>วางของใหม่ไว้ด้านใน นำของเก่ามาไว้ด้านหน้าเสมอ ห้ามหยิบข้ามคิว
            </div>
            <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 0.6rem 0.85rem; border-radius: 8px;">
              <strong>2. Day Labeling (ติดป้ายทุกกล่อง):</strong><br>ติดสติกเกอร์ระบุ "ชื่อวัตถุดิบ + วันที่เปิด/หั่น + วันหมดอายุ + ผู้เตรียม" บนกล่องและถุงทุกชิ้น
            </div>
            <div style="background: #fffbeb; border-left: 4px solid #d97706; padding: 0.6rem 0.85rem; border-radius: 8px;">
              <strong>3. Airflow Clearance (เว้นช่องลม 5–10 ซม.):</strong><br>เว้นระยะห่างจากช่องลมและผนังตู้เย็นอย่างน้อย 5–10 ซม. ห้ามวางของอัดแน่นจนบังทิศทางลมเย็น
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ภาพ Infographic แผนผังตู้เย็น 2 ประตู + ตารางสรุปรายละเอียดวิธีเก็บรักษา -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; align-items: start; margin-bottom: 1.5rem;">
      ${selectedFridgeId === 'chiller-1' ? `
        <div style="background: #ffffff; border: 2px solid var(--border-color); border-radius: 16px; padding: 1.25rem; text-align: center;">
          <h4 style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin-bottom: 0.6rem;">
            🖼️ ภาพ Infographic แผนผังตู้เย็น 2 ประตู (คลิกเพื่อขยายใหญ่ / พิมพ์แปะหน้าตู้)
          </h4>
          <img src="assets/fridge-plan-diagram.png" alt="ผังจัดวางตู้เย็น 2 ประตู" style="width: 100%; max-width: 480px; border-radius: 12px; border: 1px solid var(--border-color); cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,0.08);" onclick="openImageLightbox('assets/fridge-plan-diagram.png', 'ผังจัดวางตู้เย็น 2 ประตู (Chiller 1°C - 4°C)')" onerror="this.style.display='none'" />
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">
            คลิกที่รูปเพื่อดูขนาดเต็มจอ หรือกดปุ่ม "🖨️ พิมพ์หน้านี้ลง A4" ด้านบนเพื่อพิมพ์แปะหน้าตู้เย็นจริง
          </div>
        </div>
      ` : ''}

      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 16px; padding: 1.25rem;">
        <h4 style="font-size: 1.05rem; font-weight: 800; color: #b45309; margin-bottom: 0.75rem;">
          📋 รายละเอียดตำแหน่งและวิธีเก็บรักษาวัตถุดิบแต่ละชนิด (${allItemsFlat.length} รายการ)
        </h4>
        <div style="overflow-x: auto;">
          <table class="matrix-table-large" style="font-size: 0.88rem;">
            <thead>
              <tr>
                <th>วัตถุดิบ</th>
                <th>ตำแหน่งที่วาง</th>
                <th>วิธีการจัดเก็บเพื่อยืดอายุและคงคุณภาพ</th>
              </tr>
            </thead>
            <tbody>
              ${allItemsFlat.map(it => `
                <tr>
                  <td><strong>${it.icon || ''} ${escapeHtml(it.name)}</strong></td>
                  <td><span class="pass-pill" style="font-size:0.76rem;">${escapeHtml(it.posLabel)}</span></td>
                  <td>${escapeHtml(it.method)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function openFridgeItemDetailModal(fridgeId, shelfLevel, side, itemId) {
  const plans = getFridgePlansData();
  const fridge = plans[fridgeId];
  if (!fridge) return;
  const shelf = (fridge.shelves || []).find(s => s.level === shelfLevel);
  if (!shelf) return;
  const list = side === "left" ? shelf.leftItems : shelf.rightItems;
  const item = (list || []).find(i => i.id === itemId);
  if (!item) return;

  const isAdmin = typeof currentRole !== "undefined" && currentRole === "admin";

  const modalHtml = `
    <div class="modal-overlay" id="fridgeItemModal" onclick="closeModal('fridgeItemModal')">
      <div class="modal-card" style="max-width: 540px;" onclick="event.stopPropagation()">
        <div class="modal-header">
          <div>
            <span style="font-size: 0.76rem; font-weight: 800; color: #0284c7;">${side === 'left' ? 'ประตูซ้าย' : 'ประตูขวา'} • ชั้นที่ ${shelfLevel}</span>
            <h3 style="font-size: 1.3rem; color: #0f172a; margin-top: 0.15rem;">${item.icon || '📦'} ${escapeHtml(item.name)}</h3>
          </div>
          <button onclick="closeModal('fridgeItemModal')" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
        </div>

        <div class="modal-body">
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 1rem; margin-bottom: 1rem;">
            <div style="font-size: 0.82rem; color: #0369a1; font-weight: 700;">ภาชนะมาตรฐานที่ใช้เก็บ:</div>
            <div style="font-size: 1rem; font-weight: 800; color: #0f172a; margin-bottom: 0.65rem;">${escapeHtml(item.container || '-')}</div>
            <div style="font-size: 0.82rem; color: #0369a1; font-weight: 700;">วิธีการจัดเก็บเพื่อยืดอายุและคงคุณภาพ (FIFO):</div>
            <div style="font-size: 0.95rem; color: #1e293b; line-height: 1.55;">${escapeHtml(item.method || '-')}</div>
          </div>

          ${isAdmin ? `
            <details style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 0.85rem;">
              <summary style="font-weight: 800; color: #b45309; cursor: pointer;">✏️ แก้ไขข้อมูลวัตถุดิบชิ้นนี้ (เฉพาะ Admin)</summary>
              <div style="margin-top: 0.85rem;">
                <div class="form-group">
                  <label class="form-label">ชื่อวัตถุดิบ</label>
                  <input type="text" id="editFridgeItemName" class="form-input" value="${escapeHtml(item.name)}" />
                </div>
                <div style="display: grid; grid-template-columns: 90px 1fr; gap: 0.6rem;">
                  <div class="form-group">
                    <label class="form-label">ไอคอน</label>
                    <input type="text" id="editFridgeItemIcon" class="form-input" value="${escapeHtml(item.icon || '📦')}" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">ป้ายกำกับสั้น (Badge)</label>
                    <input type="text" id="editFridgeItemBadge" class="form-input" value="${escapeHtml(item.badge || 'FIFO')}" />
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">ภาชนะที่ใช้เก็บ</label>
                  <input type="text" id="editFridgeItemContainer" class="form-input" value="${escapeHtml(item.container || '')}" />
                </div>
                <div class="form-group">
                  <label class="form-label">วิธีการจัดเก็บและดูแลรักษา</label>
                  <textarea id="editFridgeItemMethod" class="form-textarea" rows="3">${escapeHtml(item.method || '')}</textarea>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 0.5rem;">
                  <button type="button" class="action-btn btn-secondary" onclick="deleteFridgeShelfItem('${fridgeId}', ${shelfLevel}, '${side}', '${item.id}')" style="width: auto; color: #dc2626; border-color: #fecaca; background: #fef2f2;">
                    🗑️ ลบออกจากชั้นนี้
                  </button>
                  <button type="button" class="action-btn btn-primary" onclick="saveEditedFridgeShelfItem('${fridgeId}', ${shelfLevel}, '${side}', '${item.id}')" style="width: auto;">
                    💾 บันทึกการแก้ไข
                  </button>
                </div>
              </div>
            </details>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  const existing = document.getElementById("fridgeItemModal");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function saveEditedFridgeShelfItem(fridgeId, shelfLevel, side, itemId) {
  const plans = getFridgePlansData();
  const fridge = plans[fridgeId];
  if (!fridge) return;
  const shelf = (fridge.shelves || []).find(s => s.level === shelfLevel);
  if (!shelf) return;
  const list = side === "left" ? shelf.leftItems : shelf.rightItems;
  const item = (list || []).find(i => i.id === itemId);
  if (!item) return;

  item.name = document.getElementById("editFridgeItemName")?.value.trim() || item.name;
  item.icon = document.getElementById("editFridgeItemIcon")?.value.trim() || "📦";
  item.badge = document.getElementById("editFridgeItemBadge")?.value.trim() || "FIFO";
  item.container = document.getElementById("editFridgeItemContainer")?.value.trim() || "";
  item.method = document.getElementById("editFridgeItemMethod")?.value.trim() || "";

  saveFridgePlansData(plans);
  closeModal("fridgeItemModal");
  renderFridgeManagementView();
  if (typeof showToast === "function") showToast("✅ อัปเดตข้อมูลวัตถุดิบในผังตู้เย็นเรียบร้อยแล้ว!");
}

function deleteFridgeShelfItem(fridgeId, shelfLevel, side, itemId) {
  if (!confirm("ต้องการลบวัตถุดิบชิ้นนี้ออกจากชั้นวางใช่หรือไม่?")) return;
  const plans = getFridgePlansData();
  const fridge = plans[fridgeId];
  if (!fridge) return;
  const shelf = (fridge.shelves || []).find(s => s.level === shelfLevel);
  if (!shelf) return;
  if (side === "left") {
    shelf.leftItems = (shelf.leftItems || []).filter(i => i.id !== itemId);
  } else {
    shelf.rightItems = (shelf.rightItems || []).filter(i => i.id !== itemId);
  }
  saveFridgePlansData(plans);
  closeModal("fridgeItemModal");
  renderFridgeManagementView();
  if (typeof showToast === "function") showToast("🗑️ ลบรายการออกจากชั้นวางแล้ว");
}

function openAddFridgeShelfItemModal(fridgeId, defaultLevel = 1, defaultSide = "left") {
  const modalHtml = `
    <div class="modal-overlay" id="addFridgeItemModal" onclick="closeModal('addFridgeItemModal')">
      <div class="modal-card" style="max-width: 520px;" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3 style="font-size: 1.2rem; color: #0284c7;">➕ เพิ่มวัตถุดิบลงในแผนผังตู้เย็น</h3>
          <button onclick="closeModal('addFridgeItemModal')" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
        </div>
        <form onsubmit="handleAddFridgeShelfItem(event, '${fridgeId}')">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label">ฝั่งประตูตู้เย็น</label>
              <select id="newFridgeSide" class="form-select">
                <option value="left" ${defaultSide === 'left' ? 'selected' : ''}>🚪 ประตูซ้าย (หยิบใช้บ่อย)</option>
                <option value="right" ${defaultSide === 'right' ? 'selected' : ''}>🚪 ประตูขวา (สต็อก/ของดอง)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">ชั้นวาง (1 - 4)</label>
              <select id="newFridgeLevel" class="form-select">
                <option value="1" ${defaultLevel === 1 ? 'selected' : ''}>ชั้น 1 (บนสุด)</option>
                <option value="2" ${defaultLevel === 2 ? 'selected' : ''}>ชั้น 2</option>
                <option value="3" ${defaultLevel === 3 ? 'selected' : ''}>ชั้น 3</option>
                <option value="4" ${defaultLevel === 4 ? 'selected' : ''}>ชั้น 4 (ล่างสุด)</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 90px 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label">ไอคอน</label>
              <input type="text" id="newFridgeIcon" class="form-input" value="🥗" required />
            </div>
            <div class="form-group">
              <label class="form-label">ชื่อวัตถุดิบ *</label>
              <input type="text" id="newFridgeName" class="form-input" placeholder="เช่น กะหล่ำปลีซอย" required />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label">ป้ายกำกับสั้น (Badge)</label>
              <input type="text" id="newFridgeBadge" class="form-input" value="เรียง FIFO" />
            </div>
            <div class="form-group">
              <label class="form-label">ภาชนะที่ใช้เก็บ</label>
              <input type="text" id="newFridgeContainer" class="form-input" placeholder="เช่น กล่อง Food Grade ปิดสนิท" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">วิธีการจัดเก็บเพื่อยืดอายุและคงคุณภาพ *</label>
            <textarea id="newFridgeMethod" class="form-textarea" rows="3" placeholder="ระบุเทคนิคการเก็บรักษา..." required></textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
            <button type="button" class="action-btn btn-secondary" onclick="closeModal('addFridgeItemModal')" style="width: auto;">ยกเลิก</button>
            <button type="submit" class="action-btn btn-primary" style="width: auto;">💾 เพิ่มลงชั้นวาง</button>
          </div>
        </form>
      </div>
    </div>
  `;
  const existing = document.getElementById("addFridgeItemModal");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function handleAddFridgeShelfItem(event, fridgeId) {
  event.preventDefault();
  const plans = getFridgePlansData();
  const fridge = plans[fridgeId];
  if (!fridge) return;

  const side = document.getElementById("newFridgeSide")?.value || "left";
  const level = parseInt(document.getElementById("newFridgeLevel")?.value) || 1;
  const shelf = (fridge.shelves || []).find(s => s.level === level);
  if (!shelf) return;

  const newItem = {
    id: "fitem-" + Date.now(),
    icon: document.getElementById("newFridgeIcon")?.value.trim() || "📦",
    name: document.getElementById("newFridgeName")?.value.trim() || "",
    badge: document.getElementById("newFridgeBadge")?.value.trim() || "FIFO",
    container: document.getElementById("newFridgeContainer")?.value.trim() || "",
    method: document.getElementById("newFridgeMethod")?.value.trim() || ""
  };

  if (side === "left") {
    shelf.leftItems.push(newItem);
  } else {
    shelf.rightItems.push(newItem);
  }

  saveFridgePlansData(plans);
  closeModal("addFridgeItemModal");
  renderFridgeManagementView();
  if (typeof showToast === "function") showToast(`✅ เพิ่ม "${newItem.name}" ลงในผังตู้เย็นเรียบร้อยแล้ว!`);
}

function resetFridgePlansToDefault() {
  if (!confirm("ต้องการรีเซ็ตผังตู้เย็นทั้ง 2 ตู้กลับเป็นค่ามาตรฐานตามเอกสารคู่มือใช่หรือไม่?")) return;
  saveFridgePlansData(DEFAULT_FRIDGE_PLANS);
  renderFridgeManagementView();
  if (typeof showToast === "function") showToast("🔄 รีเซ็ตแผนผังตู้เย็นกลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว");
}

// =========================================================================
// แท็บ 2: เช็กลิสต์ตรวจตู้เย็นประจำวันออนไลน์ (Daily Fridge Opening & Closing Checklist)
// =========================================================================

function renderFridgeDailyChecklistTab(area) {
  const branches = getBranchesData();
  const rec = getFridgeDailyRecord(selectedOpsBranch, selectedOpsDate, selectedFridgeId);
  const openTemp = parseFloat(rec.opening.tempC);
  const closeTemp = parseFloat(rec.closing.tempC);
  const isOpenTempAlert = !isNaN(openTemp) && (openTemp > 4 || openTemp < 0);
  const isCloseTempAlert = !isNaN(closeTemp) && (closeTemp > 4 || closeTemp < 0);

  area.innerHTML = `
    <!-- ตัวกรองสาขา วันที่ และตู้เย็น -->
    <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 14px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.85rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <div>
          <label style="font-size: 0.75rem; font-weight: 800; color: #0369a1; display: block;">สาขาที่ตรวจ</label>
          <select id="fridgeLogBranchSelect" class="form-select" style="width: auto; font-weight: 800; padding: 0.45rem 0.85rem;" onchange="handleFridgeChecklistFilterChange()">
            ${branches.map(b => `<option value="${b.code}" ${selectedOpsBranch === b.code ? 'selected' : ''}>🏪 ${b.name}</option>`).join("")}
          </select>
        </div>
        <div>
          <label style="font-size: 0.75rem; font-weight: 800; color: #0369a1; display: block;">วันที่ตรวจ</label>
          <input type="date" id="fridgeLogDateSelect" class="form-input" style="width: auto; font-weight: 700; padding: 0.4rem 0.75rem;" value="${selectedOpsDate}" onchange="handleFridgeChecklistFilterChange()" />
        </div>
        <div>
          <label style="font-size: 0.75rem; font-weight: 800; color: #0369a1; display: block;">เลือกตู้แช่เย็น</label>
          <select id="fridgeLogUnitSelect" class="form-select" style="width: auto; font-weight: 800; padding: 0.45rem 0.85rem;" onchange="handleFridgeChecklistFilterChange()">
            <option value="chiller-1" ${selectedFridgeId === 'chiller-1' ? 'selected' : ''}>🥬 ตู้ที่ 1: ตู้เย็น 2 ประตู (ผัก/กิมจิ/ไชเท้าดอง/โค้ก)</option>
            <option value="chiller-2" ${selectedFridgeId === 'chiller-2' ? 'selected' : ''}>🍗 ตู้ที่ 2: ตู้แช่ไก่หมัก / ไก่สด / ซอสคลุกไก่</option>
          </select>
        </div>
      </div>

      <div style="background: #ffffff; border: 1.5px solid #0284c7; border-radius: 10px; padding: 0.5rem 0.9rem; font-size: 0.82rem; font-weight: 800; color: #0369a1;">
        🌡️ เกณฑ์มาตรฐาน: 1°C – 4°C (ห้ามเกิน 5°C)
      </div>
    </div>

    ${(openTemp >= 5 || closeTemp >= 5) ? `
      <div style="background: #fef2f2; border: 2px solid #dc2626; color: #991b1b; border-radius: 12px; padding: 0.9rem 1.2rem; margin-bottom: 1.25rem; font-weight: 800;">
        🚨 แจ้งเตือนอุณหภูมิตู้เย็นเกิน 5°C! ข้อปฏิบัติบังคับ: ให้ตรวจสอบขอบยางประตูและคอมเพรสเซอร์ทันที ไม่วางของบังพัดลมแอร์ และแจ้งหัวหน้ากะก่อนเริ่มตักวัตถุดิบใช้งาน
      </div>
    ` : ''}

    <!-- กะเปิดร้าน & กะปิดร้าน -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
      <!-- 1. กะเปิดร้าน (Opening Checklist) -->
      <div style="background: #ffffff; border: 2px solid #10b981; border-radius: 16px; padding: 1.35rem; box-shadow: 0 4px 12px rgba(16,185,129,0.06);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid #d1fae5; padding-bottom: 0.65rem;">
          <div>
            <span style="background: #ecfdf5; color: #047857; font-size: 0.74rem; font-weight: 800; padding: 0.15rem 0.55rem; border-radius: 6px;">MORNING SHIFT</span>
            <h4 style="font-size: 1.15rem; font-weight: 900; color: #065f46; margin-top: 0.2rem;">🌅 1. กะเปิดร้าน (Opening Fridge Check)</h4>
          </div>
          <div style="text-align: right;">
            <label style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; display: block;">เวลาตรวจ</label>
            <input type="time" id="fridgeOpenTime" class="form-input" value="${escapeHtml(rec.opening.checkTime || '09:00')}" style="width: 105px; padding: 0.3rem 0.45rem; font-weight: 700;" onchange="saveFridgeDailyChecklistForm(false)" />
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 0.85rem; margin-bottom: 0.85rem; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;">
          <div>
            <div style="font-weight: 800; font-size: 0.92rem; color: #0f172a;">🌡️ อุณหภูมิหน้าตู้ตอนเปิดร้าน (°C)</div>
            <div style="font-size: 0.76rem; color: var(--text-muted);">เกณฑ์มาตรฐาน 1°C – 4°C</div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <input type="number" step="0.1" id="fridgeOpenTemp" class="form-input" value="${escapeHtml(rec.opening.tempC)}" style="width: 85px; text-align: center; font-weight: 900; font-size: 1.05rem; color: ${isOpenTempAlert ? '#dc2626' : '#059669'};" oninput="saveFridgeDailyChecklistForm(false)" />
            <span style="font-weight: 800;">°C</span>
            <span class="${isOpenTempAlert ? '' : 'pass-pill'}" style="${isOpenTempAlert ? 'background:#fef2f2; color:#dc2626; padding:0.2rem 0.55rem; border-radius:8px; font-weight:800; font-size:0.75rem;' : 'font-size:0.75rem;'}">
              ${isOpenTempAlert ? '❌ เกินเกณฑ์!' : '✅ ผ่าน'}
            </span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1rem;">
          <label style="display: flex; align-items: center; gap: 0.7rem; background: #f8fafc; padding: 0.7rem 0.9rem; border-radius: 10px; border: 1px solid var(--border-color); cursor: pointer;">
            <input type="checkbox" id="fridgeOpenLids" ${rec.opening.lidsClosed ? 'checked' : ''} onchange="saveFridgeDailyChecklistForm(false)" style="width: 18px; height: 18px;" />
            <span style="font-weight: 700; font-size: 0.92rem;">📦 ปิดฝากล่องสนิททุกกล่อง (เรียบร้อย)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 0.7rem; background: #f8fafc; padding: 0.7rem 0.9rem; border-radius: 10px; border: 1px solid var(--border-color); cursor: pointer;">
            <input type="checkbox" id="fridgeOpenFifo" ${rec.opening.fifoRestocked ? 'checked' : ''} onchange="saveFridgeDailyChecklistForm(false)" style="width: 18px; height: 18px;" />
            <span style="font-weight: 700; font-size: 0.92rem;">🔄 เติมของพร้อมเสิร์ฟชั้นบนสุดตามระบบ FIFO (เรียบร้อย)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 0.7rem; background: #f8fafc; padding: 0.7rem 0.9rem; border-radius: 10px; border: 1px solid var(--border-color); cursor: pointer;">
            <input type="checkbox" id="fridgeOpenWater" ${rec.opening.waterWiped ? 'checked' : ''} onchange="saveFridgeDailyChecklistForm(false)" style="width: 18px; height: 18px;" />
            <span style="font-weight: 700; font-size: 0.92rem;">🧽 เช็ดคราบน้ำ / หยดน้ำค้างคืนภายในตู้ (สะอาด)</span>
          </label>
        </div>

        <div>
          <label class="form-label">✍️ ชื่อผู้ตรวจกะเปิดร้าน</label>
          <input type="text" id="fridgeOpenInspector" class="form-input" placeholder="ระบุชื่อพนักงานผู้ตรวจกะเช้า" value="${escapeHtml(rec.opening.inspector || '')}" onchange="saveFridgeDailyChecklistForm(false)" />
        </div>
      </div>

      <!-- 2. กะปิดร้าน (Closing Checklist) -->
      <div style="background: #ffffff; border: 2px solid #f59e0b; border-radius: 16px; padding: 1.35rem; box-shadow: 0 4px 12px rgba(245,158,11,0.06);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid #fde68a; padding-bottom: 0.65rem;">
          <div>
            <span style="background: #fffbeb; color: #b45309; font-size: 0.74rem; font-weight: 800; padding: 0.15rem 0.55rem; border-radius: 6px;">CLOSING SHIFT</span>
            <h4 style="font-size: 1.15rem; font-weight: 900; color: #92400e; margin-top: 0.2rem;">🌙 2. กะปิดร้าน (Closing Fridge Check)</h4>
          </div>
          <div style="text-align: right;">
            <label style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; display: block;">เวลาตรวจ</label>
            <input type="time" id="fridgeCloseTime" class="form-input" value="${escapeHtml(rec.closing.checkTime || '21:30')}" style="width: 105px; padding: 0.3rem 0.45rem; font-weight: 700;" onchange="saveFridgeDailyChecklistForm(false)" />
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 0.85rem; margin-bottom: 0.85rem; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;">
          <div>
            <div style="font-weight: 800; font-size: 0.92rem; color: #0f172a;">🌡️ อุณหภูมิหน้าตู้ก่อนปิดร้าน (°C)</div>
            <div style="font-size: 0.76rem; color: var(--text-muted);">เกณฑ์มาตรฐาน 1°C – 4°C</div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <input type="number" step="0.1" id="fridgeCloseTemp" class="form-input" value="${escapeHtml(rec.closing.tempC)}" style="width: 85px; text-align: center; font-weight: 900; font-size: 1.05rem; color: ${isCloseTempAlert ? '#dc2626' : '#059669'};" oninput="saveFridgeDailyChecklistForm(false)" />
            <span style="font-weight: 800;">°C</span>
            <span class="${isCloseTempAlert ? '' : 'pass-pill'}" style="${isCloseTempAlert ? 'background:#fef2f2; color:#dc2626; padding:0.2rem 0.55rem; border-radius:8px; font-weight:800; font-size:0.75rem;' : 'font-size:0.75rem;'}">
              ${isCloseTempAlert ? '❌ เกินเกณฑ์!' : '✅ ผ่าน'}
            </span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1rem;">
          <label style="display: flex; align-items: center; gap: 0.7rem; background: #f8fafc; padding: 0.7rem 0.9rem; border-radius: 10px; border: 1px solid var(--border-color); cursor: pointer;">
            <input type="checkbox" id="fridgeCloseExpiry" ${rec.closing.expiryChecked ? 'checked' : ''} onchange="saveFridgeDailyChecklistForm(false)" style="width: 18px; height: 18px;" />
            <span style="font-weight: 700; font-size: 0.92rem;">🏷️ เช็ควันหมดอายุทุกกล่อง & คัดสภาพผักสด (ผ่าน)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 0.7rem; background: #f8fafc; padding: 0.7rem 0.9rem; border-radius: 10px; border: 1px solid var(--border-color); cursor: pointer;">
            <input type="checkbox" id="fridgeCloseFifo" ${rec.closing.fifoPulledFront ? 'checked' : ''} onchange="saveFridgeDailyChecklistForm(false)" style="width: 18px; height: 18px;" />
            <span style="font-weight: 700; font-size: 0.92rem;">🔄 ดึงของเก่ามาไว้ด้านหน้าตามระบบ FIFO สำหรับพรุ่งนี้เช้า</span>
          </label>
          <label style="display: flex; align-items: center; gap: 0.7rem; background: #f8fafc; padding: 0.7rem 0.9rem; border-radius: 10px; border: 1px solid var(--border-color); cursor: pointer;">
            <input type="checkbox" id="fridgeCloseGasket" ${rec.closing.gasketAndDoorClosed ? 'checked' : ''} onchange="saveFridgeDailyChecklistForm(false)" style="width: 18px; height: 18px;" />
            <span style="font-weight: 700; font-size: 0.92rem;">🚪 เช็คขอบยาง Superlock & ปิดประตูตู้เย็นแน่นสนิท</span>
          </label>
          <label style="display: flex; align-items: center; gap: 0.7rem; background: #f8fafc; padding: 0.7rem 0.9rem; border-radius: 10px; border: 1px solid var(--border-color); cursor: pointer;">
            <input type="checkbox" id="fridgeCloseTowel" ${rec.closing.paperTowelChanged ? 'checked' : ''} onchange="saveFridgeDailyChecklistForm(false)" style="width: 18px; height: 18px;" />
            <span style="font-weight: 700; font-size: 0.92rem;">🧻 เปลี่ยนทิชชู่ซับน้ำก้นกล่อง (ต้นหอมซอย/เห็ดเข็มทอง) & เทน้ำทิ้ง</span>
          </label>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem;">
          <div>
            <label class="form-label">✍️ ผู้ตรวจกะปิดร้าน</label>
            <input type="text" id="fridgeCloseInspector" class="form-input" placeholder="ชื่อพนักงาน" value="${escapeHtml(rec.closing.inspector || '')}" onchange="saveFridgeDailyChecklistForm(false)" />
          </div>
          <div>
            <label class="form-label">👑 ผู้จัดการ/หัวหน้ากะ (ตรวจซ้ำ)</label>
            <input type="text" id="fridgeCloseSupervisor" class="form-input" placeholder="ชื่อหัวหน้ากะ" value="${escapeHtml(rec.closing.supervisor || '')}" onchange="saveFridgeDailyChecklistForm(false)" />
          </div>
        </div>
      </div>
    </div>

    <div style="display: flex; justify-content: flex-end; margin-bottom: 1.5rem;">
      <button class="action-btn btn-primary" onclick="saveFridgeDailyChecklistForm(true)" style="width: auto; padding: 0.75rem 2rem; font-size: 1rem;">
        💾 บันทึกผลตรวจตู้เย็นประจำวัน (${selectedOpsBranch} • ${selectedOpsDate})
      </button>
    </div>

    <!-- จุดตรวจเน้นย้ำเฉพาะวัตถุดิบ (Specific Item Audits) -->
    <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 14px; padding: 1.25rem;">
      <h4 style="font-size: 1.05rem; font-weight: 900; color: #b45309; margin-bottom: 0.6rem;">
        🔍 จุดตรวจเน้นย้ำเฉพาะวัตถุดิบก่อนปิดร้านทุกวัน (Specific Item Audits)
      </h4>
      <ul style="padding-left: 1.25rem; line-height: 1.75; color: #334155; font-size: 0.92rem; margin: 0;">
        <li><strong>ต้นหอมซอย & เห็ดเข็มทองหั่น:</strong> เปลี่ยนกระดาษทิชชู่ซับน้ำก้นกล่องทุกเย็น เทน้ำส่วนเกินทิ้ง ป้องกันผักเน่าช้ำ</li>
        <li><strong>กล่อง Superlock (กิมจิ / ไชเท้าดอง):</strong> เช็ดคราบน้ำหมักดองรอบขอบยางกล่องก่อนปิดล็อก เพื่อไม่ให้ยางเสื่อมและกลิ่นเล็ดลอด</li>
        <li><strong>เต้าหู้หลอด:</strong> ตรวจเช็คว่าไม่มีวัตถุดิบหนักหรือกล่องอื่นวางทับ (ซ้อนไม่เกิน 2 ชั้น)</li>
        <li><strong>การระบายอากาศ (Airflow):</strong> ตรวจสอบว่าไม่มีสิ่งของวางชิดพัดลมแอร์ด้านบนและผนังตู้ (เว้นระยะอย่างน้อย 5–10 ซม.)</li>
      </ul>
    </div>
  `;
}

function handleFridgeChecklistFilterChange() {
  const b = document.getElementById("fridgeLogBranchSelect");
  const d = document.getElementById("fridgeLogDateSelect");
  const u = document.getElementById("fridgeLogUnitSelect");
  if (b) selectedOpsBranch = b.value;
  if (d) selectedOpsDate = d.value;
  if (u) selectedFridgeId = u.value;
  renderFridgeManagementView();
}

function saveFridgeDailyChecklistForm(showNotification = true) {
  const all = getFridgeChecklistLogs();
  const key = `${selectedOpsBranch}_${selectedOpsDate}_${selectedFridgeId}`;
  const rec = getFridgeDailyRecord(selectedOpsBranch, selectedOpsDate, selectedFridgeId);

  rec.opening.checkTime = document.getElementById("fridgeOpenTime")?.value || "09:00";
  rec.opening.tempC = document.getElementById("fridgeOpenTemp")?.value || "";
  const openNum = parseFloat(rec.opening.tempC);
  rec.opening.tempPass = !isNaN(openNum) && openNum >= 0 && openNum <= 4;
  rec.opening.lidsClosed = !!document.getElementById("fridgeOpenLids")?.checked;
  rec.opening.fifoRestocked = !!document.getElementById("fridgeOpenFifo")?.checked;
  rec.opening.waterWiped = !!document.getElementById("fridgeOpenWater")?.checked;
  rec.opening.inspector = document.getElementById("fridgeOpenInspector")?.value.trim() || "";

  rec.closing.checkTime = document.getElementById("fridgeCloseTime")?.value || "21:30";
  rec.closing.tempC = document.getElementById("fridgeCloseTemp")?.value || "";
  rec.closing.expiryChecked = !!document.getElementById("fridgeCloseExpiry")?.checked;
  rec.closing.fifoPulledFront = !!document.getElementById("fridgeCloseFifo")?.checked;
  rec.closing.gasketAndDoorClosed = !!document.getElementById("fridgeCloseGasket")?.checked;
  rec.closing.paperTowelChanged = !!document.getElementById("fridgeCloseTowel")?.checked;
  rec.closing.inspector = document.getElementById("fridgeCloseInspector")?.value.trim() || "";
  rec.closing.supervisor = document.getElementById("fridgeCloseSupervisor")?.value.trim() || "";

  all[key] = rec;
  saveFridgeChecklistLogs(all);

  if (showNotification) {
    renderFridgeManagementView();
    if (typeof showToast === "function") showToast(`✅ บันทึกเช็กลิสต์ตรวจตู้เย็น (${selectedOpsBranch}) เรียบร้อยแล้ว!`);
  }
}

// =========================================================================
// แท็บ 3: เทมเพลตฟอร์มสติกเกอร์เปล่า (Fast-Tick Label) 12 ดวง/หน้า A4 สำหรับสั่งพิมพ์แล้วให้พนักงานเขียนวันที่เอง
// =========================================================================

function renderFridgeBlankStickersTab(area) {
  const themeMap = {
    blue: { label: "🔵 มาตรฐานสีน้ำเงิน (Standard Daily Prep)", headerBg: "#1d4ed8", borderColor: "#1d4ed8", badgeText: "FOOD PREP STICKER" },
    usefirst: { label: "🟠 ป้ายเตือนใช้ก่อน (USE FIRST - FIFO)", headerBg: "#ea580c", borderColor: "#ea580c", badgeText: "⚡ USE FIRST (ใช้ก่อน!)" },
    mon: { label: "🟡 วันจันทร์ (สีเหลือง)", headerBg: "#ca8a04", borderColor: "#eab308", badgeText: "PREP STICKER • จันทร์" },
    tue: { label: "🩷 วันอังคาร (สีชมพู)", headerBg: "#db2777", borderColor: "#ec4899", badgeText: "PREP STICKER • อังคาร" },
    wed: { label: "🟢 วันพุธ (สีเขียว)", headerBg: "#15803d", borderColor: "#22c55e", badgeText: "PREP STICKER • พุธ" },
    thu: { label: "🟠 วันพฤหัสบดี (สีส้ม)", headerBg: "#c2410c", borderColor: "#f97316", badgeText: "PREP STICKER • พฤหัสฯ" },
    fri: { label: "🔵 วันศุกร์ (สีฟ้า)", headerBg: "#0284c7", borderColor: "#38bdf8", badgeText: "PREP STICKER • ศุกร์" },
    sat: { label: "🟣 วันเสาร์ (สีม่วง)", headerBg: "#7e22ce", borderColor: "#a855f7", badgeText: "PREP STICKER • เสาร์" },
    sun: { label: "🔴 วันอาทิตย์ (สีแดง)", headerBg: "#b91c1c", borderColor: "#ef4444", badgeText: "PREP STICKER • อาทิตย์" }
  };

  const activeTheme = themeMap[selectedStickerColorTheme] || themeMap.blue;
  const twelveArray = Array.from({ length: 12 }, (_, i) => i + 1);

  area.innerHTML = `
    <div class="no-print" style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 14px; padding: 1.15rem 1.35rem; margin-bottom: 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h4 style="font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem;">
            🏷️ เทมเพลตฟอร์มสติกเกอร์เปล่า (Fast-Tick Label) 12 ดวงต่อหน้ากระดาษ A4 (3 แถวแนวตั้ง × 4 แถวแนวนอน)
          </h4>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
            ออกแบบให้พนักงานใช้วิธี <strong>"ติ๊กเลือกวัตถุดิบ"</strong> และเขียนวันที่หั่น/วันหมดอายุด้วยปากกาเคมีกันน้ำ (Permanent Marker) • แนะนำใช้สติกเกอร์ชนิดกันน้ำหรือละลายน้ำได้ (Water-soluble)
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
          <select class="form-select" style="width: auto; font-weight: 700; padding: 0.5rem 0.85rem;" onchange="selectedStickerColorTheme = this.value; renderFridgeManagementView();">
            ${Object.entries(themeMap).map(([k, v]) => `<option value="${k}" ${selectedStickerColorTheme === k ? 'selected' : ''}>${v.label}</option>`).join("")}
          </select>
          <button class="action-btn btn-primary" onclick="window.print()" style="width: auto; padding: 0.6rem 1.35rem;">
            🖨️ สั่งพิมพ์สติกเกอร์ 12 ดวง (A4)
          </button>
        </div>
      </div>
    </div>

    <!-- กระดาษ A4 เรียงสติกเกอร์ 12 ดวง (3 คอลัมน์ x 4 แถว) -->
    <div class="sticker-sheet-a4-container">
      <div class="sticker-grid-12">
        ${twelveArray.map(() => `
          <div class="fast-tick-sticker-card" style="border-color: ${activeTheme.borderColor};">
            <div class="fast-tick-sticker-header" style="background: ${activeTheme.headerBg};">
              <span>${activeTheme.badgeText}</span>
              <span style="font-size: 0.68rem; font-weight: 600;">ผมขอทอด SOP</span>
            </div>
            <div class="fast-tick-sticker-body">
              <div style="font-weight: 800; font-size: 0.74rem; color: #0f172a; margin-bottom: 0.2rem;">วัตถุดิบ (ติ๊กเลือก):</div>
              <div class="fast-tick-options-grid">
                <span>☐ ต้นหอมซอย</span>
                <span>☐ หอมใหญ่หั่น</span>
                <span>☐ เห็ดเข็มทองหั่น</span>
                <span>☐ กิมจิ Superlock</span>
                <span>☐ ไชเท้าดอง</span>
                <span>☐ น้ำซุปกิมจิ</span>
                <span>☐ ไก่หมัก/ซอส</span>
                <span style="grid-column: span 2;">☐ อื่นๆ: ...............................</span>
              </div>
              <div class="fast-tick-line">
                <strong>วันที่หั่น/เปิด:</strong> ......../......../........ <strong>เวลา:</strong> ...........น.
              </div>
              <div class="fast-tick-line" style="color: #b91c1c;">
                <strong>วันหมดอายุ:</strong> ......../......../........ <strong>เวลา:</strong> ...........น.
              </div>
              <div class="fast-tick-footer">
                <span><strong>กะ:</strong> ☐ เช้า ☐ เย็น</span>
                <span><strong>ผู้เตรียม:</strong> .......................</span>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}
