const API = "https://kindora.ai";

// ── Category colors (mirrors the app) ────────────────────────
const CAT_COLORS = {
  medical:    "#ef4444",
  school:     "#3b82f6",
  family:     "#8b5cf6",
  activities: "#f97316",
  work:       "#6b7280",
  eldercare:  "#10b981",
  social:     "#ec4899",
  personal:   "#f59e0b",
};
function catColor(cat) {
  return CAT_COLORS[cat] || "#8b949e";
}

// ── Time helpers ──────────────────────────────────────────────
function fmt12(date) {
  let h = date.getHours(), m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

function countdown(targetMs) {
  const diffMs = targetMs - Date.now();
  if (diffMs <= 0) return null;
  const totalMins = Math.ceil(diffMs / 60000);
  if (totalMins < 60) return `${totalMins}m`;
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;
}

// ── DOM ───────────────────────────────────────────────────────
const content = document.getElementById("content");
const familyNameEl = document.getElementById("family-name");
const addBtn = document.getElementById("btn-quick-add");

// ── Shared state (set after a successful boot) ────────────────
const appState = { familyId: null, families: [] };

function setAddVisible(visible) {
  if (addBtn) addBtn.style.display = visible ? "flex" : "none";
}

// Single managed refresh timer for the countdown; cleared when leaving the
// schedule view (e.g. while the quick-add form is open) so it never clobbers it.
let refreshTimer = null;
function clearRefreshTimer() {
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
}

function showSignIn() {
  setAddVisible(false);
  content.innerHTML = `
    <div class="signin-state">
      <div class="signin-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <div class="signin-title">Sign in to see your schedule</div>
      <div class="signin-sub">Log in to Kindora in your browser, then click the extension icon again.</div>
      <button class="btn-signin" id="btn-go-signin">Sign in to Kindora</button>
    </div>`;
  document.getElementById("btn-go-signin").addEventListener("click", () => {
    chrome.tabs.create({ url: `${API}/` });
  });
}

function showError(msg) {
  setAddVisible(false);
  content.innerHTML = `<div class="no-events">${msg}</div>`;
}

function renderEvents(events, families, activeFamilyId) {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  const todayEnd   = new Date(now); todayEnd.setHours(23,59,59,999);

  // Filter to today's events, sorted
  const todayEvts = events
    .map(e => ({ ...e, _start: new Date(e.startTime), _end: new Date(e.endTime) }))
    .filter(e => e._start <= todayEnd && e._end >= todayStart)
    .sort((a, b) => a._start - b._start);

  // Find the "next" event
  const current  = todayEvts.find(e => e._start <= now && e._end > now);
  const upcoming = todayEvts.find(e => e._start > now);
  const nextEvt  = current || upcoming;

  // ── Next-up section ──
  let nextHtml = "";
  if (current) {
    const timeLeft = countdown(current._end.getTime());
    nextHtml = `
      <div class="next-up">
        <div class="next-up-label">Happening now</div>
        <div class="next-up-content">
          <div class="next-up-countdown in-progress">In progress · ends in ${timeLeft || "soon"}</div>
          <div class="next-up-title">${esc(current.title)}</div>
          <div class="next-up-time">${fmt12(current._start)} – ${fmt12(current._end)}</div>
        </div>
      </div>`;
  } else if (upcoming) {
    const cd = countdown(upcoming._start.getTime());
    nextHtml = `
      <div class="next-up">
        <div class="next-up-label">Next up</div>
        <div class="next-up-content">
          <div class="next-up-countdown">Starts in ${cd}</div>
          <div class="next-up-title">${esc(upcoming.title)}</div>
          <div class="next-up-time">${fmt12(upcoming._start)} – ${fmt12(upcoming._end)}</div>
        </div>
      </div>`;
  } else {
    nextHtml = `
      <div class="next-up">
        <div class="next-up-label">Today</div>
        <div class="next-up-content">
          <div class="next-up-countdown all-clear">Nothing more scheduled today</div>
        </div>
      </div>`;
  }

  // ── Events list ──
  let listHtml = "";
  if (todayEvts.length > 0) {
    const rows = todayEvts.map(e => {
      const isPast    = e._end <= now;
      const isCurrent = !isPast && e._start <= now;
      const cls = isPast ? "past" : isCurrent ? "current" : "";
      const color = catColor(e.category);
      const badge = isCurrent ? `<span class="current-badge">Now</span>` : "";
      return `
        <div class="event-row ${cls}">
          <div class="event-dot-col"><span class="dot" style="background:${color};"></span></div>
          <div class="event-body">
            <div class="event-title">${esc(e.title)}${badge}</div>
            <div class="event-time">${fmt12(e._start)} – ${fmt12(e._end)}</div>
          </div>
        </div>`;
    }).join("");
    listHtml = `<div class="events-section"><div class="events-label">All today</div>${rows}</div>`;
  }

  // ── Family switcher footer ──
  const familySwitcher = families.length > 1
    ? `<button class="footer-family-switcher" id="btn-switch">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        Switch family
      </button>`
    : `<span></span>`;

  content.innerHTML = `
    ${nextHtml}
    ${listHtml || '<div class="no-events">No events today</div>'}
    <div class="footer">
      ${familySwitcher}
      <a class="footer-link" href="${API}/calendar" target="_blank">Open calendar →</a>
    </div>`;

  // Family switcher logic
  if (families.length > 1) {
    document.getElementById("btn-switch")?.addEventListener("click", () => {
      const idx = families.findIndex(f => f.id === activeFamilyId);
      const next = families[(idx + 1) % families.length];
      chrome.storage.local.set({ activeFamilyId: next.id }, () => {
        familyNameEl.textContent = next.name || next.familyName || "";
        load(next.id, families);
      });
    });
  }

  // Update the next-up countdown every 30 seconds (single managed timer)
  clearRefreshTimer();
  if (nextEvt) {
    refreshTimer = setTimeout(() => renderEvents(events, families, activeFamilyId), 30000);
  }
}

// ── Escape HTML ───────────────────────────────────────────────
function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Fetch events for a family and render ─────────────────────
async function load(familyId, families) {
  try {
    const res = await fetch(`${API}/api/events?familyId=${familyId}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) { showError("Couldn't load events."); return; }
    const events = await res.json();
    renderEvents(events, families, familyId);
  } catch {
    showError("Couldn't reach Kindora. Are you connected?");
  }
}

// ── Boot ──────────────────────────────────────────────────────
async function boot() {
  // 1. Check authentication
  let user;
  try {
    const res = await fetch(`${API}/api/auth/user`, { credentials: "include", cache: "no-store" });
    if (res.status === 401 || res.status === 403) { showSignIn(); return; }
    if (!res.ok) { showError("Couldn't connect to Kindora."); return; }
    user = await res.json();
  } catch {
    showError("Couldn't reach Kindora. Check your connection.");
    return;
  }

  // 2. Fetch families
  let families;
  try {
    const res = await fetch(`${API}/api/families`, { credentials: "include", cache: "no-store" });
    if (!res.ok) { showError("Couldn't load your families."); return; }
    families = await res.json();
  } catch {
    showError("Couldn't load family data.");
    return;
  }

  if (!families || families.length === 0) {
    showError("No family found. Set one up in Kindora first.");
    return;
  }

  // 3. Determine which family to show (stored preference or first)
  const stored = await new Promise(r =>
    chrome.storage.local.get("activeFamilyId", d => r(d.activeFamilyId))
  );
  const activeFamilyId = (stored && families.find(f => f.id === stored))
    ? stored
    : families[0].id;
  const activeFamily = families.find(f => f.id === activeFamilyId) || families[0];
  familyNameEl.textContent = activeFamily.name || activeFamily.familyName || "";

  // Stash state for quick-add and reveal the button
  appState.familyId = activeFamilyId;
  appState.families = families;
  setAddVisible(true);

  // 4. Load events
  await load(activeFamilyId, families);
}

// ── Quick add ─────────────────────────────────────────────────
const QA_TYPES = [
  { id: "event",    label: "Event" },
  { id: "reminder", label: "Reminder" },
  { id: "task",     label: "Task" },
];

function pad2(n) { return String(n).padStart(2, "0"); }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function nextHourStr() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function quickAddFields(type) {
  if (type === "task") {
    return `
      <div class="qa-field">
        <label class="qa-label" for="qa-title">Task</label>
        <input class="qa-input" id="qa-title" type="text" placeholder="e.g. Refill prescription" autocomplete="off" />
      </div>
      <div class="qa-field">
        <label class="qa-label" for="qa-date">Due date (optional)</label>
        <input class="qa-input" id="qa-date" type="date" />
      </div>`;
  }
  // event + reminder share a title + date + time
  const titleLabel = type === "reminder" ? "Reminder" : "Event";
  const placeholder = type === "reminder" ? "e.g. Call the doctor" : "e.g. Dentist appointment";
  return `
    <div class="qa-field">
      <label class="qa-label" for="qa-title">${titleLabel}</label>
      <input class="qa-input" id="qa-title" type="text" placeholder="${placeholder}" autocomplete="off" />
    </div>
    <div class="qa-row">
      <div class="qa-field">
        <label class="qa-label" for="qa-date">Date</label>
        <input class="qa-input" id="qa-date" type="date" value="${todayStr()}" />
      </div>
      <div class="qa-field">
        <label class="qa-label" for="qa-time">Time</label>
        <input class="qa-input" id="qa-time" type="time" value="${nextHourStr()}" />
      </div>
    </div>
    ${type === "event" ? '<div class="qa-hint">Defaults to a 1-hour block.</div>' : '<div class="qa-hint">A quick nudge on your calendar.</div>'}`;
}

function showQuickAdd(activeType) {
  let type = activeType || "event";
  clearRefreshTimer();
  setAddVisible(false);

  function render() {
    content.innerHTML = `
      <div class="qa-wrap">
        <div class="qa-types">
          ${QA_TYPES.map(t => `<button class="qa-type ${t.id === type ? "active" : ""}" data-type="${t.id}">${t.label}</button>`).join("")}
        </div>
        <div id="qa-fields">${quickAddFields(type)}</div>
        <div class="qa-actions">
          <button class="qa-btn qa-btn-secondary" id="qa-cancel">Cancel</button>
          <button class="qa-btn qa-btn-primary" id="qa-save">Add</button>
        </div>
        <div class="qa-msg" id="qa-msg"></div>
      </div>`;

    // Type switching (preserve the typed title)
    content.querySelectorAll(".qa-type").forEach(btn => {
      btn.addEventListener("click", () => {
        const keepTitle = (document.getElementById("qa-title") || {}).value || "";
        type = btn.dataset.type;
        render();
        const titleEl = document.getElementById("qa-title");
        if (titleEl) { titleEl.value = keepTitle; titleEl.focus(); }
      });
    });

    document.getElementById("qa-cancel").addEventListener("click", () => {
      setAddVisible(true);
      load(appState.familyId, appState.families);
    });
    document.getElementById("qa-save").addEventListener("click", () => saveQuickAdd(type));
    const titleEl = document.getElementById("qa-title");
    if (titleEl) titleEl.focus();
    content.querySelectorAll(".qa-input").forEach(inp => {
      inp.addEventListener("keydown", e => { if (e.key === "Enter") saveQuickAdd(type); });
    });
  }

  render();
}

async function saveQuickAdd(type) {
  const msgEl = document.getElementById("qa-msg");
  const saveBtn = document.getElementById("qa-save");
  const title = (document.getElementById("qa-title").value || "").trim();
  if (!title) {
    msgEl.className = "qa-msg error";
    msgEl.textContent = "Please enter a title.";
    return;
  }

  let url, body;
  try {
    if (type === "task") {
      const dateVal = (document.getElementById("qa-date").value || "").trim();
      url = `${API}/api/tasks`;
      body = { familyId: appState.familyId, title };
      if (dateVal) body.dueDate = new Date(`${dateVal}T12:00`).toISOString();
    } else {
      const dateVal = (document.getElementById("qa-date").value || "").trim();
      const timeVal = (document.getElementById("qa-time").value || "").trim();
      if (!dateVal || !timeVal) {
        msgEl.className = "qa-msg error";
        msgEl.textContent = "Please pick a date and time.";
        return;
      }
      const start = new Date(`${dateVal}T${timeVal}`);
      const durationMins = type === "reminder" ? 15 : 60;
      const end = new Date(start.getTime() + durationMins * 60000);
      url = `${API}/api/events`;
      body = {
        familyId: appState.familyId,
        title,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        memberIds: [],
        color: type === "reminder" ? "#f97316" : "#3b82f6",
        category: "other",
      };
    }
  } catch {
    msgEl.className = "qa-msg error";
    msgEl.textContent = "That date or time looks invalid.";
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Adding…";
  msgEl.className = "qa-msg";
  msgEl.textContent = "";

  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401 || res.status === 403) {
      msgEl.className = "qa-msg error";
      msgEl.textContent = "You don't have permission to add this.";
      saveBtn.disabled = false;
      saveBtn.textContent = "Add";
      return;
    }
    if (!res.ok) {
      msgEl.className = "qa-msg error";
      msgEl.textContent = "Couldn't save. Please try again.";
      saveBtn.disabled = false;
      saveBtn.textContent = "Add";
      return;
    }
    const label = type === "task" ? "Task" : type === "reminder" ? "Reminder" : "Event";
    msgEl.className = "qa-msg success";
    msgEl.textContent = `${label} added!`;
    setTimeout(() => {
      setAddVisible(true);
      load(appState.familyId, appState.families);
    }, 750);
  } catch {
    msgEl.className = "qa-msg error";
    msgEl.textContent = "Couldn't reach Kindora. Check your connection.";
    saveBtn.disabled = false;
    saveBtn.textContent = "Add";
  }
}

if (addBtn) addBtn.addEventListener("click", () => showQuickAdd("event"));

boot();
