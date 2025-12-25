/**
 * Horizontal reveal track (time-based) + per-tile image upload.
 *
 * How reveals work:
 * - Each tile has a revealAt (ISO string).
 * - Before revealAt: locked + countdown.
 * - After revealAt: revealed + can upload/replace image.
 *
 * Images:
 * - Click a revealed tile (or open modal and click upload).
 * - Pick an image from your computer.
 * - Stored as a Data URL in localStorage for demo convenience.
 *
 * NOTE: Data URLs can be large; for many high-res images consider a backend or using smaller images.
 */

// ====== CONFIG YOU EDIT ======
const PAGE_TITLE = "Bubsi's Battle Pass";
const PAGE_SUB =
  "Elke week opent een nieuwe tile. Klik op een tile voor meer informatie";

/**
 * Set your reveal schedule here (ISO timestamps).
 * Use your local timezone when generating these, or paste UTC with Z.
 *
 * Examples:
 *  - "2025-12-21T18:00:00+01:00" (explicit offset)
 *  - "2025-12-21T17:00:00Z"      (UTC)
 *  - "2025-12-21T18:00:00"       (treated as local time by most browsers)
 */
const TILES = [
  { id: "1", title: "Date", rarity: "10 & 11 January", revealAt: "2025-12-31T20:30:00+01:00",  imageUrl: "https://i.ibb.co/V0L777yr/bp-tile1.jpg", icon: "👫" },
  { id: "2", title: "Family Time", rarity: "Week 3", revealAt: "2026-01-10T20:30:00+01:00", icon: "👨‍👩‍👦️" },	
  { id: "3", title: "Home date", rarity: "Week 4", revealAt: "2026-01-17T20:30:00+01:00", icon: "🏠" },
  { id: "4", title: "Surprise", rarity: "Week 5", revealAt: "2026-01-24T20:30:00+01:00", icon: "🎁" },
  { id: "5", title: "Date", rarity: "Week 6", revealAt: "2026-01-31T20:30:00+01:00", icon: "👫" },
  { id: "6", title: "Family Time", rarity: "Week 7", revealAt: "2026-02-01T20:30:00+01:00", icon: "👨‍👩‍👦" },
  { id: "7", title: "Home date", rarity: "Week 8", revealAt: "2026-02-07T20:30:00+01:00", icon: "🏠" },  
  { id: "8", title: "Surprise", rarity: "Week 9", revealAt: "2026-02-14T20:30:00+01:00", icon: "🎁" },
  { id: "9", title: "Date", rarity: "Week 10", revealAt: "2026-02-21T20:30:00+01:00", icon: "👫" },
  { id: "10", title: "Family Time", rarity: "Week 11", revealAt: "2026-02-28T20:30:00+01:00", icon: "👨‍👩‍👦" },
  { id: "11", title: "Home date", rarity: "Week 12", revealAt: "2026-03-07T20:30:00+01:00", icon: "🏠" },
  { id: "12", title: "Surprise", rarity: "Week 13", revealAt: "2026-03-14T20:30:00+01:00", icon: "🎁" },
];

// ====== STATE ======
const STORAGE_KEY = "reveal_track_images_v1"; // id -> dataURL
let imagesById = loadImages();

// ====== ELEMENTS ======
document.getElementById("pageTitle").textContent = PAGE_TITLE;
document.getElementById("pageSub").textContent = PAGE_SUB;

const trackRow = document.getElementById("trackRow");
const track = document.getElementById("track");
const trackHint = document.getElementById("trackHint");

const filePicker = document.getElementById("filePicker");

const jumpNextBtn = document.getElementById("jumpNextBtn");

// Modal
const modalBackdrop = document.getElementById("modalBackdrop");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalClose2Btn = document.getElementById("modalClose2Btn");
const modalUploadBtn = document.getElementById("modalUploadBtn");

const modalKicker = document.getElementById("modalKicker");
const modalTitle = document.getElementById("modalTitle");
const modalPreview = document.getElementById("modalPreview");
const modalRarity = document.getElementById("modalRarity");
const modalReveal = document.getElementById("modalReveal");
const modalStatus = document.getElementById("modalStatus");

let activeTileId = null;

// ====== HELPERS ======
function loadImages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveImages() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(imagesById));
}

function parseTime(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatLocal(dt) {
  // local human-friendly
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
}

function msToParts(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return { days, hours, mins, secs };
}

function countdownString(ms) {
  const { days, hours, mins, secs } = msToParts(ms);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

function rarityLabel(r) {
  return r.charAt(0).toUpperCase() + r.slice(1);
}

function rarityClass(r) {
  switch (r) {
    case "common": return "r-common";
    case "rare": return "r-rare";
    case "epic": return "r-epic";
    case "legendary": return "r-legendary";
    default: return "r-common";
  }
}

function rarityBadgeClass(r) {
  return `badge rarity-${r}`;
}

function isRevealed(tile, now = new Date()) {
  const t = parseTime(tile.revealAt);
  if (!t) return false;
  return now.getTime() >= t.getTime();
}

function nextUnrevealedIndex() {
  const now = new Date();
  return TILES.findIndex(t => !isRevealed(t, now));
}

// ====== RENDER ======
function renderTrack() {
  trackRow.innerHTML = "";

  const now = new Date();
  trackHint.textContent = `Now: ${formatLocal(now)} CET`;

  for (const tile of TILES) {
  const revealAt = parseTime(tile.revealAt);
  const revealed = revealAt ? now >= revealAt : false;

  // URL-only cover (shown only after reveal)
  const coverUrl = revealed ? (tile.imageUrl || "") : "";
  const hasImage = !!coverUrl;

  const el = document.createElement("div");
  el.className = `tile ${rarityClass(tile.rarity)} ${revealed ? "revealed" : "locked"}`;
  el.setAttribute("data-id", tile.id);

  // Image-only art container
  const art = document.createElement("div");
  art.className = "art art-only";

  if (hasImage) {
    const img = document.createElement("img");
    img.src = coverUrl;
    img.alt = `${tile.title} cover`;
    art.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.className = "placeholder";
    ph.textContent = tile.icon || "⬡";
    art.appendChild(ph);
  }

  el.appendChild(art);

  // Locked overlay with countdown
  if (!revealed) {
    const overlay = document.createElement("div");
    overlay.className = "locked-overlay";

    const cd = document.createElement("div");
    cd.className = "countdown big";
    cd.setAttribute("data-countdown-for", tile.id);
    cd.innerHTML = `<small>Reveals in</small>${countdownString(
      (revealAt ? revealAt.getTime() : now.getTime()) - now.getTime()
    )}`;

    overlay.appendChild(cd);
    el.appendChild(overlay);
  }

  // Click → modal stays
  el.addEventListener("click", () => {
    openTileModal(tile);
  });

  trackRow.appendChild(el);
}



  // After render, update countdowns immediately
  updateCountdowns();
}

function updateCountdowns() {
  const now = new Date();
  for (const tile of TILES) {
    const el = document.querySelector(`[data-countdown-for="${tile.id}"]`);
    if (!el) continue;

    const revealAt = parseTime(tile.revealAt);
    if (!revealAt) {
      el.textContent = "Invalid time";
      continue;
    }

    const ms = revealAt.getTime() - now.getTime();
    el.firstChild && (el.firstChild.textContent = "Reveals in"); // small text node from <small>
    // Replace content safely:
    el.innerHTML = `<small>Reveals in</small>${countdownString(ms)}`;

    // If the reveal just happened, re-render the tile states
    if (ms <= 0) renderTrack();
  }
}

// ====== MODAL ======
function openTileModal(tile) {
  activeTileId = tile.id;

  const now = new Date();
  const revealAt = parseTime(tile.revealAt);
  const revealed = revealAt ? now >= revealAt : false;

  modalKicker.textContent = `TILE • ${tile.id}`;
  modalTitle.textContent = tile.title;
  modalRarity.textContent = rarityLabel(tile.rarity);
  modalReveal.textContent = revealAt ? formatLocal(revealAt) : "Invalid time";
  modalStatus.textContent = revealed ? "Revealed" : "Locked";

  // URL-only preview: show tile.imageUrl only after reveal
  modalPreview.innerHTML = "";

  if (revealed && tile.imageUrl) {
    const img = document.createElement("img");
    img.src = tile.imageUrl;
    img.alt = `${tile.title} cover`;
    modalPreview.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.style.fontSize = "56px";
    ph.textContent = tile.icon || "⬡";
    modalPreview.appendChild(ph);
  }

  // URL-only: no uploads
  modalUploadBtn.style.display = "none";

  modalBackdrop.classList.add("open");
  modalBackdrop.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modalBackdrop.classList.remove("open");
  modalBackdrop.setAttribute("aria-hidden", "true");
  activeTileId = null;
}

modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});
modalCloseBtn.addEventListener("click", closeModal);
modalClose2Btn.addEventListener("click", closeModal);

modalUploadBtn.addEventListener("click", () => {
  if (!activeTileId) return;

  const tile = TILES.find(t => t.id === activeTileId);
  if (!tile) return;

  if (!isRevealed(tile)) return; // safety
  filePicker.value = "";
  filePicker.click();
});

// Shared file picker handler
filePicker.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file || !activeTileId) return;

  // Basic validation
  if (!file.type.startsWith("image/")) return;

  const dataUrl = await fileToDataURL(file);
  imagesById[activeTileId] = dataUrl;
  saveImages();
  renderTrack();

  // Refresh modal preview
  const tile = TILES.find(t => t.id === activeTileId);
  if (tile) openTileModal(tile);
});

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ====== BUTTONS ======
jumpNextBtn.addEventListener("click", () => {
  const idx = nextUnrevealedIndex();
  // If all revealed, jump to last
  const targetIndex = idx === -1 ? TILES.length - 1 : idx;
  const tileId = TILES[targetIndex]?.id;
  const tileEl = tileId ? document.querySelector(`.tile[data-id="${tileId}"]`) : null;

  if (tileEl) {
    tileEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }
});

// ====== INIT ======
renderTrack();
// Update countdowns every second
setInterval(updateCountdowns, 1000);

