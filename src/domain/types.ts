export type NeutronSpeed = "slow" | "fast";

export type ChannelType =
  | "empty"
  | "fuel"
  | "moderated_fuel"
  | "control"
  | "moderated_control"
  | "auto_control"
  | "steam"
  | "graphite"
  | "reflector"
  | "absorber"
  | "irradiation"
  | "heater"
  | "structural"
  | "cooler";

export type SteamType = "steam" | "dense_steam" | "super_dense_steam" | "ultra_dense_steam";

export type FluxFunctionKind =
  | "passive"
  | "euler"
  | "sigmoid"
  | "logarithmic"
  | "square_root"
  | "negative_quadratic"
  | "linear"
  | "quadratic"
  | "sine_slope";

export type DecayFunctionKind = "linear" | "raising_slope" | "boosted_slope" | "gentle_slope" | "static";

export interface FuelRod {
  id: string;
  name: string;
  yield: number;
  decay: DecayFunctionKind;
  splitsWith: NeutronSpeed;
  splitsInto: NeutronSpeed;
  fluxFunction: FluxFunctionKind;
  xenonGenMultiplier: number;
  heatPerFlux: number;
  diffusion: number;
  meltingPoint: number;
  selfIgniting: boolean;
}

export interface Cell {
  type: ChannelType;
  fuelId: string | null;
  steamType: SteamType;
  controlGroup: string;
  controlInsertion: number;
  covered: boolean;
}

export interface GridDesign {
  version: 1;
  name: string;
  size: number;
  cells: Cell[][];
}

export interface SimulationState {
  tick: number;
  flux: Float32Array[];
  heat: Float32Array[];
  coreHeat: Float32Array[];
  skinHeat: Float32Array[];
  xenon: Float32Array[];
  depletion: Float32Array[];
  meltdown: boolean;
}

export interface SimulationSummary {
  maxHeat: number;
  totalFlux: number;
  totalHeat: number;
  steamByType: Record<SteamType, number>;
  warnings: Array<{ level: "critical" | "warning" | "info"; message: string }>;
}
