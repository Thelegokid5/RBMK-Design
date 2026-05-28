import { Download, Eraser, FolderOpen, Pause, Play, Save, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CELL_SIZE, CHANNELS, CONTROL_GROUPS, SIM_TPS, STEAM_TYPES } from "./domain/channels";
import { evaluateDecay, evaluateFlux, FUEL_RODS, fuelById } from "./domain/fuels";
import { cloneDesign, createDesign, resizeDesign } from "./domain/grid";
import { createSimulationState, stepSimulation, summarizeSimulation } from "./domain/simulation";
import { exportDesign, importDesign, loadSlots, saveSlot, type SaveSlot } from "./domain/storage";
import type { Cell, ChannelType, GridDesign, SimulationState, SteamType } from "./domain/types";

type Tool = "paint" | "erase";

const paletteChannels = CHANNELS.filter((channel) => channel.id !== "empty");

function cellLabel(cell: Cell): string {
  if (cell.type === "fuel" || cell.type === "moderated_fuel") return cell.fuelId ? fuelById[cell.fuelId]?.name ?? "Fuel" : "Fuel";
  if (cell.type === "steam") return STEAM_TYPES.find((steam) => steam.id === cell.steamType)?.label ?? "Steam";
  return CHANNELS.find((channel) => channel.id === cell.type)?.label ?? "Empty";
}

function CellArt({ cell, heat, flux }: { cell: Cell; heat: number; flux: number }) {
  const channel = CHANNELS.find((entry) => entry.id === cell.type);
  const fuel = cell.fuelId ? fuelById[cell.fuelId] : null;
  const steam = STEAM_TYPES.find((entry) => entry.id === cell.steamType);
  const color = fuel ? (fuel.selfIgniting ? "#9fd35d" : "#dccf54") : steam?.color ?? channel?.color ?? "#20242a";
  const heatGlow = Math.max(0, Math.min(1, (heat - 80) / 1300));
  const fluxGlow = Math.max(0, Math.min(1, flux / 80));

  return (
    <div className="cell-art" style={{ "--channel": color, "--heat": heatGlow, "--flux": fluxGlow } as React.CSSProperties}>
      <div className="cell-cover" />
      {cell.type === "fuel" || cell.type === "moderated_fuel" ? (
        <>
          {cell.type === "moderated_fuel" && <div className="moderator-cross" />}
          <div className="fuel-pin" />
          <div className="fuel-core" />
        </>
      ) : null}
      {cell.type === "control" || cell.type === "moderated_control" || cell.type === "auto_control" ? <div className="control-rod" /> : null}
      {cell.type === "steam" ? <div className="steam-bars"><span /><span /><span /></div> : null}
      {cell.type === "graphite" ? <div className="graphite-grid" /> : null}
      {cell.type === "reflector" ? <div className="reflector-mark" /> : null}
      {cell.type === "absorber" ? <div className="absorber-bars"><span /><span /><span /></div> : null}
      {cell.type === "irradiation" ? <div className="irradiation-core" /> : null}
      {cell.type === "heater" ? <div className="heater-bars"><span /><span /></div> : null}
      {cell.type === "cooler" ? <div className="cooler-core" /> : null}
      {cell.type === "structural" ? <div className="structural-core" /> : null}
      <div className="flux-overlay" />
      <div className="heat-strip" />
    </div>
  );
}

function makePaintCell(selectedType: ChannelType, selectedFuel: string, selectedSteam: SteamType): Cell {
  return {
    type: selectedType,
    fuelId: selectedType === "fuel" || selectedType === "moderated_fuel" ? selectedFuel : null,
    steamType: selectedType === "steam" ? selectedSteam : "steam",
    controlGroup: "Default",
    controlInsertion: selectedType === "control" || selectedType === "moderated_control" || selectedType === "auto_control" ? 100 : 0,
    covered: true,
  };
}

export function App() {
  const [design, setDesign] = useState<GridDesign>(() => createDesign(11));
  const [sim, setSim] = useState<SimulationState>(() => createSimulationState(11));
  const [running, setRunning] = useState(false);
  const [tool, setTool] = useState<Tool>("paint");
  const [selectedType, setSelectedType] = useState<ChannelType>("fuel");
  const [selectedFuel, setSelectedFuel] = useState(FUEL_RODS[0].id);
  const [selectedSteam, setSelectedSteam] = useState<SteamType>(STEAM_TYPES[0].id);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [slots, setSlots] = useState<SaveSlot[]>(() => loadSlots());
  const pointerDown = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const summary = useMemo(() => summarizeSimulation(design, sim), [design, sim]);
  const selectedCell = selected ? design.cells[selected[0]]?.[selected[1]] : null;
  const selectedFuelInfo = selectedCell?.fuelId ? fuelById[selectedCell.fuelId] : null;
  const selectedLive = selected
    ? {
        heat: sim.heat[selected[0]][selected[1]],
        coreHeat: sim.coreHeat[selected[0]][selected[1]],
        skinHeat: sim.skinHeat[selected[0]][selected[1]],
        flux: sim.flux[selected[0]][selected[1]],
        xenon: sim.xenon[selected[0]][selected[1]],
        depletion: sim.depletion[selected[0]][selected[1]],
      }
    : null;
  const selectedFuelOutput = selectedFuelInfo && selectedLive
    ? evaluateFlux(selectedFuelInfo.fluxFunction, selectedLive.flux)
        * Math.max(0, 1 - selectedLive.xenon / 100)
        * evaluateDecay(selectedFuelInfo.decay, selectedLive.depletion)
    : 0;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSim((state) => stepSimulation(design, state));
    }, 1000 / SIM_TPS);
    return () => window.clearInterval(id);
  }, [design, running]);

  useEffect(() => {
    const up = () => {
      pointerDown.current = false;
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  function resetSimulation(nextDesign = design) {
    setSim(createSimulationState(nextDesign.size));
    setRunning(false);
  }

  function updateDesign(mutator: (draft: GridDesign) => void) {
    setDesign((current) => {
      const draft = cloneDesign(current);
      mutator(draft);
      return draft;
    });
  }

  function paintCell(row: number, col: number) {
    updateDesign((draft) => {
      draft.cells[row][col] = tool === "erase" ? { ...draft.cells[row][col], type: "empty", fuelId: null } : makePaintCell(selectedType, selectedFuel, selectedSteam);
    });
    setSelected([row, col]);
  }

  function changeSize(size: number) {
    const next = resizeDesign(design, size);
    setDesign(next);
    resetSimulation(next);
    setSelected(null);
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    const next = await importDesign(file);
    setDesign(next);
    resetSimulation(next);
  }

  const counts = useMemo(() => {
    const result = new Map<ChannelType, number>();
    for (const row of design.cells) {
      for (const cell of row) {
        if (cell.type !== "empty") result.set(cell.type, (result.get(cell.type) ?? 0) + 1);
      }
    }
    return result;
  }, [design.cells]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">RBMK</span>
          <input value={design.name} onChange={(event) => updateDesign((draft) => { draft.name = event.target.value; })} />
        </div>
        <label className="compact-field">
          Grid
          <select value={design.size} onChange={(event) => changeSize(Number(event.target.value))}>
            {Array.from({ length: 21 }, (_, i) => i + 5).map((size) => <option key={size} value={size}>{size}x{size}</option>)}
          </select>
        </label>
        <button className={tool === "paint" ? "active" : ""} onClick={() => setTool("paint")} title="Paint selected channel">Paint</button>
        <button className={tool === "erase" ? "active danger" : "danger"} onClick={() => setTool("erase")} title="Erase cells"><Eraser size={16} /></button>
        <button className={running ? "active run" : "run"} onClick={() => setRunning((value) => !value)}>{running ? <Pause size={16} /> : <Play size={16} />}{running ? "Pause" : "Run"}</button>
        <button onClick={() => resetSimulation()}>Reset</button>
        <button onClick={() => setSlots(saveSlot(design))} title="Save locally"><Save size={16} />Save</button>
        <button onClick={() => exportDesign(design)} title="Export design JSON"><Download size={16} /></button>
        <button onClick={() => fileRef.current?.click()} title="Import design JSON"><Upload size={16} /></button>
        <input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(event) => void handleImport(event.target.files?.[0])} />
      </header>

      <main className="workspace">
        <aside className="panel palette">
          <h2>Channels</h2>
          <div className="palette-list">
            {paletteChannels.map((channel) => (
              <button key={channel.id} className={selectedType === channel.id ? "palette-item selected" : "palette-item"} onClick={() => setSelectedType(channel.id)}>
                <span style={{ background: channel.color }} />
                {channel.label}
              </button>
            ))}
          </div>

          {(selectedType === "fuel" || selectedType === "moderated_fuel") && (
            <section>
              <h3>Fuel</h3>
              <select className="wide" value={selectedFuel} onChange={(event) => setSelectedFuel(event.target.value)}>
                {FUEL_RODS.map((fuel) => <option key={fuel.id} value={fuel.id}>{fuel.name}{fuel.selfIgniting ? " - source" : ""}</option>)}
              </select>
            </section>
          )}

          {selectedType === "steam" && (
            <section>
              <h3>Steam</h3>
              <select className="wide" value={selectedSteam} onChange={(event) => setSelectedSteam(event.target.value as SteamType)}>
                {STEAM_TYPES.map((steam) => <option key={steam.id} value={steam.id}>{steam.label}</option>)}
              </select>
            </section>
          )}

          <section>
            <h3>Counts</h3>
            <div className="stat-list">
              {[...counts.entries()].map(([type, count]) => (
                <div key={type}><span>{CHANNELS.find((channel) => channel.id === type)?.label}</span><strong>{count}</strong></div>
              ))}
            </div>
          </section>
        </aside>

        <section className="reactor-area">
          <div className="grid-wrap">
            <div className="reactor-grid" style={{ gridTemplateColumns: `repeat(${design.size}, ${CELL_SIZE}px)` }}>
              {design.cells.map((row, r) => row.map((cell, c) => (
                <button
                  key={`${r}-${c}`}
                  className={selected?.[0] === r && selected?.[1] === c ? "cell selected" : "cell"}
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                  title={`${c + 1},${r + 1}: ${cellLabel(cell)}`}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    pointerDown.current = true;
                    paintCell(r, c);
                  }}
                  onPointerEnter={() => {
                    if (pointerDown.current) paintCell(r, c);
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setSelected([r, c]);
                  }}
                >
                  <CellArt cell={cell} heat={sim.heat[r]?.[c] ?? 20} flux={sim.flux[r]?.[c] ?? 0} />
                </button>
              )))}
            </div>
          </div>
        </section>

        <aside className="panel inspector">
          <h2>DODD</h2>
          <div className="panel-subtitle">Dump of Ordered Diagnostic Data</div>
          {selected && selectedCell ? (
            <>
              <div className="coord">Column {selected[1] + 1}, {selected[0] + 1}</div>
              <div className="kv"><span>Coordinates</span><strong>X {selected[1] + 1}, Y {selected[0] + 1}</strong></div>
              <div className="kv"><span>Type</span><strong>{cellLabel(selectedCell)}</strong></div>
              <div className="kv"><span>Covered</span><strong>{selectedCell.covered ? "Yes" : "No"}</strong></div>
              <div className="kv"><span>Column Heat</span><strong>{Math.round(selectedLive?.heat ?? 20)}C</strong></div>
              <div className="kv"><span>Core Heat</span><strong>{Math.round(selectedLive?.coreHeat ?? 20)}C</strong></div>
              <div className="kv"><span>Skin Heat</span><strong>{Math.round(selectedLive?.skinHeat ?? 20)}C</strong></div>
              <div className="kv"><span>Flux Input</span><strong>{(selectedLive?.flux ?? 0).toFixed(3)}</strong></div>
              <div className="kv"><span>Flux Output</span><strong>{selectedFuelOutput.toFixed(3)}</strong></div>
              <div className="kv"><span>Xenon</span><strong>{(selectedLive?.xenon ?? 0).toFixed(2)}%</strong></div>
              <div className="kv"><span>Depletion</span><strong>{(selectedLive?.depletion ?? 0).toFixed(2)}%</strong></div>

              {(selectedCell.type === "control" || selectedCell.type === "moderated_control" || selectedCell.type === "auto_control") && (
                <section>
                  <h3>Control</h3>
                  <label className="stacked">Group
                    <select value={selectedCell.controlGroup} onChange={(event) => updateDesign((draft) => { draft.cells[selected[0]][selected[1]].controlGroup = event.target.value; })}>
                      {CONTROL_GROUPS.map((group) => <option key={group}>{group}</option>)}
                    </select>
                  </label>
                  <label className="stacked">Insertion {selectedCell.controlInsertion}%
                    <input type="range" min="0" max="100" value={selectedCell.controlInsertion} onChange={(event) => updateDesign((draft) => { draft.cells[selected[0]][selected[1]].controlInsertion = Number(event.target.value); })} />
                  </label>
                </section>
              )}

              {selectedFuelInfo && (
                <section>
                  <h3>{selectedFuelInfo.name}</h3>
                  <div className="kv"><span>Yield</span><strong>{selectedFuelInfo.yield.toLocaleString()}</strong></div>
                  <div className="kv"><span>Decay</span><strong>{selectedFuelInfo.decay.replace(/_/g, " ")}</strong></div>
                  <div className="kv"><span>Flux Function</span><strong>{selectedFuelInfo.fluxFunction.replace(/_/g, " ")}</strong></div>
                  <div className="kv"><span>Splits with</span><strong>{selectedFuelInfo.splitsWith}</strong></div>
                  <div className="kv"><span>Splits into</span><strong>{selectedFuelInfo.splitsInto}</strong></div>
                  <div className="kv"><span>Melt point</span><strong>{selectedFuelInfo.meltingPoint}C</strong></div>
                  <div className="kv"><span>Heat/flux</span><strong>{selectedFuelInfo.heatPerFlux}</strong></div>
                  <div className="kv"><span>Est. heat/t</span><strong>{(selectedFuelOutput * selectedFuelInfo.heatPerFlux).toFixed(3)}</strong></div>
                  <div className="kv"><span>Diffusion</span><strong>{selectedFuelInfo.diffusion}</strong></div>
                  <div className="kv"><span>Self igniting</span><strong>{selectedFuelInfo.selfIgniting ? "Yes" : "No"}</strong></div>
                </section>
              )}
            </>
          ) : (
            <div className="empty-state">Select a column to inspect live values.</div>
          )}

          <section>
            <h3>Saves</h3>
            <div className="save-list">
              {slots.length === 0 ? <div className="muted">No local saves yet.</div> : slots.map((slot) => (
                <button key={slot.id} onClick={() => { setDesign(slot.design); resetSimulation(slot.design); }}>
                  <FolderOpen size={14} />
                  <span>{slot.name}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </main>

      <footer className="statusbar">
        <div><span>Tick</span><strong>{sim.tick}</strong></div>
        <div><span>Total Flux</span><strong>{summary.totalFlux.toFixed(1)}</strong></div>
        <div><span>Est. Heat</span><strong>{summary.totalHeat.toFixed(1)} HE/t</strong></div>
        <div><span>Max Heat</span><strong className={summary.maxHeat > 1200 ? "hot" : ""}>{Math.round(summary.maxHeat)}C</strong></div>
        {STEAM_TYPES.map((steam) => (
          <div key={steam.id}><span>{steam.label}</span><strong style={{ color: steam.color }}>{summary.steamByType[steam.id].toLocaleString()} mB/t</strong></div>
        ))}
      </footer>

      {summary.warnings.length > 0 && (
        <div className="warnings">
          {summary.warnings.slice(0, 6).map((warning, index) => <div key={index} className={warning.level}>{warning.message}</div>)}
        </div>
      )}
    </div>
  );
}
