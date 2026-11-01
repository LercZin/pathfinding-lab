export interface Grid {
  rows: number
  cols: number
  costs: number[]
  walls: boolean[]
  start: number
  goal: number
}

export function validateGrid(grid: Grid): void {
  if (
    !Number.isInteger(grid.rows) ||
    !Number.isInteger(grid.cols) ||
    grid.rows < 1 ||
    grid.cols < 1 ||
    grid.rows > 40 ||
    grid.cols > 40
  ) {
    throw new Error('Grid dimensions must be integers between 1 and 40.')
  }
  const size = grid.rows * grid.cols
  if (
    !Array.isArray(grid.costs) ||
    !Array.isArray(grid.walls) ||
    grid.costs.length !== size ||
    grid.walls.length !== size
  ) {
    throw new Error('Grid arrays must match its dimensions.')
  }
  if (
    Array.from(grid.costs).some((cost) => !Number.isSafeInteger(cost) || cost < 1 || cost > 1000) ||
    Array.from(grid.walls).some((wall) => typeof wall !== 'boolean')
  ) {
    throw new Error('Costs must be integers between 1 and 1000; walls must be booleans.')
  }
  for (const position of [grid.start, grid.goal]) {
    if (!Number.isInteger(position) || position < 0 || position >= size || grid.walls[position]) {
      throw new Error('Start and goal must be valid, traversable cells.')
    }
  }
}

export function cloneGrid(grid: Grid): Grid {
  return { ...grid, costs: [...grid.costs], walls: [...grid.walls] }
}

export function emptyGrid(rows = 15, cols = 23): Grid {
  if (
    !Number.isInteger(rows) ||
    !Number.isInteger(cols) ||
    rows < 1 ||
    cols < 1 ||
    rows > 40 ||
    cols > 40
  )
    throw new Error('Grid dimensions must be integers between 1 and 40.')
  const grid: Grid = {
    rows,
    cols,
    costs: Array.from({ length: rows * cols }, () => 1),
    walls: Array.from({ length: rows * cols }, () => false),
    start: Math.floor(rows / 2) * cols + Math.min(2, cols - 1),
    goal: Math.floor(rows / 2) * cols + Math.max(cols - 3, 0),
  }
  validateGrid(grid)
  return grid
}

export type Preset = 'balanced' | 'weighted' | 'blocked'

export function preset(id: Preset): Grid {
  const grid = emptyGrid()
  if (id === 'balanced') {
    for (let row = 1; row < grid.rows - 1; row++) {
      for (const col of [6, 12, 18]) {
        const gap = col === 12 ? 11 : 3
        grid.walls[row * grid.cols + col] = row !== gap && row !== gap + 1
      }
    }
    for (let row = 5; row <= 9; row++)
      for (let col = 8; col <= 10; col++) grid.costs[row * grid.cols + col] = 3
  } else if (id === 'weighted') {
    for (let row = 5; row <= 9; row++)
      for (let col = 5; col <= 17; col++) grid.costs[row * grid.cols + col] = row === 7 ? 9 : 5
    for (const col of [8, 14])
      for (let row = 1; row <= 3; row++) grid.walls[row * grid.cols + col] = true
  } else if (id === 'blocked') {
    for (const offset of [-grid.cols, 1, grid.cols, -1]) grid.walls[grid.goal + offset] = true
    for (let row = 3; row <= 11; row++) grid.walls[row * grid.cols + 10] = row !== 7
  } else throw new Error('Unknown preset.')
  return grid
}

export function seededGrid(seed: number, rows = 15, cols = 23): Grid {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error('Seed must be an unsigned 32-bit integer.')
  const grid = emptyGrid(rows, cols)
  let state = seed || 0x9e3779b9
  const random = () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 0x100000000
  }
  for (let index = 0; index < grid.costs.length; index++) {
    grid.walls[index] = random() < 0.2
    grid.costs[index] = random() < 0.65 ? 1 : 2 + Math.floor(random() * 8)
  }
  grid.walls[grid.start] = false
  grid.walls[grid.goal] = false
  return grid
}
