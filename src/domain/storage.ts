import { createDesign } from "./grid";
import type { GridDesign } from "./types";

const STORAGE_KEY = "rbmk-design:saves";

export interface SaveSlot {
  id: string;
  name: string;
  updatedAt: string;
  design: GridDesign;
}

export function loadSlots(): SaveSlot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SaveSlot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSlot(design: GridDesign): SaveSlot[] {
  const slots = loadSlots();
  const slot: SaveSlot = {
    id: crypto.randomUUID(),
    name: design.name || "Untitled RBMK",
    updatedAt: new Date().toISOString(),
    design,
  };
  const next = [slot, ...slots].slice(0, 24);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function exportDesign(design: GridDesign): void {
  const blob = new Blob([JSON.stringify(design, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${design.name.replace(/[^a-z0-9_-]+/gi, "_") || "rbmk-design"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importDesign(file: File): Promise<GridDesign> {
  const raw = await file.text();
  const parsed = JSON.parse(raw) as GridDesign;
  if (parsed.version !== 1 || !Array.isArray(parsed.cells)) return createDesign();
  return parsed;
}
