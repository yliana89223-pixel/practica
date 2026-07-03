(function () {
  "use strict";

  const fileInput = document.getElementById("fileInput");
  const fileName = document.getElementById("fileName");
  const processBtn = document.getElementById("processBtn");
  const uploadArea = document.getElementById("uploadArea");

  const resultBlock = document.getElementById("result");
  const countDisplay = document.getElementById("countDisplay");
  const timestampDisplay = document.getElementById("timestampDisplay");
  const resultImage = document.getElementById("resultImage");
  const placeholderText = document.getElementById("placeholderText");

  function updateFileInfo() {
    const file = fileInput.files[0];
    if (file) {
      const size = (file.size / 1024 / 1024).toFixed(1);
      fileName.innerHTML = `<span class="file-name-highlight">${file.name}</span> (${size} МБ)`;
      processBtn.disabled = false;
      uploadArea.classList.remove("dragover");
    } else {
      fileName.textContent = "Файл не выбран";
      processBtn.disabled = true;
    }
  }

  fileInput.addEventListener("change", updateFileInfo);

  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    uploadArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  uploadArea.addEventListener("dragover", () => {
    uploadArea.classList.add("dragover");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });

  uploadArea.addEventListener("drop", (e) => {
    uploadArea.classList.remove("dragover");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        fileInput.files = files;
        updateFileInfo();
      } else {
        alert("Пожалуйста, загрузите изображение (JPEG, PNG, и т.д.)");
      }
    }
  });

  processBtn.addEventListener("click", async function (e) {
    e.preventDefault();

    const file = fileInput.files[0];
    if (!file) {
      alert("Сначала выберите изображение.");
      return;
    }

    processBtn.disabled = true;
    processBtn.classList.add("loading");

    resultBlock.classList.remove("visible");
    resultBlock.style.display = "none";

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Ошибка сервера (${response.status})`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      countDisplay.textContent = data.count ?? 0;

      const now = new Date();
      const timeStr = now.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      timestampDisplay.textContent = `${timeStr}`;

      if (data.result_url) {
        const url = data.result_url.includes("?")
          ? data.result_url + "&_t=" + Date.now()
          : data.result_url + "?_t=" + Date.now();
        resultImage.src = url;
        resultImage.style.display = "block";
        placeholderText.style.display = "none";
      } else {
        resultImage.style.display = "none";
        placeholderText.style.display = "block";
        placeholderText.textContent = "Изображение не получено";
      }

      resultBlock.style.display = "block";
      requestAnimationFrame(() => {
        resultBlock.classList.add("visible");
      });
    } catch (error) {
      console.error("Ошибка при обработке:", error);
      alert("Произошла ошибка:\n" + error.message);
    } finally {
      processBtn.disabled = false;
      processBtn.classList.remove("loading");
    }
  });

  updateFileInfo();
})();
