/**
 * ระบบยืนยันตัวตนและการเข้าถึงข้อมูล (Employee Authentication & Security Module)
 * ร้านไก่ทอด "ผมขอทอด" (Pom Khor Thod)
 * เพิ่มโลโก้ร้านในหน้า Login และ Profile Avatar
 */

const DEFAULT_USER_ACCOUNTS = [
  {
    id: "user-admin",
    username: "admin",
    name: "คุณเจ้าของร้าน / ผู้จัดการ",
    password: "pktadmin1234",
    pin: "9999",
    role: "admin",
    department: "ผู้บริหาร"
  },
  {
    id: "user-kitchen",
    username: "chef",
    name: "ทีมเชฟ / พนักงานห้องครัว",
    password: "kitchen1234",
    pin: "1111",
    role: "kitchen",
    department: "ฝ่ายครัวร้อน & หมักไก่"
  },
  {
    id: "user-front",
    username: "service",
    name: "ทีมพนักงานหน้าร้าน & จัดเสิร์ฟ",
    password: "front1234",
    pin: "2222",
    role: "front",
    department: "ฝ่ายบริการ & แพ็กสินค้า"
  }
];

function getUserAccounts() {
  const local = localStorage.getItem("PKT_USER_ACCOUNTS");
  if (local) {
    try { return JSON.parse(local); } catch (e) { console.error(e); }
  }
  saveUserAccounts(DEFAULT_USER_ACCOUNTS);
  return DEFAULT_USER_ACCOUNTS;
}

function saveUserAccounts(accounts) {
  localStorage.setItem("PKT_USER_ACCOUNTS", JSON.stringify(accounts));
}

function getCurrentUserSession() {
  const session = sessionStorage.getItem("PKT_CURRENT_SESSION");
  if (session) {
    try { return JSON.parse(session); } catch (e) { return null; }
  }
  return null;
}

function setCurrentUserSession(user) {
  sessionStorage.setItem("PKT_CURRENT_SESSION", JSON.stringify(user));
}

function clearUserSession() {
  sessionStorage.removeItem("PKT_CURRENT_SESSION");
}

function checkAuthStatus() {
  const currentUser = getCurrentUserSession();
  if (!currentUser) {
    showLoginModal();
    return false;
  }
  updateNavbarAuthUI(currentUser);
  return true;
}

function showLoginModal() {
  const modalHtml = `
    <div class="modal-overlay" id="loginModalOverlay" style="background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px);">
      <div class="modal-card" style="max-width: 440px; border: 2px solid var(--primary); box-shadow: 0 20px 50px rgba(0,0,0,0.8); border-radius: 20px; padding: 2rem;">
        
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <img src="assets/logo.png" alt="โลโก้ร้านผมขอทอด" style="width: 120px; height: auto; margin-bottom: 0.75rem; filter: drop-shadow(0 4px 15px rgba(0,0,0,0.5));" />
          <h2 style="font-size: 1.6rem; color: #fbbf24; font-weight: 800;">ระบบความปลอดภัย SOP</h2>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.2rem;">
            ร้านไก่ทอด "ผมขอทอด ที่มันอร่อยเกินไป"
          </p>
          <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 0.4rem; border-radius: 8px; font-size: 0.75rem; margin-top: 0.75rem;">
            ⚠️ เอกสารความลับทางการค้าและสูตรมาตรฐานเฉพาะพนักงานเท่านั้น
          </div>
        </div>

        <form id="loginForm" onsubmit="handleUserLogin(event)">
          <div class="form-group">
            <label class="form-label">ชื่อผู้ใช้งาน (Username) หรือ PIN</label>
            <input type="text" id="loginUsername" class="form-input" required placeholder="กรอกชื่อผู้ใช้งาน หรือ PIN" style="font-size: 1rem; padding: 0.8rem;" />
          </div>

          <div class="form-group">
            <label class="form-label">รหัสผ่าน (Password)</label>
            <input type="password" id="loginPassword" class="form-input" required placeholder="กรอกรหัสผ่านเพื่อเข้าใช้งาน" style="font-size: 1rem; padding: 0.8rem;" />
          </div>

          <div id="loginErrorMessage" style="color: #dc2626; font-size: 0.85rem; margin-bottom: 1rem; display: none; text-align: center; font-weight: bold;"></div>

          <button type="submit" class="action-btn btn-primary" style="padding: 0.9rem; font-size: 1rem; border-radius: 10px;">
            🔑 ยืนยันเข้าสู่ระบบ
          </button>
        </form>

      </div>
    </div>
  `;

  const existing = document.getElementById("loginModalOverlay");
  if (existing) existing.remove();

  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function handleUserLogin(event) {
  event.preventDefault();
  const inputUser = document.getElementById("loginUsername").value.trim().toLowerCase();
  const inputPass = document.getElementById("loginPassword").value.trim();
  const errorEl = document.getElementById("loginErrorMessage");

  const accounts = getUserAccounts();

  const matchedUser = accounts.find(acc => 
    (acc.username.toLowerCase() === inputUser || acc.pin === inputUser) &&
    (acc.password === inputPass || acc.pin === inputPass)
  );

  if (matchedUser) {
    const sessionData = {
      id: matchedUser.id,
      name: matchedUser.name,
      username: matchedUser.username,
      role: matchedUser.role,
      department: matchedUser.department,
      loggedInAt: new Date().toLocaleTimeString('th-TH')
    };
    setCurrentUserSession(sessionData);

    const modal = document.getElementById("loginModalOverlay");
    if (modal) modal.remove();

    currentRole = matchedUser.role;
    updateNavbarAuthUI(sessionData);
    renderSOPList();

    showToast(`✅ ยินดีต้อนรับ ${matchedUser.name} (${matchedUser.department})`);
  } else {
    errorEl.style.display = "block";
    errorEl.innerText = "❌ ชื่อผู้ใช้ หรือ รหัสผ่าน ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง";
  }
}

function handleUserLogout() {
  clearUserSession();
  currentRole = "none";
  location.reload();
}

function updateNavbarAuthUI(user) {
  const authContainer = document.getElementById("navbarAuthArea");
  if (!authContainer) return;

  if (user) {
    let roleBadgeColor = "#f59e0b";
    let roleIcon = "👑";
    if (user.role === "kitchen") { roleBadgeColor = "#10b981"; roleIcon = "🍳"; }
    if (user.role === "front") { roleBadgeColor = "#3b82f6"; roleIcon = "🛎️"; }

    authContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <img src="assets/logo.png" alt="Profile Logo" class="user-avatar-img" />
        <div style="text-align: right;">
          <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">${user.name}</div>
          <span style="font-size: 0.7rem; background: ${roleBadgeColor}; color: #000; font-weight: 800; padding: 0.1rem 0.5rem; border-radius: 12px; display: inline-block;">
            ${roleIcon} ${user.department}
          </span>
        </div>
        <button onclick="handleUserLogout()" class="action-btn btn-secondary" style="width: auto; padding: 0.4rem 0.8rem; margin: 0; font-size: 0.8rem; background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid #ef4444;">
          🚪 ออกจากระบบ
        </button>
      </div>
    `;
  }
}

function openManageAccountsModal() {
  const accounts = getUserAccounts();
  
  let html = `
    <div class="modal-overlay" id="accountManageModal">
      <div class="modal-card" style="max-width: 600px;">
        <div class="modal-header">
          <h3 style="font-size: 1.2rem; color: #fbbf24;">🔐 จัดการรหัสผ่านและบัญชีพนักงาน</h3>
          <button onclick="closeModal('accountManageModal')" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
            แอดมินสามารถเปลี่ยนรหัสผ่านพนักงานเพื่อป้องกันสูตรและความลับของร้านรั่วไหล
          </p>

          <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); text-align: left; color: var(--text-muted);">
                <th style="padding: 0.5rem;">แผนก/บทบาท</th>
                <th style="padding: 0.5rem;">Username</th>
                <th style="padding: 0.5rem;">รหัสผ่านปัจจุบัน</th>
                <th style="padding: 0.5rem; text-align: right;">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
  `;

  accounts.forEach(acc => {
    html += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 0.6rem 0.5rem;">${acc.name}</td>
        <td style="padding: 0.6rem 0.5rem; color: #fbbf24;"><code>${acc.username}</code></td>
        <td style="padding: 0.6rem 0.5rem;"><code>${acc.password}</code></td>
        <td style="padding: 0.6rem 0.5rem; text-align: right;">
          <button onclick="promptChangePassword('${acc.id}')" class="action-btn btn-secondary" style="width: auto; padding: 0.3rem 0.6rem; font-size: 0.75rem; margin: 0; display: inline-block;">✏️ เปลี่ยนรหัส</button>
        </td>
      </tr>
    `;
  });

  html += `
            </tbody>
          </table>
        </div>
        <div style="margin-top: 1.5rem; text-align: right;">
          <button class="action-btn btn-primary" onclick="closeModal('accountManageModal')" style="width: auto; display: inline-block;">ปิดหน้าต่าง</button>
        </div>
      </div>
    </div>
  `;

  const existing = document.getElementById("accountManageModal");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", html);
}

function promptChangePassword(userId) {
  const accounts = getUserAccounts();
  const acc = accounts.find(a => a.id === userId);
  if (!acc) return;

  const newPass = prompt(`ระบุรหัสผ่านใหม่สำหรับ ${acc.name} (Username: ${acc.username}):`, acc.password);
  if (newPass && newPass.trim().length >= 4) {
    acc.password = newPass.trim();
    saveUserAccounts(accounts);
    openManageAccountsModal();
    showToast(`🔐 อัปเดตรหัสผ่านสำหรับ ${acc.name} เรียบร้อยแล้ว`);
  } else if (newPass !== null) {
    showToast("⚠️ รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร", "error");
  }
}
