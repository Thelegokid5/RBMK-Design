const DEFAULT_XENON_BURN = 50;
const DEFAULT_XENON_GEN = 0.5;
const DEFAULT_DIFFUSION = 0.02;
const DEFAULT_HEAT = 1;

function rod(config) {
  return {
    xenonGenMultiplier: DEFAULT_XENON_GEN,
    xenonBurnDivisor: DEFAULT_XENON_BURN,
    heatPerFlux: DEFAULT_HEAT,
    diffusion: DEFAULT_DIFFUSION,
    decay: "gentle_slope",
    splitsWith: "slow",
    splitsInto: "fast",
    selfRate: 0,
    heatCoeffStart: 0,
    heatCoeffLength: 0,
    ...config,
    selfIgniting: config.selfRate > 0 || config.fluxFunction === "sigmoid",
  };
}

export const FUEL_RODS = [
  rod({ id: "ueu", name: "Unenriched Uranium", yield: 100_000_000, reactivity: 15, fluxFunction: "log_ten", decay: "raising_slope", heatPerFlux: 0.65, meltingPoint: 2865 }),
  rod({ id: "meu", name: "Medium Enriched Uranium-235", yield: 100_000_000, reactivity: 20, fluxFunction: "log_ten", decay: "raising_slope", heatPerFlux: 0.65, meltingPoint: 2865 }),
  rod({ id: "heu233", name: "Highly Enriched Uranium-233", yield: 100_000_000, reactivity: 27.5, fluxFunction: "linear", heatPerFlux: 1.25, meltingPoint: 2865 }),
  rod({ id: "heu235", name: "Highly Enriched Uranium-235", yield: 100_000_000, reactivity: 50, fluxFunction: "square_root", meltingPoint: 2865 }),
  rod({ id: "uzh", name: "Uranium Zirconium Hydride", yield: 50_000_000, reactivity: 30, fluxFunction: "log_ten", heatPerFlux: 0.75, diffusion: 0.1, meltingPoint: 1845, heatCoeffStart: 1000, heatCoeffLength: 500 }),
  rod({ id: "thmeu", name: "Thorium with MEU Driver Fuel", yield: 100_000_000, reactivity: 20, fluxFunction: "plateau", decay: "boosted_slope", heatPerFlux: 0.65, meltingPoint: 3350 }),
  rod({ id: "lep", name: "Low Enriched Plutonium-239", yield: 100_000_000, reactivity: 35, fluxFunction: "log_ten", decay: "raising_slope", heatPerFlux: 0.75, meltingPoint: 2744 }),
  rod({ id: "mep", name: "Medium Enriched Plutonium-239", yield: 100_000_000, reactivity: 35, fluxFunction: "square_root", meltingPoint: 2744 }),
  rod({ id: "hep239", name: "Highly Enriched Plutonium-239", yield: 100_000_000, reactivity: 30, fluxFunction: "linear", heatPerFlux: 1.25, meltingPoint: 2744 }),
  rod({ id: "hep241", name: "Highly Enriched Plutonium-241", yield: 100_000_000, reactivity: 40, fluxFunction: "linear", heatPerFlux: 1.75, meltingPoint: 2744 }),
  rod({ id: "lea", name: "Low Enriched Americium-242", yield: 100_000_000, reactivity: 60, selfRate: 10, fluxFunction: "square_root", decay: "raising_slope", heatPerFlux: 1.5, meltingPoint: 2386 }),
  rod({ id: "mea", name: "Medium Enriched Americium-242", yield: 100_000_000, reactivity: 35, selfRate: 20, fluxFunction: "negative_quadratic", heatPerFlux: 1.75, meltingPoint: 2386 }),
  rod({ id: "hea241", name: "Highly Enriched Americium-241", yield: 100_000_000, reactivity: 65, selfRate: 15, fluxFunction: "square_root", heatPerFlux: 1.85, meltingPoint: 2386, splitsWith: "fast", splitsInto: "fast" }),
  rod({ id: "hea242", name: "Highly Enriched Americium-242", yield: 100_000_000, reactivity: 45, fluxFunction: "linear", heatPerFlux: 2, meltingPoint: 2386 }),
  rod({ id: "men", name: "Medium Enriched Neptunium-237", yield: 100_000_000, reactivity: 30, fluxFunction: "square_root", decay: "raising_slope", heatPerFlux: 0.75, meltingPoint: 2800, splitsWith: "any", splitsInto: "fast" }),
  rod({ id: "hen", name: "Highly Enriched Neptunium-237", yield: 100_000_000, reactivity: 40, fluxFunction: "square_root", meltingPoint: 2800, splitsWith: "fast", splitsInto: "fast" }),
  rod({ id: "mox", name: "Mixed MEU & LEP Oxide", yield: 100_000_000, reactivity: 40, fluxFunction: "log_ten", decay: "raising_slope", meltingPoint: 2815 }),
  rod({ id: "les", name: "Low Enriched Schrabidium-326", yield: 100_000_000, reactivity: 50, fluxFunction: "square_root", heatPerFlux: 1.25, meltingPoint: 2500, splitsWith: "slow", splitsInto: "slow" }),
  rod({ id: "mes", name: "Medium Enriched Schrabidium-326", yield: 100_000_000, reactivity: 75, fluxFunction: "negative_quadratic", heatPerFlux: 1.5, meltingPoint: 2750 }),
  rod({ id: "hes", name: "Highly Enriched Schrabidium-326", yield: 100_000_000, reactivity: 90, fluxFunction: "linear", decay: "linear", heatPerFlux: 1.75, meltingPoint: 3000 }),
  rod({ id: "leaus", name: "Low Enriched Australium (Tasmanite)", yield: 100_000_000, reactivity: 30, fluxFunction: "sigmoid", decay: "linear", xenonGenMultiplier: 0.05, heatPerFlux: 1.5, meltingPoint: 7029 }),
  rod({ id: "heaus", name: "Highly Enriched Australium (Ayerite)", yield: 100_000_000, reactivity: 35, fluxFunction: "linear", xenonGenMultiplier: 0.05, heatPerFlux: 1.5, meltingPoint: 5211 }),
  rod({ id: "po210be", name: "Polonium-210 & Beryllium Neutron Source", yield: 25_000_000, reactivity: 0, selfRate: 50, fluxFunction: "passive", decay: "linear", xenonGenMultiplier: 0, heatPerFlux: 0.1, diffusion: 0.05, meltingPoint: 1287, splitsWith: "slow", splitsInto: "slow" }),
  rod({ id: "ra226be", name: "Radium-226 & Beryllium Neutron Source", yield: 100_000_000, reactivity: 0, selfRate: 20, fluxFunction: "passive", decay: "linear", xenonGenMultiplier: 0, heatPerFlux: 0.035, diffusion: 0.5, meltingPoint: 700, splitsWith: "slow", splitsInto: "slow" }),
  rod({ id: "pu238be", name: "Plutonium-238 & Beryllium Neutron Source", yield: 50_000_000, reactivity: 40, selfRate: 40, fluxFunction: "square_root", heatPerFlux: 0.1, diffusion: 0.05, meltingPoint: 1287, splitsWith: "slow", splitsInto: "slow" }),
  rod({ id: "balefire_gold", name: "Antihydrogen Gold-198 Lattice", yield: 100_000_000, reactivity: 50, selfRate: 10, fluxFunction: "negative_quadratic", decay: "linear", xenonGenMultiplier: 0, meltingPoint: 2000 }),
  rod({ id: "flashlead", name: "Antihydrogen Gold-198/Lead-209 Lattice", yield: 250_000_000, reactivity: 40, selfRate: 50, fluxFunction: "negative_quadratic", decay: "linear", xenonGenMultiplier: 0, meltingPoint: 2050 }),
  rod({ id: "balefire", name: "Draconic Flames", yield: 100_000_000, reactivity: 100, selfRate: 35, fluxFunction: "linear", xenonGenMultiplier: 0, heatPerFlux: 3, meltingPoint: 3652 }),
  rod({ id: "zfb_bismuth", name: "ZFB - LEU/HEP-241#Bi", yield: 50_000_000, reactivity: 20, fluxFunction: "square_root", heatPerFlux: 1.75, meltingPoint: 2744 }),
  rod({ id: "zfb_pu241", name: "ZFB - HEU-235/HEP-240#Pu-241", yield: 50_000_000, reactivity: 20, fluxFunction: "square_root", meltingPoint: 2865 }),
  rod({ id: "zfb_am_mix", name: "ZFB - HEP-241#MEA", yield: 50_000_000, reactivity: 20, fluxFunction: "linear", heatPerFlux: 1.75, meltingPoint: 2744 }),
  rod({ id: "drx", name: "Digamma", yield: 10_000_000, reactivity: 1000, selfRate: 10, fluxFunction: "quadratic", heatPerFlux: 0.1, meltingPoint: 100_000 }),
];

export const fuelById = Object.fromEntries(FUEL_RODS.map((fuel) => [fuel.id, fuel]));

export function evaluateDecay(kind, depletionPercent) {
  const enrichment = Math.max(0, Math.min(1, 1 - depletionPercent / 100));
  switch (kind) {
    case "static":
      return 1;
    case "boosted_slope":
      return enrichment + Math.sin((enrichment - 1) * (enrichment - 1) * Math.PI);
    case "raising_slope":
      return enrichment + Math.sin(enrichment * Math.PI) / 2;
    case "gentle_slope":
      return enrichment + Math.sin(enrichment * Math.PI) / 3;
    case "linear":
    default:
      return enrichment;
  }
}

export function evaluateFlux(kind, input, reactivity = 1, selfRate = 0) {
  const x = Math.max(0, input);
  switch (kind) {
    case "passive":
      return selfRate * reactivity;
    case "log_ten":
    case "logarithmic":
      return Math.log10(x + 1) * 0.5 * reactivity;
    case "plateau":
    case "euler":
      return (1 - Math.exp(-x / 25)) * reactivity;
    case "negative_quadratic":
      return Math.max(((x - (x * x) / 10000) / 100) * reactivity, 0);
    case "sigmoid":
      return reactivity / (1 + Math.exp(-(x - 50) / 10));
    case "square_root":
      return Math.sqrt(x) * reactivity / 10;
    case "linear":
      return (x / 100) * reactivity;
    case "quadratic":
      return ((x * x) / 10000) * reactivity;
    case "sine_slope":
    case "experimental":
      return x * (Math.sin(x) + 1) * reactivity;
    default:
      return 0;
  }
}

export function evaluateFuelOutput(fuel, incomingFlux, xenonPercent, depletionPercent, coreHeat = 20) {
  const adjustedInput = Math.max(0, incomingFlux + fuel.selfRate);
  const xenonAdjusted = adjustedInput * Math.max(0, 1 - xenonPercent / 100);
  const depletionReactivity = evaluateDecay(fuel.decay, depletionPercent);
  let heatCoeff = 1;

  if (fuel.heatCoeffStart && coreHeat >= fuel.heatCoeffStart) {
    const progress = Math.min(1, (coreHeat - fuel.heatCoeffStart) / fuel.heatCoeffLength);
    heatCoeff = Math.sin((progress * Math.PI + Math.PI) / 2);
  }

  return evaluateFlux(fuel.fluxFunction, xenonAdjusted, fuel.reactivity * depletionReactivity * heatCoeff, fuel.selfRate);
}
