let questionsData = [];
let currentIndex = 0;
const userAnswers = {}; // Menyimpan jawaban pengguna sementara

document.addEventListener("DOMContentLoaded", () => {
  // 1. Cek Login Siswa
  const userData = sessionStorage.getItem("user_login");
  if (!userData) {
    alert("Sesi Anda telah berakhir. Silakan login kembali.");
    window.location.href = "index.html";
    return;
  }

  const user = JSON.parse(userData);
  document.getElementById("studentName").innerText = user.nama || user.username || "Siswa";
  document.getElementById("studentClass").innerText = `Kelas: ${user.kelas || "-"} | Username: ${user.username || "-"}`;

  // 2. Ambil File Soal dari sessionStorage
  const fileSoal = sessionStorage.getItem("selected_exam_file") || "data/soal-uh1.json";

  // 3. Fetch Data Soal JSON
  fetch(fileSoal)
    .then((res) => {
      if (!res.ok) throw new Error("Gagal mengambil file soal.");
      return res.json();
    })
    .then((data) => {
      questionsData = data;
      showQuestion(currentIndex);
    })
    .catch((err) => {
      console.error("Error loading exam:", err);
      document.getElementById("questionsContainer").innerHTML = 
        `<p style="color: red;">Gagal memuat soal. Pastikan file <b>${fileSoal}</b> tersedia!</p>`;
    });

  // Tombol Logout
  document.getElementById("btnLogout").addEventListener("click", () => {
    sessionStorage.clear();
    window.location.href = "index.html";
  });

  // Event Listener Navigasi
  document.getElementById("btnNext").addEventListener("click", () => {
    if (validateCurrentAnswer()) {
      saveCurrentAnswer();
      hideWarning();
      currentIndex++;
      showQuestion(currentIndex);
    } else {
      showWarning();
    }
  });

  document.getElementById("btnPrev").addEventListener("click", () => {
    saveCurrentAnswer();
    hideWarning();
    currentIndex--;
    showQuestion(currentIndex);
  });

  // Submit Ujian
  document.getElementById("examForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (validateCurrentAnswer()) {
      saveCurrentAnswer();
      hideWarning();
      
      if (confirm("Apakah Anda yakin ingin menyelesaikan ujian dan mengirim semua jawaban?")) {
        console.log("Jawaban Akhir Siswa:", userAnswers);
        alert("Jawaban berhasil dikirim!");
        // Tambahkan fungsi kirim ke Google Spreadsheet / Apps Script Anda di sini
      }
    } else {
      showWarning();
    }
  });
});

// Menampilkan 1 Soal berdasarkan Indeks Active
function showQuestion(index) {
  const container = document.getElementById("questionsContainer");
  const q = questionsData[index];

  let html = `<div style="padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px;">`;
  html += `<h4 style="margin-top:0; color:#2d3748;">${q.title}</h4>`;
  html += `<p style="margin-bottom: 12px; font-weight: 500;">${index + 1}. ${q.text}</p>`;

  // 1. Pilihan Ganda / Benar Salah (Radio)
  if (q.type === "radio") {
    q.options.forEach((opt) => {
      const isChecked = userAnswers[q.name] === opt.v ? "checked" : "";
      html += `
        <div style="margin-bottom: 8px;">
          <label style="cursor: pointer;">
            <input type="radio" name="${q.name}" value="${opt.v}" ${isChecked} onchange="hideWarning()" />
            <b>${opt.v}.</b> ${opt.t}
          </label>
        </div>
      `;
    });
  } 
  // 2. Pilihan Ganda Kompleks (Checkbox)
  else if (q.type === "checkbox") {
    const savedArr = userAnswers[q.name] || [];
    q.options.forEach((opt) => {
      const isChecked = savedArr.includes(opt.v) ? "checked" : "";
      html += `
        <div style="margin-bottom: 8px;">
          <label style="cursor: pointer;">
            <input type="checkbox" name="${q.name}" value="${opt.v}" ${isChecked} onchange="hideWarning()" />
            <b>${opt.v}.</b> ${opt.t}
          </label>
        </div>
      `;
    });
  } 
  // 3. Essay
  else if (q.type === "essay") {
    const savedText = userAnswers[q.name] || "";
    html += `
      <textarea id="essayInput" name="${q.name}" rows="4" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc;" placeholder="Tuliskan jawaban Anda di sini..." oninput="hideWarning()">${savedText}</textarea>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;

  // Update Tampilan Tombol Navigasi
  document.getElementById("questionProgress").innerText = `Soal ${index + 1} dari ${questionsData.length}`;
  
  document.getElementById("btnPrev").disabled = (index === 0);

  if (index === questionsData.length - 1) {
    document.getElementById("btnNext").style.display = "none";
    document.getElementById("btnSubmitExam").style.display = "inline-block";
  } else {
    document.getElementById("btnNext").style.display = "inline-block";
    document.getElementById("btnSubmitExam").style.display = "none";
  }
}

// Validasi Apakah Soal Sekarang Sudah Dijawab
function validateCurrentAnswer() {
  const q = questionsData[currentIndex];

  if (q.type === "radio") {
    const checkedRadio = document.querySelector(`input[name="${q.name}"]:checked`);
    return checkedRadio !== null;
  } 
  else if (q.type === "checkbox") {
    const checkedBoxes = document.querySelectorAll(`input[name="${q.name}"]:checked`);
    return checkedBoxes.length > 0;
  } 
  else if (q.type === "essay") {
    const essayVal = document.getElementById("essayInput")?.value.trim();
    return essayVal !== "" && essayVal !== undefined;
  }

  return false;
}

// Menyimpan Jawaban ke Objek Temporary
function saveCurrentAnswer() {
  const q = questionsData[currentIndex];

  if (q.type === "radio") {
    const checkedRadio = document.querySelector(`input[name="${q.name}"]:checked`);
    if (checkedRadio) userAnswers[q.name] = checkedRadio.value;
  } 
  else if (q.type === "checkbox") {
    const checkedBoxes = document.querySelectorAll(`input[name="${q.name}"]:checked`);
    userAnswers[q.name] = Array.from(checkedBoxes).map(cb => cb.value);
  } 
  else if (q.type === "essay") {
    const essayVal = document.getElementById("essayInput")?.value.trim();
    if (essayVal) userAnswers[q.name] = essayVal;
  }
}

function showWarning() {
  document.getElementById("warningMsg").style.display = "block";
}

function hideWarning() {
  document.getElementById("warningMsg").style.display = "none";
}
