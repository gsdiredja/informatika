let currentQuestionIndex = 0;
let questionsData = [];
let userAnswers = {};

// 1. Inisialisasi saat halaman selesai dimuat
document.addEventListener("DOMContentLoaded", () => {
  // Ambil data user dari sessionStorage
  const userDataStr = sessionStorage.getItem("userData");
  const soalPath = sessionStorage.getItem("soalPath");

  if (!userDataStr || !soalPath) {
    alert("Sesi Anda telah berakhir. Silakan login kembali.");
    window.location.href = "index.html";
    return;
  }

  const userData = JSON.parse(userDataStr);

  // Tampilkan info user
  document.getElementById("userInfo").innerHTML = `
    <strong>${userData.nama || userData.username}</strong><br>
    Kelas: ${userData.kelas || '-'} | Username: ${userData.username}
  `;

  // Fetch file JSON soal berdasarkan pilihan paket di index
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
  
  // Menampilkan Judul Tipe Soal
  if (q.title) {
    html += `<h4 style="margin-top:0; color:#2d3748;">${q.title}</h4>`;
  }
  
  // Teks Soal (Tanpa Nomor Otomatis)
  html += `<p style="margin-bottom: 16px; font-weight: 500; line-height: 1.5;">${q.text}</p>`;

  // Render Pilihan / Input Jawaban (Tanpa Huruf A/B/C/D)
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
  } else if (q.type === "checkbox") {
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
  } else if (q.type === "essay") {
    const savedText = userAnswers[q.name] || "";
    html += `
      <textarea id="essayInput" name="${q.name}" rows="4" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; outline: none;" placeholder="Tuliskan jawaban Anda di sini..." oninput="hideWarning()">${savedText}</textarea>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;

  // FORMAT PROGRESS BARU: 1/45
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

  if (q.type === "radio") {
    const selected = document.querySelector(`input[name="${q.name}"]:checked`);
    if (selected) {
      userAnswers[q.name] = selected.value;
    }
  } else if (q.type === "checkbox") {
    const checkedBoxes = document.querySelectorAll(`input[name="${q.name}"]:checked`);
    const values = Array.from(checkedBoxes).map((cb) => cb.value);
    if (values.length > 0) {
      userAnswers[q.name] = values;
    } else {
      delete userAnswers[q.name];
    }
  } else if (q.type === "essay") {
    const essayText = document.getElementById("essayInput")?.value.trim();
    if (essayText) {
      userAnswers[q.name] = essayText;
    } else {
      delete userAnswers[q.name];
    }
  }
}

// 4. Cek Apakah Soal Saat Ini Sudah Dijawab
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

// 8. Menampilkan Pesan Peringatan
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

// 9. Kirim Jawaban Akhir
function submitExam() {
  saveCurrentAnswer();

  if (!isCurrentQuestionAnswered()) {
    showWarning("Anda harus menjawab soal terakhir sebelum mengumpulkan!");
    return;
  }

  if (confirm("Apakah Anda yakin ingin menyelesaikan ujian ini?")) {
    console.log("Jawaban dikirim:", userAnswers);
    alert("Jawaban berhasil disimpan. Terima kasih!");
    sessionStorage.clear();
    window.location.href = "index.html";
  }
}

// 10. Tombol Keluar / Logout
function logout() {
  if (confirm("Apakah Anda yakin ingin keluar dari ujian? Data yang belum tersimpan mungkin akan hilang.")) {
    sessionStorage.clear();
    window.location.href = "index.html";
  }
}
