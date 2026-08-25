/**
 * ฐานข้อมูล SOP และระบบซิงค์ข้อมูลเรียลไทม์ผ่าน Supabase (Supabase Enterprise Cloud DB Engine)
 * ร้านไก่ทอด "ผมขอทอด" (Pom Khor Thod)
 * รองรับการซิงค์ข้อมูลสูตรอาหาร วัตถุดิบ และขั้นตอนการทำแบบเรียลไทม์ 0.1 วินาที ข้ามทุกอุปกรณ์
 */

const CLOUD_CONFIG = {
  enabled: true,
  type: "supabase",
  // 🔑 ข้อมูล Supabase Cloud DB ร้าน "ผมขอทอด" (Realtime 0.1s Sync)
  supabaseUrl: "https://vpsgvvyeqaltkisykbru.supabase.co",
  supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwc2d2dnllcWFsdGtpc3lrYnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NTE5MDUsImV4cCI6MjEwMzIyNzkwNX0.266bjOaxiV6u5Z5VoutzIJ0bthkgbHENJuAksOYfGH0"
};

let supabaseClient = null;

function initSupabaseClient() {
  const supabaseObj = window.supabase || (window.supabaseJS ? window.supabaseJS : null);
  if (supabaseObj && CLOUD_CONFIG.supabaseUrl && CLOUD_CONFIG.supabaseKey && CLOUD_CONFIG.supabaseUrl !== "YOUR_SUPABASE_URL_HERE") {
    try {
      if (!supabaseClient) {
        if (typeof supabaseObj.createClient === "function") {
          supabaseClient = supabaseObj.createClient(CLOUD_CONFIG.supabaseUrl, CLOUD_CONFIG.supabaseKey);
        } else if (typeof window.createClient === "function") {
          supabaseClient = window.createClient(CLOUD_CONFIG.supabaseUrl, CLOUD_CONFIG.supabaseKey);
        }
        if (supabaseClient) {
          console.log("🚀 Supabase Cloud Client Initialized successfully!");
          subscribeToSupabaseRealtime();
        }
      }
      return supabaseClient;
    } catch (e) {
      console.error("Supabase Init Error:", e);
    }
  }
  return null;
}

// ระบบฟังการเปลี่ยนแปลงข้ามอุปกรณ์แบบเรียลไทม์ (Supabase Realtime Subscription)
function subscribeToSupabaseRealtime() {
  if (!supabaseClient) return;
  try {
    supabaseClient
      .channel('public:sop_data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sop_data' }, async payload => {
        console.log("🔔 Supabase Realtime Change Received on this device!", payload);
        const cloudData = await fetchSOPDataFromCloud();
        if (cloudData) {
          if (typeof renderSidebarNavigation === "function") renderSidebarNavigation();
          if (typeof renderSOPList === "function") renderSOPList();
          if (typeof showToast === "function") showToast("⚡ อัปเดตสูตรอาหารใหม่จากคลาวด์เรียบร้อยแล้ว!", "info", 2500);
        }
      })
      .subscribe();
  } catch (err) {
    console.error("Realtime Subscription Error:", err);
  }
}

const DEFAULT_SUB_CATEGORIES = [
  { id: "thigh", stage: "prep", label: "สะโพกไก่ดิบ" },
  { id: "wing", stage: "prep", label: "ปีกไก่ดิบ" },
  { id: "batter-sauce", stage: "prep", label: "แป้งทอด & ซอสเบส" },
  { id: "sides-prep", stage: "prep", label: "ข้าวสาร กิมจิ & เครื่องซุป" },

  { id: "thigh-frying", stage: "cooking", label: "ทอดสะโพกไก่" },
  { id: "wing-frying", stage: "cooking", label: "ทอดปีกไก่" },
  { id: "sauces-coating", stage: "cooking", label: "คลุกซอส 4 สูตร" },
  { id: "sides-cooking", stage: "cooking", label: "ทอดเฟรนช์ฟรายส์ & ต้มซุป" },

  { id: "dine-in", stage: "serving-packaging", label: "จัดเสิร์ฟทานที่ร้าน" },
  { id: "takeaway-delivery", stage: "serving-packaging", label: "แพ็กเดลิเวอรี / กลับบ้าน" },

  { id: "food-safety", stage: "hygiene", label: "ความปลอดภัยอาหาร & FIFO" }
];

function getSubCategoriesData() {
  const local = localStorage.getItem("PKT_SUB_CATEGORIES_V1");
  if (local) {
    try { return JSON.parse(local); } catch (e) { console.error(e); }
  }
  saveSubCategoriesData(DEFAULT_SUB_CATEGORIES);
  return DEFAULT_SUB_CATEGORIES;
}

function saveSubCategoriesData(data) {
  localStorage.setItem("PKT_SUB_CATEGORIES_V1", JSON.stringify(data));
  // อัปเดตไปยัง Supabase Cloud เสมอ
  syncSubCategoriesToCloud(data);
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

function createBase64SvgPlaceholder(bgColor, textColor, mainText, subText) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="${bgColor}"/><g text-anchor="middle" font-family="Prompt, sans-serif"><text x="400" y="200" fill="${textColor}" font-size="34" font-weight="800">${mainText}</text><text x="400" y="270" fill="%2394a3b8" font-size="22">${subText}</text></g></svg>`;
  try {
    return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
  } catch (e) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
}

const SAMPLE_IMAGES = {
  thighPrep: createBase64SvgPlaceholder("#1e293b", "#fbbf24", "🥩 การเตรียมสะโพกไก่ดิบ 130-150g", "ล้าง ตัดแต่งมัน บากเนื้อ 2 รอย"),
  wingPrep: createBase64SvgPlaceholder("#1e293b", "#f59e0b", "🍗 การเตรียมปีกไก่ดิบ (ปีกบน/ปีกกลาง)", "บากปีกกลาง ซับแห้ง หมัก 4 ชม."),
  batterPrep: createBase64SvgPlaceholder("#1e293b", "#10b981", "🥣 การผสมผงหมักและแป้งชุบทอด", "อัตราส่วนแป้งแห้งและแป้งเปียกน้ำเย็นจัด"),
  frying: createBase64SvgPlaceholder("#1e293b", "#ef4444", "🔥 การทอดไก่อุณหภูมิ 165°C - 170°C", "สะโพก 8.5 นาที / ปีก 6.5 นาที"),
  sauceCoating: createBase64SvgPlaceholder("#1e293b", "#fbbf24", "🥣 การคลุกซอส 4 สูตร Signature", "เกาหลีเผ็ด / โชยุ / ฮันนี่มัสตาร์ด / หม่าล่า"),
  platingDineIn: createBase64SvgPlaceholder("#1e293b", "#3b82f6", "🍽️ การจัดเสิร์ฟทานที่ร้าน (Dine-in)", "การจัดจานไก่ทอด ข้าว ซุป เครื่องเคียง"),
  packagingTakeaway: createBase64SvgPlaceholder("#1e293b", "#ec4899", "📦 การแพ็กเดลิเวอรี / สั่งกลับบ้าน (Takeaway)", "กล่องระบายความร้อน ถุงกระดาษแยกซอส")
};

const INITIAL_SOP_DATA = [
  {
    id: "sop-prep-thigh",
    title: "SOP การเตรียมและหมัก สะโพกไก่ดิบ (Raw Thigh Prep)",
    category: "prep",
    subCategory: "thigh",
    version: "1.0",
    updatedAt: "2026-08-21 22:00",
    author: "คุณเจ้าของร้าน / Owner",
    changeNotes: "กำหนดสูตรมาตรฐานเริ่มต้นของร้านผมขอทอด",
    versionHistory: [],
    targetRole: ["kitchen", "admin"],
    prepTime: "20 นาที (พักหมัก 6 ชม.)",
    cookTime: "-",
    yield: "1.5 kg (ประมาณ 10 ชิ้น)",
    summary: "มาตรฐานการตรวจรับ ล้าง ตัดแต่งมัน บากเนื้อ และนวดหมักสะโพกไก่ดิบก่อนนำไปทอด",
    tags: ["สะโพกไก่ดิบ", "วัตถุดิบดิบ", "การหมัก", "การเตรียมวัตถุดิบ"],
    specifications: [
      { label: "วัตถุดิบหลัก", value: "สะโพกไก่สดตัดแต่ง 1.5 kg" },
      { label: "น้ำหนักต่อชิ้น", value: "130 - 150 กรัม" },
      { label: "สัดส่วนผงหมัก", value: "45g ผงหมัก + 150ml น้ำเย็นจัด" },
      { label: "อุณหภูมิแช่หมัก", value: "2°C - 4°C (หมัก 6 - 24 ชม.)" }
    ],
    ingredients: [
      { name: "สะโพกไก่สด", amount: 1.5, unit: "kg" },
      { name: "ผงหมักสูตรเข้มข้น ร้านผมขอทอด", amount: 45, unit: "g" },
      { name: "น้ำเย็นจัด", amount: 150, unit: "ml" }
    ],
    steps: [
      {
        stepNumber: 1,
        title: "การตรวจรับและล้างสะโพกไก่",
        description: "ตรวจเช็คความสดของสะโพกไก่ สีชมพูธรรมชาติ ไม่มีกลิ่นคาว ล้างด้วยน้ำเย็นจัดเพื่อลดความร้อน ตัดแต่งมันส่วนเกินออก",
        imageUrl: SAMPLE_IMAGES.thighPrep,
        timerSeconds: 0,
        tip: "ห้ามใช้ไก่ที่อุณหภูมิเกิน 5°C ในการนำมาหมัก"
      },
      {
        stepNumber: 2,
        title: "การบากเนื้อไก่ด้านใน",
        description: "ใช้มีดคมบากเนื้อสะโพกด้านในเป็น 2 รอยขนาน ความลึกประมาณ 0.5 ซม. เพื่อให้ซึมซับผงหมักเข้าถึงแกนเนื้อและช่วยให้ทอดสุกเร็วทั่วถึง",
        imageUrl: SAMPLE_IMAGES.thighPrep,
        timerSeconds: 0,
        tip: "ระวังอย่าบากลึกจนหนังหลุดออกจากเนื้อ"
      },
      {
        stepNumber: 3,
        title: "การละลายผงหมักและนวดไก่",
        description: "ผสมผงหมัก 45g กับน้ำเย็นจัด 150ml คนให้ละลาย เทใส่สะโพกไก่ นวดคลุกเคล้าด้วยมือ 3 นาทีจนน้ำหมักซึมเข้าเนื้อไก่ทั้งหมด",
        imageUrl: SAMPLE_IMAGES.thighPrep,
        timerSeconds: 180,
        tip: "นวดวนเป็นวงกลมเพื่อให้เครื่องหมักซึมเข้าทุกซอกมุม"
      },
      {
        stepNumber: 4,
        title: "บรรจุและซีลแช่เย็น (Marinating Storage)",
        description: "บรรจุไก่ใส่กล่อง Food Grade ปิดฝามิดชิด ติดป้าย Date-Time Tag แช่เย็นอุณหภูมิ 2°C - 4°C หมักอย่างน้อย 6 ชั่วโมงก่อนนำไปทอด",
        imageUrl: "",
        timerSeconds: 0,
        tip: "ยึดหลัก FIFO (เข้าก่อน-ออกก่อน) และวางกล่องไก่ดิบไว้ชั้นล่างสุด"
      }
    ]
  },

  {
    id: "sop-prep-wing",
    title: "SOP การเตรียมและหมัก ปีกไก่ดิบ (Raw Wing Prep)",
    category: "prep",
    subCategory: "wing",
    version: "1.0",
    updatedAt: "2026-08-21 22:00",
    author: "คุณเจ้าของร้าน / Owner",
    changeNotes: "กำหนดสูตรหมักปีกไก่กระเทียมมาตรฐาน",
    versionHistory: [],
    targetRole: ["kitchen", "admin"],
    prepTime: "15 นาที (พักหมัก 4 ชม.)",
    cookTime: "-",
    yield: "1.0 kg (ประมาณ 20 ชิ้น)",
    summary: "การซับแห้ง บากปีกกลาง ผสมผงหมักกระเทียม และแช่หมักปีกไก่สำหรับทอดกรอบ",
    tags: ["ปีกไก่ดิบ", "วัตถุดิบดิบ", "การหมัก", "การเตรียมวัตถุดิบ"],
    specifications: [
      { label: "ส่วนของปีก", value: "ปีกบน (Drumette) และ ปีกกลาง (Wingette)" },
      { label: "สัดส่วนผงหมัก", value: "30g ผงหมัก + 15g กระเทียมสับ + 100ml น้ำเย็น" },
      { label: "เวลาแช่หมัก", value: "4 - 12 ชั่วโมง" }
    ],
    ingredients: [
      { name: "ปีกไก่สด (ปีกบน+ปีกกลาง)", amount: 1.0, unit: "kg" },
      { name: "ผงหมักสูตรเข้มข้น ผมขอทอด", amount: 30, unit: "g" },
      { name: "กระเทียมสับละเอียด", amount: 15, unit: "g" },
      { name: "น้ำเย็นจัด", amount: 100, unit: "ml" }
    ],
    steps: [
      {
        stepNumber: 1,
        title: "การล้าง บากปีกกลาง และซับแห้ง",
        description: "นำปีกไก่ล้างน้ำสะอาด บากเนื้อปีกกลาง 1 รอยขนานกับกระดูก ใช้กระดาษอเนกประสงค์ซับน้ำให้แห้งสนิท",
        imageUrl: SAMPLE_IMAGES.wingPrep,
        timerSeconds: 0,
        tip: "ปีกไก่ต้องแห้งสนิท เครื่องหมักจึงจะเกาะติดเนื้อไก่ได้ดี"
      },
      {
        stepNumber: 2,
        title: "การนวดหมักกระเทียมสด",
        description: "ผสมผงหมัก 30g + กระเทียมสับ 15g + น้ำเย็น 100ml นวดเคล้ากับปีกไก่ 1kg ให้เข้ากัน 2 นาที",
        imageUrl: SAMPLE_IMAGES.wingPrep,
        timerSeconds: 120,
        tip: "กระเทียมสับช่วยเพิ่มความหอมเฉพาะตัวให้ปีกไก่"
      },
      {
        stepNumber: 3,
        title: "การแช่เย็นควบคุมอุณหภูมิ",
        description: "บรรจุใส่ภาชนะปิดฝา แช่ตู้เย็น 2-4°C เป็นเวลา 4-12 ชั่วโมง",
        imageUrl: "",
        timerSeconds: 0,
        tip: "หมักอย่างน้อย 4 ชม. ก่อนนำออกมาชุบแป้งทอด"
      }
    ]
  },

  {
    id: "sop-cook-sauce-coating",
    title: "SOP การคลุกซอสไก่ทอด 4 สูตร Signature",
    category: "cooking",
    subCategory: "sauces-coating",
    version: "1.0",
    updatedAt: "2026-08-21 22:00",
    author: "เชฟหัวหน้าครัวร้อน",
    changeNotes: "กำหนดสัดส่วนซอส 4 รสชาติ 45-50g ต่อเสิร์ฟ",
    versionHistory: [],
    targetRole: ["kitchen", "front", "admin"],
    prepTime: "1 นาที",
    cookTime: "1 นาที",
    yield: "1 เสิร์ฟ",
    summary: "สัดส่วนซอส 45-50g ต่อเสิร์ฟ และเทคนิคการสะบัดอ่างคลุกซอสฉ่ำๆ",
    tags: ["คลุกซอส", "เกาหลีเผ็ด", "โชยุ", "ฮันนี่มัสตาร์ด", "หม่าล่า", "การปรุงอาหาร"],
    specifications: [
      { label: "ซอสเกาหลีเผ็ดหวาน", value: "50g + งาขาวคั่ว 0.5g" },
      { label: "ซอสกระเทียมโชยุ", value: "45g + กระเทียมเจียว 3g" },
      { label: "ซอสมัสตาร์ดน้ำผึ้ง", value: "45g (ราดซิกแซก) + พาร์สลีย์" },
      { label: "ซอสหม่าล่าสไปซี่", value: "45g + ผงหม่าล่า 1g" }
    ],
    ingredients: [
      { name: "ไก่ทอดร้อนๆ", amount: 1, unit: "เสิร์ฟ" },
      { name: "ซอสที่ลูกค้าเลือก", amount: 45, unit: "g" }
    ],
    steps: [
      {
        stepNumber: 1,
        title: "การคลุกซอสในอ่างสแตนเลส",
        description: "ใส่ไก่ทอดร้อนๆ ลงอ่าง ชั่งซอส 45-50g เขย่าอ่างวนเข็มนาฬิกาให้ซอสเคลือบไก่ทั่วถึง 100%",
        imageUrl: SAMPLE_IMAGES.sauceCoating,
        timerSeconds: 30,
        tip: "ต้องคลุกขณะไก่ยังร้อน ซอสจึงจะซึมติดแป้ง"
      }
    ]
  }
];

function sanitizeImageUrlsInSopList(sopList) {
  if (!Array.isArray(sopList)) return sopList;
  sopList.forEach(sop => {
    if (Array.isArray(sop.steps)) {
      sop.steps.forEach(step => {
        if (step.imageUrl && step.imageUrl.startsWith("data:image/svg+xml;utf8,")) {
          if (sop.id.includes("thigh")) step.imageUrl = SAMPLE_IMAGES.thighPrep;
          else if (sop.id.includes("wing")) step.imageUrl = SAMPLE_IMAGES.wingPrep;
          else if (sop.id.includes("sauce")) step.imageUrl = SAMPLE_IMAGES.sauceCoating;
          else step.imageUrl = SAMPLE_IMAGES.frying;
        }
      });
    }
  });
  return sopList;
}

function getSOPData() {
  const local = localStorage.getItem("PKT_SOP_DATA_V10");
  if (local) {
    try {
      const parsed = JSON.parse(local);
      return sanitizeImageUrlsInSopList(parsed);
    } catch (e) {
      console.error("Error parsing SOP data", e);
    }
  }
  
  saveSOPData(INITIAL_SOP_DATA);
  return INITIAL_SOP_DATA;
}

function saveSOPData(data) {
  try {
    localStorage.setItem("PKT_SOP_DATA_V10", JSON.stringify(data));
  } catch (e) {
    console.warn("LocalStorage quota exceeded (5MB limit). Saving directly to Supabase Cloud instead.", e);
  }
  // ซิงค์ไปยัง Supabase Cloud เสมอ
  syncSOPToSupabaseCloud(data);
}

// =========================================================================
// 🚀 ฟังก์ชันดึงและซิงค์ข้อมูลตรงจาก Supabase PostgreSQL Cloud
// =========================================================================
async function fetchSOPDataFromCloud() {
  const client = initSupabaseClient();
  if (!client) {
    console.warn("Supabase Client is not initialized.");
    return null;
  }

  try {
    const { data, error } = await client
      .from('sop_data')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.warn("Supabase Fetch Warning:", error.message);
      return null;
    }

    if (data && data.length > 0) {
      const parsedSopList = data.map(item => typeof item.sop_content === 'object' ? item.sop_content : JSON.parse(item.sop_content));
      localStorage.setItem("PKT_SOP_DATA_V10", JSON.stringify(parsedSopList));
      console.log("🚀 Fetched SOP Data from Supabase Cloud successfully!", parsedSopList.length, "items");
      return parsedSopList;
    }
  } catch (err) {
    console.error("Supabase Cloud Fetch Error:", err);
  }
  return null;
}

async function syncSOPToSupabaseCloud(sopList) {
  const client = initSupabaseClient();
  if (!client || !Array.isArray(sopList)) return false;

  try {
    const payload = sopList.map(sop => ({
      id: sop.id,
      title: sop.title,
      category: sop.category,
      sub_category: sop.subCategory,
      updated_at: new Date().toISOString(),
      sop_content: sop
    }));

    const { error } = await client
      .from('sop_data')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error("Supabase Upsert Error:", error.message);
      return false;
    } else {
      console.log("⚡ Synced SOP Data to Supabase Cloud successfully!");
      return true;
    }
  } catch (err) {
    console.error("Supabase Cloud Sync Error:", err);
    return false;
  }
}

// Alias สำหรับระบบ CMS
async function syncSOPDataToCloud(sopList) {
  return await syncSOPToSupabaseCloud(sopList);
}

async function syncSubCategoriesToCloud(subCatList) {
  const client = initSupabaseClient();
  if (!client || !Array.isArray(subCatList)) return;

  try {
    const { error } = await client
      .from('sop_data')
      .upsert({
        id: '_sub_categories_config',
        title: 'Subcategories Configuration',
        category: 'config',
        sub_category: 'config',
        updated_at: new Date().toISOString(),
        sop_content: subCatList
      }, { onConflict: 'id' });
    if (!error) {
      console.log("⚡ Synced Subcategories Config to Supabase Cloud!");
    }
  } catch (err) {
    console.error("Sync Subcategories Error:", err);
  }
}

// Auto init client immediately on load
setTimeout(() => {
  initSupabaseClient();
}, 200);
