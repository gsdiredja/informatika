let currentQuestionIndex = 0;
let questionsData = [];
let userAnswers = {};

// URL GOOGLE APPS SCRIPT
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlIv4VZBFcgi5iZ3sdW-gNGqBXbA4IStfH98qPlcNMsVd1oTh0gm7cQMXUE70oKqjT/exec";

// KONFIGURASI WAKTU (60 Menit)
const EXAM_DURATION_MINUTES = 60;
let totalSeconds = EXAM_DURATION_MINUTES * 60;
let timerInterval = null;
let currentUsername = "";
let currentUserData = {};

// FUNGSI UNTUK MENYEIMBANGKAN NAMA PAKET AGAR KONSISTEN DI LOCALSTORAGE
function getCleanPaketId(rawPath) {
  if (!rawPath) return "soal-uh1";
  return String(rawPath)
    .replace(/^.*[\\\/]/, '') 
    .replace('.json', '')     
    .trim()
    .toLowerCase();
}

// ALGORITMA PENGAJAKAN SOAL & JAWABAN (FISHER-YATES SHUFFLE)
function shuffleArray(array) {
  let shuffled = array.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

document.addEventListener("DOMContentLoaded", () => {
  let userDataStr = localStorage.getItem("userData");
  let rawSoalPath = localStorage.getItem("soalPath");

  if (!userDataStr) {
    window.location.href = "index.html";
    return;
  }

  if (!rawSoalPath || rawSoalPath === "undefined") {
    rawSoalPath = "./data/soal-uh1.json";
  }

  currentUserData = JSON.parse(userDataStr);
  currentUsername = currentUserData.username || "";

  const cleanPaketId = getCleanPaketId(rawSoalPath);

  // Render Info Peserta Ujian
  document.getElementById("userInfo").innerHTML = `
    PESERTA: <strong>${currentUserData.nama || currentUserData.username}</strong> | KELAS: <strong>${currentUserData.kelas || '-'}</strong> | NISN: <strong>${currentUserData.username}</strong>
  `;

  // 🔒 RESTORE SISA WAKTU (TIMER CONTINUATION)
  const savedRemainingTime = localStorage.getItem(`remainingTime_${currentUsername}`);
  if (savedRemainingTime !== null) {
    totalSeconds = parseInt(savedRemainingTime, 10);
  } else {
    totalSeconds = EXAM_DURATION_MINUTES * 60;
  }

  startTimer();

  // 🔒 PENYIMPANAN SOAL & JAWABAN PERSISTEN (ANTI RESET SAAT LOGOUT/REFRESH)
  const cachedQuestionsKey = `questions_${currentUsername}_${cleanPaketId}`;
  const savedAnswersKey = `answers_${currentUsername}_${cleanPaketId}`;

  // Restore jawaban yang pernah diisi
  const savedUserAnswers = localStorage.getItem(savedAnswersKey);
  if (savedUserAnswers) {
    try { userAnswers = JSON.parse(savedUserAnswers); } catch(e) {}
  }

  const cachedQuestions = localStorage.getItem(cachedQuestionsKey);

  if (cachedQuestions) {
    // 1. GUNAKAN DATA LAMA JIKA ADA (MELEPAS KEMBALI PROSES UJIAN SEBELUMNYA)
    questionsData = JSON.parse(cachedQuestions);

    // Cari nomor soal terakhir yang belum diisi agar siswa langsung diarahkan ke sana
    let lastUnansweredIndex = 0;
    for (let i = 0; i < questionsData.length; i++) {
      if (!isQuestionAnswered(questionsData[i].name)) {
        lastUnansweredIndex = i;
        break;
      }
    }
    currentQuestionIndex = lastUnansweredIndex;

    renderNumberGrid();
    showQuestion(currentQuestionIndex);
  } else {
    // 2. BARU PERTAMA KALI UJIAN: FETCH & ACAK SEKALI
    fetch(rawSoalPath)
      .then((res) => {
        if (!res.ok) throw new Error("HTTP Status " + res.status);
        return res.json();
      })
      .then((data) => {
        questionsData = shuffleArray(data);
        questionsData.forEach((q) => {
          if (q.options && Array.isArray(q.options)) {
            q.options = shuffleArray(q.options);
          }
        });

        localStorage.setItem(cachedQuestionsKey, JSON.stringify(questionsData));

        renderNumberGrid();
        showQuestion(currentQuestionIndex);
      })
      .catch((err) => {
        console.error(err);
        document.getElementById("questionsContainer").innerHTML = `
          <div style="color: #dc2626; padding: 20px; text-align: center;">
            <p><strong>Gagal Memuat Soal Ujian!</strong></p>
            <small>Pastikan file JSON berada di folder <code>data/</code> server Anda.</small>
          </div>
        `;
      });
  }
});

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    totalSeconds--;
    if (currentUsername) localStorage.setItem(`remainingTime_${currentUsername}`, totalSeconds);
    updateTimerDisplay();

    if (totalSeconds <= 0) {
      clearInterval(timerInterval);
      alert("Waktu Ujian telah habis! Jawaban Anda dikumpulkan secara otomatis.");
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

function toggleSidebar() {
  const sidebar = document.getElementById("gridSidebar");
  if (sidebar) sidebar.classList.toggle("open");
}

function changeFontSize(size) {
  const panel = document.getElementById("examPanel");
  if (size === 'small') panel.style.fontSize = '0.875rem';
  else if (size === 'medium') panel.style.fontSize = '1rem';
  else if (size === 'large') panel.style.fontSize = '1.15rem';
}

function renderNumberGrid() {
  const gridContainer = document.getElementById("numberGrid");
  if (!gridContainer) return;
  let html = "";

  questionsData.forEach((q, idx) => {
    const isAnswered = isQuestionAnswered(q.name);
    const isActive = idx === currentQuestionIndex;

    let classList = "btn-num";
    if (isActive) classList += " active";
    else if (isAnswered) classList += " answered";

    html += `<button class="${classList}" onclick="jumpToQuestion(${idx})" title="Soal ${idx + 1}">${idx + 1}</button>`;
  });

  gridContainer.innerHTML = html;
}

function jumpToQuestion(index) {
  if (index === currentQuestionIndex) return;

  saveCurrentAnswer();

  if (!isQuestionAnswered(questionsData[currentQuestionIndex].name)) {
    showWarning("Anda harus menjawab soal ini terlebih dahulu sebelum berpindah ke nomor lain!");
    return;
  }

  currentQuestionIndex = index;
  showQuestion(currentQuestionIndex);

  const sidebar = document.getElementById("gridSidebar");
  if (sidebar && sidebar.classList.contains("open")) {
    sidebar.classList.remove("open");
  }
}

function showQuestion(index) {
  const container = document.getElementById("questionsContainer");
  const q = questionsData[index];

  document.getElementById("questionTitle").innerText = `Soal Nomor ${index + 1}`;
  
  let typeText = "Pilihan Ganda";
  if (q.type === "checkbox") typeText = "Pilihan Ganda Kompleks";
  else if (q.type === "essay") typeText = "Uraian / Essay";
  document.getElementById("questionTypeBadge").innerText = typeText;

  let html = `<div style="line-height: 1.6; color: #1e293b;">`;
  html += `<p style="margin-bottom: 20px; font-weight: 600; font-size: 1.05rem;">${q.text}</p>`;

  // 1. PILIHAN GANDA (SINGLE CHOICE)
  if (q.type === "radio") {
    q.options.forEach((opt, idx) => {
      const isChecked = userAnswers[q.name] === opt.v;
      const labelBadge = String.fromCharCode(65 + idx);

      html += `
        <div class="option-item ${isChecked ? 'selected' : ''}" onclick="selectRadioOption('${q.name}', '${opt.v}', this)">
          <input type="radio" name="${q.name}" value="${opt.v}" ${isChecked ? 'checked' : ''} style="display: none;" />
          <div class="option-badge">${labelBadge}</div>
          <div class="option-text">${opt.t}</div>
        </div>
      `;
    });
  } 
  
  // 2. PILIHAN GANDA KOMPLEKS (MULTIPLE CHOICE)
  else if (q.type === "checkbox") {
    const savedArr = userAnswers[q.name] || [];
    q.options.forEach((opt, idx) => {
      const isChecked = savedArr.includes(opt.v);
      const labelBadge = idx + 1;

      html += `
        <div class="option-item ${isChecked ? 'selected' : ''}" onclick="toggleCheckboxOption('${q.name}', '${opt.v}', this)">
          <input type="checkbox" name="${q.name}" value="${opt.v}" ${isChecked ? 'checked' : ''} style="display: none;" />
          <div class="option-badge badge-checkbox">${labelBadge}</div>
          <div class="option-text">${opt.t}</div>
        </div>
      `;
    });
  } 
  
  // 3. ESSAY / URAIAN
  else if (q.type === "essay") {
    const savedText = userAnswers[q.name] || "";
    html += `
      <textarea id="essayInput" name="${q.name}" rows="5" class="essay-box" placeholder="Ketikkan jawaban uraian Anda secara rinci..." oninput="hideWarning()">${savedText}</textarea>
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

function selectRadioOption(qName, val, el) {
  const parent = el.parentNode;
  parent.querySelectorAll('.option-item').forEach(item => {
    item.classList.remove('selected');
    const input = item.querySelector('input');
    if (input) input.checked = false;
  });

  el.classList.add('selected');
  const input = el.querySelector('input');
  if (input) input.checked = true;

  saveCurrentAnswer();
  hideWarning();
}

function toggleCheckboxOption(qName, val, el) {
  const input = el.querySelector('input');
  if (input) {
    input.checked = !input.checked;
    if (input.checked) {
      el.classList.add('selected');
    } else {
      el.classList.remove('selected');
    }
  }
  saveCurrentAnswer();
  hideWarning();
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

  let rawSoalPath = localStorage.getItem("soalPath") || "soal-uh1";
  const cleanPaketId = getCleanPaketId(rawSoalPath);
  const savedAnswersKey = `answers_${currentUsername}_${cleanPaketId}`;
  localStorage.setItem(savedAnswersKey, JSON.stringify(userAnswers));

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
  const warnEl = document.getElementById("warningMessage");
  if (warnEl) warnEl.style.display = "none";
}

function nextQuestion() {
  saveCurrentAnswer();
  if (!isQuestionAnswered(questionsData[currentQuestionIndex].name)) {
    showWarning("Jawab soal ini terlebih dahulu sebelum melanjutkan!");
    return;
  }
  if (currentQuestionIndex < questionsData.length - 1) {
    currentQuestionIndex++;
    showQuestion(currentQuestionIndex);
  }
}

function prevQuestion() {
  saveCurrentAnswer();
  if (!isQuestionAnswered(questionsData[currentQuestionIndex].name)) {
    showWarning("Jawab soal ini terlebih dahulu sebelum berpindah!");
    return;
  }
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

  if (confirm("Apakah Anda yakin ingin mengakhiri ujian ini? Jawaban tidak dapat diubah setelah dikirim.")) {
    processExamResults();
  }
}

function forceSubmitExam() {
  saveCurrentAnswer();
  processExamResults();
}

async function processExamResults() {
  clearInterval(timerInterval);

  document.getElementById("examPanel").innerHTML = `
    <div style="text-align:center; padding: 60px;">
      <h3>Sedang Memproses & Mengirimkan Jawaban...</h3>
      <p style="color:#64748b; margin-top:8px;">Mohon jangan menutup halaman ini.</p>
    </div>
  `;

  let rawSoalPath = localStorage.getItem("soalPath") || "soal-uh1";

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
        paket: rawSoalPath,
        jawaban: userAnswers
      }),
    });
  } catch (err) {
    console.error("Gagal Mengirim Data:", err);
  }

  // 🔒 HANYA HAPUS CACHE SAAT BERHASIL SUBMIT JAWABAN
  clearExamCache();
  showFinalResult();
}

function showFinalResult() {
  const gridSidebar = document.getElementById("gridSidebar");
  const akmFooter = document.querySelector(".akm-footer");

  if (gridSidebar) gridSidebar.style.display = "none";
  if (akmFooter) akmFooter.style.display = "none";

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

// 🚪 LOGOUT AMAN: STATUS DI-RESET TAPI SOAL & WAKTU DI BROWSER TIDAK DI-RESET
function confirmLogout() {
  if (confirm("Apakah Anda yakin ingin keluar dari sesi ujian? Kemajuan jawaban dan sisa waktu Anda tetap akan tersimpan.")) {
    logout();
  }
}

function logout() {
  clearInterval(timerInterval);
  
  if (currentUsername) {
    fetch(SCRIPT_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "logout", username: currentUsername }),
    }).catch(() => {});
  }

  // JANGAN HAPUS CACHE SOAL/JAWABAN/TIMER SAAT LOGOUT
  localStorage.removeItem("userData");
  window.location.href = "index.html";
}

// FUNGSI INI HANYA DIPANGGUL JIKA SUBMIT SELESAI
function clearExamCache() {
  let rawSoalPath = localStorage.getItem("soalPath") || "soal-uh1";
  const cleanPaketId = getCleanPaketId(rawSoalPath);

  if (currentUsername) {
    localStorage.removeItem(`remainingTime_${currentUsername}`);
    localStorage.removeItem(`questions_${currentUsername}_${cleanPaketId}`);
    localStorage.removeItem(`answers_${currentUsername}_${cleanPaketId}`);
  }
}
