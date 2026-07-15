# RBMK Design Project Summary

## Goal

Build an accurate Nuclear Tech Mod RBMK designer/simulator that can run offline on older hardware. Current direction is a lightweight React/TypeScript app, with Tauri planned later for a native desktop wrapper.

## Repository

- GitHub: https://github.com/Thelegokid5/RBMK-Design
- Local path: `C:\Users\blues\OneDrive\Documents\VS Code\RBMK-Design`
- Branch: `main`

## Sources and Assets

- Original mod JAR: `C:\Users\blues\curseforge\minecraft\Instances\mc\mods\HBM-NTM-.1.0.27_X5645_H261.jar`
- RBMK top-texture source: `public\textures\rbmk`
- Godot RBMK top-texture copy: `godot\assets\textures\rbmk`
- Godot project: `godot`
- The `public\textures\rbmk-gui` folder is UI-only; do not use it for column textures.

## Current App State

- Vite + React + TypeScript project scaffold.
- Modularized from the original single Claude TSX prototype.
- Main modules:
  - `src/App.tsx`: UI, editor controls, DODD panel.
  - `src/domain/fuels.ts`: RBMK fuel data and fuel curve helpers.
  - `src/domain/channels.ts`: channel, steam, control constants.
  - `src/domain/grid.ts`: grid/design creation and resizing.
  - `src/domain/simulation.ts`: simulation state and tick logic.
  - `src/domain/storage.ts`: local saves and JSON import/export.
  - `src/domain/types.ts`: shared domain types.

## Implemented Features

- Grid editor with selectable size from 5x5 to 25x25.
- Pixel-art grid cells are currently set to 25x25 pixels.
- Paint/erase tools.
- Channel palette:
  - Fuel
  - Moderated fuel
  - Control rod
  - Moderated control
  - Auto control
  - Steam channel
  - Graphite
  - Reflector
  - Boron absorber
  - Irradiation
  - Fluid heater
  - Cooler
  - Structural
- Fuel picker with Nuclear Tech RBMK fuel list.
- Added thorium fuel rod: `ThMEU`.
- Steam type picker.
- Run/pause/reset simulation.
- DODD panel: Dump of Ordered Diagnostic Data for selected column.
- Local save slots.
- JSON export/import.
- Basic warnings.
- Status bar with tick, flux, heat, max heat, and steam output.

## Simulation State

The simulation uses typed arrays for better performance:

- Flux
- Column heat
- Core heat
- Skin heat
- Xenon
- Depletion

Current simulation is structured for accuracy work, but some constants/formulas are still approximations.

## Fuel Data Notes

Fuel data is seeded from:

- https://nucleartech.wiki/wiki/RBMK
- https://nucleartech.wiki/wiki/Category:RBMK_fuel

Known accuracy work still needed:

- Verify exact flux curves.
- Verify decay curves.
- Verify heat transfer constants.
- Verify neutron range and cover leakage.
- Verify steam production rules.
- Add/verify turbine and condenser math.
- Compare behavior against mod source or controlled in-game tests.

## Tooling

Installed/used locally:

- Node/npm
- Git
- GitHub CLI

Important command note:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
```

Use `npm.cmd` because PowerShell blocks the `npm.ps1` shim on this machine.

## Verification

Completed checks:

- `npm.cmd install`
- `npm.cmd run build`
- Browser smoke test:
  - App renders.
  - 11x11 grid renders.
  - ThMEU appears in fuel list.
  - DODD panel appears.
  - Pu238Be source rod can be placed.
  - Simulation updates live values.

## Git History

Initial commit pushed:

- `bc8194f Initial RBMK designer scaffold`

Project summary commit should follow this file.

## Next Recommended Work

1. Add exact Nuclear Tech RBMK data from mod source where available.
2. Improve DODD with more selected-column internals and debug values.
3. Add turbine/condenser planning tabs.
4. Add persistent file-based save/load after Tauri is added.
5. Add Tauri desktop shell once Rust/Cargo is installed.
6. Add simulation tests for known reactor layouts.
