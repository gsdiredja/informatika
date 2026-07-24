document.addEventListener("DOMContentLoaded", () => {
  // 1. Verifikasi Login Siswa
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
    .then((questions) => {
      renderQuestions(questions);
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
});

// Fungsi Render Soal berdasarkan Type (radio, checkbox, essay)
function renderQuestions(questions) {
  const container = document.getElementById("questionsContainer");
  container.innerHTML = ""; // Bersihkan loading

  questions.forEach((q, index) => {
    const qBox = document.createElement("div");
    qBox.style.marginBottom = "25px";
    qBox.style.padding = "15px";
    qBox.style.border = "1px solid #e2e8f0";
    qBox.style.borderRadius = "8px";

    let html = `<h4 style="margin-top:0; color:#2d3748;">${q.title}</h4>`;
    html += `<p style="margin-bottom: 12px; font-weight: 500;">${index + 1}. ${q.text}</p>`;

    // Render Pilihan (Radio/Benar-Salah & Pilihan Ganda)
    if (q.type === "radio") {
      q.options.forEach((opt) => {
        html += `
          <div style="margin-bottom: 8px;">
            <label style="cursor: pointer;">
              <input type="radio" name="${q.name}" value="${opt.v}" required />
              <b>${opt.v}.</b> ${opt.t}
            </label>
          </div>
        `;
      });
    } 
    // Render Pilihan Ganda Kompleks (Checkbox)
    else if (q.type === "checkbox") {
      q.options.forEach((opt) => {
        html += `
          <div style="margin-bottom: 8px;">
            <label style="cursor: pointer;">
              <input type="checkbox" name="${q.name}" value="${opt.v}" />
              <b>${opt.v}.</b> ${opt.t}
            </label>
          </div>
        `;
      });
    } 
    // Render Essay
    else if (q.type === "essay") {
      html += `
        <textarea name="${q.name}" rows="4" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc;" placeholder="Tuliskan jawaban Anda di sini..." required></textarea>
      `;
    }

    qBox.innerHTML = html;
    container.appendChild(qBox);
  });
}
