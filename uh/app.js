document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const alertBox = document.getElementById("alertBox");

  // Ganti URL ini dengan URL Web App Google Apps Script Anda jika ada
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxYOUR_SCRIPT_ID_HERE/exec";

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();
      const jenisUjian = document.getElementById("jenisUjian").value;
      const submitBtn = loginForm.querySelector("button[type='submit']");

      const originalBtnText = submitBtn.innerText;
      submitBtn.innerText = "Memproses...";
      submitBtn.disabled = true;
      hideAlert();

      try {
        const response = await fetch(SCRIPT_URL, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            action: "login",
            username: username,
            password: password
          }),
        });

        const result = await response.json();

        if (result.status === "success") {
          localStorage.setItem("userData", JSON.stringify(result.data || { username: username }));
          localStorage.setItem("soalPath", jenisUjian);
          window.location.href = "ujian.html";
        } else {
          showAlert(result.message || "Username atau Password salah!");
          submitBtn.innerText = originalBtnText;
          submitBtn.disabled = false;
        }
      } catch (error) {
        console.error("Login Error / Offline Mode:", error);
        
        // Fallback jika Google Script error/offline agar siswa tetap bisa masuk
        const fallbackUserData = { username: username, nama: username, kelas: "-" };
        localStorage.setItem("userData", JSON.stringify(fallbackUserData));
        localStorage.setItem("soalPath", jenisUjian);

        window.location.href = "ujian.html";
      }
    });
  }

  function showAlert(message) {
    if (alertBox) {
      alertBox.innerText = message;
      alertBox.style.display = "block";
    } else {
      alert(message);
    }
  }

  function hideAlert() {
    if (alertBox) {
      alertBox.style.display = "none";
      alertBox.innerText = "";
    }
  }
});
