import { DIRS, MELTDOWN_TEMP, STEAM_TYPES } from "./channels.js";
import { evaluateFuelOutput, fuelById } from "./fuels.js";

function makeFlat(size, fill = 0) {
  return Array.from({ length: size }, () => {
    const row = new Float32Array(size);
    row.fill(fill);
    return row;
  });
}

function copyFlat(source) {
  return source.map((row) => new Float32Array(row));
}

export function createSimulationState(size) {
  return {
    tick: 0,
    flux: makeFlat(size),
    heat: makeFlat(size, 20),
    coreHeat: makeFlat(size, 20),
    skinHeat: makeFlat(size, 20),
    xenon: makeFlat(size),
    depletion: makeFlat(size),
    meltdown: false,
  };
}

function isFuel(cell) {
  return (cell.type === "fuel" || cell.type === "moderated_fuel") && !!cell.fuelId;
}

function isModerator(cell) {
  return cell.type === "graphite" || cell.type === "moderated_control" || cell.type === "moderated_fuel";
}

function splitEfficiency(inputSpeed, targetSpeed) {
  if (inputSpeed === "any" || targetSpeed === "any") return 1;
  if (inputSpeed === targetSpeed) return 1;
  return targetSpeed === "slow" ? 0.5 : 0.3;
}

function controlTransmission(cell) {
  if (cell.type !== "control" && cell.type !== "moderated_control" && cell.type !== "auto_control") return 1;
  return Math.max(0, Math.min(1, 1 - cell.controlInsertion / 100));
}

function fuelOutput(cell, incomingFlux, xenon, depletion, coreHeat = 20) {
  if (!cell.fuelId) return 0;
  const fuel = fuelById[cell.fuelId];
  if (!fuel) return 0;
  return evaluateFuelOutput(fuel, incomingFlux, xenon, depletion, coreHeat);
}

export function stepSimulation(design, previous) {
  const size = design.size;
  const flux = makeFlat(size);
  const heat = copyFlat(previous.heat);
  const coreHeat = copyFlat(previous.coreHeat);
  const skinHeat = copyFlat(previous.skinHeat);
  const xenon = copyFlat(previous.xenon);
  const depletion = copyFlat(previous.depletion);

  for (let pass = 0; pass < 4; pass += 1) {
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        const cell = design.cells[r][c];
        if (!isFuel(cell) || !cell.fuelId) continue;
        const fuel = fuelById[cell.fuelId];
        if (!fuel) continue;
        const sourceOutput = fuelOutput(cell, flux[r][c], xenon[r][c], depletion[r][c], coreHeat[r][c]) / 4;
        if (sourceOutput <= 0) continue;

        for (const [dr, dc] of DIRS) {
          let nr = r + dr;
          let nc = c + dc;
          let stream = sourceOutput;
          let speed = cell.type === "moderated_fuel" ? "slow" : fuel.splitsInto;

          while (nr >= 0 && nr < size && nc >= 0 && nc < size && stream > 0.001) {
            const target = design.cells[nr][nc];
            if (isModerator(target)) speed = "slow";

            if (target.type === "empty") {
              break;
            }

            if (target.type === "control" || target.type === "moderated_control" || target.type === "auto_control") {
              const absorbed = stream * (1 - controlTransmission(target));
              heat[nr][nc] += absorbed / 20;
              stream *= controlTransmission(target);
              if (stream <= 0.001) break;
            }

            if (target.type === "absorber" || target.type === "irradiation") {
              heat[nr][nc] += stream / 20;
              break;
            }

            if (target.type === "reflector") {
              flux[r][c] += stream * 0.8;
              break;
            }

            if (isFuel(target) && target.fuelId) {
              const targetFuel = fuelById[target.fuelId];
              if (targetFuel) flux[nr][nc] += stream * splitEfficiency(speed, targetFuel.splitsWith);
              break;
            }

            nr += dr;
            nc += dc;
          }
        }
      }
    }
  }

  let meltdown = previous.meltdown;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const cell = design.cells[r][c];
      if (isFuel(cell) && cell.fuelId) {
        const fuel = fuelById[cell.fuelId];
        if (!fuel) continue;
        const out = fuelOutput(cell, flux[r][c], xenon[r][c], depletion[r][c], coreHeat[r][c]);
        coreHeat[r][c] += out * fuel.heatPerFlux;
        const coreToSkin = ((coreHeat[r][c] - skinHeat[r][c]) / 2) * fuel.diffusion;
        coreHeat[r][c] -= coreToSkin;
        skinHeat[r][c] += coreToSkin;
        const skinToColumn = (skinHeat[r][c] - heat[r][c]) / 2;
        skinHeat[r][c] -= skinToColumn;
        heat[r][c] += skinToColumn;
        const inputWithSource = Math.max(0, flux[r][c] + fuel.selfRate);
        const xenonAfterBurn = Math.max(0, xenon[r][c] - (inputWithSource * inputWithSource) / fuel.xenonBurnDivisor);
        const xenonAdjustedInput = inputWithSource * Math.max(0, 1 - xenonAfterBurn / 100);
        xenon[r][c] = Math.max(0, Math.min(100, xenonAfterBurn + xenonAdjustedInput * fuel.xenonGenMultiplier));
        depletion[r][c] = Math.min(100, depletion[r][c] + (xenonAdjustedInput / fuel.yield) * 100);
        if (skinHeat[r][c] >= fuel.meltingPoint) {
          const spike = (skinHeat[r][c] + coreHeat[r][c]) / 3;
          heat[r][c] += spike;
          skinHeat[r][c] += spike;
          coreHeat[r][c] += spike;
        }
      }

      const steam = STEAM_TYPES.find((entry) => entry.id === cell.steamType);
      if (cell.type === "steam" && steam && heat[r][c] >= steam.minTemp) {
        heat[r][c] = Math.max(20, heat[r][c] - steam.minTemp * 0.15);
      }
      if (cell.type === "heater") heat[r][c] = Math.max(20, heat[r][c] - 30);
      if (cell.type === "cooler") heat[r][c] = Math.max(20, heat[r][c] - 80);
    }
  }

  const diffused = copyFlat(heat);
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) {
          diffused[r][c] = Math.max(20, diffused[r][c] - 0.4);
          continue;
        }
        const delta = (heat[r][c] - heat[nr][nc]) * 0.025;
        diffused[r][c] -= delta;
        diffused[nr][nc] += delta;
      }
      diffused[r][c] = Math.max(20, diffused[r][c] * 0.997);
      if (diffused[r][c] >= MELTDOWN_TEMP) meltdown = true;
    }
  }

  return {
    tick: previous.tick + 1,
    flux,
    heat: diffused,
    coreHeat,
    skinHeat,
    xenon,
    depletion,
    meltdown,
  };
}

export function summarizeSimulation(design, state) {
  const steamByType = {
    steam: 0,
    dense_steam: 0,
    super_dense_steam: 0,
    ultra_dense_steam: 0,
  };
  let maxHeat = 20;
  let totalFlux = 0;
  let totalHeat = 0;
  let hasFuel = false;
  let hasIgniter = false;
  const warnings = [];

  for (let r = 0; r < design.size; r += 1) {
    for (let c = 0; c < design.size; c += 1) {
      const cell = design.cells[r][c];
      maxHeat = Math.max(maxHeat, state.heat[r][c]);
      totalFlux += state.flux[r][c];
      if (isFuel(cell) && cell.fuelId) {
        hasFuel = true;
        const fuel = fuelById[cell.fuelId];
        if (fuel?.selfIgniting) hasIgniter = true;
        totalHeat += fuelOutput(cell, state.flux[r][c], state.xenon[r][c], state.depletion[r][c]) * (fuel?.heatPerFlux ?? 0);
      }
      if (cell.type === "steam") {
        const steam = STEAM_TYPES.find((entry) => entry.id === cell.steamType);
        if (steam && state.heat[r][c] >= steam.minTemp) steamByType[cell.steamType] += steam.mbPerTick;
      }
      if (!cell.covered && state.flux[r][c] > 0) warnings.push({ level: "warning", message: `Flux through uncovered column (${c + 1}, ${r + 1})` });
    }
  }

  if (hasFuel && !hasIgniter) warnings.push({ level: "critical", message: "No self-igniting/source fuel is present, so the reactor may not start." });
  if (maxHeat >= MELTDOWN_TEMP * 0.9) warnings.push({ level: "critical", message: `Meltdown risk: max column heat is ${Math.round(maxHeat)}C.` });
  if (state.meltdown) warnings.push({ level: "critical", message: "Simulation has crossed meltdown conditions." });

  return { maxHeat, totalFlux, totalHeat, steamByType, warnings };
}
