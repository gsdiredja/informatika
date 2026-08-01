let currentQuestionIndex = 0;
let questionsData = [];
let userAnswers = {};

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyt2yEo-WbYDRXf7RFY-mTxhDk_yGKnK9dqpCYKiNhlXYwEIYUuaNfMJXnn1LWNbq43/exec";

const EXAM_DURATION_MINUTES = 60;
let totalSeconds = EXAM_DURATION_MINUTES * 60;
let timerInterval = null;
let currentUsername = "";
let currentUserData = {};

document.addEventListener("DOMContentLoaded", () => {
  let userDataStr = localStorage.getItem("userData");
  let soalPath = localStorage.getItem("soalPath");

  if (!userDataStr) {
    window.location.href = "index.html";
    return;
  }

  if (!soalPath || soalPath === "undefined") {
    soalPath = "./data/soal-uh1.json";
  }

  currentUserData = JSON.parse(userDataStr);
  currentUsername = currentUserData.username || "";

  // Info User AKM Style
  document.getElementById("userInfo").innerHTML = `
    PESERTA: <strong>${currentUserData.nama || currentUserData.username}</strong> | KELAS: <strong>${currentUserData.kelas || '-'}</strong> | NISN: <strong>${currentUserData.username}</strong>
  `;

  const savedRemainingTime = localStorage.getItem(`remainingTime_${currentUsername}`);
  if (savedRemainingTime !== null) {
    totalSeconds = parseInt(savedRemainingTime, 10);
  }

  startTimer();

  fetch(soalPath)
    .then((res) => res.json())
    .then((data) => {
      questionsData = data;
      renderNumberGrid();
      showQuestion(currentQuestionIndex);
    })
    .catch((err) => {
      document.getElementById("questionsContainer").innerHTML = `<p style="color:red;">Gagal memuat file soal JSON.</p>`;
    });
});

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    totalSeconds--;
    if (currentUsername) localStorage.setItem(`remainingTime_${currentUsername}`, totalSeconds);
    updateTimerDisplay();

    if (totalSeconds <= 0) {
      clearInterval(timerInterval);
      alert("Waktu Habis! Ujian terkirim otomatis.");
      forceSubmitExam();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const timerDisplay = document.getElementById("timerDisplay");
  if (!timerDisplay) return;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  timerDisplay.innerText = `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// TOGGLE SIDEBAR GRID NAVIGASI (RESPONSIF)
function toggleSidebar() {
  const sidebar = document.getElementById("gridSidebar");
  sidebar.classList.toggle("open");
}

// PENGATUR UKURAN FONT (A- A A+)
function changeFontSize(size) {
  const panel = document.getElementById("examPanel");
  if (size === 'small') panel.style.fontSize = '0.875rem';
  else if (size === 'medium') panel.style.fontSize = '1rem';
  else if (size === 'large') panel.style.fontSize = '1.15rem';
}

// RENDER PETA GRID NOMOR SOAL AKM
function renderNumberGrid() {
  const gridContainer = document.getElementById("numberGrid");
  let html = "";

  questionsData.forEach((q, idx) => {
    const isAnswered = isQuestionAnswered(q.name);
    const isActive = idx === currentQuestionIndex;

    let classList = "btn-num";
    if (isActive) classList += " active";
    else if (isAnswered) classList += " answered";

    html += `<button class="${classList}" onclick="jumpToQuestion(${idx})">${idx + 1}</button>`;
  });

  gridContainer.innerHTML = html;
}

function jumpToQuestion(index) {
  saveCurrentAnswer();
  currentQuestionIndex = index;
  showQuestion(currentQuestionIndex);
}

function showQuestion(index) {
  const container = document.getElementById("questionsContainer");
  const q = questionsData[index];

  // Update Badges & Titles
  document.getElementById("questionTitle").innerText = `Soal Nomor ${index + 1}`;
  
  let typeText = "Pilihan Ganda";
  if (q.type === "checkbox") typeText = "Pilihan Ganda Kompleks";
  else if (q.type === "essay") typeText = "Uraian / Essay";
  document.getElementById("questionTypeBadge").innerText = typeText;

  let html = `<div style="line-height: 1.6; color: #1e293b;">`;
  html += `<p style="margin-bottom: 20px; font-weight: 600;">${q.text}</p>`;

  if (q.type === "radio") {
    q.options.forEach((opt) => {
      const isChecked = userAnswers[q.name] === opt.v ? "checked" : "";
      html += `
        <div style="margin-bottom: 12px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px;">
          <label style="cursor: pointer; display: flex; align-items: center; gap: 10px;">
            <input type="radio" name="${q.name}" value="${opt.v}" ${isChecked} onchange="hideWarning()" />
            <span><strong>${opt.v}.</strong> ${opt.t}</span>
          </label>
        </div>
      `;
    });
  } else if (q.type === "checkbox") {
    const savedArr = userAnswers[q.name] || [];
    q.options.forEach((opt) => {
      const isChecked = savedArr.includes(opt.v) ? "checked" : "";
      html += `
        <div style="margin-bottom: 12px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px;">
          <label style="cursor: pointer; display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" name="${q.name}" value="${opt.v}" ${isChecked} onchange="hideWarning()" />
            <span><strong>${opt.v}.</strong> ${opt.t}</span>
          </label>
        </div>
      `;
    });
  } else if (q.type === "essay") {
    const savedText = userAnswers[q.name] || "";
    html += `
      <textarea id="essayInput" name="${q.name}" rows="5" style="width: 100%; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e1; outline: none;" placeholder="Ketikkan jawaban uraian Anda secara rinci..." oninput="hideWarning()">${savedText}</textarea>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;

  document.getElementById("questionProgress").innerText = `Soal ${index + 1} dari ${questionsData.length}`;
  document.getElementById("btnPrev").disabled = (index === 0);

  if (index === questionsData.length - 1) {
    document.getElementById("btnNext").style.display = "none";
    document.getElementById("btnSubmitExam").style.display = "inline-flex";
  } else {
    document.getElementById("btnNext").style.display = "inline-flex";
    document.getElementById("btnSubmitExam").style.display = "none";
  }

  renderNumberGrid();
}

function saveCurrentAnswer() {
  const q = questionsData[currentQuestionIndex];
  if (!q) return;

  if (q.type === "radio") {
    const selected = document.querySelector(`input[name="${q.name}"]:checked`);
    if (selected) userAnswers[q.name] = selected.value;
  } else if (q.type === "checkbox") {
    const checkedBoxes = document.querySelectorAll(`input[name="${q.name}"]:checked`);
    const values = Array.from(checkedBoxes).map((cb) => cb.value);
    if (values.length > 0) userAnswers[q.name] = values;
    else delete userAnswers[q.name];
  } else if (q.type === "essay") {
    const essayText = document.getElementById("essayInput")?.value.trim();
    if (essayText) userAnswers[q.name] = essayText;
    else delete userAnswers[q.name];
  }

  renderNumberGrid();
}

function isQuestionAnswered(qName) {
  const ans = userAnswers[qName];
  if (!ans) return false;
  if (Array.isArray(ans) && ans.length === 0) return false;
  if (typeof ans === "string" && ans.trim() === "") return false;
  return true;
}

function hideWarning() {
  saveCurrentAnswer();
  const warnEl = document.getElementById("warningMessage");
  if (warnEl) warnEl.style.display = "none";
}

function nextQuestion() {
  saveCurrentAnswer();
  if (!isQuestionAnswered(questionsData[currentQuestionIndex].name)) {
    showWarning("Jawab soal ini terlebih dahulu!");
    return;
  }
  if (currentQuestionIndex < questionsData.length - 1) {
    currentQuestionIndex++;
    showQuestion(currentQuestionIndex);
  }
}

function prevQuestion() {
  saveCurrentAnswer();
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    showQuestion(currentQuestionIndex);
  }
}

function showWarning(msg) {
  let warnEl = document.getElementById("warningMessage");
  if (!warnEl) {
    warnEl = document.createElement("div");
    warnEl.id = "warningMessage";
    warnEl.style.color = "#ef4444";
    warnEl.style.marginTop = "10px";
    warnEl.style.fontWeight = "bold";
    document.getElementById("questionsContainer").appendChild(warnEl);
  }
  warnEl.innerText = "⚠️ " + msg;
  warnEl.style.display = "block";
}

function submitExam() {
  saveCurrentAnswer();
  if (!isQuestionAnswered(questionsData[currentQuestionIndex].name)) {
    showWarning("Jawab soal terakhir terlebih dahulu!");
    return;
  }

  if (confirm("Apakah Anda yakin ingin mengakhiri ujian ini?")) {
    processExamResults();
  }
}

function forceSubmitExam() {
  saveCurrentAnswer();
  processExamResults();
}

async function processExamResults() {
  clearInterval(timerInterval);
  if (currentUsername) localStorage.removeItem(`remainingTime_${currentUsername}`);

  document.getElementById("examPanel").innerHTML = `
    <div style="text-align:center; padding: 60px;">
      <h3>Sedang Memproses & Mengirimkan Jawaban...</h3>
      <p style="color:#64748b; margin-top:8px;">Mohon jangan menutup halaman ini.</p>
    </div>
  `;

  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "submit",
        username: currentUserData.username || currentUsername,
        nama: currentUserData.nama || "-",
        kelas: currentUserData.kelas || "-",
        jawaban: userAnswers
      }),
    });
  } catch (err) {
    console.error("Gagal Mengirim Data:", err);
  }

  showFinalResult();
}

function showFinalResult() {
  document.getElementById("gridSidebar").style.display = "none";
  document.querySelector(".akm-footer").style.display = "none";

  document.getElementById("examPanel").innerHTML = `
    <div style="text-align: center; padding: 40px 10px;">
      <div style="font-size: 4rem; margin-bottom: 12px;">🏛️</div>
      <h2 style="color: #0f172a; margin-bottom: 8px;">Ujian Asesmen Selesai</h2>
      <p style="color: #64748b; font-size: 0.95rem; margin-bottom: 24px;">
        Jawaban dan respon ujian Anda telah tersimpan secara resmi di server.
      </p>

      <button onclick="logout()" style="padding: 12px 30px; background-color: #1e3a8a; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
        Keluar Dari Portal Ujian
      </button>
    </div>
  `;
}

function logout() {
  clearInterval(timerInterval);
  localStorage.removeItem("userData");
  if (currentUsername) localStorage.removeItem(`remainingTime_${currentUsername}`);
  window.location.href = "index.html";
}
