let currentQuestionIndex = 0;
let questionsData = [];
let userAnswers = {};

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzPdMy9I6A-GtHXY0TZd62ByjdkqPcpVFkcrA8_9vaOvIxZbWJ6CCGDjLqLpXtfWk4T/exec";

const EXAM_DURATION_MINUTES = 60;
let totalSeconds = EXAM_DURATION_MINUTES * 60;
let timerInterval = null;
let currentUsername = "";
let currentUserData = {};

function getCleanPaketId(rawPath) {
  if (!rawPath) return "soal-uh1";
  return String(rawPath)
    .replace(/^.*[\\\/]/, '') 
    .replace('.json', '')     
    .trim()
    .toLowerCase();
}

function shuffleArray(array) {
  if (!Array.isArray(array)) return [];
  let shuffled = array.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("questionsContainer");
  
  try {
    let userDataStr = localStorage.getItem("userData");
    let rawSoalPath = localStorage.getItem("soalPath");

    if (!userDataStr) {
      window.location.href = "index.html";
      return;
    }

    if (!rawSoalPath || rawSoalPath === "undefined") {
      rawSoalPath = "./data/soal-uh1.json";
    }

    try {
      currentUserData = JSON.parse(userDataStr);
    } catch(e) {
      currentUserData = { username: "siswa", nama: "Siswa", kelas: "-" };
    }
    
    currentUsername = currentUserData.username || "siswa";
    const cleanPaketId = getCleanPaketId(rawSoalPath);

    const userInfoEl = document.getElementById("userInfo");
    if (userInfoEl) {
      userInfoEl.innerHTML = `
        PESERTA: <strong>${currentUserData.nama || currentUserData.username}</strong> | KELAS: <strong>${currentUserData.kelas || '-'}</strong> | NISN: <strong>${currentUserData.username}</strong>
      `;
    }

    const savedRemainingTime = localStorage.getItem(`remainingTime_${currentUsername}`);
    if (savedRemainingTime !== null && !isNaN(parseInt(savedRemainingTime))) {
      totalSeconds = parseInt(savedRemainingTime, 10);
    } else {
      totalSeconds = EXAM_DURATION_MINUTES * 60;
    }

    startTimer();

    const cachedQuestionsKey = `questions_${currentUsername}_${cleanPaketId}`;
    const savedAnswersKey = `answers_${currentUsername}_${cleanPaketId}`;

    const savedUserAnswers = localStorage.getItem(savedAnswersKey);
    if (savedUserAnswers) {
      try { userAnswers = JSON.parse(savedUserAnswers); } catch(e) { userAnswers = {}; }
    }

    const cachedQuestions = localStorage.getItem(cachedQuestionsKey);

    if (cachedQuestions) {
      questionsData = JSON.parse(cachedQuestions);
      renderNumberGrid();
      showQuestion(0);
    } else {
      let loaded = false;
      try {
        const response = await fetch(SCRIPT_URL, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "getquestions", paket: cleanPaketId })
        });
        const result = await response.json();
        if (result.status === "success" && Array.isArray(result.data) && result.data.length > 0) {
          questionsData = shuffleArray(result.data);
          loaded = true;
        }
      } catch(err) {
        console.warn("Gagal load dari GAS, mencoba lokal file...", err);
      }

      if (!loaded) {
        let targetLocalPath = rawSoalPath;
        if (!targetLocalPath.startsWith('./') && !targetLocalPath.startsWith('data/')) {
          targetLocalPath = `./data/${cleanPaketId}.json`;
        }

        try {
          const localRes = await fetch(targetLocalPath);
          if (localRes.ok) {
            const localData = await localRes.json();
            if (Array.isArray(localData) && localData.length > 0) {
              questionsData = shuffleArray(localData);
              loaded = true;
            }
          }
        } catch(err) {
          console.error("Gagal load lokal JSON...", err);
        }
      }

      if (loaded && questionsData.length > 0) {
        questionsData.forEach((q) => {
          if (q.options && Array.isArray(q.options)) {
            q.options = shuffleArray(q.options);
          }
        });

        localStorage.setItem(cachedQuestionsKey, JSON.stringify(questionsData));
        renderNumberGrid();
        showQuestion(0);
      } else {
        if (container) {
          container.innerHTML = `
            <div style="color: #dc2626; padding: 30px; text-align: center; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
              <h3 style="margin-bottom: 8px;">⚠️ Soal Ujian Tidak Ditemukan!</h3>
              <p style="font-size: 0.9rem; color: #991b1b;">
                Paket soal <code>"${cleanPaketId}"</code> belum tersedia di Spreadsheet atau file lokal.<br>
                Silakan kembali ke menu Login dan pilih paket soal yang valid.
              </p>
            </div>
          `;
        }
      }
    }

  } catch (fatalError) {
    if (container) {
      container.innerHTML = `
        <div style="color: #dc2626; padding: 20px; text-align: center;">
          <p><strong>Terjadi Kesalahan Sistem:</strong> ${fatalError.message}</p>
        </div>
      `;
    }
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
      alert("Waktu Ujian telah habis!");
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
  if (!panel) return;
  if (size === 'small') panel.style.fontSize = '0.875rem';
  else if (size === 'medium') panel.style.fontSize = '1rem';
  else if (size === 'large') panel.style.fontSize = '1.15rem';
}

function renderNumberGrid() {
  const gridContainer = document.getElementById("numberGrid");
  if (!gridContainer || !questionsData) return;
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
    showWarning("Jawab soal ini terlebih dahulu sebelum berpindah!");
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
  if (!container || !questionsData[index]) return;

  const q = questionsData[index];

  const titleEl = document.getElementById("questionTitle");
  if (titleEl) titleEl.innerText = `Soal Nomor ${index + 1}`;
  
  let typeText = "Pilihan Ganda";
  if (q.type === "checkbox") typeText = "Pilihan Ganda Kompleks";
  else if (q.type === "essay") typeText = "Uraian / Essay";
  
  const badgeEl = document.getElementById("questionTypeBadge");
  if (badgeEl) badgeEl.innerText = typeText;

  let html = `<div style="line-height: 1.6; color: #1e293b;">`;
  html += `<p style="margin-bottom: 12px; font-weight: 600; font-size: 1.05rem;">${q.text}</p>`;

  // GAMBAR SOAL JIKA ADA
  if (q.image && q.image.trim() !== "") {
    html += `
      <div style="text-align: center; margin-bottom: 16px;">
        <img src="${q.image}" alt="Gambar Soal" style="max-width: 100%; max-height: 350px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      </div>
    `;
  }

  if (q.type === "radio" && Array.isArray(q.options)) {
    q.options.forEach((opt, idx) => {
      const isChecked = userAnswers[q.name] === opt.v;
      const labelBadge = String.fromCharCode(65 + idx);

      html += `
        <div class="option-item ${isChecked ? 'selected' : ''}" onclick="selectRadioOption('${q.name}', '${opt.v}', this)">
          <input type="radio" name="${q.name}" value="${opt.v}" ${isChecked ? 'checked' : ''} style="display: none;" />
          <div class="option-badge">${labelBadge}</div>
          <div class="option-text">${opt.t || ''}</div>
        </div>
      `;
    });
  } 
  else if (q.type === "checkbox" && Array.isArray(q.options)) {
    const savedArr = userAnswers[q.name] || [];
    q.options.forEach((opt, idx) => {
      const isChecked = savedArr.includes(opt.v);
      const labelBadge = idx + 1;

      html += `
        <div class="option-item ${isChecked ? 'selected' : ''}" onclick="toggleCheckboxOption('${q.name}', '${opt.v}', this)">
          <input type="checkbox" name="${q.name}" value="${opt.v}" ${isChecked ? 'checked' : ''} style="display: none;" />
          <div class="option-badge badge-checkbox">${labelBadge}</div>
          <div class="option-text">${opt.t || ''}</div>
        </div>
      `;
    });
  } 
  else if (q.type === "essay") {
    const savedText = userAnswers[q.name] || "";
    html += `
      <textarea id="essayInput" name="${q.name}" rows="5" class="essay-box" placeholder="Ketikkan jawaban uraian Anda secara rinci..." oninput="hideWarning()">${savedText}</textarea>
    `;
  } else {
    html += `<p style="color:#64748b;"><i>Tipe soal (${q.type}) tidak dapat ditampilkan.</i></p>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  const progEl = document.getElementById("questionProgress");
  if (progEl) progEl.innerText = `Soal ${index + 1} dari ${questionsData.length}`;
  
  const btnPrev = document.getElementById("btnPrev");
  if (btnPrev) btnPrev.disabled = (index === 0);

  const btnNext = document.getElementById("btnNext");
  const btnSubmit = document.getElementById("btnSubmitExam");

  if (index === questionsData.length - 1) {
    if (btnNext) btnNext.style.display = "none";
    if (btnSubmit) btnSubmit.style.display = "inline-flex";
  } else {
    if (btnNext) btnNext.style.display = "inline-flex";
    if (btnSubmit) btnSubmit.style.display = "none";
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
    if (input.checked) el.classList.add('selected');
    else el.classList.remove('selected');
  }
  saveCurrentAnswer();
  hideWarning();
}

function saveCurrentAnswer() {
  if (!questionsData || !questionsData[currentQuestionIndex]) return;
  const q = questionsData[currentQuestionIndex];

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
    const container = document.getElementById("questionsContainer");
    if (container) container.appendChild(warnEl);
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

  const panel = document.getElementById("examPanel");
  if (panel) {
    panel.innerHTML = `
      <div style="text-align:center; padding: 60px;">
        <h3>Sedang Memproses & Mengirimkan Jawaban...</h3>
        <p style="color:#64748b; margin-top:8px;">Mohon jangan menutup halaman ini.</p>
      </div>
    `;
  }

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

  clearExamCache();
  showFinalResult();
}

function showFinalResult() {
  const gridSidebar = document.getElementById("gridSidebar");
  const akmFooter = document.querySelector(".akm-footer");

  if (gridSidebar) gridSidebar.style.display = "none";
  if (akmFooter) akmFooter.style.display = "none";

  const panel = document.getElementById("examPanel");
  if (panel) {
    panel.innerHTML = `
      <div style="text-align: center; padding: 40px 10px;">
        <div style="font-size: 4rem; margin-bottom: 12px;">🏛️</div>
        <h2 style="color: #0f172a; margin-bottom: 8px;">Ujian Asesmen Selesai</h2>
        <p style="color: #64748b; font-size: 0.95rem; margin-bottom: 24px;">
          Jawaban Anda telah tersimpan secara resmi di server.
        </p>

        <button onclick="logout()" style="padding: 12px 30px; background-color: #1e3a8a; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
          Keluar Dari Portal Ujian
        </button>
      </div>
    `;
  }
}

function confirmLogout() {
  if (confirm("Apakah Anda yakin ingin keluar dari sesi ujian?")) {
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

  localStorage.removeItem("userData");
  window.location.href = "index.html";
}

function clearExamCache() {
  let rawSoalPath = localStorage.getItem("soalPath") || "soal-uh1";
  const cleanPaketId = getCleanPaketId(rawSoalPath);

  if (currentUsername) {
    localStorage.removeItem(`remainingTime_${currentUsername}`);
    localStorage.removeItem(`questions_${currentUsername}_${cleanPaketId}`);
    localStorage.removeItem(`answers_${currentUsername}_${cleanPaketId}`);
  }
}
