/**
 * 🍗 ฐานข้อมูลหลักระบบ SOP แฟรนไชส์ร้านไก่ทอด "ผมขอทอด" (Pom Khor Thod V30 Enterprise)
 * โครงสร้าง 7 หมวดหมู่ตามไทม์ไลน์การทำงานจริง (Operational Workflow) + คลังราคาวัตถุดิบกลาง (Food Cost)
 * รองรับการซิงค์ข้อมูลผ่าน Firebase Firestore Cloud + Hybrid Backup
 */

const CLOUD_CONFIG = {
  enabled: true,
  type: "firebase_hybrid",
  supabaseUrl: "https://vpsgvvyeqaltkisykbru.supabase.co",
  supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwc2d2dnllcWFsdGtpc3lrYnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NTE5MDUsImV4cCI6MjEwMzIyNzkwNX0.266bjOaxiV6u5Z5VoutzIJ0bthkgbHENJuAksOYfGH0"
};

let supabaseClient = null;

function initSupabaseClient() {
  const supabaseObj = window.supabase || (window.supabaseJS ? window.supabaseJS : null);
  if (supabaseObj && CLOUD_CONFIG.supabaseUrl && CLOUD_CONFIG.supabaseKey) {
    try {
      if (!supabaseClient) {
        if (typeof supabaseObj.createClient === "function") {
          supabaseClient = supabaseObj.createClient(CLOUD_CONFIG.supabaseUrl, CLOUD_CONFIG.supabaseKey);
        } else if (typeof window.createClient === "function") {
          supabaseClient = window.createClient(CLOUD_CONFIG.supabaseUrl, CLOUD_CONFIG.supabaseKey);
        }
      }
      return supabaseClient;
    } catch (e) {
      console.warn("Supabase Fallback Init Warning:", e);
    }
  }
  return null;
}

// =========================================================================
// 🏪 ข้อมูลสาขาแฟรนไชส์ 4 สาขาหลัก (เพิ่มสาขาใหม่ได้ตลอดเวลา)
// =========================================================================

const DEFAULT_BRANCHES = [
  { id: "B1", code: "B1", name: "B1 สาขาลาดพร้าว (Ladphrao)", manager: "ผู้จัดการสาขา B1", status: "ACTIVE" },
  { id: "B2", code: "B2", name: "B2 สาขาเทพรักษ์ (Theprak)", manager: "ผู้จัดการสาขา B2", status: "ACTIVE" },
  { id: "B3", code: "B3", name: "B3 สาขาเมืองทอง (Muangthong)", manager: "ผู้จัดการสาขา B3", status: "ACTIVE" },
  { id: "B4", code: "B4", name: "B4 สาขาปิ่นเกล้า (Pinklao)", manager: "ผู้จัดการสาขา B4", status: "ACTIVE" }
];

function getBranchesData() {
  const local = localStorage.getItem("PKT_BRANCHES_V30");
  if (local) {
    try { return JSON.parse(local); } catch (e) { console.error(e); }
  }
  localStorage.setItem("PKT_BRANCHES_V30", JSON.stringify(DEFAULT_BRANCHES));
  return DEFAULT_BRANCHES;
}

function saveBranchesData(branches) {
  localStorage.setItem("PKT_BRANCHES_V30", JSON.stringify(branches));
  if (typeof firestoreSaveDocument === "function") {
    firestoreSaveDocument("pkt_app_state", "branches", branches);
  }
}

// =========================================================================
// 💰 คลังราคาวัตถุดิบกลาง (Master Ingredient Database สำหรับคำนวณ Food Cost)
// =========================================================================

const DEFAULT_MASTER_INGREDIENTS = [
  { id: "ing-thigh", name: "สะโพกไก่สดตัดแต่ง (130-150g/ชิ้น)", category: "เนื้อไก่", packSize: 1000, unit: "g", packPrice: 95, costPerUnit: 0.095 },
  { id: "ing-drumstick", name: "น่องไก่ติดกระดูกสด", category: "เนื้อไก่", packSize: 1000, unit: "g", packPrice: 92, costPerUnit: 0.092 },
  { id: "ing-wing", name: "ปีกไก่สด (ปีกบน+ปีกกลาง)", category: "เนื้อไก่", packSize: 1000, unit: "g", packPrice: 115, costPerUnit: 0.115 },
  { id: "ing-breast", name: "อกไก่ / สันในไก่สดไร้กระดูก", category: "เนื้อไก่", packSize: 1000, unit: "g", packPrice: 88, costPerUnit: 0.088 },
  { id: "ing-marinade", name: "ผงหมักสูตรเข้มข้น ผมขอทอด", category: "เครื่องหมัก/แป้ง", packSize: 1000, unit: "g", packPrice: 280, costPerUnit: 0.28 },
  { id: "ing-garlic", name: "กระเทียมสับละเอียด", category: "เครื่องหมัก/แป้ง", packSize: 1000, unit: "g", packPrice: 80, costPerUnit: 0.08 },
  { id: "ing-flour", name: "แป้งชุบทอดเกล็ดกรอบพิเศษ", category: "เครื่องหมัก/แป้ง", packSize: 1000, unit: "g", packPrice: 55, costPerUnit: 0.055 },
  { id: "ing-oil", name: "น้ำมันปาล์มโอเลอินสำหรับทอด", category: "น้ำมันทอด", packSize: 1000, unit: "ml", packPrice: 48, costPerUnit: 0.048 },
  { id: "ing-sauce-korean", name: "ซอสเกาหลีเผ็ดหวาน (Signature)", category: "ซอส/ผงเขย่า", packSize: 1000, unit: "g", packPrice: 160, costPerUnit: 0.16 },
  { id: "ing-sauce-shoyu", name: "ซอสกระเทียมโชยุ", category: "ซอส/ผงเขย่า", packSize: 1000, unit: "g", packPrice: 155, costPerUnit: 0.155 },
  { id: "ing-sauce-honey", name: "ซอสมัสตาร์ดน้ำผึ้ง (Honey Mustard)", category: "ซอส/ผงเขย่า", packSize: 1000, unit: "g", packPrice: 170, costPerUnit: 0.17 },
  { id: "ing-sauce-mala", name: "ซอสหม่าล่าสไปซี่", category: "ซอส/ผงเขย่า", packSize: 1000, unit: "g", packPrice: 165, costPerUnit: 0.165 },
  { id: "ing-seasoning-shake", name: "ผงเขย่าปรุงรส (ชีส/วิงส์แซ่บ/ปาปริก้า)", category: "ซอส/ผงเขย่า", packSize: 1000, unit: "g", packPrice: 240, costPerUnit: 0.24 },
  { id: "ing-fries", name: "เฟรนช์ฟรายส์แช่แข็งเกรด A", category: "ของทานเล่น", packSize: 1000, unit: "g", packPrice: 75, costPerUnit: 0.075 },
  { id: "ing-box-s", name: "กล่องกระดาษไซส์ S / ซองกันน้ำมัน + ทิชชู่", category: "บรรจุภัณฑ์", packSize: 1, unit: "ชุด", packPrice: 3.5, costPerUnit: 3.5 },
  { id: "ing-box-m", name: "กล่องกระดาษไซส์ M (เจาะรูระบาย) + ถุงมือ 2 คู่", category: "บรรจุภัณฑ์", packSize: 1, unit: "ชุด", packPrice: 6.5, costPerUnit: 6.5 },
  { id: "ing-bucket", name: "ถังบักเก็ตครอบครัว (8+ ชิ้น) + ถุงมือ 4 คู่", category: "บรรจุภัณฑ์", packSize: 1, unit: "ชุด", packPrice: 12.0, costPerUnit: 12.0 }
];

function getMasterIngredients() {
  const local = localStorage.getItem("PKT_MASTER_INGREDIENTS_V30");
  if (local) {
    try { return JSON.parse(local); } catch (e) { console.error(e); }
  }
  localStorage.setItem("PKT_MASTER_INGREDIENTS_V30", JSON.stringify(DEFAULT_MASTER_INGREDIENTS));
  return DEFAULT_MASTER_INGREDIENTS;
}

function saveMasterIngredients(list) {
  list.forEach(item => {
    item.packSize = parseFloat(item.packSize) || 1;
    item.packPrice = parseFloat(item.packPrice) || 0;
    item.costPerUnit = item.packPrice / item.packSize;
  });
  localStorage.setItem("PKT_MASTER_INGREDIENTS_V30", JSON.stringify(list));
  if (typeof firestoreSaveDocument === "function") {
    firestoreSaveDocument("pkt_app_state", "master_ingredients", list);
  }
}

function calculateIngredientLineCost(ingName, amount, unit) {
  const masterList = getMasterIngredients();
  const cleanName = (ingName || "").toLowerCase().trim();
  let matched = masterList.find(m => m.name.toLowerCase() === cleanName || cleanName.includes(m.name.toLowerCase().split(" ")[0]));
  if (!matched) {
    if (cleanName.includes("สะโพก")) matched = masterList.find(m => m.id === "ing-thigh");
    else if (cleanName.includes("น่อง")) matched = masterList.find(m => m.id === "ing-drumstick");
    else if (cleanName.includes("ปีก")) matched = masterList.find(m => m.id === "ing-wing");
    else if (cleanName.includes("อก") || cleanName.includes("สันใน") || cleanName.includes("ป๊อป")) matched = masterList.find(m => m.id === "ing-breast");
    else if (cleanName.includes("ผงหมัก")) matched = masterList.find(m => m.id === "ing-marinade");
    else if (cleanName.includes("กระเทียม")) matched = masterList.find(m => m.id === "ing-garlic");
    else if (cleanName.includes("แป้ง")) matched = masterList.find(m => m.id === "ing-flour");
    else if (cleanName.includes("น้ำมัน")) matched = masterList.find(m => m.id === "ing-oil");
    else if (cleanName.includes("ซอส")) matched = masterList.find(m => m.id === "ing-sauce-korean");
    else if (cleanName.includes("ผงเขย่า") || cleanName.includes("ผงปรุง")) matched = masterList.find(m => m.id === "ing-seasoning-shake");
    else if (cleanName.includes("เฟรนช์ฟราย")) matched = masterList.find(m => m.id === "ing-fries");
    else if (cleanName.includes("กล่อง") || cleanName.includes("บักเก็ต")) matched = masterList.find(m => m.id === "ing-box-m");
  }
  if (!matched) return 0;

  let normalizedAmount = parseFloat(amount) || 0;
  const u = (unit || "").toLowerCase().trim();
  if ((u === "kg" || u === "กก." || u === "กิโลกรัม" || u === "l" || u === "ลิตร") && (matched.unit === "g" || matched.unit === "ml")) {
    normalizedAmount = normalizedAmount * 1000;
  }
  return normalizedAmount * (matched.costPerUnit || 0);
}

// =========================================================================
// 🗂️ โครงสร้าง 7 หมวดหมู่หลักตามไทม์ไลน์การทำงานจริง (7-Stage Operational Workflow)
// =========================================================================

const WORKFLOW_STAGES_META = [
  { id: "stage-1-opening", number: 1, icon: "🌅", shortTitle: "1. ขั้นตอนการเปิดร้าน", fullTitle: "หมวดที่ 1: ขั้นตอนการเปิดร้าน (Opening Procedures)", goal: "เซ็ตระบบเครื่องครัว วัตถุดิบ และความสะอาดให้พร้อมรับออร์เดอร์แรกทันทีที่เปิดร้าน" },
  { id: "stage-2-prep", number: 2, icon: "🥩", shortTitle: "2. รับและเตรียมวัตถุดิบ", fullTitle: "หมวดที่ 2: การรับ ตรวจรับ และเตรียมวัตถุดิบ (Raw Material & Prep)", goal: "ป้องกันการปนเปื้อนข้าม (Cross-contamination) และคุมความสดตามมาตรฐาน FIFO" },
  { id: "stage-3-frying", number: 3, icon: "🔥", shortTitle: "3. คลุกแป้งและทอดไก่", fullTitle: "หมวดที่ 3: กระบวนการคลุกแป้งและทอด (Coating & Frying Station)", goal: "จุดหัวใจของร้าน รสชาติ ความกรอบ และสีของไก่ต้องเหมือนกันทุกสาขา" },
  { id: "stage-4-packing", number: 4, icon: "📦", shortTitle: "4. ตู้โชว์ คลุกซอส & แพ็ก", fullTitle: "หมวดที่ 4: การจัดเก็บ การประกอบเมนู และแพ็กเกจจิ้ง (Holding & Packing)", goal: "คงความร้อน ความกรอบ และส่งมอบอาหารถูกต้อง รวดเร็ว Zero Missing Items" },
  { id: "stage-5-delivery", number: 5, icon: "🛵", shortTitle: "5. หน้าร้าน & เดลิเวอรี", fullTitle: "หมวดที่ 5: การบริการหน้าร้านและการจัดส่ง (Front of House & Delivery)", goal: "ตั้งค่า Prep Time แม่นยำ รับมือไรเดอร์มาช้า และเคลมค่าอาหารเดลิเวอรีได้ 100%" },
  { id: "stage-6-oil", number: 6, icon: "🛢️", shortTitle: "6. จัดการน้ำมัน & อุปกรณ์", fullTitle: "หมวดที่ 6: การจัดการน้ำมันและบำรุงรักษาอุปกรณ์ (Oil & Equipment Care)", goal: "ควบคุมต้นทุนน้ำมัน กรองกากแป้ง วัดค่า TPM และต้มล้างหม้อทอด (Boil-out)" },
  { id: "stage-7-closing", number: 7, icon: "🌙", shortTitle: "7. ขั้นตอนการปิดร้าน", fullTitle: "หมวดที่ 7: ขั้นตอนการปิดร้าน (Closing Procedures)", goal: "เคลียร์สต็อก บันทึก Waste Log ทำ Deep Clean ดักไขมัน และปิดระบบแก๊ส/ไฟ" }
];

const DEFAULT_SUB_CATEGORIES = [
  // หมวดที่ 1: เปิดร้าน
  { id: "open-equip", stage: "stage-1-opening", label: "1.1 เปิดเตาทอด & ตู้โชว์ 60°C" },
  { id: "open-pos", stage: "stage-1-opening", label: "1.2 เปิด POS & แอปเดลิเวอรี" },
  { id: "open-hygiene", stage: "stage-1-opening", label: "1.3 สุขอนามัย & ล้างมือ 7 ขั้นตอน" },

  // หมวดที่ 2: รับและเตรียมวัตถุดิบ (รวมหมวดเดิม prep)
  { id: "prep-receive", stage: "stage-2-prep", label: "2.1 ตรวจรับของสด (≤4°C) & FIFO" },
  { id: "prep-thaw", stage: "stage-2-prep", label: "2.2 ละลายน้ำแข็ง & ป้าย Use-by" },
  { id: "thigh", stage: "stage-2-prep", label: "2.3 หมักสะโพกไก่ & ปีกไก่ดิบ" },
  { id: "batter-sauce", stage: "stage-2-prep", label: "2.4 เตรียมแป้งชุบ & ซอสเบส" },
  { id: "prep-fridge", stage: "stage-2-prep", label: "2.5 ผังจัดตู้เย็น 2 ประตู & สติกเกอร์" },

  // หมวดที่ 3: คลุกแป้งและทอด (รวมหมวดเดิม cooking)
  { id: "fry-dredging", stage: "stage-3-frying", label: "3.1 เทคนิคชุบแป้ง Fold & Roll" },
  { id: "fry-matrix", stage: "stage-3-frying", label: "3.2 ตารางเวลา-อุณหภูมิทอด (Matrix)" },
  { id: "fry-temp", stage: "stage-3-frying", label: "3.3 สะเด็ดน้ำมัน & วัดแกนกลาง ≥74°C" },

  // หมวดที่ 4: ตู้โชว์ คลุกซอส และแพ็กเกจจิ้ง
  { id: "pack-holding", stage: "stage-4-packing", label: "4.1 อายุอาหารในตู้ Holding Cabinet" },
  { id: "sauces-coating", stage: "stage-4-packing", label: "4.2 คลุกซอส 4 สูตร & เขย่าผง" },
  { id: "takeaway-delivery", stage: "stage-4-packing", label: "4.3 จัดเซ็ต & บรรจุภัณฑ์ (Packaging)" },

  // หมวดที่ 5: บริการหน้าร้านและเดลิเวอรี
  { id: "deliv-greeting", stage: "stage-5-delivery", label: "5.1 สคริปต์ต้อนรับ & Up-selling" },
  { id: "deliv-preptime", stage: "stage-5-delivery", label: "5.2 ตั้งค่า Prep Time & ไรเดอร์มาช้า" },
  { id: "deliv-claim", stage: "stage-5-delivery", label: "5.3 ขั้นตอนเคลมอาหารเดลิเวอรี" },

  // หมวดที่ 6: จัดการน้ำมันและอุปกรณ์
  { id: "oil-filter", stage: "stage-6-oil", label: "6.1 การกรองน้ำมันระหว่างวัน" },
  { id: "oil-tpm", stage: "stage-6-oil", label: "6.2 วัดค่า TPM & เปลี่ยนน้ำมันใหม่" },
  { id: "oil-boilout", stage: "stage-6-oil", label: "6.3 การต้มล้างหม้อทอด (Boil-out)" },

  // หมวดที่ 7: ปิดร้าน
  { id: "close-waste", stage: "stage-7-closing", label: "7.1 เคลียร์สต็อก & บันทึก Waste Log" },
  { id: "close-clean", stage: "stage-7-closing", label: "7.2 Deep Clean & ตักไขมัน" },
  { id: "close-system", stage: "stage-7-closing", label: "7.3 ปิดแก๊ส/ไฟ & สรุปยอด POS" }
];

function getSubCategoriesData() {
  const local = localStorage.getItem("PKT_SUB_CATEGORIES_V30");
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        DEFAULT_SUB_CATEGORIES.forEach(def => {
          if (!parsed.some(p => p.id === def.id)) {
            parsed.push(def);
          }
        });
        return parsed;
      }
    } catch (e) { console.error(e); }
  }
  saveSubCategoriesData(DEFAULT_SUB_CATEGORIES);
  return DEFAULT_SUB_CATEGORIES;
}

function saveSubCategoriesData(data) {
  localStorage.setItem("PKT_SUB_CATEGORIES_V30", JSON.stringify(data));
  if (typeof firestoreSaveDocument === "function") {
    firestoreSaveDocument("pkt_app_state", "sub_categories", data);
  }
}

function addSubCategoryItem(stage, label) {
  const list = getSubCategoriesData();
  const id = "sub-" + Date.now();
  const newItem = { id, stage, label: label.trim() };
  list.push(newItem);
  saveSubCategoriesData(list);
  return newItem;
}

function removeSubCategoryItem(id) {
  let list = getSubCategoriesData();
  list = list.filter(item => item.id !== id);
  saveSubCategoriesData(list);
}

// =========================================================================
// 🎨 สร้างภาพประกอบ Infographics ชัดเจนระดับ HD สำหรับแต่ละขั้นตอน
// =========================================================================

function createBase64SvgPlaceholder(bgColor, accentColor, badgeText, mainText, subText) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <rect width="800" height="450" rx="20" fill="${bgColor}"/>
    <rect x="30" y="30" width="740" height="390" rx="16" fill="none" stroke="${accentColor}" stroke-width="2" stroke-dasharray="8 6" opacity="0.45"/>
    <rect x="250" y="65" width="300" height="44" rx="22" fill="${accentColor}"/>
    <text x="400" y="94" text-anchor="middle" font-family="Prompt, sans-serif" fill="#ffffff" font-size="18" font-weight="800">${badgeText}</text>
    <text x="400" y="215" text-anchor="middle" font-family="Prompt, sans-serif" fill="#ffffff" font-size="31" font-weight="800">${mainText}</text>
    <text x="400" y="275" text-anchor="middle" font-family="Prompt, sans-serif" fill="#cbd5e1" font-size="21" font-weight="500">${subText}</text>
    <text x="400" y="365" text-anchor="middle" font-family="Prompt, sans-serif" fill="${accentColor}" font-size="16" font-weight="700">📸 แตะเพื่อขยายภาพ หรืออัปโหลดภาพถ่ายจริงจากมือถือได้ทันที</text>
  </svg>`;
  try {
    return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
  } catch (e) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
}

const SAMPLE_IMAGES = {
  opening: createBase64SvgPlaceholder("#0f172a", "#d97706", "SOP-OPS-001 • OPENING", "🌅 การเปิดเตาทอด & ตู้โชว์อุ่นไก่", "Pre-heat เตา 165°C-175°C • ตู้โชว์ Holding ≥ 60°C"),
  receiving: createBase64SvgPlaceholder("#0f172a", "#059669", "SOP-OPS-002 • FIFO & PREP", "🌡️ ตรวจรับไก่สด (≤ 4°C) & ติดป้าย Use-by", "ห้ามรับไก่เกิน 4°C • ละลายในตู้เย็น • เรียงตาม FIFO"),
  thighPrep: createBase64SvgPlaceholder("#1e293b", "#f59e0b", "SOP-PREP-01 • MARINATION", "🥩 การเตรียมและหมักสะโพกไก่ดิบ 130-150g", "ล้างน้ำเย็น • บากเนื้อ 2 รอย • นวดหมัก 3 นาที พัก 6 ชม."),
  wingPrep: createBase64SvgPlaceholder("#1e293b", "#eab308", "SOP-PREP-02 • WING PREP", "🍗 การเตรียมและหมักปีกไก่ดิบกระเทียมสด", "บากปีกกลาง 1 รอย • ซับให้แห้งสนิท • หมัก 4-12 ชม."),
  dredging: createBase64SvgPlaceholder("#1e293b", "#dc2626", "SOP-OPS-003 • COATING & FRYING", "🔥 คลุกแป้ง Fold & Roll 10-12 ครั้ง + สะบัด 2 ครั้ง", "คลุกรอบแรก 7-10 ครั้ง ➔ จุ่มน้ำ 3-5 วิ ➔ ตลบแป้งสร้างเกล็ด"),
  probeTemp: createBase64SvgPlaceholder("#0f172a", "#ef4444", "CRITICAL CONTROL POINT", "🌡️ เสียบโพรบวัดอุณหภูมิแกนกลาง ≥ 74°C", "เขย่าสะเด็ดน้ำมัน 30 วินาที • วัดส่วนหนาสุดไม่โดนกระดูก"),
  sauceCoating: createBase64SvgPlaceholder("#1e293b", "#d97706", "SOP-OPS-004 • GLAZING & SHAKE", "🥣 คลุกซอส 4 สูตร Signature & เขย่าผงปรุงรส", "3-4 ชิ้น: ซอส 30ml • 6 ชิ้น: ซอส 60ml • คลุกเร็วใน 10 วินาที"),
  packing: createBase64SvgPlaceholder("#0f172a", "#2563eb", "SOP-OPS-004 • PACKING STATION", "📦 มาตรฐานจัดเซ็ต & เปิดรูระบายไอน้ำ", "เช็กบิล POS แบบ Tick-off • แยกของเย็น • ติด Tamper Seal"),
  deliveryClaim: createBase64SvgPlaceholder("#0f172a", "#7c3aed", "SOP-OPS-005 • DELIVERY CLAIM", "🛵 กฎเหล็กเคลมอาหารเมื่อไรเดอร์ไม่มารับ", "กด 'อาหารพร้อมส่ง' ทันที • ถ่ายรูปครบ 3 มุม • ยื่นภายใน 24 ชม."),
  oilCare: createBase64SvgPlaceholder("#0f172a", "#0d9488", "SOP-OPS-006 • OIL & BOIL-OUT", "🛢️ การกรองน้ำมันทุก 4-5 รอบ & วัดค่า TPM ≤ 25%", "ช้อนเศษแป้งทุกแบทช์ • เปลี่ยนน้ำมันทันทีเมื่อค่า TPM เกิน 25%"),
  closing: createBase64SvgPlaceholder("#0f172a", "#475569", "SOP-OPS-007 • CLOSING & WASTE", "🌙 บันทึก Waste Log • Deep Clean • ดักไขมัน", "ปิดวาล์วแก๊สหลัก • ปิดเบรกเกอร์เตาทอด • กระทบยอด POS")
};

// =========================================================================
// 📚 ข้อมูลคู่มือ SOP มาตรฐานแฟรนไชส์ครบทั้ง 7 หมวดหมู่ (จากเอกสาร 14 หน้า)
// =========================================================================

const INITIAL_SOP_DATA = [
  // -------------------------------------------------------------------------
  // หมวดที่ 1: ขั้นตอนการเปิดร้าน (Opening Procedures)
  // -------------------------------------------------------------------------
  {
    id: "sop-ops-001-opening",
    docCode: "SOP-OPS-001",
    title: "SOP ขั้นตอนการเปิดร้าน ตรวจเช็กเตาทอด ตู้โชว์ และสุขอนามัยก่อนเข้าครัว",
    category: "stage-1-opening",
    subCategory: "open-equip",
    version: "2.0",
    updatedAt: "2026-10-22 09:00",
    author: "ฝ่ายมาตรฐานแฟรนไชส์ ผมขอทอด",
    changeNotes: "อัปเดตมาตรฐานเปิดร้าน 3 ส่วน: อุปกรณ์หลัก, ระบบ POS/เดลิเวอรี และสุขอนามัยการล้างมือ 7 ขั้นตอน",
    versionHistory: [],
    targetRole: ["kitchen", "front", "admin"],
    prepTime: "30 นาที ก่อนเปิดร้าน",
    cookTime: "-",
    yield: "พร้อมเปิดร้าน 100%",
    sellingPrice: 0,
    summary: "เซ็ตระบบเครื่องครัว เตาทอด น้ำมัน ตู้โชว์อุ่นไก่ (≥60°C) เครื่อง POS และตรวจเช็กสุขอนามัยพนักงานให้พร้อมรับออร์เดอร์แรกทันทีที่เปิดร้าน",
    tags: ["เปิดร้าน", "เตาทอด", "ตู้โชว์", "สุขอนามัย", "POS"],
    specifications: [
      { label: "อุณหภูมิ Pre-heat เตาทอด", value: "165°C - 175°C (ไฟ READY ติด)" },
      { label: "อุณหภูมิตู้โชว์อุ่นไก่ (Holding)", value: "60°C - 65°C ตลอดเวลา" },
      { label: "ระดับน้ำมันทอด", value: "อยู่ระหว่างขีด Min และ Max เสมอ" },
      { label: "การล้างมือพนักงาน", value: "ครบ 7 ขั้นตอน + เล็บสั้นไร้เครื่องประดับ" }
    ],
    matrixTitle: "📋 ตารางตรวจเช็กความพร้อมก่อนเปิดร้าน (Pre-Opening Matrix)",
    matrixHeaders: ["หมวดงาน", "จุดตรวจสำคัญ", "ค่ามาตรฐานที่ต้องได้", "ผู้รับผิดชอบ"],
    matrixRows: [
      ["1. อุปกรณ์ครัวร้อน", "สายไฟ, ท่อแก๊ส, ฮูดดูดควัน, เตาทอด, ตู้ Holding", "เตาทอด 165-175°C / ตู้โชว์ ≥ 60°C", "พนักงานสเตชันทอด"],
      ["2. คุณภาพน้ำมันทอด", "สีน้ำมัน, กลิ่น, ตะกอนก้นหม้อ, ค่า TPM", "ใส ไม่เหม็นหืน ค่า TPM ไม่เกิน 25%", "หัวหน้าครัว / Fry Cook"],
      ["3. ระบบหน้าร้าน & POS", "เครื่อง POS, เงินทอนตั้งต้น, แอปเดลิเวอรี 4 ค่าย", "ออนไลน์ครบ ตั้งค่า Prep Time 15-20 นาที", "พนักงานหน้าร้าน (FOH)"],
      ["4. สุขอนามัยพนักงาน", "เครื่องแบบ, หมวกคลุมผม, หน้ากาก, ถุงมือ, เล็บ", "แต่งกายครบ 100% ล้างมือ 7 ขั้นตอน", "พนักงานทุกคน"]
    ],
    qualityChecks: [
      { topic: "ความพร้อมเตาทอดและน้ำมัน", pass: "น้ำมันใส อยู่ระหว่างขีด Min-Max ไฟสถานะ READY ติดสว่างก่อนลงไก่", fail: "น้ำมันต่ำกว่าขีด Min มีเศษแป้งดำค้างก้นหม้อ หรือลงไก่ตอนไฟยังไม่ READY" },
      { topic: "การแต่งกายและสุขอนามัย", pass: "สวมหมวกคลุมผมเก็บผมมิดชิด สวมหน้ากากอนามัย ผ้ากันเปื้อนสะอาด เล็บสั้น", fail: "ใส่แหวน นาฬิกา ทาเล็บ หรือไม่สวมหมวกคลุมผมขณะเข้าพื้นที่ครัว" }
    ],
    troubleshooting: [
      { problem: "เปิดเตาทอดแล้วอุณหภูมิขึ้นช้าผิดปกติ หรือไฟ READY ไม่ติด", solution: "ตรวจเช็กวาล์วแก๊สหลักและเบรกเกอร์ไฟ หากมีคราบเขม่าหรือกากแป้งเกาะท่อความร้อนหนา ให้แจ้งผู้จัดการสาขาและห้ามฝืนลงไก่เด็ดขาด" },
      { problem: "ตู้โชว์อุ่นไก่ (Holding Cabinet) อุณหภูมิไม่ถึง 60°C", solution: "ต้องเปิดวอร์มตู้ล่วงหน้าอย่างน้อย 20 นาทีก่อนทอดไก่แบทช์แรก และตรวจสอบว่าประตูปิดสนิทซีลยางไม่รั่ว" }
    ],
    ingredients: [],
    steps: [
      {
        stepNumber: 1,
        title: "1.1 การตรวจเช็กและเปิดระบบอุปกรณ์หลักในครัว",
        description: "ตรวจสภาพสายไฟ ท่อแก๊ส ระบบดูดควัน และระบบดับเพลิง ➔ เปิดเครื่องทอด (Deep/Pressure Fryer) ตั้งค่าอุณหภูมิ Pre-heat (165°C-175°C) ➔ ตรวจเช็กระดับและสภาพน้ำมันทอด (สี, ตะกอน, ค่า TPM) ➔ เปิดตู้โชว์อุ่นไก่ (Holding Cabinet) ตั้งค่าอุณหภูมิ ≥ 60°C",
        imageUrl: SAMPLE_IMAGES.opening,
        videoUrl: "",
        cameraAngle: "Side-Angle / Close-up",
        timerSeconds: 900,
        tip: "ต้องเปิดวอร์มเตาทอดและตู้โชว์ล่วงหน้าอย่างน้อย 15-20 นาทีก่อนรับออร์เดอร์แรก"
      },
      {
        stepNumber: 2,
        title: "1.2 การเปิดระบบหน้าร้านและจุดชำระเงิน (POS & Delivery)",
        description: "เปิดเครื่อง POS ตรวจนับเงินทอนตั้งต้นในลิ้นชักเก็บเงินให้ตรงตามเกณฑ์ ➔ เปิดสัญญาณแอปเดลิเวอรีทั้ง 4 ค่าย (GrabFood, LINE MAN, ShopeeFood, Robinhood) ตั้งค่า Prep Time ช่วง Off-Peak ที่ 15-20 นาที ➔ เช็ดทำความสะอาดโต๊ะ เก้าอี้ กระจกหน้าร้าน และจุดรับอาหารไรเดอร์",
        imageUrl: "",
        videoUrl: "",
        cameraAngle: "Top-down 90°",
        timerSeconds: 0,
        tip: "ตรวจสอบกระดาษใบเสร็จในเครื่องพิมพ์ POS และสติกเกอร์ Tamper Seal ให้พร้อมใช้งานเสมอ"
      },
      {
        stepNumber: 3,
        title: "1.3 Checklist สุขอนามัยประจำตัวพนักงานก่อนเข้าครัว",
        description: "สวมเครื่องแบบมาตรฐาน หมวกคลุมผม ผ้ากันเปื้อน และหน้ากากอนามัย ➔ ถอดแหวน นาฬิกา และเครื่องประดับทุกชนิด ➔ ล้างมือด้วยสบู่ฆ่าเชื้อตามมาตรฐาน 7 ขั้นตอน นานอย่างน้อย 20 วินาที แล้วเช็ดด้วยกระดาษทิชชู่แบบใช้ครั้งเดียวทิ้ง",
        imageUrl: "",
        videoUrl: "",
        cameraAngle: "POV (มุมสายตาตัวเอง)",
        timerSeconds: 20,
        tip: "ผู้จัดการสาขาต้องตรวจเล็บและเครื่องแบบพนักงานทุกคนก่อนอนุญาตให้เข้าสเตชัน"
      }
    ]
  },

  // -------------------------------------------------------------------------
  // หมวดที่ 2: การรับ ตรวจรับ และเตรียมวัตถุดิบ (Raw Material & Prep)
  // -------------------------------------------------------------------------
  {
    id: "sop-ops-002-receive-thaw",
    docCode: "SOP-OPS-002",
    title: "SOP การตรวจรับไก่สด (≤4°C) การละลายน้ำแข็ง (Thawing) และการจัดตู้แช่ FIFO",
    category: "stage-2-prep",
    subCategory: "prep-receive",
    version: "2.0",
    updatedAt: "2026-10-22 09:30",
    author: "ฝ่ายมาตรฐานแฟรนไชส์ ผมขอทอด",
    changeNotes: "กำหนดเกณฑ์วัดอุณหภูมิรับของสด ≤4°C, ห้ามละลายน้ำแข็งในน้ำอุณหภูมิห้อง และผังตู้แช่ FIFO",
    versionHistory: [],
    targetRole: ["kitchen", "admin"],
    prepTime: "15 นาที",
    cookTime: "-",
    yield: "ตามล็อตจัดส่ง",
    sellingPrice: 0,
    summary: "มาตรฐานการตรวจรับเนื้อไก่สดจากซัพพลายเออร์/ครัวกลาง เกณฑ์การปฏิเสธสินค้า การละลายน้ำแข็งในตู้เย็น และการติดฉลาก Use-by Label",
    tags: ["ตรวจรับของสด", "FIFO", "ละลายน้ำแข็ง", "Thawing", "Use-by Label"],
    specifications: [
      { label: "อุณหภูมิไก่สดตอนรับมอบ", value: "ต้องไม่เกิน 4°C (ห้ามเกินเด็ดขาด)" },
      { label: "วิธีละลายน้ำแข็ง (Thawing)", value: "ละลายในตู้ชิลเลอร์ 2°C - 4°C เท่านั้น" },
      { label: "การจัดวางในตู้แช่", value: "เนื้อสัตว์ดิบอยู่ชั้นล่างสุด / ของพร้อมทานอยู่ชั้นบนสุด" },
      { label: "การติดป้ายฉลาก", value: "ติดป้าย Use-by Label ระบุวัน-เวลาหมดอายุทุกกล่อง" }
    ],
    matrixTitle: "📏 มาตรฐานขนาดและน้ำหนักชิ้นส่วนไก่สด (Raw Cut Spec Matrix)",
    matrixHeaders: ["ชิ้นส่วนไก่", "น้ำหนักมาตรฐานต่อชิ้น", "อุณหภูมิรับเข้า", "อายุการเก็บหลังหมัก (Chiller 2-4°C)"],
    matrixRows: [
      ["สะโพกไก่สดตัดแต่ง (Thigh)", "130 - 150 กรัม / ชิ้น", "≤ 4°C", "หมักขั้นต่ำ 6 ชม. (เก็บได้ไม่เกิน 24 ชม.)"],
      ["น่องไก่ติดกระดูก (Drumstick)", "110 - 130 กรัม / ชิ้น", "≤ 4°C", "หมักขั้นต่ำ 6 ชม. (เก็บได้ไม่เกิน 24 ชม.)"],
      ["ปีกบน / ปีกกลาง (Wing)", "45 - 55 กรัม / ชิ้น", "≤ 4°C", "หมักขั้นต่ำ 4 ชม. (เก็บได้ไม่เกิน 24 ชม.)"],
      ["อกไก่ / สันใน (Breast / Tender)", "120 - 140 กรัม (หรือหั่นป๊อป 15-20g)", "≤ 4°C", "หมักขั้นต่ำ 4 ชม. (เก็บได้ไม่เกิน 24 ชม.)"]
    ],
    qualityChecks: [
      { topic: "สภาพเนื้อไก่สดตอนตรวจรับ", pass: "เนื้อสีชมพูธรรมชาติ เนื้อแน่นเด้ง ไม่มีกลิ่นคาว ถุงซีลไม่รั่ว อุณหภูมิ ≤ 4°C", fail: "สีคล้ำเขียวช้ำ มีกลิ่นเปรี้ยว/คาว เมือกเหนียว ถุงฉีกขาด หรืออุณหภูมิสูงกว่า 4°C (ต้องตีกลับทันที)" },
      { topic: "การละลายน้ำแข็งและการจัดเก็บ", pass: "ละลายในตู้เย็น 2-4°C ล่วงหน้า ติดป้าย Use-by ชัดเจน วางไก่ดิบไว้ชั้นล่างสุด", fail: "นำไก่แช่แข็งมาแช่น้ำอุณหภูมิห้อง หรือวางกล่องไก่ดิบไว้ชั้นบนเหนือซอส/ผักสด (เสี่ยงปนเปื้อนข้าม)" }
    ],
    troubleshooting: [
      { problem: "ซัพพลายเออร์มาส่งไก่สดแล้ววัดอุณหภูมิได้ 7°C - 8°C", solution: "ปฏิเสธการรับสินค้าล็อตนั้นทันที ถ่ายรูปหน้าจอเทอร์โมมิเตอร์คู่กับใบส่งของ แล้วแจ้งผู้จัดการสาขาเพื่อเคลมซัพพลายเออร์" },
      { problem: "ไก่หมักในตู้เย็นใกล้หมดแต่ไก่แช่แข็งยังละลายไม่ทัน", solution: "ห้ามใช้น้ำร้อนลวกเด็ดขาด ให้ใช้วิธีแช่ทั้งถุงซีลสุญญากาศในอ่างน้ำเย็นจัดที่มีน้ำไหลผ่าน (Running Cold Water ≤ 15°C) และต้องนำมาหมัก/ใช้ทันทีห้ามนำกลับไปแช่แข็งซ้ำ" }
    ],
    ingredients: [],
    steps: [
      {
        stepNumber: 1,
        title: "2.1 การตรวจรับสินค้าสดจากซัพพลายเออร์/ครัวกลาง",
        description: "ใช้โพรบเทอร์โมมิเตอร์วัดอุณหภูมิเนื้อไก่สดทันทีที่มาถึง (ต้อง ≤ 4°C) ➔ ตรวจสภาพถุงบรรจุภัณฑ์ วันผลิต และวันหมดอายุ ➔ หากพบเนื้อสีคล้ำ มีกลิ่นผิดปกติ หรือถุงรั่ว ให้ปฏิเสธการรับสินค้าและถ่ายรูปแจ้งผู้จัดการทันที",
        imageUrl: SAMPLE_IMAGES.receiving,
        videoUrl: "",
        cameraAngle: "Side-Angle / Close-up",
        timerSeconds: 0,
        tip: "นำของสดเข้าตู้แช่ทันทีภายใน 10 นาทีหลังตรวจรับเสร็จ ห้ามวางทิ้งไว้นอกตู้เย็น"
      },
      {
        stepNumber: 2,
        title: "2.2 การละลายน้ำแข็ง (Thawing) และการติดป้าย Use-by Label",
        description: "ย้ายไก่แช่แข็งจากตู้ฟรีซ (-18°C) ลงมาวางในถาดรองน้ำหยดที่ชั้นล่างสุดของตู้ชิลเลอร์ (2°C - 4°C) ล่วงหน้า 12-24 ชม. ➔ เขียนป้ายสติกเกอร์ Use-by Label ระบุวันที่นำออกละลาย และวันเวลาหมดอายุแปะหน้ากล่องทุกใบ",
        imageUrl: "",
        videoUrl: "",
        cameraAngle: "Top-down 90°",
        timerSeconds: 0,
        tip: "ห้ามนำไก่แช่แข็งมาแช่น้ำอุณหภูมิห้องเด็ดขาด เพราะเชื้อแบคทีเรียจะเจริญเติบโตอย่างรวดเร็ว"
      }
    ]
  },

  {
    id: "sop-ops-02-fridge",
    docCode: "SOP-OPS-002B",
    title: "คู่มือจัดตู้เย็น 2 ประตู (1°C - 4°C), กฎเหล็ก FIFO & เทมเพลตสติกเกอร์ Prep Label",
    category: "stage-2-prep",
    subCategory: "prep-fridge",
    version: "3.0",
    updatedAt: "2026-10-23 00:45",
    author: "ฝ่ายปฏิบัติการแฟรนไชส์ (Franchise Operations)",
    changeNotes: "เพิ่มผังจัดวางตู้เย็น 2 ประตู 4 ชั้น (ประตูซ้าย/ประตูขวา), จุดตรวจเน้นย้ำเฉพาะวัตถุดิบ และสติกเกอร์ Fast-Tick 12 ดวง/A4",
    versionHistory: [],
    targetRole: ["kitchen", "front", "admin"],
    prepTime: "ตรวจเช็กเปิด-ปิดร้าน 5 นาที",
    cookTime: "-",
    yield: "คุมอุณหภูมิ 1°C - 4°C",
    summary: "มาตรฐานการจัดวางวัตถุดิบในตู้แช่เย็น 2 ประตู แยกฝั่งหยิบใช้บ่อย (ประตูซ้าย) และฝั่งสต็อกสำรอง/ของหมักดอง (ประตูขวา) พร้อมวิธีดูแลต้นหอมซอย เห็ดเข็มทอง เต้าหู้หลอด กิมจิ ไชเท้าดอง และน้ำซุปกิมจิ",
    tags: ["ตู้เย็น", "กิมจิ", "ไชเท้าดอง", "ต้นหอม", "เห็ดเข็มทอง", "เต้าหู้หลอด", "FIFO", "สติกเกอร์"],
    specifications: [
      { label: "เกณฑ์อุณหภูมิมาตรฐาน", value: "1°C – 4°C (ห้ามเกิน 5°C เด็ดขาด)" },
      { label: "ระยะห่างช่องลม (Airflow)", value: "เว้นระยะห่างพัดลมแอร์และผนัง 5–10 ซม." },
      { label: "ประตูซ้าย (ชั้น 1-4)", value: "ฝั่งวัตถุดิบเตรียมเสร็จ (Mise en place) / หยิบใช้บ่อย" },
      { label: "ประตูขวา (ชั้น 1-4)", value: "ฝั่งเครื่องดื่ม / กล่อง Superlock / สต็อกสำรอง" }
    ],
    matrixTitle: "ผังจัดวางตู้เย็น 2 ประตู (Commercial Chiller 1°C – 4°C) แยกตามชั้นวาง",
    matrixHeaders: ["ระดับชั้นวาง", "🚪 ประตูซ้าย (ฝั่งวัตถุดิบเตรียม / ใช้บ่อย)", "🚪 ประตูขวา (ฝั่งสต็อกสำรอง / ของหมักดอง)", "วิธีจัดเก็บเพื่อยืดอายุและคงคุณภาพ"],
    matrixRows: [
      ["ชั้น 1 บนสุด", "กิมจิ & ไชเท้าดอง แพ็คถ้วยเล็ก + ถ้วยใหญ่ (เรียง FIFO)", "โค้กกระป๋อง (เรียงแถวแนวลึก ดึงเติมง่าย)", "ของแพ็คก่อนไว้หน้า ของใหม่ไว้หลัง ชั้นบนหยิบไวสุด ไม่ต้องก้ม"],
      ["ชั้น 2", "ต้นหอมซอย (ตะแกรงรองน้ำ) • หอมใหญ่หั่น • เห็ดเข็มทองหั่น (ซับทิชชู่)", "กิมจิ ใน Superlock • ไชเท้าดอง ใน Superlock", "กล่อง Food Grade ปิดสนิท ล็อกกลิ่นกิมจิไม่ให้ฟุ้งในตู้ เปลี่ยนทิชชู่ซับน้ำผักทุกเย็น"],
      ["ชั้น 3", "เต้าหู้หลอด (เรียงแนวราบ ≤2 ชั้น) • เห็ดเข็มทองแพ็คเดิม", "น้ำซุปกิมจิ (โถมีฝา/วาล์วเท) • ไชเท้าดองถุงซีลสำรอง", "เต้าหู้หลอดห้ามถูกทับ เห็ดแพ็คเลี่ยงลมแอร์เป่าตรงๆ น้ำซุปติดป้ายวันผลิต"],
      ["ชั้น 4 ล่างสุด", "ต้นหอมแบบต้น (ห่อกระดาษ) • หอมใหญ่เป็นลูก (ใส่ตะกร้าโปร่ง)", "กิมจิ แบบลัง (น้ำหนักเยอะ วางติดพื้นตู้)", "ของหนักวางล่างสุดตามหลัก Ergonomics ต้นหอมห้ามล้างก่อนแช่"]
    ],
    qualityChecks: [
      { topic: "ต้นหอมซอย & เห็ดเข็มทองหั่น", pass: "ใส่ตะแกรงรองก้นกล่องและเปลี่ยนกระดาษทิชชู่ซับน้ำทุกเย็น ผักแห้งกรอบไม่ช้ำ", fail: "ปล่อยให้น้ำผักนองก้นกล่องหรือทิชชู่เปียกชุ่มข้ามคืนจนผักเน่าเละและเห็ดเปลี่ยนเป็นสีน้ำตาล" },
      { topic: "กล่อง Superlock (กิมจิ / ไชเท้าดอง)", pass: "เช็ดคราบน้ำหมักดองรอบขอบยางซิลิโคนก่อนปิดล็อกทุกครั้ง กลิ่นไม่รั่วไหล", fail: "มีคราบน้ำกิมจิเลอะขอบยาง ทำให้ยางเสื่อมและกลิ่นฟุ้งกระจายไปติดวัตถุดิบอื่น" },
      { topic: "เต้าหู้หลอด & การระบายอากาศ", pass: "เต้าหู้หลอดวางนอนราบซ้อนไม่เกิน 2 ชั้น และเว้นระยะห่างช่องลมแอร์ 5–10 ซม.", fail: "วางกล่องหนักทับเต้าหู้หลอดจนแตก หรือยัดของแน่นติดพัดลมแอร์จนความเย็นไม่ทั่วถึง" }
    ],
    troubleshooting: [
      { problem: "เปิดกะเช้าพบอุณหภูมิหน้าตู้เย็นสูงเกิน 5°C", solution: "ให้ตรวจสอบขอบยางประตูว่าปิดสนิทหรือไม่ ตรวจว่ามีกล่องวางบังช่องพัดลมแอร์ด้านบนหรือไม่ และเช็กคอมเพรสเซอร์ทันที หากผิดปกติให้แจ้งหัวหน้ากะก่อนเริ่มตักวัตถุดิบใช้งาน" },
      { problem: "เห็ดเข็มทองหั่นแล้วคล้ำเป็นสีน้ำตาลและมีเมือกเร็ว", solution: "เกิดจากความชื้นสะสมในกล่อง ต้องรองทิชชู่ฟู้ดเกรดทั้งก้นกล่องและคลุมด้านบนก่อนปิดฝา และต้องเปลี่ยนทิชชู่แผ่นใหม่ทุกเย็นตอนปิดร้าน" }
    ],
    ingredients: [],
    steps: [
      {
        stepNumber: 1,
        title: "การจัดเรียงตามผังตู้เย็น 2 ประตู (ซ้าย: ใช้บ่อย / ขวา: สต็อกและของดอง)",
        description: "จัดวางวัตถุดิบแยกตามชั้น 1 ถึงชั้น 4 ตามแผนผังมาตรฐาน โดยวางของที่แพ็คพร้อมเสิร์ฟไว้ชั้น 1 บนสุด วางวัตถุดิบ Mise en place ไว้ชั้น 2 วางของบอบบางไว้ชั้น 3 และวางของหนัก (กิมจิแบบลัง / ผักสดทั้งต้น) ไว้ชั้น 4 ล่างสุดเสมอ",
        imageUrl: "assets/fridge-plan-diagram.png",
        videoUrl: "",
        cameraAngle: "Front Diagram (ผังหน้าตรง)",
        timerSeconds: 0,
        tip: "สามารถกดเข้าเมนู '🧊 ผังตู้เย็น 2 ประตู & สติกเกอร์' ที่แถบด้านซ้ายเพื่อเปิดดูผัง Interactive หรือสั่งพิมพ์สติกเกอร์ Fast-Tick 12 ดวง/หน้า A4 ได้ทันที"
      },
      {
        stepNumber: 2,
        title: "การติดป้ายสติกเกอร์ Food Prep Label (Day Labeling) ทุกกล่อง",
        description: "ทุกครั้งที่หั่นผักหรือเปิดถุงกิมจิ/ไชเท้าดอง/น้ำซุปกิมจิ ต้องติดป้าย FOOD PREP STICKER ระบุชนิดวัตถุดิบ วันที่หั่น/เปิด เวลา และวันหมดอายุด้วยปากกาเคมีกันน้ำ (Permanent Marker)",
        imageUrl: "",
        videoUrl: "",
        cameraAngle: "Close-up (ระยะใกล้)",
        timerSeconds: 0,
        tip: "แนะนำใช้สติกเกอร์ชนิดกันน้ำหรือละลายน้ำได้ (Water-soluble) เพื่อไม่ให้ทิ้งคราบกาวเหนียวติดกล่อง Superlock เวลาล้าง"
      }
    ]
  },

  {
    id: "sop-prep-thigh",
    docCode: "SOP-PREP-001",
    title: "SOP การเตรียมและหมัก สะโพกไก่ดิบ & น่องไก่ (Raw Thigh & Drumstick Marination)",
    category: "stage-2-prep",
    subCategory: "thigh",
    version: "2.0",
    updatedAt: "2026-10-22 10:00",
    author: "คุณเจ้าของร้าน / Owner",
    changeNotes: "เชื่อมโยงระบบคำนวณต้นทุน Food Cost และตาราง Pass/Fail",
    versionHistory: [],
    targetRole: ["kitchen", "admin"],
    prepTime: "20 นาที (พักหมัก 6 ชม.)",
    cookTime: "11:30 - 12:00 นาที",
    yield: "1.5 kg (10-12 ชิ้น)",
    sellingPrice: 450,
    summary: "มาตรฐานการล้างด้วยน้ำเย็นจัด ตัดแต่งมันส่วนเกิน บากเนื้อ 2 รอย และนวดหมักสะโพกไก่ดิบด้วยผงหมักสูตรเข้มข้น",
    tags: ["สะโพกไก่ดิบ", "น่องไก่", "การหมัก", "วัตถุดิบดิบ"],
    specifications: [
      { label: "วัตถุดิบหลัก", value: "สะโพกไก่สดตัดแต่ง 1.5 kg (10-12 ชิ้น)" },
      { label: "น้ำหนักต่อชิ้น", value: "130 - 150 กรัม" },
      { label: "สัดส่วนผงหมัก", value: "45g ผงหมัก + 150ml น้ำเย็นจัด" },
      { label: "อุณหภูมิแช่หมัก", value: "2°C - 4°C (หมัก 6 - 24 ชม.)" }
    ],
    qualityChecks: [
      { topic: "การบากเนื้อสะโพกไก่", pass: "บากด้านเนื้อใน 2 รอยขนาน ลึก 0.5 ซม. หนังไก่ด้านนอกตึงสวยไม่ขาด", fail: "บากลึกทะลุหนังทำให้หนังหลุดตอนทอด หรือไม่บากเลยทำให้น้ำหมักไม่เข้าเนื้อและข้างในไม่สุก" },
      { topic: "การนวดคลุกเคล้าน้ำหมัก", pass: "นวดวนครบ 3 นาทีจนน้ำหมักซึมเข้าเนื้อไก่หมด ไม่เหลือน้ำหมักเจิ่งก้นอ่าง", fail: "คลุกผ่านๆ ไม่ถึง 1 นาที น้ำหมักไม่เข้าเนื้อ รสชาติจืดชืด" }
    ],
    troubleshooting: [
      { problem: "หมักไก่เสร็จแล้วยังมีน้ำหมักเหลือค้างก้นอ่างจำนวนมาก", solution: "ตรวจสอบว่าซับน้ำออกจากเนื้อไก่หลังล้างดีแล้วหรือยัง และให้นวดวนยกพลิกชิ้นไก่ต่ออีก 1-2 นาทีในขณะที่ไก่ยังเย็นจัด" }
    ],
    ingredients: [
      { name: "สะโพกไก่สดตัดแต่ง (130-150g/ชิ้น)", amount: 1500, unit: "g" },
      { name: "ผงหมักสูตรเข้มข้น ผมขอทอด", amount: 45, unit: "g" },
      { name: "น้ำเย็นจัด", amount: 150, unit: "ml" }
    ],
    steps: [
      {
        stepNumber: 1,
        title: "การล้างด้วยน้ำเย็นจัดและตัดแต่งมันส่วนเกิน",
        description: "ล้างสะโพกไก่ด้วยน้ำเย็นจัดเพื่อรักษาอุณหภูมิเนื้อไก่ไม่ให้เกิน 5°C ใช้มีดตัดแต่งก้อนมันส่วนเกินและเศษเลือดบริเวณข้อกระดูกออก แล้วซับให้หมาด",
        imageUrl: SAMPLE_IMAGES.thighPrep,
        videoUrl: "",
        cameraAngle: "Top-down 90°",
        timerSeconds: 0,
        tip: "ห้ามใช้ไก่ที่อุณหภูมิเกิน 5°C ในการนำมาหมัก"
      },
      {
        stepNumber: 2,
        title: "การบากเนื้อไก่ด้านใน 2 รอยขนาน",
        description: "พลิกด้านเนื้อในขึ้น ใช้มีดคมบากเนื้อสะโพกด้านในเป็น 2 รอยขนาน ความลึกประมาณ 0.5 ซม. เพื่อให้ซึมซับผงหมักเข้าถึงแกนเนื้อและช่วยให้ทอดสุกเร็วทั่วถึง",
        imageUrl: SAMPLE_IMAGES.thighPrep,
        videoUrl: "",
        cameraAngle: "POV (มุมสายตาตัวเอง)",
        timerSeconds: 0,
        tip: "ระวังอย่าบากลึกจนหนังด้านนอกขาดหรือหลุดออกจากเนื้อ"
      },
      {
        stepNumber: 3,
        title: "การละลายผงหมักและนวดไก่ 3 นาที",
        description: "ผสมผงหมัก 45g กับน้ำเย็นจัด 150ml คนให้ละลายจนไม่เป็นก้อน เทใส่สะโพกไก่ 1.5 kg นวดคลุกเคล้าด้วยมือวนเป็นวงกลม 3 นาทีจนน้ำหมักซึมเข้าเนื้อไก่ทั้งหมด",
        imageUrl: SAMPLE_IMAGES.thighPrep,
        videoUrl: "",
        cameraAngle: "POV (มุมสายตาตัวเอง)",
        timerSeconds: 180,
        tip: "กดปุ่มจับเวลา 3 นาทีขณะนวดเพื่อให้ได้มาตรฐานเดียวกันทุกหม้อ"
      },
      {
        stepNumber: 4,
        title: "บรรจุกล่อง Food Grade ติดป้าย Use-by แช่เย็น 2-4°C",
        description: "เรียงไก่ใส่กล่อง Food Grade ปิดฝาซีลสนิท ติดป้าย Date-Time / Use-by Label แช่ตู้ชิลเลอร์ 2°C - 4°C ชั้นล่างสุด หมักอย่างน้อย 6 ชั่วโมงก่อนนำออกทอด",
        imageUrl: "",
        videoUrl: "",
        cameraAngle: "Side-Angle / Close-up",
        timerSeconds: 0,
        tip: "ยึดหลัก FIFO (หมักก่อน-ใช้ก่อน) อย่างเคร่งครัด"
      }
    ]
  },

  {
    id: "sop-prep-wing",
    docCode: "SOP-PREP-002",
    title: "SOP การเตรียมและหมัก ปีกไก่ดิบกระเทียมสด (Raw Wing Prep)",
    category: "stage-2-prep",
    subCategory: "thigh",
    version: "2.0",
    updatedAt: "2026-10-22 10:15",
    author: "คุณเจ้าของร้าน / Owner",
    changeNotes: "อัปเดตตารางคำนวณต้นทุนปีกไก่และเกณฑ์ Pass/Fail",
    versionHistory: [],
    targetRole: ["kitchen", "admin"],
    prepTime: "15 นาที (พักหมัก 4 ชม.)",
    cookTime: "08:00 - 08:30 นาที",
    yield: "1.0 kg (ประมาณ 18-20 ชิ้น)",
    sellingPrice: 380,
    summary: "การซับแห้ง บากปีกกลาง 1 รอย ผสมผงหมักกระเทียมสด และแช่หมักปีกไก่สำหรับทอดกรอบ",
    tags: ["ปีกไก่ดิบ", "วัตถุดิบดิบ", "การหมัก", "ปีกบน", "ปีกกลาง"],
    specifications: [
      { label: "ส่วนของปีก", value: "ปีกบน (Drumette) และ ปีกกลาง (Wingette)" },
      { label: "สัดส่วนผงหมัก", value: "30g ผงหมัก + 15g กระเทียมสับ + 100ml น้ำเย็น" },
      { label: "เวลาแช่หมัก", value: "4 - 12 ชั่วโมง ที่อุณหภูมิ 2°C - 4°C" }
    ],
    qualityChecks: [
      { topic: "การซับน้ำก่อนหมัก", pass: "ซับผิวปีกไก่จนแห้งสนิทก่อนเทน้ำหมัก ทำให้เครื่องหมักเกาะติดเนื้อเข้มข้น", fail: "ปีกไก่เปียกแฉะมีน้ำค้างก้นอ่าง ทำให้น้ำหมักเจือจางและแป้งหลุดตอนทอด" }
    ],
    troubleshooting: [
      { problem: "ทอดปีกกลางแล้วด้านในติดกระดูกยังมีสีแดง", solution: "เกิดจากการไม่ได้กรีดบากเนื้อปีกกลางระหว่างกระดูก 2 ชิ้นก่อนหมัก ให้ตรวจเช็กการบากปีกกลางทุกชิ้นก่อนนำลงหมัก" }
    ],
    ingredients: [
      { name: "ปีกไก่สด (ปีกบน+ปีกกลาง)", amount: 1000, unit: "g" },
      { name: "ผงหมักสูตรเข้มข้น ผมขอทอด", amount: 30, unit: "g" },
      { name: "กระเทียมสับละเอียด", amount: 15, unit: "g" },
      { name: "น้ำเย็นจัด", amount: 100, unit: "ml" }
    ],
    steps: [
      {
        stepNumber: 1,
        title: "การล้าง บากปีกกลาง และซับแห้งสนิท",
        description: "ล้างปีกไก่ด้วยน้ำสะอาดเย็นจัด ➔ ใช้ปลายมีดบากเนื้อปีกกลาง 1 รอยขนานระหว่างกระดูกคู่ ➔ ใช้กระดาษซับอาหารซับน้ำให้แห้งสนิท",
        imageUrl: SAMPLE_IMAGES.wingPrep,
        videoUrl: "",
        cameraAngle: "POV (มุมสายตาตัวเอง)",
        timerSeconds: 0,
        tip: "ปีกไก่ต้องแห้งสนิท เครื่องหมักจึงจะซึมเข้าเนื้อได้ดีที่สุด"
      },
      {
        stepNumber: 2,
        title: "การนวดหมักกระเทียมสด 2 นาที",
        description: "ผสมผงหมัก 30g + กระเทียมสับละเอียด 15g + น้ำเย็นจัด 100ml เทลงในปีกไก่ 1.0 kg นวดคลุกเคล้าให้เข้ากันเป็นเวลา 2 นาที",
        imageUrl: SAMPLE_IMAGES.wingPrep,
        videoUrl: "",
        cameraAngle: "POV (มุมสายตาตัวเอง)",
        timerSeconds: 120,
        tip: "กระเทียมสับละเอียดช่วยเพิ่มกลิ่นหอมเอกลักษณ์ของร้านผมขอทอด"
      },
      {
        stepNumber: 3,
        title: "การบรรจุซีลและแช่เย็น 2-4°C (4-12 ชม.)",
        description: "บรรจุใส่กล่องปิดฝาสนิท ติดป้าย Use-by Label แช่ตู้เย็น 2°C - 4°C เป็นเวลาอย่างน้อย 4 ชั่วโมงก่อนนำออกทอด",
        imageUrl: "",
        videoUrl: "",
        cameraAngle: "Side-Angle / Close-up",
        timerSeconds: 0,
        tip: "ห้ามหมักเกิน 24 ชั่วโมงเพราะเนื้อจะเค็มเกินเกณฑ์มาตรฐาน"
      }
    ]
  },

  // -------------------------------------------------------------------------
  // หมวดที่ 3: กระบวนการคลุกแป้งและทอด (Coating & Frying Station - SOP-OPS-003)
  // -------------------------------------------------------------------------
  {
    id: "sop-ops-003-coating-frying",
    docCode: "SOP-OPS-003",
    title: "SOP กระบวนการคลุกแป้งสร้างเกล็ด (Fold & Roll) และมาตรฐานการทอดไก่ (Frying Matrix)",
    category: "stage-3-frying",
    subCategory: "fry-dredging",
    version: "3.0",
    updatedAt: "2026-10-22 11:00",
    author: "หัวหน้าสเตชันทอด (Master Fry Cook)",
    changeNotes: "บรรจุเนื้อหา SOP-OPS-003 ครบ 5 ขั้นตอน + ตาราง Frying Matrix + เกณฑ์ Pass/Fail และ Troubleshooting",
    versionHistory: [],
    targetRole: ["kitchen", "admin"],
    prepTime: "2 นาที / แบทช์",
    cookTime: "4:30 - 12:00 นาที (ตามชิ้นส่วน)",
    yield: "1 แบทช์ (12-18 ชิ้น)",
    sellingPrice: 590,
    summary: "หัวใจสำคัญของร้าน! เทคนิคการคลุกแป้ง 2 รอบ (First Coat & Dip ➔ Fold and Roll 10-12 ครั้ง ➔ สะบัดข้อมือ 2 ครั้ง) ตารางควบคุมเวลา-อุณหภูมิการทอด และการวัดอุณหภูมิแกนกลาง ≥ 74°C",
    tags: ["คลุกแป้ง", "ทอดไก่", "Fold and Roll", "Frying Matrix", "74°C", "SOP-OPS-003"],
    specifications: [
      { label: "ความลึกแป้งในอ่าง", value: "ไม่น้อยกว่า 5 ซม. (ร่อนแป้งทุก 4 รอบ)" },
      { label: "จังหวะคลุกรอบ 1 & จุ่มน้ำ", value: "พลิกกดเบาๆ 7-10 ครั้ง ➔ จุ่มน้ำ 3-5 วิ (พักสะเด็ด 5 วิ)" },
      { label: "จังหวะตลบแป้งรอบ 2", value: "Fold & Roll 10-12 ครั้ง ➔ เคาะสะบัดข้อมือ 2 ครั้ง" },
      { label: "อุณหภูมิแกนกลางหลังทอด", value: "ต้อง ≥ 74°C (165°F) ทุกแบทช์" }
    ],
    matrixTitle: "🔥 ตารางมาตรฐานเวลาและอุณหภูมิการทอด (Frying Matrix Table - แปะข้างเตา)",
    matrixHeaders: ["ชิ้นส่วน / รายการ", "จำนวนสูงสุด/รอบ", "อุณหภูมิตั้งต้น", "เวลาทอด (นาที:วินาที)", "อุณหภูมิแกนกลาง", "สัญญาณบอกความสุก"],
    matrixRows: [
      ["สะโพก / น่องติดกระดูก", "ไม่เกิน 12 ชิ้น", "165°C", "11:30 - 12:00 นาที", "≥ 74°C (165°F)", "สีเหลืองทองสม่ำเสมอ ไม่มีรอยเลือดที่ข้อ"],
      ["อกไก่ / สันในชิ้นใหญ่", "ไม่เกิน 12 ชิ้น", "165°C", "09:30 - 10:00 นาที", "≥ 74°C (165°F)", "สัมผัสแน่นสปริงตัว ไม่นิ่มยวบ"],
      ["ปีกเต็ม / ปีกบน-กลาง", "ไม่เกิน 18 ชิ้น", "170°C", "08:00 - 08:30 นาที", "≥ 74°C (165°F)", "ผิวเกล็ดกรอบชัด ชิ้นไก่ลอยตัว"],
      ["ไก่ป๊อป / สันในไร้กระดูก", "ไม่เกิน 500 กรัม", "175°C", "04:00 - 04:30 นาที", "≥ 74°C (165°F)", "สีทองสว่าง เกล็ดแป้งกรอบเบา"]
    ],
    qualityChecks: [
      { topic: "ลักษณะภายนอก (Visual)", pass: "สีเหลืองทอง (Golden Brown) ทั่วทั้งชิ้น เกล็ดแป้งฟูบางสม่ำเสมอ", fail: "สีน้ำตาลไหม้, ด่างขาวเป็นหย่อมๆ หรือแป้งหลุดร่อนออกจากหนัง" },
      { topic: "ความสุกภายใน (Internal)", pass: "เนื้อฉ่ำ มีน้ำใสซึม เนื้อขาวสนิทถึงกระดูก วัดโพรบได้ ≥ 74°C", fail: "เนื้อใสอมชมพู, มีเส้นเลือดแดงสด, มีน้ำเลือดไหลที่ข้อกระดูก" },
      { topic: "การจัดการแป้ง (Flour Care)", pass: "ร่อนแป้งทุกๆ 4 รอบการคลุก เพื่อคัดเอาก้อนแป้งเปียกออก", fail: "แป้งจับตัวเป็นเม็ดแข็งก้อนใหญ่ ทำให้ผิวไก่แข็งกระด้างไม่เป็นเกล็ด" },
      { topic: "ปริมาณการลงทอด (Batch Load)", pass: "ทอดตามจำนวนชิ้นสูงสุดที่กำหนดในตาราง Frying Matrix", fail: "ทอดอัดแน่นเกินไป (Overload) ทำให้อุณหภูมิน้ำมันตกและไก่อมน้ำมัน" }
    ],
    troubleshooting: [
      { problem: "ทอดออกมาแล้วแป้งนิ่ม อมน้ำมัน ไม่กรอบ", solution: "ตรวจเช็ก 2 จุดทันที: 1) ลงไก่ต่อแบทช์เยอะเกินกำหนดหรือไม่ 2) หย่อนไก่ตอนไฟสถานะเตาทอดยังไม่ขึ้น READY (น้ำมันยังไม่ถึง 165°C) หรือไม่" },
      { problem: "แป้งหลุดร่อนออกจากตัวไก่ขณะทอด", solution: "เกิดจากตอนยกขึ้นจากอ่างจุ่มน้ำ พักสะเด็ดน้ำไม่ครบ 5 วินาที (น้ำยังหยดเป็นสาย) หรือคลุกแป้งเสร็จแล้ววางไก่ทิ้งไว้นานเกินไปก่อนลงหม้อทอด" },
      { problem: "เกล็ดแป้งแข็งกระด้างเป็นก้อน ไม่ฟูสวย", solution: "เกิดจากพนักงานออกแรงบีบหรือกดชิ้นไก่แรงเกินไปตอนคลุกแป้ง หรือไม่ได้ร่อนแป้งคัดก้อนแป้งเปียกออกตามรอบ (ต้องร่อนทุก 4 รอบการคลุก)" },
      { problem: "วัดอุณหภูมิแกนกลางหลังครบเวลาแล้วได้ต่ำกว่า 74°C", solution: "ให้นำไก่ลงทอดซ้ำทันทีอีก 2 นาที แล้ววัดอุณหภูมิใหม่จนแตะ ≥ 74°C พร้อมแจ้งผู้จัดการสาขาตรวจสอบการตั้งค่าเตาทอด" }
    ],
    ingredients: [
      { name: "สะโพกไก่สดตัดแต่ง (130-150g/ชิ้น)", amount: 1500, unit: "g" },
      { name: "แป้งชุบทอดเกล็ดกรอบพิเศษ", amount: 350, unit: "g" },
      { name: "น้ำมันปาล์มโอเลอินสำหรับทอด", amount: 250, unit: "ml" }
    ],
    steps: [
      {
        stepNumber: 1,
        title: "ตรวจเช็กอุณหภูมิเตาทอดและเตรียมสเตชัน (Pre-Check)",
        description: "ยืนยันหน้าจอเตาทอดแสดงอุณหภูมิเป้าหมายตามเมนู (165°C - 175°C) และไฟสถานะ READY ติดสว่าง ➔ ตรวจระดับน้ำมันให้อยู่ระหว่างขีด Min และ Max ➔ เตรียมแป้งคลุกในอ่างแห้งความลึกไม่น้อยกว่า 5 ซม. ➔ นำไก่หมักออกจากตู้ชิลเลอร์ (4°C) เฉพาะปริมาณที่จะลงทอดใน 1 แบทช์เท่านั้น",
        imageUrl: SAMPLE_IMAGES.opening,
        videoUrl: "",
        cameraAngle: "Side-Angle / Close-up",
        timerSeconds: 0,
        tip: "ห้ามนำไก่หมักออกมาวางพักทิ้งไว้นอกตู้เย็นล่วงหน้าเด็ดขาด"
      },
      {
        stepNumber: 2,
        title: "การคลุกแป้งรอบที่ 1 และจุ่มน้ำ (First Coat & Dip)",
        description: "คีบชิ้นไก่วางกระจายในอ่างแป้งแห้ง (จำกัดไม่เกิน 12-15 ชิ้นใหญ่ ห้ามวางซ้อนทับกัน) ➔ ใช้สองมือกวาดแป้งจากด้านข้างกลบชิ้นไก่ แล้วพลิกกดเบาๆ 7-10 ครั้ง ➔ นำชิ้นไก่ใส่ตะแกรงจุ่มลงในอ่างน้ำสะอาดอุณหภูมิห้อง 3-5 วินาที (ให้น้ำซึมทั่วแป้ง) ➔ ยกตะแกรงขึ้นพักสะเด็ดน้ำ 5 วินาที จนน้ำไม่หยดเป็นสาย",
        imageUrl: SAMPLE_IMAGES.dredging,
        videoUrl: "",
        cameraAngle: "Top-down 90°",
        timerSeconds: 10,
        tip: "สังเกตให้แป้งเปียกน้ำทั่วทั้งชิ้น ห้ามมีคราบแป้งแห้งด่างๆ เหลืออยู่"
      },
      {
        stepNumber: 3,
        title: "การคลุกแป้งรอบที่ 2 เพื่อสร้างเกล็ด (Flaking: Fold & Roll)",
        description: "เทชิ้นไก่จากตะแกรงลงในอ่างแป้งแห้งอีกครั้ง ➔ ใช้เทคนิค 'ตลบ-หมุนวน' (Fold and Roll): สอดมือสองข้างใต้กองแป้ง ยกขึ้นตลบกลบตัวไก่หมุนวน 10-12 ครั้ง (ห้ามบดหรือบีบเนื้อไก่เด็ดขาด) ➔ หยิบชิ้นไก่ขึ้นมา 2 มือ จับที่ข้อกระดูกหรือปลายชิ้น สะบัดเคาะข้อมือ 2 ครั้ง เพื่อให้แป้งส่วนเกินหลุดและเกล็ดแป้งฟูตัว",
        imageUrl: SAMPLE_IMAGES.dredging,
        videoUrl: "",
        cameraAngle: "POV (มุมสายตาตัวเอง)",
        timerSeconds: 30,
        tip: "ห้ามบีบชิ้นไก่แรงเกินไป จะทำให้แป้งแน่นแข็งไม่เกิดริ้วเกล็ดฟู"
      },
      {
        stepNumber: 4,
        title: "การหย่อนไก่ลงเตาทอด (Dropping Method) & จับเวลา",
        description: "หย่อนชิ้นไก่ทีละชิ้นลงอ่างน้ำมันอย่างรวดเร็วในทิศทาง 'หย่อนจากด้านใกล้ตัวออกไปด้านไกลตัว' เพื่อกันน้ำมันกระเด็นใส่ตัว (ลงครบทั้งแบทช์ภายในไม่เกิน 30-40 วินาที) ➔ กดปุ่มจับเวลา (Timer) ทันทีที่หย่อนชิ้นสุดท้ายเสร็จ ➔ เมื่อทอดไปครบ 1-2 นาที ให้ใช้กระชอนสแตนเลสเขย่าหรือแซะเบาๆ ใต้ก้นตะแกรง 1 ครั้ง เพื่อป้องกันไก่ติดก้นหม้อ",
        imageUrl: SAMPLE_IMAGES.dredging,
        videoUrl: "",
        cameraAngle: "POV (มุมสายตาตัวเอง)",
        timerSeconds: 700,
        tip: "สะโพก/น่อง 11:30-12:00 นาที (165°C) | ปีกไก่ 8:00-8:30 นาที (170°C) | ไก่ป๊อป 4:00-4:30 นาที (175°C)"
      },
      {
        stepNumber: 5,
        title: "การพักสะเด็ดน้ำมัน 30 วินาที และวัดอุณหภูมิแกนกลาง ≥ 74°C",
        description: "เมื่อนาฬิกาเตือนครบเวลา ยกตะแกรงทอดขึ้นแขวนพักเหนืออ่างน้ำมันและเขย่าสะเด็ดน้ำมัน 30 วินาที ➔ สุ่มหยิบชิ้นที่ใหญ่ที่สุดในแบทช์ 1 ชิ้น เสียบโพรบเทอร์โมมิเตอร์ที่แกนกลางเนื้อส่วนที่หนาที่สุดโดยไม่สัมผัสกระดูก: อุณหภูมิต้องได้ ≥ 74°C (165°F) ➔ เทไก่ลงถาดพักสแตนเลสและนำเข้าตู้โชว์อุ่น (Holding Cabinet 60°C) ทันที",
        imageUrl: SAMPLE_IMAGES.probeTemp,
        videoUrl: "",
        cameraAngle: "Side-Angle / Close-up",
        timerSeconds: 30,
        tip: "ช้อนเศษกากแป้ง (Skim Floaties) ที่ลอยเหนือน้ำมันออกทุกครั้งหลังยกไก่ขึ้น"
      }
    ]
  },

  // -------------------------------------------------------------------------
  // หมวดที่ 4: การจัดเก็บ การประกอบเมนู และแพ็กเกจจิ้ง (Holding & Packing - SOP-OPS-004)
  // -------------------------------------------------------------------------
  {
    id: "sop-ops-004-holding-packing",
    docCode: "SOP-OPS-004",
    title: "SOP การคุมอายุอาหารในตู้โชว์ การคลุกซอส/เขย่าผง และมาตรฐานแพ็กเกจจิ้ง (Packing Station)",
    category: "stage-4-packing",
    subCategory: "takeaway-delivery",
    version: "2.0",
    updatedAt: "2026-10-22 11:30",
    author: "ฝ่ายมาตรฐานแฟรนไชส์ ผมขอทอด",
    changeNotes: "รวมตาราง Holding Time Limit, สูตรซอส/ผงเขย่า, Packaging Matrix และผังโต๊ะ One-Way Flow",
    versionHistory: [],
    targetRole: ["kitchen", "front", "admin"],
    prepTime: "1 - 2 นาที / ออร์เดอร์",
    cookTime: "-",
    yield: "1 เซ็ตพร้อมส่ง",
    sellingPrice: 189,
    summary: "3 กฎเหล็กป้องกันลูกค้าเคลม ตารางควบคุมอายุอาหารในตู้ Holding Cabinet สูตรอัตราส่วนซอสทา/ผงเขย่า และการเลือกกล่องเปิดรูระบายไอน้ำไม่ให้ไก่แฉะ",
    tags: ["ตู้โชว์", "Holding Time", "คลุกซอส", "เขย่าผง", "แพ็กเกจจิ้ง", "SOP-OPS-004"],
    specifications: [
      { label: "อายุสะโพก/น่องในตู้โชว์ (60-65°C)", value: "สูงสุดไม่เกิน 45 นาที" },
      { label: "อายุสันใน/วิงส์ / ไก่ป๊อป", value: "วิงส์ 30 นาที / ไก่ป๊อป 20 นาที" },
      { label: "อายุเฟรนช์ฟรายส์", value: "สูงสุดไม่เกิน 15 นาที (ใต้โคมไฟความร้อน)" },
      { label: "อัตราส่วนซอสเคลือบ", value: "3-4 ชิ้น: 30ml (1 ทัพพี) / 6 ชิ้น: 60ml (2 ทัพพี)" }
    ],
    matrixTitle: "⏳ ตารางควบคุมอายุอาหารในตู้โชว์ (Holding Time Limit) & การเลือกบรรจุภัณฑ์",
    matrixHeaders: ["เมนู / ขนาดเซ็ต", "อุณหภูมิเก็บ / ภาชนะ", "เวลาสูงสุด / รูระบายอากาศ", "เกณฑ์คัดทิ้ง / เครื่องเคียงมาตรฐาน"],
    matrixRows: [
      ["🍗 ไก่ทอดติดกระดูก (น่อง/สะโพก)", "ตู้โชว์ 60°C - 65°C", "สูงสุด 45 นาที", "เกินเวลา/หนังเหี่ยว ➔ คัดทิ้งลง Waste Log ทันที"],
      ["🍗 ไก่ไม่มีกระดูก / สันใน / วิงส์", "ตู้โชว์ 60°C - 65°C", "สูงสุด 30 นาที", "เนื้อเริ่มแห้งกระด้าง สีเข้ม ➔ คัดทิ้งลง Waste Log"],
      ["🍿 ไก่ป๊อป / 🍟 เฟรนช์ฟรายส์", "ตู้ 60°C / โคมไฟความร้อน", "ป๊อป 20 นาที / ฟรายส์ 15 นาที", "แป้งเหนียว/เหี่ยวนิ่ม ➔ ห้ามส่งให้ลูกค้าเด็ดขาด"],
      ["📦 เซ็ตเดี่ยว (1-2 ชิ้น)", "ซองกันน้ำมัน หรือ กล่อง S", "พับปากซองหลวมๆ ระบายไอน้ำ", "ซอสจิ้ม 1 ถ้วย + ทิชชู่ 2 แผ่น"],
      ["📦 เซ็ตกลาง (4-6 ชิ้น)", "กล่องกระดาษล็อกไซส์ M", "กดเปิดรูระบายอากาศ 2 ข้างเสมอ", "ซอสจิ้ม 2 ถ้วย + ถุงมือพลาสติก 2 คู่"],
      ["🪣 บักเก็ตครอบครัว (8+ ชิ้น)", "ถัง Bucket กระดาษ", "ฝาเจาะรูระบายไอน้ำ", "ซอสจิ้ม 3-4 ถ้วย + ถุงมือพลาสติก 4 คู่"]
    ],
    qualityChecks: [
      { topic: "การคลุกซอสและเขย่าผง", pass: "คลุกซอสเร็วภายใน 10 วินาทีขณะไก่ร้อน เคลือบเงาสวย / เขย่าผงในโถปิดฝา 5 ครั้ง พัก 2 วิ เขย่าซ้ำ 3 ครั้ง", fail: "แช่ไก่ค้างไว้ในกระทะซอสจนแป้งเปื่อยหลุด หรือเทผงโรยหน้ากล่องเฉยๆ จนผงกระจุกตัวเค็มเป็นหย่อม" },
      { topic: "การบรรจุกล่องและแยกอุณหภูมิ", pass: "เปิดรูระบายไอน้ำข้างกล่องทุกใบ และแยกเครื่องดื่มเย็นใส่ถุงคนละใบกับกล่องไก่ร้อนเสมอ", fail: "ปิดฝากล่องทึบสนิททันทีจนไอน้ำควบแน่นทำให้ไก่แฉะ หรือวางน้ำอัดลมเย็นจัดทับกล่องไก่ร้อน" }
    ],
    troubleshooting: [
      { problem: "ลูกค้ารีวิวว่าไก่ไปถึงบ้านแล้วแป้งนิ่มแฉะ", solution: "ตรวจสอบว่าพนักงานกดเปิดรูระบายอากาศ 2 ข้างของกล่องไซส์ M/Bucket หรือยัง และห้ามมัดปากถุงพลาสติกทึบขณะรอไรเดอร์มารับ" },
      { problem: "ลืมใส่ซอสจิ้มหรือถุงมือให้ลูกค้าเดลิเวอรี", solution: "ต้องทำตาม 4 ขั้นตอน Double-Check: 1) อ่านบิล POS 2) วางเครื่องเคียง (ซอส/ถุงมือ/ทิชชู่) ลงถุงก่อนวางกล่องไก่ 3) แยกถุงของเย็น 4) ติดสติกเกอร์ Tamper Seal พร้อมเขียนเลข Order ID" }
    ],
    ingredients: [
      { name: "สะโพกไก่สดตัดแต่ง (130-150g/ชิ้น)", amount: 550, unit: "g" },
      { name: "ซอสเกาหลีเผ็ดหวาน (Signature)", amount: 60, unit: "g" },
      { name: "กล่องกระดาษไซส์ M (เจาะรูระบาย) + ถุงมือ 2 คู่", amount: 1, unit: "ชุด" }
    ],
    steps: [
      {
        stepNumber: 1,
        title: "การคลุกซอส (Glazed Chicken) & การเขย่าผง (Seasoning Shake)",
        description: "【ไก่คลุกซอส】: ไก่ 3-4 ชิ้น ใช้ซอส 1 ทัพพี (30 ml) / ไก่ 6 ชิ้น ใช้ซอส 2 ทัพพี (60 ml) ทาหรือสะบัดคลุกในอ่างสแตนเลสให้เร็วภายใน 10 วินาที (ห้ามแช่ไก่ค้างในซอส) \n【ไก่เขย่าผง】: ไก่ป๊อป 1 ที่ ใช้ผงปรุง 1 ช้อนตวง (5g) / เฟรนช์ฟรายส์ ใช้ผงปรุง 1.5 ช้อน (7.5g) เขย่าในโถปิดฝา 5 ครั้ง พัก 2 วินาที แล้วเขย่าซ้ำอีก 3 ครั้ง",
        imageUrl: SAMPLE_IMAGES.sauceCoating,
        videoUrl: "",
        cameraAngle: "POV (มุมสายตาตัวเอง)",
        timerSeconds: 10,
        tip: "ต้องคลุกซอสหรือเขย่าผงทันทีขณะที่ไก่ยังร้อนจัด ซอสและผงจึงจะเกาะติดผิวแป้ง"
      },
      {
        stepNumber: 2,
        title: "การเลือกบรรจุภัณฑ์และเปิดรูระบายไอน้ำ (Packaging Matrix)",
        description: "เลือกกล่องตามขนาดเซ็ต (เซ็ตเดี่ยว 1-2 ชิ้น: ซองกันน้ำมัน/กล่อง S | เซ็ตกลาง 4-6 ชิ้น: กล่อง M เปิดรูระบาย 2 ข้าง | บักเก็ต 8+ ชิ้น: ถัง Bucket ฝาเจาะรู) ➔ เรียงชิ้นไก่โดยไม่กดทับกันจนแบน",
        imageUrl: SAMPLE_IMAGES.packing,
        videoUrl: "",
        cameraAngle: "Top-down 90°",
        timerSeconds: 0,
        tip: "กฎเหล็กข้อที่ 1: ห้ามปิดฝากล่องทึบสนิทโดยไม่เปิดรูระบายไอน้ำเด็ดขาด"
      },
      {
        stepNumber: 3,
        title: "ลำดับตรวจเช็ก 4 ขั้นตอนก่อนส่งมอบ (Double-Check & Tamper Seal)",
        description: "[1. อ่านบิล POS] เช็กรสชาติซอสและจำนวนชิ้น ➔ [2. ตรวจเครื่องเคียง] ใส่ซอสจิ้ม ช้อนส้อม ถุงมือ ทิชชู่ตามเกณฑ์ ➔ [3. แยกอุณหภูมิ] ห้ามวางเครื่องดื่มเย็นในถุงเดียวกับกล่องไก่ร้อน ➔ [4. ปิดซีลถุง] ติดสติกเกอร์กันแกะ (Tamper-evident Seal) และเขียนเลข Order ID ตัวใหญ่ชัดเจน",
        imageUrl: SAMPLE_IMAGES.packing,
        videoUrl: "",
        cameraAngle: "Top-down 90°",
        timerSeconds: 0,
        tip: "วางอุปกรณ์บนโต๊ะแพ็กแบบ One-Way Flow (ซ้ายไปขวา): ตู้โชว์ ➔ โซนคลุกซอส ➔ พื้นที่จัดเซ็ต ➔ จุดส่งมอบไรเดอร์"
      }
    ]
  },

  // -------------------------------------------------------------------------
  // หมวดที่ 5: การบริการหน้าร้านและการจัดส่ง (Front of House & Delivery - SOP-OPS-005)
  // -------------------------------------------------------------------------
  {
    id: "sop-ops-005-delivery-claim",
    docCode: "SOP-OPS-005",
    title: "SOP การตั้งค่า Prep Time 4 แอป การรับมือไรเดอร์มาช้า และขั้นตอนเคลมค่าอาหาร 100%",
    category: "stage-5-delivery",
    subCategory: "deliv-claim",
    version: "2.0",
    updatedAt: "2026-10-22 12:00",
    author: "ฝ่ายบริหารจัดการเดลิเวอรี ผมขอทอด",
    changeNotes: "รวมสูตรคำนวณ Base Prep Time 4 แอป, ไทม์ไลน์ไรเดอร์มาช้า 0-15-30-45 นาที และกฎการเคลมอาหาร 3 รูปหลักฐาน",
    versionHistory: [],
    targetRole: ["front", "kitchen", "admin"],
    prepTime: "Off-Peak 18-20 นาที / Peak 25-30 นาที",
    cookTime: "-",
    yield: "เคลมได้ 100%",
    sellingPrice: 0,
    summary: "กลยุทธ์การตั้งค่าเวลาเตรียมอาหาร (Prep Time) บน GrabFood, LINE MAN, ShopeeFood, Robinhood ขั้นตอนจัดการเมื่อไรเดอร์มารับช้า และการถ่ายรูปหลักฐาน 3 มุมเพื่อเคลมเงินชดเชย 100%",
    tags: ["เดลิเวอรี", "Prep Time", "ไรเดอร์มาช้า", "เคลมอาหาร", "Grab", "LINEMAN", "ShopeeFood"],
    specifications: [
      { label: "สูตรคำนวณ Base Prep Time", value: "รับบิล/คลุก (3น.) + ทอด (12น.) + พัก/แพ็ก (3น.) = 18-20 นาที" },
      { label: "Prep Time ชั่วโมงเร่งด่วน (Peak)", value: "11:30-13:30 และ 17:30-19:30 ปรับเป็น 25 - 30 นาที" },
      { label: "จุดวิกฤตรอไรเดอร์เกิน 30 นาที", value: "คัดทิ้งลง Waste Log และทอดชุดใหม่ให้ไรเดอร์ (4-8 นาที)" },
      { label: "กฎเหล็กการเคลมเดลิเวอรี", value: "กด 'อาหารพร้อมส่ง' ทันทีที่ทำเสร็จ + ห้ามร้านกดยกเลิกเองเด็ดขาด" }
    ],
    matrixTitle: "🛵 ตารางการตั้งค่า Prep Time 4 แอป & เกณฑ์การพิจารณาเคลมค่าอาหาร",
    matrixHeaders: ["แพลตฟอร์ม / กรณีที่เกิด", "วิธีตั้งค่า / สถานะเคลม", "เทคนิคสำคัญ / เงื่อนไขที่ต้องระวัง"],
    matrixRows: [
      ["🟢 GrabMerchant (GrabFood)", "ตั้งค่าเริ่มต้น 20 นาที", "ช่วงเที่ยงออร์เดอร์ล้น ให้กดปุ่ม 'โหมดร้านกำลังยุ่ง (Busy Mode)' ระบบจะบวกเวลาให้อัตโนมัติ +10 ถึง +15 นาที"],
      ["🟢 Wongnai Merchant (LINE MAN)", "ตั้งค่าพื้นฐาน 20 - 25 นาที", "เมื่อมีบักเก็ตใหญ่เข้ามา ตอนกดรับออร์เดอร์ให้กด 'ปรับเวลาเตรียมอาหารเฉพาะออร์เดอร์' เพิ่มเป็น 30 นาทีทันที"],
      ["🟠 Shopee Partner (ShopeeFood)", "ตั้งค่าเริ่มต้น 20 นาที", "หากเปิด Flash Sale ให้ปรับเวลาล่วงหน้าเป็น 30 นาที เพราะ Shopee มักจ่ายงานให้ไรเดอร์ที่อยู่ใกล้มาก"],
      ["🟣 Robinhood Merchant", "ตั้งค่าเริ่มต้น 20 - 25 นาที", "ห้ามตั้งสั้นเกินไป เพราะระบบจะปล่อยงานหาไรเดอร์ตามเวลาที่ตั้งไว้อย่างเคร่งครัด"],
      ["✅ ระบบหาไรเดอร์ไม่ได้ / ลูกค้ายกเลิก", "เคลมได้ 100%", "ร้านต้องกดปุ่ม 'อาหารพร้อมส่ง (Food Ready)' ก่อนที่ระบบจะตัดยกเลิก และมีรูปถ่ายอาหารคู่บิล"],
      ["❌ ร้านเผลอกดยกเลิกออร์เดอร์เอง", "เคลมไม่ได้ 0%", "ห้ามร้านกดยกเลิกออร์เดอร์เองเด็ดขาด! ต้องให้ระบบหรือ Support เป็นฝ่ายตัดยกเลิกเท่านั้น"]
    ],
    qualityChecks: [
      { topic: "จังหวะการกดปุ่ม 'อาหารพร้อมส่ง' (Food Ready)", pass: "กดเมื่อไก่วางบนถาดพักพร้อมแพ็ก (ก่อนแพ็กลงถุง 1-2 นาที) เพื่อให้มีประวัติในระบบและไรเดอร์มาถึงพอดี", fail: "กด 'อาหารพร้อมแล้ว' ทันทีที่รับบิล (ทำให้ไรเดอร์รีบมาแล้วยืนโมโหหน้าร้าน + AI บีบเวลาเตรียมร้านให้สั้นลง) หรือลืมกดจนออร์เดอร์ถูกยกเลิก (ทำให้เคลมเงินไม่ได้)" },
      { topic: "ภาพถ่ายหลักฐานการเคลม 3 รูปมาตรฐาน", pass: "รูปที่ 1: อาหารวางคู่ใบเสร็จเห็นเลข Order ID ชัดเจน + รูปที่ 2: แคปหน้าจอแอป Merchant + รูปที่ 3: ภาพอาหารคัดทิ้งลงถัง Waste", fail: "ถ่ายเฉพาะกล่องอาหารแต่ไม่มีใบเสร็จวางคู่กันในเฟรมเดียว ทำให้แพลตฟอร์มปฏิเสธการจ่ายเงินชดเชย" }
    ],
    troubleshooting: [
      { problem: "ไรเดอร์ยังไม่มารับอาหารเกิน 15 นาทีหลังทำเสร็จ", solution: "นาทีที่ 0-15: เก็บกล่องไก่ที่เปิดรูระบายไว้ในตู้ Holding 60°C (ห้ามใส่ถุงมัดปากเด็ดขาด) ➔ นาทีที่ 15-20: กดปุ่ม 'รายงานคนขับมาช้า' หรือโทรตามไรเดอร์ ➔ นาทีที่ 30 ขึ้นไป: หากไก่นิ่มหมดอายุ ให้บันทึก Waste Log และเมื่อไรเดอร์มาถึงให้แจ้งสุภาพว่า 'ทางร้านขอเวลาลงทอดชุดใหม่ให้ร้อนๆ สักครู่ 4-8 นาที เพื่อรักษาคุณภาพอาหารให้ลูกค้าค่ะ'" }
    ],
    ingredients: [],
    steps: [
      {
        stepNumber: 1,
        title: "การควบคุมคุณภาพอาหารตามไทม์ไลน์เมื่อไรเดอร์มารับช้า (0 ➔ 15 ➔ 30 ➔ 45 นาที)",
        description: "• นาทีที่ 0-15: บรรจุไก่ลงกล่องที่เปิดรูระบายไอน้ำ วางไว้ในตู้ Holding Cabinet (60°C) ห้ามนำลงถุงหิ้วหรือซีลสติกเกอร์เด็ดขาด\n• นาทีที่ 15-20: ตรวจสอบหน้าจอ POS/Merchant App กดรายงานคนขับมาช้าหรือโทรติดต่อไรเดอร์\n• นาทีที่ 30-45: หากเกิน 30 นาทีแล้วไก่หมดอายุความกรอบ ให้คัดทิ้งลง Waste Log และทอดชุดใหม่ให้ไรเดอร์",
        imageUrl: SAMPLE_IMAGES.deliveryClaim,
        videoUrl: "",
        cameraAngle: "Side-Angle / Close-up",
        timerSeconds: 900,
        tip: "ห้ามส่งไก่ที่วางรอนานเกิน 30-45 นาทีจนนิ่มชืดให้ไรเดอร์เด็ดขาด เพราะจะทำให้ร้านเสียคะแนนรีวิว 1 ดาว"
      },
      {
        stepNumber: 2,
        title: "กฎเหล็กข้อที่ 1 ของการเคลม: กดสถานะ 'อาหารพร้อมส่ง' (Food Ready) ทันทีที่ทำเสร็จ",
        description: "เมื่อทอดไก่และจัดลงกล่องเสร็จ ให้กดปุ่ม 'อาหารเสร็จแล้ว / พร้อมส่ง' บนเครื่อง Merchant App ทันที และห้ามกด 'ยกเลิกออร์เดอร์' จากฝั่งร้านค้าเองเด็ดขาด เพราะแพลตฟอร์มจะจ่ายค่าชดเชยก็ต่อเมื่อระบบบันทึกว่าร้านเตรียมอาหารเสร็จสมบูรณ์แล้วเท่านั้น",
        imageUrl: SAMPLE_IMAGES.deliveryClaim,
        videoUrl: "",
        cameraAngle: "POV (มุมสายตาตัวเอง)",
        timerSeconds: 0,
        tip: "เวลากดที่เหมาะสมที่สุดคือตอนไก่วางบนถาดพักพร้อมแพ็ก (ก่อนแพ็กลงถุง 1-2 นาที)"
      },
      {
        stepNumber: 3,
        title: "ถ่ายภาพเก็บหลักฐานชุดมาตรฐาน 3 รูป และส่งเคลมภายใน 24 ชม.",
        description: "1) รูปที่ 1 (ภาพอาหารคู่บิล): ถ่ายกล่องอาหารที่แพ็กเสร็จวางคู่กับสลิปใบเสร็จในเฟรมเดียวกัน เห็น Order ID, วันที่, เวลา และรายการชัดเจน\n2) รูปที่ 2 (ภาพหน้าจอระบบ): แคปหน้าจอแอป Merchant ที่แสดงเวลารอไรเดอร์หรือสถานะยกเลิก\n3) รูปที่ 3 (ภาพอาหารคัดทิ้ง): ภาพตอนนำอาหารลงถัง Waste ➔ จากนั้นนำข้อมูลไปกรอกในเมนู '🛵 บันทึกเคลมเดลิเวอรี' บนเว็บนี้เพื่อก๊อปปี้สคริปต์ส่ง Help Center ทันที",
        imageUrl: SAMPLE_IMAGES.deliveryClaim,
        videoUrl: "",
        cameraAngle: "Top-down 90°",
        timerSeconds: 0,
        tip: "ต้องยื่นเรื่องเคลมผ่าน Help Center ภายใน 24 ชม. และบันทึกลง Delivery Claim Log เพื่อตรวจยอดเงินโอนคืนใน 3-7 วันทำการ"
      }
    ]
  },

  // -------------------------------------------------------------------------
  // หมวดที่ 6: การจัดการน้ำมันและบำรุงรักษาอุปกรณ์ (Oil & Equipment Care - SOP-OPS-006)
  // -------------------------------------------------------------------------
  {
    id: "sop-ops-006-oil-care",
    docCode: "SOP-OPS-006",
    title: "SOP การกรองน้ำมันระหว่างวัน การวัดค่าเสื่อมน้ำมัน (TPM ≤ 25%) และการต้มล้างหม้อทอด (Boil-out)",
    category: "stage-6-oil",
    subCategory: "oil-filter",
    version: "2.0",
    updatedAt: "2026-10-22 12:30",
    author: "ฝ่ายวิศวกรรมครัวและควบคุมคุณภาพ",
    changeNotes: "กำหนดรอบช้อนกากแป้ง กรองน้ำมันทุก 4-5 รอบ เกณฑ์ TPM 25% และขั้นตอน Boil-out",
    versionHistory: [],
    targetRole: ["kitchen", "admin"],
    prepTime: "15 - 30 นาที",
    cookTime: "-",
    yield: "ยืดอายุน้ำมัน 40%",
    sellingPrice: 0,
    summary: "มาตรฐานการช้อนเศษแป้งหลังยกไก่ขึ้น การกรองกากแป้งก้นหม้อทุกๆ 4-5 รอบทอด การใช้แถบวัดค่ากรดไขมันอิสระ (TPM Test Strip) และขั้นตอนการต้มล้างคราบไขมันฝังแน่น (Boil-out Procedure)",
    tags: ["น้ำมันทอด", "กรองน้ำมัน", "TPM", "Boil-out", "ล้างเตาทอด"],
    specifications: [
      { label: "การช้อนเศษแป้งลอย (Skim)", value: "ช้อนออกทุกครั้งหลังยกตะแกรงไก่ขึ้น" },
      { label: "รอบการกรองน้ำมัน (Filtration)", value: "ทุกๆ 4 - 5 รอบการทอด (หรือพักเที่ยง/บ่าย)" },
      { label: "ค่า TPM สูงสุดที่ยอมรับได้", value: "ไม่เกิน 25% (หากเกิน 25% ต้องเปลี่ยนถ่ายทันที)" },
      { label: "สัญญาณน้ำมันเสื่อมสภาพ", value: "สีดำคล้ำ มีกลิ่นหืน หรือเกิดควันขาวที่อุณหภูมิ < 170°C" }
    ],
    qualityChecks: [
      { topic: "คุณภาพน้ำมันระหว่างวัน", pass: "ช้อนกากแป้งสม่ำเสมอ กรองน้ำมันตามรอบ ค่า TPM ต่ำกว่า 25% สีไก่ทอดออกมาเหลืองทองสวย", fail: "ปล่อยให้กากแป้งไหม้ดำสะสมก้นหม้อ ค่า TPM เกิน 25% ทำให้ไก่มีสีคล้ำดำและมีกลิ่นหืนน้ำมันเก่า" }
    ],
    troubleshooting: [
      { problem: "น้ำมันเกิดควันสีขาวพุ่งขึ้นทั้งที่อุณหภูมิยังไม่ถึง 170°C", solution: "เป็นสัญญาณว่าจุดเกิดควัน (Smoke Point) ลดต่ำลงเนื่องจากน้ำมันเสื่อมสภาพเกินขีดจำกัด ให้สั่งถ่ายน้ำมันทิ้ง ล้างหม้อทอด และเปลี่ยนน้ำมันใหม่ทันที" }
    ],
    ingredients: [],
    steps: [
      {
        stepNumber: 1,
        title: "6.1 การช้อนกากแป้งและกรองน้ำมันระหว่างวัน (Oil Filtration)",
        description: "ใช้กระชอนตาถี่ช้อนเศษแป้งที่ลอยเหนือผิวน้ำมัน (Skim Floaties) ออกทุกครั้งหลังยกไก่ขึ้น ➔ ทุกๆ 4-5 รอบการทอด (และช่วงบ่ายหลัง Peak เที่ยง) ให้ทำการกรองกากแป้งออกจากก้นหม้อทอด เพื่อป้องกันกากแป้งไหม้สะสมจนทำให้น้ำมันดำและขม",
        imageUrl: SAMPLE_IMAGES.oilCare,
        videoUrl: "",
        cameraAngle: "Side-Angle / Close-up",
        timerSeconds: 0,
        tip: "การกรองกากแป้งตรงเวลาช่วยลดต้นทุนค่าน้ำมันของสาขาได้มากกว่า 30-40%"
      },
      {
        stepNumber: 2,
        title: "6.2 การตรวจวัดค่า TPM ด้วยแถบทดสอบ (TPM Test Strip) และบันทึกผล",
        description: "จุ่มแถบทดสอบกรดไขมันอิสระ (TPM Strip) หรือเครื่องวัดดิจิทัลลงในน้ำมันร้อนตามคู่มือ ➔ อ่านค่าเปอร์เซ็นต์ TPM และบันทึกลงในเมนู '📋 บันทึกอุณหภูมิ & น้ำมันรายวัน' ➔ หากค่า TPM เกิน 25% หรือน้ำมันมีกลิ่นหืน/ควันขาว ให้สั่งเปลี่ยนถ่ายน้ำมันใหม่ทันที",
        imageUrl: SAMPLE_IMAGES.oilCare,
        videoUrl: "",
        cameraAngle: "Side-Angle / Close-up",
        timerSeconds: 60,
        tip: "ห้ามนำน้ำมันใหม่ไปผสมปนกับน้ำมันเก่าที่ค่า TPM เกิน 25% แล้วเด็ดขาด"
      },
      {
        stepNumber: 3,
        title: "6.3 ขั้นตอนการต้มล้างเครื่องทอด (Boil-out Procedure)",
        description: "ปิดเครื่องทอดและปล่อยให้น้ำมันเย็นลงต่ำกว่า 60°C จึงถ่ายน้ำมันเก่าออก ➔ เติมน้ำสะอาดจนถึงระดับขีดน้ำมัน ผสมน้ำยาขจัดคราบไขมันสำหรับ Boil-out โดยเฉพาะ ➔ เปิดเตาต้มที่อุณหภูมิประมาณ 90°C - 95°C นาน 15-20 นาที ใช้แปรงทนความร้อนขัดคราบคาร์บอนที่เกาะท่อความร้อน ➔ ปล่อยน้ำทิ้ง ล้างด้วยน้ำสะอาดผสมน้ำส้มสายชูเจือจางเพื่อล้างฤทธิ์ด่าง แล้วเช็ดหม้อทอดให้แห้งสนิท 100% ก่อนเติมน้ำมันใหม่",
        imageUrl: "",
        videoUrl: "",
        cameraAngle: "Top-down 90°",
        timerSeconds: 1200,
        tip: "ต้องเช็ดหม้อทอดให้แห้งสนิทไร้หยดน้ำค้างก่อนเทน้ำมันใหม่ เพื่อป้องกันน้ำมันปะทุกระเด็น"
      }
    ]
  },

  // -------------------------------------------------------------------------
  // หมวดที่ 7: ขั้นตอนการปิดร้าน (Closing Procedures - SOP-OPS-007)
  // -------------------------------------------------------------------------
  {
    id: "sop-ops-007-closing",
    docCode: "SOP-OPS-007",
    title: "SOP ขั้นตอนการปิดร้าน การเคลียร์สต็อก Waste Log การทำ Deep Clean และตักไขมัน",
    category: "stage-7-closing",
    subCategory: "close-waste",
    version: "2.0",
    updatedAt: "2026-10-22 13:00",
    author: "ฝ่ายมาตรฐานแฟรนไชส์ ผมขอทอด",
    changeNotes: "กำหนดขั้นตอนปิดร้าน 3 ส่วน: เคลียร์สต็อก/Waste Log, Deep Clean/ดักไขมัน และปิดระบบแก๊ส-ไฟ-POS",
    versionHistory: [],
    targetRole: ["kitchen", "front", "admin"],
    prepTime: "45 นาที หลังปิดรับออร์เดอร์",
    cookTime: "-",
    yield: "ปิดร้านปลอดภัย 100%",
    sellingPrice: 0,
    summary: "ขั้นตอนการเคลียร์สต็อกวัตถุดิบหมัก บันทึกรายการไก่เหลือทิ้ง (Waste Log) เพื่อคำนวณ Food Cost การล้าง Deep Clean ถาดดักไขมัน และการปิดวาล์วแก๊ส/เบรกเกอร์/สรุปยอดขาย POS",
    tags: ["ปิดร้าน", "Waste Log", "Deep Clean", "บ่อดักไขมัน", "ปิดแก๊ส"],
    specifications: [
      { label: "การจัดการไก่ทอดเหลือในตู้โชว์", value: "นับจำนวนชิ้น บันทึกใน Waste Log ห้ามนำกลับมาขายวันถัดไป" },
      { label: "การเก็บวัตถุดิบหมัก", value: "ซีลปิดฝามิดชิด เช็กป้าย Use-by เก็บเข้าตู้ชิลเลอร์ 2-4°C" },
      { label: "ความสะอาดจุดวิกฤต", value: "ซอกเตาทอด, ใต้โต๊ะสแตนเลส, รางระบายน้ำ, ถาดดักไขมัน" },
      { label: "ความปลอดภัยก่อนล็อกร้าน", value: "ปิดวาล์วแก๊สหลัก + ปิดเบรกเกอร์เตาทอด + เปิดกล้อง CCTV" }
    ],
    qualityChecks: [
      { topic: "ความสะอาดถาดดักไขมันและพื้นครัว", pass: "ตักไขมันในบ่อดักไขมันทิ้งทุกวัน ขูดล้างพื้นและรางระบายน้ำจนไม่ลื่น ไม่มีเศษอาหารตกค้าง", fail: "ปล่อยให้เศษแป้งและไขมันอุดตันท่อ หรือมีคราบน้ำมันเหนียวใต้โต๊ะสแตนเลส (เป็นแหล่งสะสมแมลงสาบและหนู)" }
    ],
    troubleshooting: [
      { problem: "ยอดเงินสดในลิ้นชักไม่ตรงกับใบสรุปยอดขาย POS (Z-Report)", solution: "ให้นับทวนเงินทอนตั้งต้น ตรวจสอบบิลยกเลิกหรือรายการเคลมเดลิเวอรี และบันทึกหมายเหตุแจ้งผู้จัดการสาขาทันทีห้ามปรับแก้ตัวเลขเอง" }
    ],
    ingredients: [],
    steps: [
      {
        stepNumber: 1,
        title: "7.1 การจัดการสต็อกวัตถุดิบและบันทึกอาหารเหลือทิ้ง (Waste Log)",
        description: "นำไก่ทอดและของทอดที่เหลือค้างในตู้โชว์มานับจำนวนชิ้นและชั่งน้ำหนัก บันทึกลงในเมนู '🗑️ บันทึกของเสีย (Waste Log)' เพื่อคำนวณต้นทุนสูญเสีย ➔ ร่อนแป้งที่ยังใช้ต่อได้เก็บใส่กล่องปิดฝาสนิท ➔ ซีลปิดภาชนะไก่หมักและซอสทั้งหมด เก็บเข้าตู้เย็นตามตำแหน่งผัง FIFO",
        imageUrl: SAMPLE_IMAGES.closing,
        videoUrl: "",
        cameraAngle: "Top-down 90°",
        timerSeconds: 0,
        tip: "ห้ามนำไก่ที่ทอดสุกแล้วเก็บค้างคืนมาอุ่นขายใหม่ในวันถัดไปเด็ดขาด"
      },
      {
        stepNumber: 2,
        title: "7.2 การทำ Deep Clean ประจำวันและการตักบ่อดักไขมัน (Grease Trap)",
        description: "ถอดล้างถาดพักไก่ ตะแกรงคลุกแป้ง อ่างสแตนเลส และเช็ดทำความสะอาดตู้โชว์อุ่นไก่ทั้งด้านใน-ด้านนอก ➔ เช็ดคราบน้ำมันตามซอกเครื่องทอดและใต้โต๊ะสแตนเลส ➔ ขูดล้างทำความสะอาดพื้นครัวและรางระบายน้ำ ➔ เปิดถาดดักไขมัน (Grease Trap) ตักกากไขมันใส่ถุงดำมัดปากทิ้งทุกวัน",
        imageUrl: SAMPLE_IMAGES.closing,
        videoUrl: "",
        cameraAngle: "Side-Angle / Close-up",
        timerSeconds: 1800,
        tip: "ใช้แท็บเล็ตเปิดหน้า 'เช็คลิสต์ปิดร้าน' เดินตรวจความสะอาดครบทุกจุดก่อนถอดผ้ากันเปื้อน"
      },
      {
        stepNumber: 3,
        title: "7.3 ปิดระบบแก๊ส ปิดไฟ และสรุปยอดขาย POS",
        description: "หมุนปิดวาล์วถังแก๊สหลักและสับเบรกเกอร์เครื่องทอด/โคมไฟอุ่นอาหารลง (ยกเว้นเบรกเกอร์ตู้เย็น/ตู้ฟรีซและกล้องวงจรปิดห้ามปิดเด็ดขาด!) ➔ พิมพ์ใบสรุปยอดขายประจำวันจากเครื่อง POS กระทบยอดเงินสดนำส่ง ➔ ล็อกประตูร้านและเปิดระบบกันขโมย",
        imageUrl: "",
        videoUrl: "",
        cameraAngle: "POV (มุมสายตาตัวเอง)",
        timerSeconds: 0,
        tip: "ถ่ายรูปวาล์วแก๊สที่ปิดแล้วส่งเข้ากลุ่ม LINE สาขาทุกคืนเพื่อยืนยันความปลอดภัย"
      }
    ]
  }
];

// =========================================================================
// 🔄 ฟังก์ชันจัดการและซิงค์ข้อมูล SOP (รองรับการย้ายหมวดหมู่เก่าเข้าสู่ 7 หมวดใหม่อัตโนมัติ)
// =========================================================================

function normalizeCategoryStage(cat) {
  if (!cat) return "stage-2-prep";
  if (cat.startsWith("stage-")) return cat;
  switch (cat) {
    case "opening": return "stage-1-opening";
    case "prep": return "stage-2-prep";
    case "cooking": return "stage-3-frying";
    case "serving-packaging": return "stage-4-packing";
    case "delivery": return "stage-5-delivery";
    case "oil": return "stage-6-oil";
    case "hygiene": return "stage-1-opening";
    case "closing": return "stage-7-closing";
    default: return "stage-2-prep";
  }
}

function filterInvalidSOPs(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(item => {
      if (!item) return false;
      if (!item.id || item.id === "undefined" || item.id === "null") return false;
      if (!item.title || item.title === "undefined" || item.title === "null") return false;
      if (item.category === "config") return false;
      return true;
    })
    .map(item => {
      item.category = normalizeCategoryStage(item.category);
      return item;
    });
}

function getSOPData() {
  const localV30 = localStorage.getItem("PKT_SOP_DATA_V30");
  if (localV30) {
    try {
      const parsed = JSON.parse(localV30);
      const cleaned = filterInvalidSOPs(parsed);
      if (cleaned.length > 0) {
        INITIAL_SOP_DATA.forEach(defSop => {
          if (!cleaned.some(c => c.id === defSop.id)) {
            cleaned.push(defSop);
          }
        });
        return cleaned;
      }
    } catch (e) {
      console.error("Error parsing PKT_SOP_DATA_V30:", e);
    }
  }

  // ตรวจสอบว่ามีข้อมูลที่ผู้ใช้เคยสร้างไว้ในรุ่น V10 หรือไม่ ถ้ามีให้นำมารวมกับชุดมาตรฐาน 7 หมวดหมู่โดยไม่ให้ข้อมูลเดิมหาย!
  const mergedMap = new Map();
  INITIAL_SOP_DATA.forEach(sop => mergedMap.set(sop.id, sop));

  const legacyV10 = localStorage.getItem("PKT_SOP_DATA_V10");
  if (legacyV10) {
    try {
      const oldList = filterInvalidSOPs(JSON.parse(legacyV10));
      oldList.forEach(oldSop => {
        if (oldSop && oldSop.id && !mergedMap.has(oldSop.id)) {
          mergedMap.set(oldSop.id, oldSop);
        }
      });
    } catch (e) {}
  }

  const finalInitial = Array.from(mergedMap.values());
  saveSOPData(finalInitial);
  return finalInitial;
}

function saveSOPData(data) {
  const cleanedData = filterInvalidSOPs(data);
  try {
    localStorage.setItem("PKT_SOP_DATA_V30", JSON.stringify(cleanedData));
  } catch (e) {
    console.warn("LocalStorage quota warning:", e);
  }
  syncSOPToCloud(cleanedData);
}

async function syncSOPToCloud(sopList) {
  if (!Array.isArray(sopList)) return false;

  // 1. ซิงค์ขึ้น Firebase Firestore (หากตั้งค่าแล้ว)
  if (typeof isFirebaseConfigured === "function" && isFirebaseConfigured()) {
    const ok = await syncAllAppDataToFirebase();
    if (ok) return true;
  }

  // 2. Fallback ซิงค์ขึ้น Supabase เดิมเพื่อความต่อเนื่อง
  const client = initSupabaseClient();
  if (!client) return false;
  try {
    const payload = sopList.map(sop => ({
      id: sop.id,
      title: sop.title,
      category: sop.category,
      sub_category: sop.subCategory,
      updated_at: new Date().toISOString(),
      sop_content: sop
    }));
    const { error } = await client.from("sop_data").upsert(payload, { onConflict: "id" });
    return !error;
  } catch (err) {
    return false;
  }
}

async function syncSOPDataToCloud(sopList) {
  return await syncSOPToCloud(sopList);
}

async function fetchLegacySupabaseSOPs() {
  const client = initSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from("sop_data").select("*").order("id", { ascending: true });
    if (error || !data) return [];
    const parsed = data
      .filter(item => item.id !== "_sub_categories_config")
      .map(item => {
        let sopObj = typeof item.sop_content === "object" ? item.sop_content : JSON.parse(item.sop_content);
        if (sopObj && (!sopObj.title || sopObj.title === "undefined")) sopObj.title = item.title;
        return sopObj;
      });
    return filterInvalidSOPs(parsed);
  } catch (e) {
    return [];
  }
}

async function fetchSOPDataFromCloud() {
  // 1. หากเชื่อมต่อ Firebase แล้ว ให้ดึงจาก Firebase เป็นหลัก
  if (typeof isFirebaseConfigured === "function" && isFirebaseConfigured()) {
    const ok = await pullAllAppDataFromFirebase();
    if (ok) return getSOPData();
  }

  // 2. ดึงข้อมูลเดิมจาก Supabase มารวมกับ 7 หมวดหมู่ใหม่โดยไม่ทับของใหม่หาย
  const legacyList = await fetchLegacySupabaseSOPs();
  if (legacyList && legacyList.length > 0) {
    const currentList = getSOPData();
    const map = new Map();
    INITIAL_SOP_DATA.forEach(s => map.set(s.id, s));
    currentList.forEach(s => map.set(s.id, s));
    legacyList.forEach(oldSop => {
      if (oldSop && oldSop.id && !map.has(oldSop.id)) {
        map.set(oldSop.id, oldSop);
      }
    });
    const combined = Array.from(map.values());
    localStorage.setItem("PKT_SOP_DATA_V30", JSON.stringify(combined));
    return combined;
  }
  return getSOPData();
}

setTimeout(() => {
  if (typeof initFirebaseEngine === "function") initFirebaseEngine();
  initSupabaseClient();
}, 150);
