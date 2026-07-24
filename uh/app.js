// URL Google Apps Script milik Anda
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzsLfVWFNc85NVkQxbROAIXJmRyG5X3Q9q4XvpldeSe5XECDC-mov6soBnpA8mrg6UA/exec";

// Data Siswa (Bisa disesuaikan / ditambah)
const USERS = [
    { username: "1001", pass: "1234", nama: "Ahmad Dani", kelas: "X-RPL" },
    { username: "1002", pass: "1234", nama: "Budi Santoso", kelas: "X-RPL" }
];

let currentUserData = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let selectedUH = "";

// ==========================================
// 1. SISTEM LOGIN & SELEKSI UH
// ==========================================
document.getElementById("login-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value.trim();

    const match = USERS.find(user => user.username === u && user.pass === p);

    if (match) {
        currentUserData = match;
        document.getElementById("login-error").innerText = "";
        document.getElementById("login-screen").classList.remove("active");
        
        document.getElementById("welcome-msg").innerText = `Selamat Datang, ${currentUserData.nama}!`;
        document.getElementById("select-screen").classList.add("active");

        createWatermark(); // Aktifkan watermark nama
        renderUHButtons();
    } else {
        document.getElementById("login-error").innerText = "NISN atau Password salah!";
    }
});

function renderUHButtons() {
    const uhList = [
        { id: "uh1", title: "Ujian Harian 1" },
        { id: "uh2", title: "Ujian Harian 2" }
    ];

    const container = document.getElementById("uh-list");
    container.innerHTML = "";

    uhList.forEach(uh => {
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.innerText = uh.title;
        btn.onclick = () => loadQuizData(uh.id);
        container.appendChild(btn);
    });
}

// ==========================================
// 2. LOAD DATA JSON SOAL
// ==========================================
function loadQuizData(uhId) {
    selectedUH = uhId;
    const jsonPath = `data/soal-${uhId}.json`;

    fetch(jsonPath)
        .then(res => {
            if (!res.ok) throw new Error("Gagal memuat file soal JSON.");
            return res.json();
        })
        .then(data => {
            currentQuestions = data;
            currentQuestionIndex = 0;

            document.getElementById("select-screen").classList.remove("active");
            document.getElementById("quiz-screen").classList.add("active");
            
            document.getElementById("quiz-title").innerText = uhId.toUpperCase();
            renderCurrentQuestion();
        })
        .catch(err => {
            alert("Terjadi Kendala: " + err.message);
        });
}

// ==========================================
// 3. RENDER SOAL & NAVIGASI
// ==========================================
function renderCurrentQuestion() {
    const q = currentQuestions[currentQuestionIndex];
    const container = document.getElementById("questions-container");

    document.getElementById("question-number").innerText = `Soal ${currentQuestionIndex + 1} / ${currentQuestions.length}`;

    let html = `
        <div class="question-title">${q.title || "Soal"}</div>
        <div class="question-text">${q.text}</div>
    `;

    // 1. Radio Button (Pilihan Ganda Biasa / Benar-Salah)
    if (q.type === "radio") {
        q.options.forEach(opt => {
            html += `
                <label class="option-label">
                    <input type="radio" name="${q.name}" value="${opt.v}">
                    <span><strong>${opt.v}.</strong> ${opt.t}</span>
                </label>`;
        });
    } 
    // 2. Checkbox (Pilihan Ganda Kompleks)
    else if (q.type === "checkbox") {
        q.options.forEach(opt => {
            html += `
                <label class="option-label">
                    <input type="checkbox" name="${q.name}" value="${opt.v}">
                    <span><strong>${opt.v}.</strong> ${opt.t}</span>
                </label>`;
        });
    } 
    // 3. Essay (Teks Paragraf)
    else if (q.type === "essay") {
        html += `<textarea name="${q.name}" rows="5" placeholder="Tuliskan jawaban Anda di sini..."></textarea>`;
    }

    container.innerHTML = html;
    updateNavButtons();
}

function updateNavButtons() {
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
    const btnSubmit = document.getElementById("btn-submit");

    btnPrev.disabled = (currentQuestionIndex === 0);

    if (currentQuestionIndex === currentQuestions.length - 1) {
        btnNext.classList.add("hidden");
        btnSubmit.classList.remove("hidden");
    } else {
        btnNext.classList.remove("hidden");
        btnSubmit.classList.add("hidden");
    }
}

function isCurrentQuestionAnswered() {
    const q = currentQuestions[currentQuestionIndex];
    const form = document.getElementById("quiz-form");

    if (q.type === "radio") {
        return form.querySelector(`input[name="${q.name}"]:checked`) !== null;
    } else if (q.type === "checkbox") {
        return form.querySelectorAll(`input[name="${q.name}"]:checked`).length > 0;
    } else if (q.type === "essay") {
        const txt = form.querySelector(`textarea[name="${q.name}"]`);
        return txt && txt.value.trim() !== "";
    }
    return true;
}

function nextQuestion() {
    if (!isCurrentQuestionAnswered()) {
        alert("Wajib menjawab soal ini sebelum berpindah!");
        return;
    }
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        renderCurrentQuestion();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderCurrentQuestion();
    }
}

// ==========================================
// 4. SUBMIT & SKOR OTOMATIS
// ==========================================
function submitQuiz() {
    if (!isCurrentQuestionAnswered()) {
        alert("Wajib menjawab soal ini terlebih dahulu!");
        return;
    }

    if (!confirm("Apakah Anda yakin ingin menyelesaikan Ujian ini?")) return;

    let totalSoalObjektif = 0;
    let totalBenarObjektif = 0;

    let formData = {
        username: currentUserData.username,
        nama: currentUserData.nama,
        kelas: currentUserData.kelas,
        uhKode: selectedUH.toUpperCase(),
        jawaban: {}
    };

    const form = document.getElementById("quiz-form");

    currentQuestions.forEach((q) => {
        // A. Pilihan Ganda / Benar Salah (Radio)
        if (q.type === "radio") {
            totalSoalObjektif++;
            const selected = form.querySelector(`input[name="${q.name}"]:checked`);
            const val = selected ? selected.value : "";
            formData.jawaban[q.name] = val;

            if (val === q.key) totalBenarObjektif++;
        } 
        // B. Pilihan Ganda Kompleks (Checkbox)
        else if (q.type === "checkbox") {
            totalSoalObjektif++;
            const checkedEls = form.querySelectorAll(`input[name="${q.name}"]:checked`);
            const selectedValues = Array.from(checkedEls).map(el => el.value).sort();
            formData.jawaban[q.name] = selectedValues.join(", ");

            const kunciJawaban = Array.isArray(q.key) ? q.key.sort() : [q.key];
            if (JSON.stringify(selectedValues) === JSON.stringify(kunciJawaban)) {
                totalBenarObjektif++;
            }
        } 
        // C. Essay (Tidak Diikutsertakan Dalam Skor Otomatis Web)
        else if (q.type === "essay") {
            const textarea = form.querySelector(`textarea[name="${q.name}"]`);
            formData.jawaban[q.name] = textarea ? textarea.value : "";
        }
    });

    // Kalkulasi Skor Otomatis Skala 0 - 100
    let nilaiObjektifOtomatis = 0;
    if (totalSoalObjektif > 0) {
        nilaiObjektifOtomatis = Math.round((totalBenarObjektif / totalSoalObjektif) * 100);
    }

    formData.nilaiObjektif = nilaiObjektifOtomatis;

    // Tampilkan Layar Hasil
    document.getElementById("quiz-screen").classList.remove("active");
    document.getElementById("result-screen").classList.add("active");
    
    document.getElementById("score-box").innerHTML = `
        <strong>Skor Objektif: ${nilaiObjektifOtomatis} / 100</strong><br>
        <small style="font-size:12px; font-weight:normal;">(Benar ${totalBenarObjektif} dari ${totalSoalObjektif} Soal Objektif)</small>
    `;

    // Kirim Data ke Google Apps Script
    if (APPS_SCRIPT_URL) {
        fetch(APPS_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        }).then(() => {
            console.log("Data berhasil dikirim ke Spreadsheet!");
        }).catch(err => console.error("Gagal mengirim data:", err));
    }
}

// ==========================================
// 5. FITUR WATERMARK & KEAMANAN
// ==========================================
function createWatermark() {
    if (!currentUserData) return;
    const existing = document.getElementById("watermark-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "watermark-overlay";
    overlay.className = "watermark-overlay";

    const textInfo = `${currentUserData.nama} - ${currentUserData.username}`;
    for (let i = 0; i < 12; i++) {
        const item = document.createElement("div");
        item.className = "watermark-item";
        item.innerText = textInfo;
        overlay.appendChild(item);
    }
    document.body.appendChild(overlay);
}

// Sembunyikan Soal Sekejap Jika Tombol Fisik/Keyboard Ditekan
document.addEventListener('keydown', function(e) {
    const container = document.getElementById("questions-container");
    if (container) {
        container.style.opacity = "0";
        setTimeout(() => { container.style.opacity = "1"; }, 1200);
    }
});
