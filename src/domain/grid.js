export function createCell() {
  return {
    type: "empty",
    fuelId: null,
    steamType: "steam",
    controlGroup: "Default",
    controlInsertion: 0,
    covered: true,
  };
}

export function createGrid(size) {
  return Array.from({ length: size }, () => Array.from({ length: size }, createCell));
}

export function createDesign(size = 11) {
  return {
    version: 1,
    name: "Untitled RBMK",
    size,
    cells: createGrid(size),
  };
}

export function cloneDesign(design) {
  return {
    ...design,
    cells: design.cells.map((row) => row.map((cell) => ({ ...cell }))),
  };
}

export function resizeDesign(design, size) {
  const next = createDesign(size);
  next.name = design.name;
  for (let r = 0; r < Math.min(size, design.size); r += 1) {
    for (let c = 0; c < Math.min(size, design.size); c += 1) {
      next.cells[r][c] = { ...design.cells[r][c] };
    }
  }
  return next;
}
