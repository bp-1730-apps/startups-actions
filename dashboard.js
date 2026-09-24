/* Startups Action List — dashboard logic */
(function () {
  "use strict";

  const STATUS_LABELS = {
    open: "Open",
    in_progress: "In Progress",
    on_hold: "On Hold",
    completed: "Completed",
  };
  const STATUS_ORDER = ["open", "in_progress", "on_hold", "completed"];

  const overviewRow = document.getElementById("overview-row");
  const linesGrid = document.getElementById("lines-grid");
  const refreshBtn = document.getElementById("refresh-btn");

  let allItems = [];
  const expandedCompleted = new Set();
  const openAddForm = new Set();

  function apiUrl(params) {
    const url = new URL(CONFIG.API_BASE_URL);
    Object.keys(params).forEach((k) => url.searchParams.set(k, params[k]));
    return url.toString();
  }

  async function apiGet(params) {
    const res = await fetch(apiUrl(params));
    return res.json();
  }

  async function apiPost(body) {
    const res = await fetch(CONFIG.API_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids CORS preflight
      body: JSON.stringify(body),
    });
    return res.json();
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function daysBetween(a, b) {
    const MS = 24 * 60 * 60 * 1000;
    return Math.round((new Date(b) - new Date(a)) / MS);
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  refreshBtn.addEventListener("click", loadData);

  // ---------- Data ----------
  async function loadData() {
    linesGrid.innerHTML = '<div class="loading-note">Loading action list…</div>';
    try {
      const data = await apiGet({ action: "list" });
      if (!data.ok) throw new Error(data.error || "unknown error");
      allItems = data.items || [];
      render();
    } catch (err) {
      linesGrid.innerHTML =
        '<div class="loading-note">Couldn\'t load data (' + escapeHtml(err.message) + "). Check config.js and try Refresh.</div>";
    }
  }

  function onTimePct(items) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const relevant = items.filter(
      (i) => i.startedOnTime !== null && i.startedOnTime !== "" && i.startedOnTime !== undefined && new Date(i.createdAt || i.startDate) >= cutoff
    );
    if (!relevant.length) return null;
    const onTime = relevant.filter((i) => i.startedOnTime === true || i.startedOnTime === "true").length;
    return Math.round((onTime / relevant.length) * 100);
  }

  function render() {
    const openItems = allItems.filter((i) => i.status !== "completed" && i.action);
    const overdue = openItems.filter((i) => isOverdue(i));
    const overallPct = onTimePct(allItems);

    overviewRow.innerHTML = `
      <div class="overview-tile">
        <div class="label">Open Actions</div>
        <div class="value">${openItems.length}</div>
      </div>
      <div class="overview-tile">
        <div class="label">Overdue</div>
        <div class="value ${overdue.length ? "warn" : ""}">${overdue.length}</div>
      </div>
      <div class="overview-tile">
        <div class="label">On-Time Starts (30d)</div>
        <div class="value ${overallPct === null ? "" : overallPct >= 80 ? "good" : "warn"}">${overallPct === null ? "—" : overallPct + "%"}</div>
      </div>
      <div class="overview-tile">
        <div class="label">Lines Tracked</div>
        <div class="value">${CONFIG.LINES.length}</div>
      </div>
    `;

    linesGrid.innerHTML = "";
    CONFIG.LINES.forEach((line) => linesGrid.appendChild(renderLineCard(line)));
  }

  function isOverdue(item) {
    if (item.status === "completed" || !item.expectedCompletion) return false;
    return daysBetween(todayISO(), item.expectedCompletion) < 0;
  }

  function renderLineCard(line) {
    const items = allItems
      .filter((i) => i.line === line && i.action)
      .sort((a, b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate));
    const active = items.filter((i) => i.status !== "completed");
    const completed = items.filter((i) => i.status === "completed");
    active.sort((a, b) => (isOverdue(b) ? 1 : 0) - (isOverdue(a) ? 1 : 0));

    const pct = onTimePct(allItems.filter((i) => i.line === line));

    const card = document.createElement("div");
    card.className = "line-card";

    const activeHtml = active.length
      ? active.map((i) => renderItemCard(i)).join("")
      : '<div class="empty-note">No open actions for this line.</div>';

    const completedOpen = expandedCompleted.has(line);
    const addFormOpen = openAddForm.has(line);

    card.innerHTML = `
      <div class="line-head">
        <div class="name">Line ${escapeHtml(line)}</div>
        <div class="ontime">On-time (30d): <span class="pct">${pct === null ? "—" : pct + "%"}</span></div>
      </div>
      <div class="line-body" data-line="${escapeHtml(line)}">
        <div class="items">${activeHtml}</div>
        ${
          completed.length
            ? `<button class="completed-toggle" data-toggle-completed="${escapeHtml(line)}">${completedOpen ? "Hide" : "Show"} completed (${completed.length})</button>
               <div class="completed-list" style="display:${completedOpen ? "flex" : "none"}">${completed.map((i) => renderItemCard(i)).join("")}</div>`
            : ""
        }
        <button class="add-toggle" data-toggle-add="${escapeHtml(line)}">${addFormOpen ? "− Cancel" : "+ Add action"}</button>
        ${renderAddForm(line, addFormOpen)}
      </div>
    `;

    // wire events
    card.querySelectorAll("select.status-select").forEach((sel) => {
      sel.addEventListener("change", () => onStatusChange(sel.dataset.id, sel.value, sel));
    });
    const toggleCompletedBtn = card.querySelector("[data-toggle-completed]");
    if (toggleCompletedBtn) {
      toggleCompletedBtn.addEventListener("click", () => {
        if (expandedCompleted.has(line)) expandedCompleted.delete(line);
        else expandedCompleted.add(line);
        render();
      });
    }
    const toggleAddBtn = card.querySelector("[data-toggle-add]");
    toggleAddBtn.addEventListener("click", () => {
      if (openAddForm.has(line)) openAddForm.delete(line);
      else openAddForm.add(line);
      render();
    });
    const addForm = card.querySelector("form.add-form");
    if (addForm) {
      addForm.addEventListener("submit", (e) => {
        e.preventDefault();
        submitAddForm(line, addForm);
      });
    }

    return card;
  }

  function renderItemCard(item) {
    const overdue = isOverdue(item);
    const daysUntil = item.expectedCompletion ? daysBetween(todayISO(), item.expectedCompletion) : null;
    let daysHtml = "";
    if (item.status === "completed") {
      daysHtml = `<span class="days-pill">Completed</span>`;
    } else if (daysUntil !== null) {
      daysHtml = overdue
        ? `<span class="days-pill overdue">${Math.abs(daysUntil)}d overdue</span>`
        : `<span class="days-pill">${daysUntil}d until due</span>`;
    }
    const typeBadge = item.type === "project" ? '<span class="badge badge-project">Project</span>' : '<span class="badge badge-action">Action</span>';

    return `
      <div class="item-card ${overdue ? "is-overdue" : ""} ${item.status === "completed" ? "is-completed" : ""}">
        <div class="item-top">
          <div class="item-action">${escapeHtml(item.action)}</div>
          ${typeBadge}
        </div>
        <div class="item-meta">
          ${item.area ? `<span><b>Area:</b> ${escapeHtml(item.area)}</span>` : ""}
          ${item.owner ? `<span><b>Owner:</b> ${escapeHtml(item.owner)}</span>` : ""}
          ${item.startDate ? `<span><b>Reported:</b> ${escapeHtml(item.startDate)}</span>` : ""}
          ${item.expectedCompletion ? `<span><b>Due:</b> ${escapeHtml(item.expectedCompletion)}</span>` : ""}
        </div>
        ${item.comments ? `<div class="item-comments">${escapeHtml(item.comments)}</div>` : ""}
        <div class="item-controls">
          <select class="status-select status-${item.status}" data-id="${item.id}">
            ${STATUS_ORDER.map((s) => `<option value="${s}" ${s === item.status ? "selected" : ""}>${STATUS_LABELS[s]}</option>`).join("")}
          </select>
          ${daysHtml}
        </div>
      </div>
    `;
  }

  function renderAddForm(line, open) {
    return `
      <form class="add-form ${open ? "open" : ""}" data-line="${escapeHtml(line)}">
        <div class="field-row">
          <div>
            <label>Area</label>
            <input type="text" name="area" placeholder="e.g. Mixer 2" />
          </div>
          <div>
            <label>Owner</label>
            <input type="text" name="owner" placeholder="Who's on it" />
          </div>
        </div>
        <div>
          <label>Action needed</label>
          <textarea name="action" rows="2" required></textarea>
        </div>
        <div class="field-row">
          <div>
            <label>Expected completion</label>
            <input type="date" name="expectedCompletion" />
          </div>
          <div>
            <label>Type</label>
            <select name="type">
              <option value="action">Action</option>
              <option value="project">Project</option>
            </select>
          </div>
        </div>
        <div>
          <label>Comments</label>
          <textarea name="comments" rows="2"></textarea>
        </div>
        <button class="btn btn-primary" type="submit">Add to ${escapeHtml(line)}</button>
      </form>
    `;
  }

  async function submitAddForm(line, formEl) {
    const fd = new FormData(formEl);
    const submitBtn = formEl.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Adding…";
    try {
      const payload = {
        action: "create",
        line,
        type: fd.get("type") || "action",
        startedOnTime: "", // manually added from the dashboard, not a floor startup report
        startDate: todayISO(),
        area: fd.get("area") || "",
        action_text: fd.get("action") || "",
        owner: fd.get("owner") || "",
        expectedCompletion: fd.get("expectedCompletion") || "",
        status: "open",
        comments: fd.get("comments") || "",
      };
      const res = await apiPost(payload);
      if (!res.ok) throw new Error(res.error || "failed");
      openAddForm.delete(line);
      await loadData();
    } catch (err) {
      alert("Couldn't add the item: " + err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Add to " + line;
    }
  }

  async function onStatusChange(id, newStatus, selectEl) {
    selectEl.disabled = true;
    try {
      const res = await apiPost({ action: "update", id, status: newStatus });
      if (!res.ok) throw new Error(res.error || "failed");
      await loadData();
    } catch (err) {
      alert("Couldn't update status: " + err.message);
      selectEl.disabled = false;
    }
  }

  loadData();
})();
