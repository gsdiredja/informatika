document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const alertBox = document.getElementById("alertBox");

  // URL Web App Google Apps Script Anda (Ganti dengan URL milik Anda jika berbeda)
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwCk4HpQqBRpvo4soMIMeHL77dpEKesW3VkrQEfE0wQqbZzood50HP8OV84K2R4S0VZ/exec";

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Tangkap input dari form index.html
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();
      const jenisUjian = document.getElementById("jenisUjian").value; // Path file JSON soal
      const submitBtn = loginForm.querySelector("button[type='submit']");

      // Tampilkan indikator loading pada tombol
      const originalBtnText = submitBtn.innerText;
      submitBtn.innerText = "Memproses...";
      submitBtn.disabled = true;
      hideAlert();

      try {
        // 1. OPSI VERIFIKASI OFFLINE/LOCAL (Opsional jika ingin bypass/testing langsung)
        // Jika tidak terhubung ke Google Apps Script, Anda bisa langsung meloloskan sesi
        /*
        const dummyUserData = { username: username, nama: username, kelas: "X" };
        localStorage.setItem("userData", JSON.stringify(dummyUserData));
        localStorage.setItem("soalPath", jenisUjian);
        window.location.href = "ujian.html";
        return;
        */

        // 2. KONEKSI KE GOOGLE APPS SCRIPT (ONLINE)
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
          // Simpan data user dan pilihan file soal ke localStorage (Bukan sessionStorage)
          // Ini mencegah munculnya notifikasi "Sesi berakhir" saat refresh / diulang
          localStorage.setItem("userData", JSON.stringify(result.data || { username: username }));
          localStorage.setItem("soalPath", jenisUjian);

          // Pindah ke halaman ujian
          window.location.href = "ujian.html";
        } else {
          showAlert(result.message || "Username atau Password salah!");
          submitBtn.innerText = originalBtnText;
          submitBtn.disabled = false;
        }
      } catch (error) {
        console.error("Login Error:", error);
        
        // Fallback jika terjadi error koneksi ke Google Script:
        // Tetap izinkan masuk menggunakan data lokal agar siswa tidak terhambat
        const fallbackUserData = { username: username, nama: username, kelas: "-" };
        localStorage.setItem("userData", JSON.stringify(fallbackUserData));
        localStorage.setItem("soalPath", jenisUjian);

        window.location.href = "ujian.html";
      }
    });
  }

  // Helper untuk menampilkan alert pesan kesalahan
  function showAlert(message) {
    if (alertBox) {
      alertBox.innerText = message;
      alertBox.style.display = "block";
    } else {
      alert(message);
    }
  }

  // Helper untuk menyembunyikan alert
  function hideAlert() {
    if (alertBox) {
      alertBox.style.display = "none";
      alertBox.innerText = "";
    }
  }
});
