let currentQuestionIndex = 0;
let questionsData = [];
let userAnswers = {};

// KONFIGURASI WAKTU (60 Menit)
const EXAM_DURATION_MINUTES = 60;
let totalSeconds = EXAM_DURATION_MINUTES * 60;
let timerInterval = null;

document.addEventListener("DOMContentLoaded", () => {
  let userDataStr = localStorage.getItem("userData");
  let soalPath = localStorage.getItem("soalPath");

  if (!userDataStr) {
    userDataStr = JSON.stringify({ username: "Siswa", nama: "Nama Siswa", kelas: "Kelas / NISN" });
  }

  if (!soalPath || soalPath === "undefined") {
    soalPath = "./data/soal-uh1.json";
  }

  const userData = JSON.parse(userDataStr);

  document.getElementById("userInfo").innerHTML = `
    <strong style="font-size: 1.1rem; color: #1e293b;">${userData.nama || userData.username}</strong><br>
    <span style="color: #64748b; font-size: 0.85rem;">Kelas: ${userData.kelas || '-'} | NISN: ${userData.username}</span>
  `;

  // Cek jika ada sisa waktu tersimpan dari sesi sebelumnya / setelah refresh
  const savedRemainingTime = localStorage.getItem("remainingTime");
  if (savedRemainingTime !== null) {
    totalSeconds = parseInt(savedRemainingTime, 10);
  }

  // Jalankan Timer Hitung Mundur
  startTimer();

  // Load Data Soal Ujian
  fetch(soalPath)
    .then((res) => {
      if (!res.ok) throw new Error("HTTP Status " + res.status);
      return res.json();
    })
    .then((data) => {
      questionsData = data;
      showQuestion(currentQuestionIndex);
    })
    .catch((err) => {
      console.error(err);
      document.getElementById("questionsContainer").innerHTML = `
        <div style="color: #dc2626; padding: 20px; text-align: center;">
          <p><strong>Gagal Memuat Soal Ujian!</strong></p>
          <small>Pastikan file JSON berada di folder <code>data/</code> server Anda (Path: ${soalPath})</small>
        </div>
      `;
    });
});

// LOGIKA TIMER
function startTimer() {
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    totalSeconds--;
    localStorage.setItem("remainingTime", totalSeconds);

    updateTimerDisplay();

    // Notifikasi peringatan saat sisa 5 menit
    if (totalSeconds === 300) {
      alert("Peringatan: Waktu pengerjaan tinggal 5 menit lagi!");
    }

    // Jika waktu habis
    if (totalSeconds <= 0) {
      clearInterval(timerInterval);
      localStorage.removeItem("remainingTime");
      alert("Waktu ujian telah habis! Sistem akan otomatis mengumpulkan jawaban Anda.");
      forceSubmitExam();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const timerDisplay = document.getElementById("timerDisplay");
  if (!timerDisplay) return;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  timerDisplay.innerText = `${formattedMinutes}:${formattedSeconds}`;
}

// MENAMPILKAN SOAL
function showQuestion(index) {
  const container = document.getElementById("questionsContainer");
  const q = questionsData[index];

  let html = `<div style="padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">`;
  
  if (q.title) {
    html += `<h4 style="margin-top:0; color:#2d3748; margin-bottom: 10px;">${q.title}</h4>`;
  }
  
  html += `<p style="margin-bottom: 16px; font-weight: 500; line-height: 1.5; color: #1e293b;">${q.text}</p>`;

  if (q.type === "radio") {
    q.options.forEach((opt) => {
      const isChecked = userAnswers[q.name] === opt.v ? "checked" : "";
      html += `
        <div style="margin-bottom: 10px;">
          <label style="cursor: pointer; display: flex; align-items: center; gap: 8px; color: #334155;">
            <input type="radio" name="${q.name}" value="${opt.v}" ${isChecked} onchange="hideWarning()" />
            <span>${opt.t}</span>
          </label>
        </div>
      `;
    });
  } else if (q.type === "checkbox") {
    const savedArr = userAnswers[q.name] || [];
    q.options.forEach((opt) => {
      const isChecked = savedArr.includes(opt.v) ? "checked" : "";
      html += `
        <div style="margin-bottom: 10px;">
          <label style="cursor: pointer; display: flex; align-items: center; gap: 8px; color: #334155;">
            <input type="checkbox" name="${q.name}" value="${opt.v}" ${isChecked} onchange="hideWarning()" />
            <span>${opt.t}</span>
          </label>
        </div>
      `;
    });
  } else if (q.type === "essay") {
    const savedText = userAnswers[q.name] || "";
    html += `
      <textarea id="essayInput" name="${q.name}" rows="4" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; outline: none;" placeholder="Tuliskan jawaban Anda di sini..." oninput="hideWarning()">${savedText}</textarea>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;

  document.getElementById("questionProgress").innerText = `${index + 1}/${questionsData.length}`;
  document.getElementById("btnPrev").disabled = (index === 0);

  if (index === questionsData.length - 1) {
    document.getElementById("btnNext").style.display = "none";
    document.getElementById("btnSubmitExam").style.display = "inline-block";
  } else {
    document.getElementById("btnNext").style.display = "inline-block";
    document.getElementById("btnSubmitExam").style.display = "none";
  }
}

// MENYIMPAN JAWABAN
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
}

function isCurrentQuestionAnswered() {
  const q = questionsData[currentQuestionIndex];
  const ans = userAnswers[q.name];

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

// NAVIGASI
function nextQuestion() {
  saveCurrentAnswer();

  if (!isCurrentQuestionAnswered()) {
    showWarning("Anda harus menjawab soal ini sebelum melanjutkan!");
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
    warnEl.style.color = "#dc2626";
    warnEl.style.backgroundColor = "#fef2f2";
    warnEl.style.padding = "8px 12px";
    warnEl.style.borderRadius = "6px";
    warnEl.style.marginTop = "10px";
    warnEl.style.fontSize = "0.875rem";
    warnEl.style.border = "1px solid #fecaca";

    const container = document.getElementById("questionsContainer");
    container.parentNode.insertBefore(warnEl, container.nextSibling);
  }
  warnEl.innerText = msg;
  warnEl.style.display = "block";
}

// SUBMIT JAWABAN
function submitExam() {
  saveCurrentAnswer();

  if (!isCurrentQuestionAnswered()) {
    showWarning("Anda harus menjawab soal terakhir sebelum mengumpulkan!");
    return;
  }

  if (confirm("Apakah Anda yakin ingin menyelesaikan ujian ini?")) {
    processExamResults();
  }
}

function forceSubmitExam() {
  saveCurrentAnswer();
  processExamResults();
}

function processExamResults() {
  clearInterval(timerInterval);
  localStorage.removeItem("remainingTime");

  let correctCount = 0;
  let totalQuestions = questionsData.length;

  questionsData.forEach((q) => {
    const userAns = userAnswers[q.name];
    const correctAns = q.answer;

    if (q.type === "radio") {
      if (userAns === correctAns) correctCount++;
    } else if (q.type === "checkbox") {
      if (Array.isArray(userAns) && Array.isArray(correctAns)) {
        if (
          userAns.length === correctAns.length &&
          userAns.every((val) => correctAns.includes(val))
        ) {
          correctCount++;
        }
      }
    }
  });

  const score = Math.round((correctCount / totalQuestions) * 100);
  showFinalResult(score, correctCount, totalQuestions);
}

function showFinalResult(score, correctCount, totalQuestions) {
  const container = document.getElementById("questionsContainer");

  document.getElementById("btnPrev").style.display = "none";
  document.getElementById("btnNext").style.display = "none";
  document.getElementById("btnSubmitExam").style.display = "none";
  document.getElementById("questionProgress").style.display = "none";
  document.getElementById("timerContainer").style.display = "none";
  
  const warnEl = document.getElementById("warningMessage");
  if (warnEl) warnEl.style.display = "none";

  container.innerHTML = `
    <div style="text-align: center; padding: 20px 10px; background-color: #ffffff; border-radius: 12px;">
      <h2 style="color: #1e293b; margin-bottom: 8px;">Ujian Selesai!</h2>
      <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 20px;">Hasil nilai Anda telah tercatat.</p>
      
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; max-width: 280px; margin: 0 auto 20px auto;">
        <span style="font-size: 0.85rem; color: #15803d; font-weight: 700; letter-spacing: 0.5px;">SKOR AKHIR</span>
        <h1 style="font-size: 3.5rem; color: #16a34a; margin: 6px 0; font-weight: 800;">${score}</h1>
        <p style="font-size: 0.85rem; color: #166534; margin: 0;">Benar ${correctCount} dari ${totalQuestions} soal</p>
      </div>

      <div style="display: flex; gap: 10px; justify-content: center;">
        <button onclick="restartExam()" style="padding: 10px 20px; background-color: #4f46e5; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
          🔄 Ulangi Ujian Lagi
        </button>
        <button onclick="logout()" style="padding: 10px 20px; background-color: #dc2626; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
          Keluar
        </button>
      </div>
    </div>
  `;
}

function restartExam() {
  userAnswers = {};
  currentQuestionIndex = 0;
  totalSeconds = EXAM_DURATION_MINUTES * 60;
  localStorage.removeItem("remainingTime");

  document.getElementById("btnPrev").style.display = "inline-block";
  document.getElementById("questionProgress").style.display = "inline-block";
  document.getElementById("timerContainer").style.display = "flex";

  startTimer();
  showQuestion(currentQuestionIndex);
}

function logout() {
  clearInterval(timerInterval);
  localStorage.clear();
  window.location.href = "index.html";
}
