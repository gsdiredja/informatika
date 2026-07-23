const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzsLfVWFNc85NVkQxbROAIXJmRyG5X3Q9q4XvpldeSe5XECDC-mov6soBnpA8mrg6UA/exec";

let validUsers = [];
let currentPage = 0;
let currentUserData = null;
let currentQuestions = [];
let selectedUH = "uh1";

// 1. MEMUAT DATA SISWA
window.addEventListener("DOMContentLoaded", () => {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("AKfycbx...")) {
        document.getElementById("login-status").innerText = "URL Apps Script belum dikonfigurasi.";
        document.getElementById("login-status").style.color = "#dc2626";
        return;
    }

    fetch(APPS_SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            validUsers = data;
            document.getElementById("login-status").innerText = "Sistem siap. Silakan login.";
            document.getElementById("login-status").style.color = "#059669";
            document.getElementById("btn-login").disabled = false;
        })
        .catch(err => {
            console.error("Gagal memuat akun:", err);
            document.getElementById("login-status").innerText = "Gagal memuat data akun dari Spreadsheet.";
            document.getElementById("login-status").style.color = "#dc2626";
        });
});

// 2. HANDLER LOGIN & FETCH JSON SOAL SESUAI PILIHAN
async function handleLogin(e) {
    e.preventDefault();
    const userInput = document.getElementById("username").value.trim();
    const passInput = document.getElementById("password").value.trim();
    selectedUH = document.getElementById("select-uh").value.toLowerCase();

    const match = validUsers.find(u => u.username === userInput && u.password === passInput);

    if (match) {
        currentUserData = match;

        // Ambil file JSON soal berdasarkan dropdown (data/soal-uh1.json atau data/soal-uh2.json)
        try {
            const response = await fetch(`data/soal-${selectedUH}.json`);
            if (!response.ok) throw new Error("File soal tidak ditemukan");
            currentQuestions = await response.json();
        } catch (err) {
            alert(`Gagal memuat soal! Pastikan file 'data/soal-${selectedUH}.json' sudah tersedia.`);
            return;
        }

        document.getElementById("login-error").style.display = "none";
        document.getElementById("user-display").innerText = `Siswa: ${match.nama} | Kelas: ${match.kelas} (${selectedUH.toUpperCase()})`;
        
        document.getElementById("login-screen").classList.remove("active");
        document.getElementById("quiz-screen").classList.add("active");
        
        renderQuestions();
        showPage(0);
    } else {
        document.getElementById("login-error").style.display = "block";
    }
}

// 3. RENDER SOAL
function renderQuestions() {
    const container = document.getElementById("questions-container");
    container.innerHTML = "";

    currentQuestions.forEach((q, index) => {
        const div = document.createElement("div");
        div.className = "question-card";
        div.id = `page-${index}`;
        div.style.display = "none";

        let html = `<p style="font-weight: 700; margin-bottom: 6px; color: #1f2937; font-size: 14px;">Soal ${index + 1} dari ${currentQuestions.length}</p>`;
        if(q.title) html += `<p style="font-weight:600; font-size:14px; margin-bottom:6px; color:#0b3a7a;">${q.title}</p>`;
        html += `<p style="font-weight: 500; margin-bottom: 16px; color: #374151; font-size: 14px; line-height: 1.5;">${q.text.replace(/\n/g, '<br>')}</p>`;

        if (q.type === "radio") {
            q.options.forEach(opt => {
                html += `
                    <label class="option-label">
                        <input type="radio" name="${q.name}" value="${opt.v}">
                        <span>${opt.v}. ${opt.t}</span>
                    </label>`;
            });
        } else if (q.type === "essay") {
            html += `<textarea name="${q.name}" rows="5" placeholder="Tuliskan jawaban Anda di sini..."></textarea>`;
        }

        div.innerHTML = html;
        container.appendChild(div);
    });
}

// 4. VALIDASI: HARUS DIJAWAB SEBELUM BISA LANJUT
function isCurrentQuestionAnswered() {
    const q = currentQuestions[currentPage];
    const form = document.getElementById("quiz-form");

    if (q.type === "radio") {
        const selected = form.querySelector(`input[name="${q.name}"]:checked`);
        return selected !== null;
    } else if (q.type === "essay") {
        const textarea = form.querySelector(`textarea[name="${q.name}"]`);
        return textarea && textarea.value.trim() !== "";
    }
    return true;
}

// 5. NAVIGASI HALAMAN
function showPage(page) {
    document.querySelectorAll(".question-card").forEach((el, i) => {
        el.style.display = i === page ? "block" : "none";
    });

    currentPage = page;
    document.getElementById("page-indicator").innerText = `${page + 1} / ${currentQuestions.length}`;
    document.getElementById("btn-prev").style.visibility = page === 0 ? "hidden" : "visible";
    
    if (page === currentQuestions.length - 1) {
        document.getElementById("btn-next").style.display = "none";
        document.getElementById("btn-submit").style.display = "block";
    } else {
        document.getElementById("btn-next").style.display = "block";
        document.getElementById("btn-submit").style.display = "none";
    }

    const progressPercent = ((page + 1) / currentQuestions.length) * 100;
    document.getElementById("progress-fill").style.width = progressPercent + "%";
}

function changePage(delta) {
    if (delta > 0 && !isCurrentQuestionAnswered()) {
        alert("Mohon jawab soal ini terlebih dahulu sebelum melanjutkan ke soal berikutnya!");
        return;
    }

    let newPage = currentPage + delta;
    if (newPage >= 0 && newPage < currentQuestions.length) {
        showPage(newPage);
    }
}

// 6. SUBMIT JAWABAN
function submitQuiz() {
    if (!isCurrentQuestionAnswered()) {
        alert("Mohon jawab soal ini terlebih dahulu sebelum mengirimkan jawaban!");
        return;
    }

    if (!confirm("Apakah Anda yakin ingin menyelesaikan dan mengirimkan jawaban?")) return;

    let scorePG = 0;
    let totalPG = 0;
    
    let formData = {
        username: currentUserData.username,
        nama: currentUserData.nama,
        kelas: currentUserData.kelas,
        uhKode: selectedUH.toUpperCase(),
        jawaban: {}
    };

    const form = document.getElementById("quiz-form");

    currentQuestions.forEach((q) => {
        if (q.type === "radio") {
            totalPG++;
            const selected = form.querySelector(`input[name="${q.name}"]:checked`);
            const val = selected ? selected.value : "";
            formData.jawaban[q.name] = val;
            if (val === q.key) scorePG++;
        } else if (q.type === "essay") {
            const textarea = form.querySelector(`textarea[name="${q.name}"]`);
            formData.jawaban[q.name] = textarea ? textarea.value : "";
        }
    });

    let nilaiAkhirPG = Math.round((scorePG / totalPG) * 100);
    formData.nilaiPG = nilaiAkhirPG;

    document.getElementById("quiz-screen").classList.remove("active");
    document.getElementById("result-screen").classList.add("active");
    document.getElementById("score-box").innerText = `Skor PG/BS: ${nilaiAkhirPG} / 100`;

    if (APPS_SCRIPT_URL) {
        fetch(APPS_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        }).then(() => {
            console.log("Data ujian berhasil dikirimkan!");
        }).catch(err => console.error("Gagal mengirimkan data:", err));
    }
}
