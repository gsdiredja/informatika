// config.js
// URL Web App dari Google Apps Script Anda (WAJIB berakhiran /exec)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwIcsuTfH1FN2S6nopUOu31b-JlADHkISY4eCu9_z1vXaJD32hPmh6Aecrr8UMFnRd2/exec";

// Menyiapkan variabel global agar aman dipanggil dari halaman manapun
window.SCRIPT_URL = SCRIPT_URL;
window.API_URL = SCRIPT_URL; // Alias variabel untuk kompatibilitas penuh

window.CONFIG = {
    SCRIPT_URL: SCRIPT_URL,
    API_URL: SCRIPT_URL
};
