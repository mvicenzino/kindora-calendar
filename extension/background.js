const API = "https://kindora.ai";

// ── Draw Kindora icon with optional badge overlay ─────────────
function makeIconCanvas(size, label) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const r = size / 2;

  // Orange rounded-square background
  const radius = size * 0.22;
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.arcTo(size, 0, size, radius, radius);
  ctx.lineTo(size, size - radius);
  ctx.arcTo(size, size, size - radius, size, radius);
  ctx.lineTo(radius, size);
  ctx.arcTo(0, size, 0, size - radius, radius);
  ctx.lineTo(0, radius);
  ctx.arcTo(0, 0, radius, 0, radius);
  ctx.closePath();
  ctx.fill();

  // White "K"
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.round(size * 0.54)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("K", r, r * 1.04);

  return ctx.getImageData(0, 0, size, size);
}

function setIcon() {
  chrome.action.setIcon({
    imageData: {
      16: makeIconCanvas(16),
      32: makeIconCanvas(32),
      48: makeIconCanvas(48),
      128: makeIconCanvas(128),
    },
  });
}

// ── Badge update ──────────────────────────────────────────────
async function updateBadge() {
  try {
    const stored = await new Promise(r =>
      chrome.storage.local.get("activeFamilyId", d => r(d.activeFamilyId))
    );

    // Need to know which family to fetch
    const famRes = await fetch(`${API}/api/families`, { credentials: "include" });
    if (!famRes.ok) { clearBadge(); return; }
    const families = await famRes.json();
    if (!families || families.length === 0) { clearBadge(); return; }

    const familyId = (stored && families.find(f => f.id === stored))
      ? stored
      : families[0].id;

    const evtRes = await fetch(`${API}/api/events?familyId=${familyId}`, { credentials: "include" });
    if (!evtRes.ok) { clearBadge(); return; }
    const events = await evtRes.json();

    const now = new Date();
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const upcoming = events
      .map(e => ({ ...e, _start: new Date(e.startTime), _end: new Date(e.endTime) }))
      .filter(e => e._end > now && e._start <= todayEnd)
      .sort((a, b) => a._start - b._start);

    if (upcoming.length === 0) {
      clearBadge();
      return;
    }

    const next = upcoming[0];
    const inProgress = next._start <= now;

    if (inProgress) {
      chrome.action.setBadgeText({ text: "NOW" });
      chrome.action.setBadgeBackgroundColor({ color: "#3fb950" });
    } else {
      const diffMs = next._start.getTime() - now.getTime();
      const totalMins = Math.ceil(diffMs / 60000);
      let label;
      if (totalMins < 60) {
        label = `${totalMins}m`;
      } else {
        const hrs = Math.floor(totalMins / 60);
        label = `${hrs}h`;
      }
      chrome.action.setBadgeText({ text: label });
      chrome.action.setBadgeBackgroundColor({ color: "#f97316" });
    }
  } catch {
    clearBadge();
  }
}

function clearBadge() {
  chrome.action.setBadgeText({ text: "" });
}

// ── Lifecycle ─────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  setIcon();
  // Update badge every 2 minutes
  chrome.alarms.create("badgeUpdate", { periodInMinutes: 2 });
  updateBadge();
});

chrome.runtime.onStartup.addListener(() => {
  setIcon();
  updateBadge();
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "badgeUpdate") updateBadge();
});
