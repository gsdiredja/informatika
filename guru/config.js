// config.js
// URL Web App dari Google Apps Script Anda (WAJIB berakhiran /exec)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwPUP983D6h686s8P0Qf2KX7_u3rwF3bwwtX7txj83m8w1lfBNU_FZPdfcezqCVAeWm/exec";

// Menyiapkan variabel global agar aman dipanggil dari halaman manapun
window.SCRIPT_URL = SCRIPT_URL;
window.API_URL = SCRIPT_URL; // Alias variabel untuk kompatibilitas penuh

window.CONFIG = {
    SCRIPT_URL: SCRIPT_URL,
    API_URL: SCRIPT_URL
};
