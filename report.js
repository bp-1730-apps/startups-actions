/* Startups Action List — floor report page (write-only) */
(function () {
  "use strict";

  const params = new URLSearchParams(location.search);
  const line = (params.get("line") || "").trim();

  const lineNameEl = document.getElementById("line-name");
  const noLineNotice = document.getElementById("no-line-notice");
  const questionStep = document.getElementById("question-step");
  const issueForm = document.getElementById("issue-form");
  const thankyou = document.getElementById("thankyou");
  const thankyouTitle = document.getElementById("thankyou-title");
  const thankyouSub = document.getElementById("thankyou-sub");
  const errorBanner = document.getElementById("error-banner");
  const submitBtn = document.getElementById("submit-btn");
  const btnYes = document.getElementById("btn-yes");
  const btnNo = document.getElementById("btn-no");
  const reportAgainBtn = document.getElementById("report-again-btn");
  const typeButtons = document.querySelectorAll(".type-toggle button");
  const typeHidden = issueForm.querySelector('input[name="type"]');

  if (!line) {
    lineNameEl.textContent = "No line specified";
    noLineNotice.style.display = "block";
    questionStep.style.display = "none";
    return;
  }
  lineNameEl.textContent = line;

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.classList.add("show");
  }
  function clearError() {
    errorBanner.textContent = "";
    errorBanner.classList.remove("show");
  }

  async function submitReport(payload) {
    const res = await fetch(CONFIG.API_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids CORS preflight
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  function showThankYou(title, sub) {
    questionStep.style.display = "none";
    issueForm.classList.remove("open");
    thankyou.style.display = "block";
    thankyouTitle.textContent = title;
    thankyouSub.textContent = sub;
  }

  btnYes.addEventListener("click", async () => {
    btnYes.disabled = true;
    btnNo.disabled = true;
    try {
      const res = await submitReport({
        action: "create",
        line,
        type: "action",
        startedOnTime: true,
        startDate: todayISO(),
        area: "",
        action_text: "",
        owner: "",
        expectedCompletion: "",
        status: "completed",
        comments: "",
      });
      if (!res.ok) throw new Error(res.error || "failed");
      showThankYou("Thanks — on-time start logged", "Have a great shift.");
    } catch (err) {
      btnYes.disabled = false;
      btnNo.disabled = false;
      alert("Couldn't submit: " + err.message + ". Check your connection and try again.");
    }
  });

  btnNo.addEventListener("click", () => {
    questionStep.style.display = "none";
    issueForm.classList.add("open");
  });

  typeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      typeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      typeHidden.value = btn.dataset.type;
    });
  });

  issueForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    const fd = new FormData(issueForm);
    const actionText = (fd.get("action") || "").trim();
    if (!actionText) {
      showError("Please describe what happened.");
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";
    try {
      const res = await submitReport({
        action: "create",
        line,
        type: fd.get("type") || "action",
        startedOnTime: false,
        startDate: todayISO(),
        area: fd.get("area") || "",
        action_text: actionText,
        owner: fd.get("owner") || "",
        expectedCompletion: fd.get("expectedCompletion") || "",
        status: "open",
        comments: fd.get("comments") || "",
      });
      if (!res.ok) throw new Error(res.error || "failed");
      showThankYou("Thanks — report submitted", "This has been added to the " + line + " action list.");
    } catch (err) {
      showError("Couldn't submit: " + err.message + ". Check your connection and try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit report";
    }
  });

  reportAgainBtn.addEventListener("click", () => {
    issueForm.reset();
    typeButtons.forEach((b) => b.classList.remove("active"));
    typeButtons[0].classList.add("active");
    typeHidden.value = "action";
    thankyou.style.display = "none";
    issueForm.classList.remove("open");
    questionStep.style.display = "block";
    btnYes.disabled = false;
    btnNo.disabled = false;
  });
})();
