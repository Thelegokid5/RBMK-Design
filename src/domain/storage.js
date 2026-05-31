import { createDesign } from "./grid.js";

const STORAGE_KEY = "rbmk-design:saves";

export function loadSlots() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSlot(design) {
  const slots = loadSlots();
  const slot = {
    id: crypto.randomUUID(),
    name: design.name || "Untitled RBMK",
    updatedAt: new Date().toISOString(),
    design,
  };
  const next = [slot, ...slots].slice(0, 24);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function exportDesign(design) {
  const blob = new Blob([JSON.stringify(design, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${design.name.replace(/[^a-z0-9_-]+/gi, "_") || "rbmk-design"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importDesign(file) {
  const raw = await file.text();
  const parsed = JSON.parse(raw);
  if (parsed.version !== 1 || !Array.isArray(parsed.cells)) return createDesign();
  return parsed;
}
