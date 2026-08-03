document.addEventListener("DOMContentLoaded", async () => {
  let userDataStr = localStorage.getItem("userData");
  let rawSoalPath = localStorage.getItem("soalPath");

  if (!userDataStr) {
    window.location.href = "index.html";
    return;
  }

  if (!rawSoalPath || rawSoalPath === "undefined") {
    rawSoalPath = "soal-uh1";
  }

  currentUserData = JSON.parse(userDataStr);
  currentUsername = currentUserData.username || "";

  const cleanPaketId = getCleanPaketId(rawSoalPath);

  // Render Info Peserta Ujian
  document.getElementById("userInfo").innerHTML = `
    PESERTA: <strong>${currentUserData.nama || currentUserData.username}</strong> | KELAS: <strong>${currentUserData.kelas || '-'}</strong> | NISN: <strong>${currentUserData.username}</strong>
  `;

  // 🔒 RESTORE SISA WAKTU
  const savedRemainingTime = localStorage.getItem(`remainingTime_${currentUsername}`);
  if (savedRemainingTime !== null) {
    totalSeconds = parseInt(savedRemainingTime, 10);
  } else {
    totalSeconds = EXAM_DURATION_MINUTES * 60;
  }

  startTimer();

  // CACHE KEYS
  const cachedQuestionsKey = `questions_${currentUsername}_${cleanPaketId}`;
  const savedAnswersKey = `answers_${currentUsername}_${cleanPaketId}`;

  // Restore jawaban yang pernah diisi
  const savedUserAnswers = localStorage.getItem(savedAnswersKey);
  if (savedUserAnswers) {
    try { userAnswers = JSON.parse(savedUserAnswers); } catch(e) {}
  }

  const cachedQuestions = localStorage.getItem(cachedQuestionsKey);

  if (cachedQuestions) {
    // 1. GUNAKAN DATA SOAL DARI CACHE BROWSER (JIKA SUDAH PERNAH DIMUAT)
    questionsData = JSON.parse(cachedQuestions);

    let lastUnansweredIndex = 0;
    for (let i = 0; i < questionsData.length; i++) {
      if (!isQuestionAnswered(questionsData[i].name)) {
        lastUnansweredIndex = i;
        break;
      }
    }
    currentQuestionIndex = lastUnansweredIndex;

    renderNumberGrid();
    showQuestion(currentQuestionIndex);
  } else {
    // 2. PERTAMA KALI UJIAN: AMBIL SOAL DARI GOOGLE APPS SCRIPT (SPREADSHEET)
    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "getquestions",
          paket: cleanPaketId
        })
      });

      const result = await response.json();

      if (result.status === "success" && Array.isArray(result.data) && result.data.length > 0) {
        questionsData = shuffleArray(result.data);
        questionsData.forEach((q) => {
          if (q.options && Array.isArray(q.options)) {
            q.options = shuffleArray(q.options);
          }
        });

        localStorage.setItem(cachedQuestionsKey, JSON.stringify(questionsData));

        renderNumberGrid();
        showQuestion(currentQuestionIndex);
      } else {
        throw new Error(result.message || "Soal tidak ditemukan di Spreadsheet.");
      }
    } catch (err) {
      console.warn("Gagal mengambil soal dari GAS, mencoba fallback file JSON lokal...", err);
      
      // FALLBACK: Coba fetch dari file JSON lokal jika dari GAS tidak tersedia
      try {
        const localRes = await fetch(rawSoalPath);
        if (!localRes.ok) throw new Error("File JSON lokal tidak ditemukan.");
        const localData = await localRes.json();
        
        questionsData = shuffleArray(localData);
        questionsData.forEach((q) => {
          if (q.options && Array.isArray(q.options)) {
            q.options = shuffleArray(q.options);
          }
        });

        localStorage.setItem(cachedQuestionsKey, JSON.stringify(questionsData));
        renderNumberGrid();
        showQuestion(currentQuestionIndex);
      } catch (localErr) {
        document.getElementById("questionsContainer").innerHTML = `
          <div style="color: #dc2626; padding: 20px; text-align: center;">
            <p><strong>Gagal Memuat Soal Ujian!</strong></p>
            <small>${err.message || "Pastikan Kode Soal telah diinput di Spreadsheet Bank_Soal."}</small>
          </div>
        `;
      }
    }
  }
});
