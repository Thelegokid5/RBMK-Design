# RBMK Design

RBMK Design is a Nuclear Tech Mod RBMK planner and simulator. The current app is a React/TypeScript frontend with the simulation core split out into typed domain modules so it can later be wrapped by a lightweight desktop shell.

## Current Status

- Multi-file Vite/React project scaffold.
- Modular reactor data, grid model, simulation state, and storage helpers.
- 11x11 default designer with paint/erase tools, channel palette, fuel picker, steam picker, inspector, warnings, local saves, JSON export, and JSON import.
- Simulation uses typed arrays for heat, flux, xenon, depletion, core heat, and skin heat to keep per-tick work cheap.

## Accuracy Notes

Fuel/channel behavior is seeded from the Nuclear Tech wiki:

- https://nucleartech.wiki/wiki/RBMK
- https://nucleartech.wiki/wiki/Category:RBMK_fuel

The fuel list and major mechanics are represented, but some formulas are still approximations. The next accuracy pass should verify flux curves, decay curves, heat transfer constants, neutron range/cover leakage, steam rules, and turbine/condenser math against the mod source or controlled in-game tests.

## Local Development

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
```

Use `npm.cmd` on this machine because PowerShell currently blocks the `npm.ps1` shim.

## Desktop Plan

The intended offline desktop target is Tauri because it is much lighter than Electron and better aligned with older hardware. Rust/Cargo is not currently on PATH here, so the Tauri shell has not been added yet.

Once Rust is installed:

```powershell
cargo --version
npm.cmd install @tauri-apps/cli @tauri-apps/api
```

Then add the Tauri shell around the existing Vite frontend.
