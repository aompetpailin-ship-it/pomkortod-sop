/**
 * นาฬิกาจับเวลาสำหรับการทอดและต้มอาหาร (Kitchen Cooking Timer)
 */

let activeTimerInterval = null;
let timerSecondsRemaining = 0;
let isTimerRunning = false;
let currentTimerTitle = "";

function startKitchenTimer(seconds, title = "กำลังทอด/ปรุงอาหาร") {
  currentTimerTitle = title;
  timerSecondsRemaining = seconds;
  isTimerRunning = true;

  const widget = document.getElementById("kitchenTimerWidget");
  const titleEl = document.getElementById("timerWidgetTitle");
  const displayEl = document.getElementById("timerDisplay");
  const startBtn = document.getElementById("timerToggleBtn");

  if (widget) widget.style.display = "flex";
  if (titleEl) titleEl.innerText = title;
  if (startBtn) startBtn.innerText = "⏸️ พัก";

  updateTimerDisplay();

  if (activeTimerInterval) clearInterval(activeTimerInterval);

  activeTimerInterval = setInterval(() => {
    if (timerSecondsRemaining > 0) {
      timerSecondsRemaining--;
      updateTimerDisplay();
    } else {
      clearInterval(activeTimerInterval);
      isTimerRunning = false;
      playTimerAlarm();
      if (startBtn) startBtn.innerText = "▶️ เริ่ม";
    }
  }, 1000);
}

function updateTimerDisplay() {
  const displayEl = document.getElementById("timerDisplay");
  if (!displayEl) return;

  const mins = Math.floor(timerSecondsRemaining / 60);
  const secs = timerSecondsRemaining % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  displayEl.innerText = formatted;

  if (timerSecondsRemaining === 0) {
    displayEl.style.color = "#ef4444"; // สีแดงแจ้งเตือนเสร็จสิ้น
  } else {
    displayEl.style.color = "#fbbf24";
  }
}

function toggleKitchenTimer() {
  const startBtn = document.getElementById("timerToggleBtn");
  if (isTimerRunning) {
    clearInterval(activeTimerInterval);
    isTimerRunning = false;
    if (startBtn) startBtn.innerText = "▶️ เริ่มต่อ";
  } else {
    if (timerSecondsRemaining > 0) {
      isTimerRunning = true;
      if (startBtn) startBtn.innerText = "⏸️ พัก";
      activeTimerInterval = setInterval(() => {
        if (timerSecondsRemaining > 0) {
          timerSecondsRemaining--;
          updateTimerDisplay();
        } else {
          clearInterval(activeTimerInterval);
          isTimerRunning = false;
          playTimerAlarm();
          if (startBtn) startBtn.innerText = "▶️ เริ่ม";
        }
      }, 1000);
    }
  }
}

function resetKitchenTimer() {
  if (activeTimerInterval) clearInterval(activeTimerInterval);
  isTimerRunning = false;
  timerSecondsRemaining = 0;
  updateTimerDisplay();
  const widget = document.getElementById("kitchenTimerWidget");
  if (widget) widget.style.display = "none";
}

function playTimerAlarm() {
  // สร้างเสียงบี๊บแจ้งเตือนโดยใช้ Web Audio API
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // โน้ต A5
    gain.gain.setValueAtTime(1, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.2); // เสียงดัง 1.2 วินาที
  } catch (e) {
    console.log("Audio alert fallback");
  }
  alert(`⏰ หมดเวลาแล้ว!สำหรับรายการ: ${currentTimerTitle}`);
}
