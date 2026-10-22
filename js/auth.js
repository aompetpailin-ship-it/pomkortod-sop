/**
 * 🔐 ระบบยืนยันตัวตนและจัดการสิทธิ์รายบุคคล/รายสาขา (Franchise User & Role Management V30)
 * ร้านไก่ทอด "ผมขอทอด" (Pom Khor Thod)
 * รองรับการกำหนดสิทธิ์ตามตำแหน่ง (Admin / ฝ่ายครัว / ฝ่ายหน้าร้าน) แยกตามสาขา B1-B4 และการระงับสิทธิ์พนักงานที่ลาออกทันที
 */

const DEFAULT_USER_ACCOUNTS = [
  {
    id: "user-admin",
    username: "admin",
    name: "คุณเจ้าของร้าน / ผู้บริหารแฟรนไชส์",
    password: "pktadmin1234",
    pin: "9999",
    role: "admin",
    branchCode: "ALL",
    department: "ผู้บริหารสูงสุด (เห็นต้นทุน Food Cost)",
    active: true
  },
  {
    id: "user-kitchen",
    username: "chef",
    name: "ทีมเชฟ / สเตชันเตาทอด",
    password: "kitchen1234",
    pin: "1111",
    role: "kitchen",
    branchCode: "B1",
    department: "ฝ่ายครัวร้อน & หมักไก่",
    active: true
  },
  {
    id: "user-front",
    username: "service",
    name: "ทีมหน้าร้าน & แพ็กเดลิเวอรี",
    password: "front1234",
    pin: "2222",
    role: "front",
    branchCode: "B1",
    department: "ฝ่ายบริการ & แพ็กเกจจิ้ง",
    active: true
  }
];

function getUserAccounts() {
  const local = localStorage.getItem("PKT_USER_ACCOUNTS");
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach(a => {
          if (typeof a.active === "undefined") a.active = true;
          if (!a.branchCode) a.branchCode = "B1";
        });
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
  }
  saveUserAccounts(DEFAULT_USER_ACCOUNTS);
  return DEFAULT_USER_ACCOUNTS;
}

function saveUserAccounts(accounts) {
  localStorage.setItem("PKT_USER_ACCOUNTS", JSON.stringify(accounts));
  if (typeof firestoreSaveDocument === "function") {
    firestoreSaveDocument("pkt_app_state", "user_accounts", accounts);
  }
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

function showLoginModal() {
  const branches = typeof getBranchesData === "function" ? getBranchesData() : [{ code: "B1", name: "B1 สาขาลาดพร้าว" }];

  const modalHtml = `
    <div class="modal-overlay" id="loginModalOverlay" style="background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(10px);">
      <div class="modal-card" style="max-width: 440px; border: 2px solid var(--primary); box-shadow: 0 20px 50px rgba(0,0,0,0.4); border-radius: 22px; padding: 2rem;">
        
        <div style="text-align: center; margin-bottom: 1.4rem;">
          <img src="assets/logo.png" alt="โลโก้ร้านผมขอทอด" style="width: 105px; height: auto; margin-bottom: 0.6rem; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.15));" />
          <h2 style="font-size: 1.5rem; color: #b45309; font-weight: 800;">ระบบมาตรฐาน SOP แฟรนไชส์</h2>
          <p style="color: var(--text-muted); font-size: 0.88rem; margin-top: 0.15rem;">
            ร้านไก่ทอด "ผมขอทอด ที่มันอร่อยเกินไป"
          </p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 0.4rem 0.65rem; border-radius: 8px; font-size: 0.75rem; font-weight: 700; margin-top: 0.65rem;">
            🔒 เอกสารความลับทางการค้าและสูตรมาตรฐานเฉพาะพนักงานที่มีสิทธิ์เท่านั้น
          </div>
        </div>

        <form id="loginForm" onsubmit="handleUserLogin(event)">
          <div class="form-group">
            <label class="form-label">สาขาที่ปฏิบัติงาน</label>
            <select id="loginBranchSelect" class="form-select" style="font-weight: 700;">
              ${branches.map(b => `<option value="${b.code}">🏪 ${b.name}</option>`).join("")}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">ชื่อผู้ใช้งาน (Username) หรือรหัส PIN</label>
            <input type="text" id="loginUsername" class="form-input" required placeholder="กรอกชื่อผู้ใช้งาน หรือ PIN" style="font-size: 1rem; padding: 0.75rem;" />
          </div>

          <div class="form-group">
            <label class="form-label">รหัสผ่าน (Password)</label>
            <input type="password" id="loginPassword" class="form-input" required placeholder="กรอกรหัสผ่านเพื่อเข้าใช้งาน" style="font-size: 1rem; padding: 0.75rem;" />
          </div>

          <div id="loginErrorMessage" style="color: #dc2626; font-size: 0.85rem; margin-bottom: 1rem; display: none; text-align: center; font-weight: bold;"></div>

          <button type="submit" class="action-btn btn-primary" style="padding: 0.85rem; font-size: 1rem; border-radius: 12px;">
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
  const selectedBranch = document.getElementById("loginBranchSelect")?.value || "B1";
  const errorEl = document.getElementById("loginErrorMessage");

  const accounts = getUserAccounts();

  const matchedUser = accounts.find(acc =>
    (acc.username.toLowerCase() === inputUser || acc.pin === inputUser) &&
    (acc.password === inputPass || acc.pin === inputPass)
  );

  if (matchedUser) {
    if (matchedUser.active === false) {
      errorEl.style.display = "block";
      errorEl.innerText = "⛔ บัญชีนี้ถูกระงับสิทธิ์การใช้งานแล้ว กรุณาติดต่อผู้จัดการร้าน";
      return;
    }

    const sessionData = {
      id: matchedUser.id,
      name: matchedUser.name,
      username: matchedUser.username,
      role: matchedUser.role,
      branchCode: matchedUser.branchCode === "ALL" ? selectedBranch : (matchedUser.branchCode || selectedBranch),
      department: matchedUser.department,
      loggedInAt: new Date().toLocaleTimeString("th-TH")
    };
    setCurrentUserSession(sessionData);

    const modal = document.getElementById("loginModalOverlay");
    if (modal) modal.remove();

    currentRole = matchedUser.role;
    if (typeof selectedOpsBranch !== "undefined") {
      selectedOpsBranch = sessionData.branchCode;
    }
    updateNavbarAuthUI(sessionData);
    renderSidebarNavigation();
    renderMainView();

    showToast(`✅ ยินดีต้อนรับ ${matchedUser.name} (สาขา ${sessionData.branchCode})`);
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
    let roleBadgeColor = "#fef3c7";
    let roleTextColor = "#b45309";
    let roleIcon = "👑";
    if (user.role === "kitchen") { roleBadgeColor = "#ecfdf5"; roleTextColor = "#047857"; roleIcon = "🍳"; }
    if (user.role === "front") { roleBadgeColor = "#eff6ff"; roleTextColor = "#1d4ed8"; roleIcon = "🛎️"; }

    authContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.65rem;">
        <img src="assets/logo.png" alt="Profile Logo" class="user-avatar-img" />
        <div style="text-align: right; line-height: 1.25;">
          <div style="font-size: 0.82rem; font-weight: 800; color: var(--text-main);">${escapeHtml(user.name)}</div>
          <span style="font-size: 0.7rem; background: ${roleBadgeColor}; color: ${roleTextColor}; font-weight: 800; padding: 0.1rem 0.5rem; border-radius: 12px; display: inline-block;">
            ${roleIcon} ${escapeHtml(user.branchCode || 'B1')} • ${escapeHtml(user.department)}
          </span>
        </div>
        <button onclick="handleUserLogout()" class="action-btn btn-secondary" style="width: auto; padding: 0.35rem 0.75rem; margin: 0; font-size: 0.78rem; min-height: 34px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;">
          🚪 ออก
        </button>
      </div>
    `;
  }
}

function openManageAccountsModal() {
  const accounts = getUserAccounts();
  const branches = typeof getBranchesData === "function" ? getBranchesData() : [];

  let html = `
    <div class="modal-overlay" id="accountManageModal">
      <div class="modal-card" style="max-width: 760px;">
        <div class="modal-header">
          <div>
            <h3 style="font-size: 1.25rem; color: #b45309;">🔐 จัดการสิทธิ์พนักงานรายบุคคล & รายสาขา (User Management)</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">สามารถเพิ่มพนักงานใหม่ เปลี่ยนรหัสผ่าน หรือกดระงับสิทธิ์ทันทีเมื่อพนักงานลาออก</span>
          </div>
          <button onclick="closeModal('accountManageModal')" style="background:none; border:none; color:var(--text-main); font-size:1.5rem; cursor:pointer;">&times;</button>
        </div>
        <div class="modal-body">
          <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem; margin-bottom: 1.25rem;">
            <h4 style="font-size: 0.95rem; font-weight: 800; color: #b45309; margin-bottom: 0.65rem;">➕ เพิ่มบัญชีพนักงาน / สาขาใหม่</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.6rem; align-items: end;">
              <div>
                <label class="form-label">ชื่อพนักงาน</label>
                <input type="text" id="newAccName" class="form-input" placeholder="เช่น สมชาย (ครัว B2)" />
              </div>
              <div>
                <label class="form-label">Username</label>
                <input type="text" id="newAccUser" class="form-input" placeholder="เช่น somchai" />
              </div>
              <div>
                <label class="form-label">รหัสผ่าน / PIN</label>
                <input type="text" id="newAccPass" class="form-input" placeholder="เช่น 5566" />
              </div>
              <div>
                <label class="form-label">บทบาทสิทธิ์</label>
                <select id="newAccRole" class="form-select">
                  <option value="kitchen">🍳 ฝ่ายครัว</option>
                  <option value="front">🛎️ ฝ่ายหน้าร้าน</option>
                  <option value="admin">👑 Admin</option>
                </select>
              </div>
              <div>
                <label class="form-label">สาขา</label>
                <select id="newAccBranch" class="form-select">
                  <option value="ALL">ทุกสาขา (ALL)</option>
                  ${branches.map(b => `<option value="${b.code}">${b.code}</option>`).join("")}
                </select>
              </div>
              <button type="button" class="action-btn btn-primary" onclick="handleAddStaffAccount()" style="padding: 0.65rem;">➕ เพิ่มสิทธิ์</button>
            </div>
          </div>

          <div style="overflow-x: auto;">
            <table class="matrix-table-large">
              <thead>
                <tr>
                  <th>ชื่อพนักงาน / แผนก</th>
                  <th>สาขา</th>
                  <th>Username / PIN</th>
                  <th>รหัสผ่าน</th>
                  <th>สถานะสิทธิ์</th>
                  <th style="text-align: right;">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                ${accounts.map(acc => `
                  <tr>
                    <td><strong>${escapeHtml(acc.name)}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(acc.department)}</span></td>
                    <td><strong>${escapeHtml(acc.branchCode || 'ALL')}</strong></td>
                    <td><code>${escapeHtml(acc.username)}</code> (PIN: ${escapeHtml(acc.pin || '-')})</td>
                    <td><code>${escapeHtml(acc.password)}</code></td>
                    <td>
                      ${acc.active !== false
                        ? `<span class="pass-pill">🟢 ใช้งานปกติ</span>`
                        : `<span style="background:#fef2f2; color:#dc2626; padding:0.2rem 0.6rem; border-radius:12px; font-weight:800; font-size:0.75rem;">⛔ ระงับสิทธิ์แล้ว</span>`}
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                      <button onclick="promptChangePassword('${acc.id}')" class="action-btn btn-secondary" style="width: auto; padding: 0.3rem 0.6rem; font-size: 0.75rem; display: inline-flex;">✏️ รหัส</button>
                      ${acc.role !== 'admin' ? `
                        <button onclick="toggleAccountActive('${acc.id}')" class="action-btn btn-secondary" style="width: auto; padding: 0.3rem 0.6rem; font-size: 0.75rem; display: inline-flex; color: ${acc.active !== false ? '#dc2626' : '#059669'};">
                          ${acc.active !== false ? '⛔ ตัดสิทธิ์' : '🟢 เปิดสิทธิ์'}
                        </button>
                      ` : ''}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  const existing = document.getElementById("accountManageModal");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", html);
}

function handleAddStaffAccount() {
  const name = document.getElementById("newAccName")?.value.trim();
  const username = document.getElementById("newAccUser")?.value.trim();
  const password = document.getElementById("newAccPass")?.value.trim();
  const role = document.getElementById("newAccRole")?.value || "kitchen";
  const branchCode = document.getElementById("newAccBranch")?.value || "B1";

  if (!name || !username || !password) {
    showToast("⚠️ กรุณากรอกชื่อ, Username และรหัสผ่านให้ครบถ้วน", "error");
    return;
  }

  const accounts = getUserAccounts();
  accounts.push({
    id: "user-" + Date.now(),
    username,
    name,
    password,
    pin: password,
    role,
    branchCode,
    department: role === "admin" ? "ผู้บริหาร" : role === "kitchen" ? "ฝ่ายครัวร้อน & เตาทอด" : "ฝ่ายหน้าร้าน & แพ็กเดลิเวอรี",
    active: true
  });
  saveUserAccounts(accounts);
  openManageAccountsModal();
  showToast(`✅ เพิ่มบัญชีพนักงาน "${name}" เรียบร้อยแล้ว!`);
}

function toggleAccountActive(userId) {
  const accounts = getUserAccounts();
  const acc = accounts.find(a => a.id === userId);
  if (!acc) return;
  acc.active = acc.active === false ? true : false;
  saveUserAccounts(accounts);
  openManageAccountsModal();
  showToast(acc.active ? `🟢 เปิดสิทธิ์การใช้งานให้ ${acc.name} แล้ว` : `⛔ ตัดสิทธิ์การเข้าถึงของ ${acc.name} ทันทีเรียบร้อยแล้ว`);
}

function promptChangePassword(userId) {
  const accounts = getUserAccounts();
  const acc = accounts.find(a => a.id === userId);
  if (!acc) return;

  const newPass = prompt(`ระบุรหัสผ่านใหม่สำหรับ ${acc.name} (Username: ${acc.username}):`, acc.password);
  if (newPass && newPass.trim().length >= 4) {
    acc.password = newPass.trim();
    acc.pin = newPass.trim();
    saveUserAccounts(accounts);
    openManageAccountsModal();
    showToast(`🔐 อัปเดตรหัสผ่านสำหรับ ${acc.name} เรียบร้อยแล้ว`);
  } else if (newPass !== null) {
    showToast("⚠️ รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร", "error");
  }
}
