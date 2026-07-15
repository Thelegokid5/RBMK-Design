import { CELL_SIZE, CHANNELS, CONTROL_GROUPS, SIM_TPS, STEAM_TYPES } from "./domain/channels.js";
import { evaluateFuelOutput, FUEL_RODS, fuelById } from "./domain/fuels.js";
import { cloneDesign, createDesign, resizeDesign } from "./domain/grid.js";
import { createSimulationState, stepSimulation, summarizeSimulation } from "./domain/simulation.js";
import { exportDesign, importDesign, loadSlots, saveSlot } from "./domain/storage.js";

// Application State
let design = createDesign(11);
let sim = createSimulationState(11);
let running = false;
let tool = "paint"; // "paint" | "erase"
let selectedType = "fuel";
let selectedFuel = FUEL_RODS[0].id;
let selectedSteam = STEAM_TYPES[0].id;
let selected = null; // [row, col] or null
let slots = loadSlots();
let pointerDown = false;
let simIntervalId = null;
let cellArtCache = []; // 2D array of cell-art elements
let selectedCellBtn = null;

// DOM Element References
const nameInput = document.getElementById("design-name-input");
const gridSizeSelect = document.getElementById("grid-size-select");
const btnPaintTool = document.getElementById("btn-paint-tool");
const btnEraseTool = document.getElementById("btn-erase-tool");
const btnRunSim = document.getElementById("btn-run-sim");
const btnResetSim = document.getElementById("btn-reset-sim");
const btnSaveSlot = document.getElementById("btn-save-slot");
const btnExportJson = document.getElementById("btn-export-json");
const btnImportJson = document.getElementById("btn-import-json");
const fileImportInput = document.getElementById("file-import-input");

const paletteList = document.getElementById("palette-list");
const fuelSelectSection = document.getElementById("fuel-select-section");
const fuelRodSelect = document.getElementById("fuel-rod-select");
const steamSelectSection = document.getElementById("steam-select-section");
const steamTypeSelect = document.getElementById("steam-type-select");
const countsList = document.getElementById("counts-list");

const reactorGrid = document.getElementById("reactor-grid");
const doddContent = document.getElementById("dodd-content");
const savesList = document.getElementById("saves-list");
const warningsContainer = document.getElementById("warnings-container");

const statusTick = document.getElementById("status-tick");
const statusFlux = document.getElementById("status-flux");
const statusHeat = document.getElementById("status-heat");
const statusMaxHeat = document.getElementById("status-max-heat");
const statusSteamContainer = document.getElementById("status-steam-container");

const RBMK_TEXTURES = {
  fuel: "rbmk_element_top.png",
  moderated_fuel: "rbmk_element_mod_top.png",
  control: "rbmk_control_top.png",
  moderated_control: "rbmk_control_mod_top.png",
  auto_control: "rbmk_control_auto_top.png",
  steam: "rbmk_boiler_top.png",
  graphite: "rbmk_moderator_top.png",
  reflector: "rbmk_reflector_top.png",
  absorber: "rbmk_absorber_top.png",
  irradiation: "rbmk_storage_top.png",
  heater: "rbmk_heater_top.png",
  cooler: "rbmk_cooler_top.png",
  structural: "rbmk_blank_top.png",
};

// Cell Art DOM Element Creator
function createCellArtDOM(cell, r, c) {
  const channel = CHANNELS.find((entry) => entry.id === cell.type);
  const fuel = cell.fuelId ? fuelById[cell.fuelId] : null;
  const steam = STEAM_TYPES.find((entry) => entry.id === cell.steamType);
  const color = fuel ? (fuel.selfIgniting ? "#9fd35d" : "#dccf54") : steam?.color ?? channel?.color ?? "#20242a";
  
  const heat = sim.heat[r]?.[c] ?? 20;
  const flux = sim.flux[r]?.[c] ?? 0;
  const heatGlow = Math.max(0, Math.min(1, (heat - 80) / 1300));
  const fluxGlow = Math.max(0, Math.min(1, flux / 80));

  const wrapper = document.createElement("div");
  wrapper.className = "cell-art";
  wrapper.style.setProperty("--channel", color);
  wrapper.style.setProperty("--heat", heatGlow);
  wrapper.style.setProperty("--flux", fluxGlow);

  const textureName = RBMK_TEXTURES[cell.type];
  if (textureName) {
    wrapper.classList.add("textured");
    const texture = document.createElement("img");
    texture.className = "cell-texture";
    texture.src = `textures/rbmk/${textureName}`;
    texture.alt = "";
    texture.draggable = false;
    wrapper.appendChild(texture);
  }
  
  const fluxOverlay = document.createElement("div");
  fluxOverlay.className = "flux-overlay";
  wrapper.appendChild(fluxOverlay);
  
  const heatStrip = document.createElement("div");
  heatStrip.className = "heat-strip";
  wrapper.appendChild(heatStrip);
  
  return wrapper;
}

// Helper to label cells for accessibility / tooltips
function cellLabel(cell) {
  if (cell.type === "fuel" || cell.type === "moderated_fuel") return cell.fuelId ? fuelById[cell.fuelId]?.name ?? "Fuel" : "Fuel";
  if (cell.type === "steam") return STEAM_TYPES.find((steam) => steam.id === cell.steamType)?.label ?? "Steam";
  return CHANNELS.find((channel) => channel.id === cell.type)?.label ?? "Empty";
}

// Make a default cell object of selected type/fuel/steam for painting
function makePaintCell(type, fuel, steam) {
  return {
    type,
    fuelId: (type === "fuel" || type === "moderated_fuel") ? fuel : null,
    steamType: type === "steam" ? steam : "steam",
    controlGroup: "Default",
    controlInsertion: (type === "control" || type === "moderated_control" || type === "auto_control") ? 100 : 0,
    covered: true,
  };
}

// Change size of design grid
function changeSize(size) {
  const next = resizeDesign(design, size);
  design = next;
  resetSimulation(next);
  selected = null;
  renderGrid();
  renderCounts();
  renderDoddStatic();
}

// Paint cell at coordinates
function paintCell(row, col) {
  const cell = design.cells[row][col];
  if (tool === "erase") {
    design.cells[row][col] = {
      ...cell,
      type: "empty",
      fuelId: null
    };
  } else {
    design.cells[row][col] = makePaintCell(selectedType, selectedFuel, selectedSteam);
  }
  
  // Incremental render of this specific cell
  const btn = reactorGrid.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  if (btn) {
    btn.innerHTML = "";
    btn.title = `${col + 1},${row + 1}: ${cellLabel(design.cells[row][col])}`;
    const cellArt = createCellArtDOM(design.cells[row][col], row, col);
    btn.appendChild(cellArt);
    cellArtCache[row][col] = cellArt;
  }
  
  selectCell(row, col);
  renderCounts();
  
  const summary = summarizeSimulation(design, sim);
  updateWarnings(summary.warnings);
}

// Select a cell and render inspectors
function selectCell(r, c) {
  if (selectedCellBtn) {
    selectedCellBtn.classList.remove("selected");
  }
  
  selected = [r, c];
  
  const newSelectedBtn = reactorGrid.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
  if (newSelectedBtn) {
    newSelectedBtn.classList.add("selected");
    selectedCellBtn = newSelectedBtn;
  }
  
  renderDoddStatic();
}

// Toggle simulation play/pause
function toggleSimulation() {
  running = !running;
  if (running) {
    btnRunSim.classList.add("active");
    btnRunSim.querySelector(".text-span").textContent = "Pause";
    btnRunSim.querySelector(".icon-span").innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="4" height="16" x="6" y="4" rx="1"/><rect width="4" height="16" x="14" y="4" rx="1"/></svg>
    `;
    
    simIntervalId = setInterval(() => {
      sim = stepSimulation(design, sim);
      
      updateCells();
      updateDoddLive();
      
      const summary = summarizeSimulation(design, sim);
      updateStatusBar(summary);
      updateWarnings(summary.warnings);
    }, 1000 / SIM_TPS);
  } else {
    stopSimulationLoop();
  }
}

// Stop simulation tick loop
function stopSimulationLoop() {
  if (simIntervalId) {
    clearInterval(simIntervalId);
    simIntervalId = null;
  }
  running = false;
  btnRunSim.classList.remove("active");
  btnRunSim.querySelector(".text-span").textContent = "Run";
  btnRunSim.querySelector(".icon-span").innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
  `;
}

// Reset simulation to 0 state
function resetSimulation(nextDesign = design) {
  stopSimulationLoop();
  sim = createSimulationState(nextDesign.size);
  
  updateCells();
  updateDoddLive();
  
  const summary = summarizeSimulation(nextDesign, sim);
  updateStatusBar(summary);
  updateWarnings(summary.warnings);
}

// Render channels palette
function renderPalette() {
  paletteList.innerHTML = "";
  const paletteChannels = CHANNELS.filter((ch) => ch.id !== "empty");
  
  paletteChannels.forEach((channel) => {
    const btn = document.createElement("button");
    btn.className = "palette-item";
    if (selectedType === channel.id) {
      btn.classList.add("selected");
    }
    btn.innerHTML = `<span style="background: ${channel.color}"></span>${channel.label}`;
    
    btn.addEventListener("click", () => {
      selectedType = channel.id;
      paletteList.querySelectorAll(".palette-item").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      
      if (selectedType === "fuel" || selectedType === "moderated_fuel") {
        fuelSelectSection.style.display = "block";
        steamSelectSection.style.display = "none";
      } else if (selectedType === "steam") {
        fuelSelectSection.style.display = "none";
        steamSelectSection.style.display = "block";
      } else {
        fuelSelectSection.style.display = "none";
        steamSelectSection.style.display = "none";
      }
    });
    
    paletteList.appendChild(btn);
  });
}

// Render save slots
function renderSaves() {
  savesList.innerHTML = "";
  if (slots.length === 0) {
    savesList.innerHTML = `<div class="muted">No local saves yet.</div>`;
    return;
  }
  
  slots.forEach((slot) => {
    const btn = document.createElement("button");
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/></svg>
      <span>${slot.name}</span>
    `;
    btn.addEventListener("click", () => {
      design = cloneDesign(slot.design);
      nameInput.value = design.name;
      gridSizeSelect.value = design.size;
      resetSimulation(design);
      selected = null;
      renderGrid();
      renderCounts();
      renderDoddStatic();
    });
    savesList.appendChild(btn);
  });
}

// Render grid layout
function renderGrid() {
  reactorGrid.innerHTML = "";
  reactorGrid.style.gridTemplateColumns = `repeat(${design.size}, ${CELL_SIZE}px)`;
  cellArtCache = Array.from({ length: design.size }, () => []);
  selectedCellBtn = null;
  
  for (let r = 0; r < design.size; r += 1) {
    for (let c = 0; c < design.size; c += 1) {
      const cell = design.cells[r][c];
      
      const btn = document.createElement("button");
      btn.className = "cell";
      if (selected && selected[0] === r && selected[1] === c) {
        btn.classList.add("selected");
        selectedCellBtn = btn;
      }
      btn.style.width = `${CELL_SIZE}px`;
      btn.style.height = `${CELL_SIZE}px`;
      btn.dataset.row = r;
      btn.dataset.col = c;
      btn.title = `${c + 1},${r + 1}: ${cellLabel(cell)}`;
      
      const cellArt = createCellArtDOM(cell, r, c);
      btn.appendChild(cellArt);
      cellArtCache[r][c] = cellArt;
      
      btn.addEventListener("pointerdown", (e) => {
        if (e.button === 2) {
          e.preventDefault();
          selectCell(r, c);
          return;
        }
        e.preventDefault();
        pointerDown = true;
        paintCell(r, c);
      });
      
      btn.addEventListener("pointerenter", () => {
        if (pointerDown) {
          paintCell(r, c);
        }
      });
      
      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        selectCell(r, c);
      });
      
      reactorGrid.appendChild(btn);
    }
  }
}

// Render counts stat list
function renderCounts() {
  countsList.innerHTML = "";
  const counts = new Map();
  
  for (const row of design.cells) {
    for (const cell of row) {
      if (cell.type !== "empty") {
        counts.set(cell.type, (counts.get(cell.type) ?? 0) + 1);
      }
    }
  }
  
  if (counts.size === 0) {
    countsList.innerHTML = `<div class="muted">No channels placed yet.</div>`;
    return;
  }
  
  // Sort counts by label
  const sorted = [...counts.entries()].sort((a, b) => {
    const labelA = CHANNELS.find((channel) => channel.id === a[0])?.label ?? a[0];
    const labelB = CHANNELS.find((channel) => channel.id === b[0])?.label ?? b[0];
    return labelA.localeCompare(labelB);
  });
  
  sorted.forEach(([type, count]) => {
    const label = CHANNELS.find((channel) => channel.id === type)?.label ?? type;
    const div = document.createElement("div");
    div.innerHTML = `<span>${label}</span><strong>${count}</strong>`;
    countsList.appendChild(div);
  });
}

// Render static DODD elements (inputs, select dropdowns, text labels)
function renderDoddStatic() {
  if (!selected) {
    doddContent.innerHTML = `<div class="empty-state">Select a column to inspect live values.</div>`;
    return;
  }
  
  const [r, c] = selected;
  const cell = design.cells[r]?.[c];
  if (!cell) {
    doddContent.innerHTML = `<div class="empty-state">Select a column to inspect live values.</div>`;
    return;
  }
  
  const fuel = cell.fuelId ? fuelById[cell.fuelId] : null;

  let html = `
    <div class="coord" id="live-coord">Column ${c + 1}, ${r + 1}</div>
    <div class="kv"><span>Coordinates</span><strong>X ${c + 1}, Y ${r + 1}</strong></div>
    <div class="kv"><span>Type</span><strong id="live-type">${cellLabel(cell)}</strong></div>
    <div class="kv"><span>Covered</span><strong id="live-covered">${cell.covered ? "Yes" : "No"}</strong></div>
    <div class="kv"><span>Column Heat</span><strong id="live-heat">20°C</strong></div>
    <div class="kv"><span>Core Heat</span><strong id="live-core-heat">20°C</strong></div>
    <div class="kv"><span>Skin Heat</span><strong id="live-skin-heat">20°C</strong></div>
    <div class="kv"><span>Flux Input</span><strong id="live-flux-input">0.000</strong></div>
    <div class="kv"><span>Flux Output</span><strong id="live-flux-output">0.000</strong></div>
    <div class="kv"><span>Xenon</span><strong id="live-xenon">0.00%</strong></div>
    <div class="kv"><span>Depletion</span><strong id="live-depletion">0.00%</strong></div>
  `;
  
  if (cell.type === "control" || cell.type === "moderated_control" || cell.type === "auto_control") {
    html += `
      <section>
        <h3>Control</h3>
        <label class="stacked">Group
          <select id="inspector-control-group">
            ${CONTROL_GROUPS.map((g) => `<option value="${g}" ${cell.controlGroup === g ? "selected" : ""}>${g}</option>`).join("")}
          </select>
        </label>
        <label class="stacked">Insertion <span id="inspector-insertion-label">${cell.controlInsertion}</span>%
          <input id="inspector-control-insertion" type="range" min="0" max="100" value="${cell.controlInsertion}" />
        </label>
      </section>
    `;
  }
  
  if (fuel) {
    html += `
      <section>
        <h3>${fuel.name}</h3>
        <div class="kv"><span>Yield</span><strong>${fuel.yield.toLocaleString()}</strong></div>
        <div class="kv"><span>Depletion</span><strong>${fuel.decay.replace(/_/g, " ")}</strong></div>
        <div class="kv"><span>Flux Function</span><strong>${fuel.fluxFunction.replace(/_/g, " ")}</strong></div>
        <div class="kv"><span>Reactivity</span><strong>${fuel.reactivity}</strong></div>
        <div class="kv"><span>Self flux</span><strong>${fuel.selfRate}</strong></div>
        <div class="kv"><span>Splits with</span><strong>${fuel.splitsWith}</strong></div>
        <div class="kv"><span>Splits into</span><strong>${fuel.splitsInto}</strong></div>
        <div class="kv"><span>Melt point</span><strong>${fuel.meltingPoint}°C</strong></div>
        <div class="kv"><span>Heat/flux</span><strong>${fuel.heatPerFlux}</strong></div>
        <div class="kv"><span>Est. heat/t</span><strong id="live-est-heat-tick">0.000</strong></div>
        <div class="kv"><span>Diffusion</span><strong>${fuel.diffusion}</strong></div>
        <div class="kv"><span>Self igniting</span><strong>${fuel.selfIgniting ? "Yes" : "No"}</strong></div>
      </section>
    `;
  }
  
  doddContent.innerHTML = html;
  
  const groupSelect = document.getElementById("inspector-control-group");
  const insertionRange = document.getElementById("inspector-control-insertion");
  const insertionLabel = document.getElementById("inspector-insertion-label");
  
  if (groupSelect) {
    groupSelect.addEventListener("change", (e) => {
      design.cells[r][c].controlGroup = e.target.value;
    });
  }
  
  if (insertionRange) {
    insertionRange.addEventListener("input", (e) => {
      const val = parseInt(e.target.value);
      design.cells[r][c].controlInsertion = val;
      if (insertionLabel) {
        insertionLabel.textContent = val;
      }
    });
  }
  
  updateDoddLive();
}

// Update only dynamic metrics in DODD to avoid interrupting range sliders
function updateDoddLive() {
  if (!selected) return;
  const [r, c] = selected;
  const cell = design.cells[r]?.[c];
  if (!cell) return;
  
  const fuel = cell.fuelId ? fuelById[cell.fuelId] : null;
  const liveHeat = sim.heat[r]?.[c] ?? 20;
  const liveCoreHeat = sim.coreHeat[r]?.[c] ?? 20;
  const liveSkinHeat = sim.skinHeat[r]?.[c] ?? 20;
  const liveFlux = sim.flux[r]?.[c] ?? 0;
  const liveXenon = sim.xenon[r]?.[c] ?? 0;
  const liveDepletion = sim.depletion[r]?.[c] ?? 0;
  
  const fuelOutputVal = fuel ? evaluateFuelOutput(fuel, liveFlux, liveXenon, liveDepletion, liveCoreHeat) : 0;

  const heatEl = document.getElementById("live-heat");
  const coreHeatEl = document.getElementById("live-core-heat");
  const skinHeatEl = document.getElementById("live-skin-heat");
  const fluxInputEl = document.getElementById("live-flux-input");
  const fluxOutputEl = document.getElementById("live-flux-output");
  const xenonEl = document.getElementById("live-xenon");
  const depletionEl = document.getElementById("live-depletion");
  const estHeatEl = document.getElementById("live-est-heat-tick");
  
  if (heatEl) heatEl.textContent = `${Math.round(liveHeat)}°C`;
  if (coreHeatEl) coreHeatEl.textContent = `${Math.round(liveCoreHeat)}°C`;
  if (skinHeatEl) skinHeatEl.textContent = `${Math.round(liveSkinHeat)}°C`;
  if (fluxInputEl) fluxInputEl.textContent = liveFlux.toFixed(3);
  if (fluxOutputEl) fluxOutputEl.textContent = fuelOutputVal.toFixed(3);
  if (xenonEl) xenonEl.textContent = `${liveXenon.toFixed(2)}%`;
  if (depletionEl) depletionEl.textContent = `${liveDepletion.toFixed(2)}%`;
  if (estHeatEl && fuel) estHeatEl.textContent = (fuelOutputVal * fuel.heatPerFlux).toFixed(3);
}

// Update style parameters of existing grid cells during simulation tick
function updateCells() {
  for (let r = 0; r < design.size; r++) {
    for (let c = 0; c < design.size; c++) {
      const cellArt = cellArtCache[r]?.[c];
      if (cellArt) {
        const heat = sim.heat[r]?.[c] ?? 20;
        const flux = sim.flux[r]?.[c] ?? 0;
        const heatGlow = Math.max(0, Math.min(1, (heat - 80) / 1300));
        const fluxGlow = Math.max(0, Math.min(1, flux / 80));
        cellArt.style.setProperty("--heat", heatGlow);
        cellArt.style.setProperty("--flux", fluxGlow);
      }
    }
  }
}

// Update stats at bottom status bar
function updateStatusBar(summary) {
  statusTick.textContent = sim.tick;
  statusFlux.textContent = summary.totalFlux.toFixed(1);
  statusHeat.textContent = `${summary.totalHeat.toFixed(1)} HE/t`;
  
  statusMaxHeat.textContent = `${Math.round(summary.maxHeat)}°C`;
  if (summary.maxHeat > 1200) {
    statusMaxHeat.className = "hot";
  } else {
    statusMaxHeat.className = "";
  }
  
  statusSteamContainer.innerHTML = "";
  STEAM_TYPES.forEach((steam) => {
    const amount = summary.steamByType[steam.id] ?? 0;
    const div = document.createElement("div");
    div.innerHTML = `
      <span>${steam.label}</span>
      <strong style="color: ${steam.color}">${amount.toLocaleString()} mB/t</strong>
    `;
    statusSteamContainer.appendChild(div);
  });
}

// Update warnings container overlay
function updateWarnings(warnings) {
  warningsContainer.innerHTML = "";
  warnings.slice(0, 6).forEach((warning) => {
    const div = document.createElement("div");
    div.className = warning.level;
    div.textContent = warning.message;
    warningsContainer.appendChild(div);
  });
}

// Initialize Application UI
function initUI() {
  // Grid size choices
  gridSizeSelect.innerHTML = "";
  for (let s = 5; s <= 25; s += 1) {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = `${s}x${s}`;
    if (s === design.size) opt.selected = true;
    gridSizeSelect.appendChild(opt);
  }
  
  // Fuel selections
  fuelRodSelect.innerHTML = "";
  FUEL_RODS.forEach((fuel) => {
    const opt = document.createElement("option");
    opt.value = fuel.id;
    opt.textContent = `${fuel.name}${fuel.selfIgniting ? " - source" : ""}`;
    if (fuel.id === selectedFuel) opt.selected = true;
    fuelRodSelect.appendChild(opt);
  });
  
  // Steam selections
  steamTypeSelect.innerHTML = "";
  STEAM_TYPES.forEach((steam) => {
    const opt = document.createElement("option");
    opt.value = steam.id;
    opt.textContent = steam.label;
    if (steam.id === selectedSteam) opt.selected = true;
    steamTypeSelect.appendChild(opt);
  });
  
  // Design name
  nameInput.value = design.name || "Untitled RBMK";
  
  // Handlers
  nameInput.addEventListener("input", (e) => {
    design.name = e.target.value;
  });
  
  gridSizeSelect.addEventListener("change", (e) => {
    changeSize(Number(e.target.value));
  });
  
  fuelRodSelect.addEventListener("change", (e) => {
    selectedFuel = e.target.value;
  });
  
  steamTypeSelect.addEventListener("change", (e) => {
    selectedSteam = e.target.value;
  });
  
  btnPaintTool.addEventListener("click", () => {
    tool = "paint";
    btnPaintTool.classList.add("active");
    btnEraseTool.classList.remove("active");
  });
  
  btnEraseTool.addEventListener("click", () => {
    tool = "erase";
    btnEraseTool.classList.add("active");
    btnPaintTool.classList.remove("active");
  });
  
  btnRunSim.addEventListener("click", () => {
    toggleSimulation();
  });
  
  btnResetSim.addEventListener("click", () => {
    resetSimulation();
  });
  
  btnSaveSlot.addEventListener("click", () => {
    slots = saveSlot(design);
    renderSaves();
  });
  
  btnExportJson.addEventListener("click", () => {
    exportDesign(design);
  });
  
  btnImportJson.addEventListener("click", () => {
    fileImportInput.click();
  });
  
  fileImportInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const next = await importDesign(file);
      design = next;
      nameInput.value = design.name;
      gridSizeSelect.value = design.size;
      resetSimulation(next);
      selected = null;
      renderGrid();
      renderCounts();
      renderDoddStatic();
    }
  });
  
  window.addEventListener("pointerup", () => {
    pointerDown = false;
  });
  
  // Initial draw
  renderPalette();
  renderSaves();
  renderCounts();
  renderGrid();
  renderDoddStatic();
  
  const summary = summarizeSimulation(design, sim);
  updateStatusBar(summary);
  updateWarnings(summary.warnings);
}

// Start application
initUI();
