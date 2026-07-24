let currentQuestionIndex = 0;
let questionsData = [];
let userAnswers = {};

// 1. Inisialisasi saat halaman selesai dimuat
document.addEventListener("DOMContentLoaded", () => {
  // Ambil data dari localStorage (bukan sessionStorage lagi)
  let userDataStr = localStorage.getItem("userData");
  let soalPath = localStorage.getItem("soalPath");

  // Jika tidak ada data, gunakan nilai bawaan (Default) agar tidak memicu alert error
  if (!userDataStr) {
    userDataStr = JSON.stringify({ username: "Siswa", nama: "Siswa Ujian", kelas: "-" });
  }
  if (!soalPath) {
    soalPath = "data/soal-uh1.json"; // Path soal default Anda
  }

  const userData = JSON.parse(userDataStr);

  // Tampilkan info user
  document.getElementById("userInfo").innerHTML = `
    <strong>${userData.nama || userData.username}</strong><br>
    Kelas: ${userData.kelas || '-'} | Username: ${userData.username}
  `;

  // Fetch file JSON soal
  fetch(soalPath)
    .then((res) => {
      if (!res.ok) throw new Error("Gagal memuat file soal");
      return res.json();
    })
    .then((data) => {
      questionsData = data;
      showQuestion(currentQuestionIndex);
    })
    .catch((err) => {
      console.error(err);
      alert("Gagal memuat soal ujian. Pastikan file JSON tersedia.");
    });
});

// 2. Fungsi untuk menampilkan 1 soal sesuai index
function showQuestion(index) {
  const container = document.getElementById("questionsContainer");
  const q = questionsData[index];

  let html = `<div style="padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">`;
  
  if (q.title) {
    html += `<h4 style="margin-top:0; color:#2d3748;">${q.title}</h4>`;
  }
  
  html += `<p style="margin-bottom: 16px; font-weight: 500; line-height: 1.5;">${q.text}</p>`;

  // Opsi Radio
  if (q.type === "radio") {
    q.options.forEach((opt) => {
      const isChecked = userAnswers[q.name] === opt.v ? "checked" : "";
      html += `
        <div style="margin-bottom: 10px;">
          <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <input type="radio" name="${q.name}" value="${opt.v}" ${isChecked} onchange="hideWarning()" />
            <span>${opt.t}</span>
          </label>
        </div>
      `;
    });
  } 
  // Opsi Checkbox
  else if (q.type === "checkbox") {
    const savedArr = userAnswers[q.name] || [];
    q.options.forEach((opt) => {
      const isChecked = savedArr.includes(opt.v) ? "checked" : "";
      html += `
        <div style="margin-bottom: 10px;">
          <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" name="${q.name}" value="${opt.v}" ${isChecked} onchange="hideWarning()" />
            <span>${opt.t}</span>
          </label>
        </div>
      `;
    });
  } 
  // Opsi Essay
  else if (q.type === "essay") {
    const savedText = userAnswers[q.name] || "";
    html += `
      <textarea id="essayInput" name="${q.name}" rows="4" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; outline: none;" placeholder="Tuliskan jawaban Anda di sini..." oninput="hideWarning()">${savedText}</textarea>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;

  // Indikator Progress 1/45
  document.getElementById("questionProgress").innerText = `${index + 1}/${questionsData.length}`;

  // Navigasi Tombol
  document.getElementById("btnPrev").disabled = (index === 0);

  if (index === questionsData.length - 1) {
    document.getElementById("btnNext").style.display = "none";
    document.getElementById("btnSubmitExam").style.display = "inline-block";
  } else {
    document.getElementById("btnNext").style.display = "inline-block";
    document.getElementById("btnSubmitExam").style.display = "none";
  }
}

// 3. Simpan Jawaban Soal Saat Ini
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

// 4. Validasi Soal Terjawab
function isCurrentQuestionAnswered() {
  const q = questionsData[currentQuestionIndex];
  const ans = userAnswers[q.name];

  if (!ans) return false;
  if (Array.isArray(ans) && ans.length === 0) return false;
  if (typeof ans === "string" && ans.trim() === "") return false;

  return true;
}

// 5. Sembunyikan Pesan Peringatan
function hideWarning() {
  saveCurrentAnswer();
  const warnEl = document.getElementById("warningMessage");
  if (warnEl) warnEl.style.display = "none";
}

// 6. Tombol Selanjutnya
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

// 7. Tombol Sebelumnya
function prevQuestion() {
  saveCurrentAnswer();
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    showQuestion(currentQuestionIndex);
  }
}

// 8. Menampilkan Peringatan
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

// 9. Kirim Jawaban Akhir & Hitung Skor
function submitExam() {
  saveCurrentAnswer();

  if (!isCurrentQuestionAnswered()) {
    showWarning("Anda harus menjawab soal terakhir sebelum mengumpulkan!");
    return;
  }

  if (confirm("Apakah Anda yakin ingin menyelesaikan ujian ini?")) {
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
}

// 10. Menampilkan Skor + Tombol Ulangi Ujian
function showFinalResult(score, correctCount, totalQuestions) {
  const container = document.getElementById("questionsContainer");

  document.getElementById("btnPrev").style.display = "none";
  document.getElementById("btnNext").style.display = "none";
  document.getElementById("btnSubmitExam").style.display = "none";
  document.getElementById("questionProgress").style.display = "none";
  
  const warnEl = document.getElementById("warningMessage");
  if (warnEl) warnEl.style.display = "none";

  container.innerHTML = `
    <div style="text-align: center; padding: 30px 15px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
      <h2 style="color: #1e293b; margin-bottom: 8px;">Ujian Selesai!</h2>
      <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 20px;">Hasil nilai Anda telah tercatat.</p>
      
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; max-width: 280px; margin: 0 auto 20px auto;">
        <span style="font-size: 0.85rem; color: #15803d; font-weight: 700; letter-spacing: 0.5px;">SKOR AKHIR</span>
        <h1 style="font-size: 3.5rem; color: #16a34a; margin: 6px 0; font-weight: 800;">${score}</h1>
        <p style="font-size: 0.85rem; color: #166534; margin: 0;">Benar ${correctCount} dari ${totalQuestions} soal</p>
      </div>

      <div style="display: flex; gap: 10px; justify-content: center;">
        <button onclick="restartExam()" style="padding: 10px 20px; background-color: #2563eb; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
          🔄 Ulangi Ujian Lagi
        </button>
        <button onclick="logout()" style="padding: 10px 20px; background-color: #dc2626; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
          Keluar
        </button>
      </div>
    </div>
  `;
}

// 11. Fungsi untuk Mengulangi Ujian Tanpa Logout
function restartExam() {
  userAnswers = {};
  currentQuestionIndex = 0;

  document.getElementById("btnPrev").style.display = "inline-block";
  document.getElementById("questionProgress").style.display = "inline-block";

  showQuestion(currentQuestionIndex);
}

// 12. Tombol Keluar / Logout Manual
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}
