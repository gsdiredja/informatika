// config.js
// URL Web App dari Google Apps Script Anda (WAJIB berakhiran /exec)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxB9i1MzUJh7xuJYWq9RycwQ9_J7OHcmH49IVbIlHHyoVsjSdKP75_I_xN8yQo_qNTT/exec";

// Menyiapkan variabel global agar aman dipanggil dari halaman manapun
window.SCRIPT_URL = SCRIPT_URL;
window.API_URL = SCRIPT_URL; // Alias variabel untuk kompatibilitas penuh

window.CONFIG = {
    SCRIPT_URL: SCRIPT_URL,
    API_URL: SCRIPT_URL
};
