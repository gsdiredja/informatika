// GANTI DENGAN URL DEPLOYMENT BARU ANDA
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwCk4HpQqBRpvo4soMIMeHL77dpEKesW3VkrQEfE0wQqbZzood50HP8OV84K2R4S0VZ/exec";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm"); // Sesuaikan ID form Anda
  const errorMsg = document.getElementById("errorMessage"); // Sesuaikan ID elemen error Anda

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const usernameInput = document.getElementById("username").value.trim();
      const passwordInput = document.getElementById("password").value.trim();
      const btnSubmit = loginForm.querySelector("button[type='submit']");

      if (!usernameInput || !passwordInput) {
        showError("Username dan password wajib diisi!");
        return;
      }

      // Indikator Loading
      btnSubmit.disabled = true;
      btnSubmit.innerText = "Memeriksa...";
      if (errorMsg) errorMsg.innerText = "";

      try {
        // Mengirim request via GET parameter ke Apps Script
        const url = `${APPS_SCRIPT_URL}?action=login&username=${encodeURIComponent(usernameInput)}&password=${encodeURIComponent(passwordInput)}`;
        
        const response = await fetch(url);
        const result = await response.json();

        if (result.status === "success") {
          // Simpan data user ke SessionStorage
          sessionStorage.setItem("user_login", JSON.stringify(result.user));
          
          // Redirect ke halaman ujian/dashboard
          window.location.href = "ujian.html"; 
        } else {
          showError(result.message || "NISN atau Password salah!");
        }
      } catch (err) {
        console.error("Login Error:", err);
        showError("Gagal terhubung ke server. Periksa koneksi internet Anda.");
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Masuk";
      }
    });
  }

  function showError(msg) {
    if (errorMsg) {
      errorMsg.innerText = msg;
      errorMsg.style.display = "block";
    } else {
      alert(msg);
    }
  }
});
