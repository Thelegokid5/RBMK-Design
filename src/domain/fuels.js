export const FUEL_RODS = [
  { id: "nu", name: "NU", yield: 100_000_000, decay: "linear", splitsWith: "slow", splitsInto: "fast", fluxFunction: "euler", xenonGenMultiplier: 0.5, heatPerFlux: 1, diffusion: 0.02, meltingPoint: 2865, selfIgniting: false },
  { id: "leu", name: "LEU", yield: 100_000_000, decay: "linear", splitsWith: "slow", splitsInto: "fast", fluxFunction: "euler", xenonGenMultiplier: 0.5, heatPerFlux: 1, diffusion: 0.02, meltingPoint: 2865, selfIgniting: false },
  { id: "heu", name: "HEU", yield: 100_000_000, decay: "gentle_slope", splitsWith: "slow", splitsInto: "fast", fluxFunction: "square_root", xenonGenMultiplier: 0.5, heatPerFlux: 1, diffusion: 0.02, meltingPoint: 2865, selfIgniting: false },
  { id: "men", name: "MEN", yield: 100_000_000, decay: "gentle_slope", splitsWith: "fast", splitsInto: "fast", fluxFunction: "square_root", xenonGenMultiplier: 0.5, heatPerFlux: 1, diffusion: 0.02, meltingPoint: 2800, selfIgniting: false },
  { id: "hen", name: "HEN", yield: 100_000_000, decay: "gentle_slope", splitsWith: "fast", splitsInto: "fast", fluxFunction: "square_root", xenonGenMultiplier: 0.5, heatPerFlux: 1, diffusion: 0.02, meltingPoint: 2800, selfIgniting: false },
  { id: "mox", name: "MOX", yield: 100_000_000, decay: "raising_slope", splitsWith: "slow", splitsInto: "fast", fluxFunction: "logarithmic", xenonGenMultiplier: 0.5, heatPerFlux: 1, diffusion: 0.02, meltingPoint: 2815, selfIgniting: false },
  { id: "thmeu", name: "ThMEU", yield: 100_000_000, decay: "boosted_slope", splitsWith: "slow", splitsInto: "fast", fluxFunction: "euler", xenonGenMultiplier: 0.5, heatPerFlux: 0.65, diffusion: 0.02, meltingPoint: 3350, selfIgniting: false },
  { id: "lea", name: "LEAus", yield: 100_000_000, decay: "linear", splitsWith: "slow", splitsInto: "fast", fluxFunction: "sigmoid", xenonGenMultiplier: 0.5, heatPerFlux: 1.5, diffusion: 0.02, meltingPoint: 7029, selfIgniting: true },
  { id: "hea", name: "HEAus", yield: 100_000_000, decay: "gentle_slope", splitsWith: "slow", splitsInto: "fast", fluxFunction: "square_root", xenonGenMultiplier: 0.5, heatPerFlux: 2, diffusion: 0.02, meltingPoint: 5211, selfIgniting: false },
  { id: "ra226be", name: "Ra226Be", yield: 100_000_000, decay: "linear", splitsWith: "slow", splitsInto: "slow", fluxFunction: "passive", xenonGenMultiplier: 0, heatPerFlux: 0.035, diffusion: 0.5, meltingPoint: 700, selfIgniting: true },
  { id: "po210be", name: "Po210Be", yield: 25_000_000, decay: "linear", splitsWith: "slow", splitsInto: "slow", fluxFunction: "passive", xenonGenMultiplier: 0, heatPerFlux: 0.1, diffusion: 0.05, meltingPoint: 1287, selfIgniting: true },
  { id: "pu238be", name: "Pu238Be", yield: 50_000_000, decay: "gentle_slope", splitsWith: "slow", splitsInto: "slow", fluxFunction: "square_root", xenonGenMultiplier: 0.5, heatPerFlux: 0.1, diffusion: 0.05, meltingPoint: 1287, selfIgniting: true },
  { id: "bismuth_zfb", name: "Bismuth ZFB", yield: 50_000_000, decay: "gentle_slope", splitsWith: "slow", splitsInto: "fast", fluxFunction: "square_root", xenonGenMultiplier: 0.5, heatPerFlux: 1.75, diffusion: 0.02, meltingPoint: 2744, selfIgniting: false },
  { id: "pu241_zfb", name: "Pu241 ZFB", yield: 50_000_000, decay: "gentle_slope", splitsWith: "slow", splitsInto: "fast", fluxFunction: "square_root", xenonGenMultiplier: 0.5, heatPerFlux: 1, diffusion: 0.02, meltingPoint: 2865, selfIgniting: false },
  { id: "rga_zfb", name: "RGA ZFB", yield: 50_000_000, decay: "gentle_slope", splitsWith: "slow", splitsInto: "fast", fluxFunction: "linear", xenonGenMultiplier: 0.5, heatPerFlux: 1.75, diffusion: 0.02, meltingPoint: 2744, selfIgniting: false },
  { id: "flashgold", name: "Flashgold", yield: 100_000_000, decay: "linear", splitsWith: "slow", splitsInto: "fast", fluxFunction: "negative_quadratic", xenonGenMultiplier: 0, heatPerFlux: 1, diffusion: 0.02, meltingPoint: 2000, selfIgniting: true },
  { id: "flashlead", name: "Flashlead", yield: 250_000_000, decay: "linear", splitsWith: "slow", splitsInto: "fast", fluxFunction: "negative_quadratic", xenonGenMultiplier: 0, heatPerFlux: 1, diffusion: 0.02, meltingPoint: 2050, selfIgniting: true },
  { id: "balefire", name: "Balefire", yield: 100_000_000, decay: "gentle_slope", splitsWith: "slow", splitsInto: "fast", fluxFunction: "linear", xenonGenMultiplier: 0, heatPerFlux: 3, diffusion: 0.02, meltingPoint: 3652, selfIgniting: true },
  { id: "digamma", name: "Digamma", yield: 1_000_000, decay: "gentle_slope", splitsWith: "slow", splitsInto: "fast", fluxFunction: "quadratic", xenonGenMultiplier: 0.5, heatPerFlux: 0.1, diffusion: 0.02, meltingPoint: 100_000, selfIgniting: true },
];

export const fuelById = Object.fromEntries(FUEL_RODS.map((fuel) => [fuel.id, fuel]));

export function evaluateFlux(kind, input) {
  const x = Math.max(0, input);
  switch (kind) {
    case "passive":
      return 20;
    case "euler":
      return (1 - Math.exp(-x / 25)) * 20;
    case "sigmoid":
      return 30 / (1 + Math.exp(-(x - 50) / 10));
    case "logarithmic":
      return Math.log10(x + 1) * 7.5;
    case "square_root":
      return Math.sqrt(x) * 5;
    case "negative_quadratic":
      return Math.max(0, x - (x * x) / 100_000);
    case "linear":
      return x;
    case "quadratic":
      return (x * x) / 100;
    case "sine_slope":
      return Math.sin(x / 15) * 10 + x * 0.4;
  }
}

export function evaluateDecay(kind, depletionPercent) {
  const d = Math.max(0, Math.min(100, depletionPercent)) / 100;
  switch (kind) {
    case "static":
      return 1;
    case "linear":
      return Math.max(0.05, 1 - d);
    case "gentle_slope":
      return Math.max(0.05, 1 + Math.min(d, 0.2) * 0.05 - d * 0.65);
    case "raising_slope":
      return Math.max(0.05, 1 + Math.sin(Math.min(d, 0.55) / 0.55 * Math.PI) * 0.2 - d * 0.9);
    case "boosted_slope":
      return Math.max(0.05, 0.95 + Math.sin(d * Math.PI) * 0.4 - d * 0.55);
  }
}
