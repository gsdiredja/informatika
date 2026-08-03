document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const alertBox = document.getElementById("alertBox");

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxAkcxn5FRhUkz2lSnrx2boJK4MoAG7Lacl--mQ_DbLhVUzCJDQHs4gbOLmah0o7pv4/exec";

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
          // Menyimpan result.user (bukan result.data) agar data Nama & Kelas tersimpan sempurna
          localStorage.setItem("userData", JSON.stringify(result.user || { username: username, nama: username, kelas: "-" }));
          localStorage.setItem("soalPath", jenisUjian);
          window.location.href = "ujian.html";
        } else {
          showAlert(result.message || "Username atau Password salah!");
          submitBtn.innerText = originalBtnText;
          submitBtn.disabled = false;
        }
      } catch (error) {
        console.error("Login Error / Offline Mode:", error);
        
        // Fallback jika terjadi kegagalan jaringan
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
