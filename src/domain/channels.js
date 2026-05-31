export const CELL_SIZE = 25;
export const SIM_TPS = 20;
export const MELTDOWN_TEMP = 1500;
export const DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

export const CHANNELS = [
  { id: "fuel", label: "Fuel Channel", color: "#d7c84a" },
  { id: "moderated_fuel", label: "Moderated Fuel", color: "#8acb5b" },
  { id: "control", label: "Control Rod", color: "#5170d8" },
  { id: "moderated_control", label: "Moderated Control", color: "#3f8290" },
  { id: "auto_control", label: "Auto Control", color: "#23a898" },
  { id: "steam", label: "Steam Channel", color: "#1aa8c7" },
  { id: "graphite", label: "Graphite", color: "#7d8285" },
  { id: "reflector", label: "Reflector", color: "#a7b7c4" },
  { id: "absorber", label: "Boron Absorber", color: "#38a56f" },
  { id: "irradiation", label: "Irradiation", color: "#b14bd5" },
  { id: "heater", label: "Fluid Heater", color: "#c46b3b" },
  { id: "cooler", label: "Cooler", color: "#53b9d7" },
  { id: "structural", label: "Structural", color: "#5d6266" },
];

export const STEAM_TYPES = [
  { id: "steam", label: "Steam 100C", minTemp: 100, mbPerTick: 1000, color: "#32bad2" },
  { id: "dense_steam", label: "Dense 300C", minTemp: 300, mbPerTick: 800, color: "#1782c9" },
  { id: "super_dense_steam", label: "Super Dense 450C", minTemp: 450, mbPerTick: 600, color: "#4352d9" },
  { id: "ultra_dense_steam", label: "Ultra Dense 600C", minTemp: 600, mbPerTick: 400, color: "#713ed6" },
];

export const CONTROL_GROUPS = ["Default", "Red", "Yellow", "Green", "Blue", "Purple"];
