const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwCk4HpQqBRpvo4soMIMeHL77dpEKesW3VkrQEfE0wQqbZzood50HP8OV84K2R4S0VZ/exec";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const statusMsg = document.getElementById("statusMessage");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Mengambil nilai dari dropdown (misal: "data/soal-uh1.json")
      const jenisUjian = document.getElementById("jenisUjian").value;
      const usernameInput = document.getElementById("username").value.trim();
      const passwordInput = document.getElementById("password").value.trim();
      const btnSubmit = document.getElementById("btnSubmit");

      if (!usernameInput || !passwordInput) {
        showStatus("Username dan password wajib diisi!", "danger");
        return;
      }

      // Indikator Loading
      btnSubmit.disabled = true;
      btnSubmit.innerText = "Memeriksa...";
      showStatus("Memeriksa kredensial...", "info");

      try {
        const url = `${APPS_SCRIPT_URL}?action=login&username=${encodeURIComponent(usernameInput)}&password=${encodeURIComponent(passwordInput)}`;
        
        const response = await fetch(url);
        const result = await response.json();

        if (result.status === "success") {
          // Simpan data user yang berhasil login
          sessionStorage.setItem("user_login", JSON.stringify(result.user));

          showStatus("Login berhasil! Membuka soal...", "success");

          // LANGSUNG DIARAHKAN KE FILE JSON YANG DIPILIH
          setTimeout(() => {
            window.location.href = jenisUjian; // Akandimengarahkan ke "data/soal-uh1.json"
          }, 800);

        } else {
          showStatus(result.message || "NISN atau Password salah!", "danger");
        }
      } catch (err) {
        console.error("Error Login:", err);
        showStatus("Gagal terhubung ke server. Periksa koneksi internet Anda.", "danger");
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Masuk Ke Ujian";
      }
    });
  }

  function showStatus(msg, type) {
    if (statusMsg) {
      statusMsg.innerText = msg;
      statusMsg.className = "status-message";

      if (type === "danger") {
        statusMsg.classList.add("text-danger");
      } else if (type === "success") {
        statusMsg.classList.add("text-success");
      } else {
        statusMsg.classList.add("text-info");
      }
    }
  }
});
