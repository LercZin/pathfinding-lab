import { describe, expect, it } from 'vitest'
import { cloneGrid, emptyGrid, preset, seededGrid, validateGrid } from './grid'
import type { Grid } from './grid'
import { search } from './search'
import type { Algorithm, SearchResult } from './search'

const algorithms: Algorithm[] = ['astar', 'dijkstra']

function assertRoute(grid: Grid, result: SearchResult) {
  if (result.status === 'unreachable') {
    expect(result.path).toEqual([])
    expect(result.cost).toBeNull()
    return
  }
  expect(result.path[0]).toBe(grid.start)
  expect(result.path.at(-1)).toBe(grid.goal)
  expect(new Set(result.path).size).toBe(result.path.length)
  let cost = 0
  for (let index = 0; index < result.path.length; index++) {
    const cell = result.path[index]
    expect(grid.walls[cell]).toBe(false)
    if (index) {
      const previous = result.path[index - 1]
      const distance =
        Math.abs(Math.floor(cell / grid.cols) - Math.floor(previous / grid.cols)) +
        Math.abs((cell % grid.cols) - (previous % grid.cols))
      expect(distance).toBe(1)
      cost += grid.costs[cell]
    }
  }
  expect(result.cost).toBe(cost)
}

describe.each(algorithms)('%s shortest path', (algorithm) => {
  it('finds the known optimal cost on an open grid', () => {
    const grid = emptyGrid(3, 4)
    grid.start = 0
    grid.goal = 11
    const result = search(grid, algorithm)
    expect(result.cost).toBe(5)
    expect(result.path.length).toBe(6)
    assertRoute(grid, result)
  })
  it('takes a longer but cheaper route, charging entry cells rather than the start', () => {
    const grid = emptyGrid(3, 5)
    grid.start = 5
    grid.goal = 9
    grid.costs[5] = 1000
    for (const index of [6, 7, 8]) grid.costs[index] = 9
    const result = search(grid, algorithm)
    expect(result.cost).toBe(6)
    expect(result.path.length - 1).toBe(6)
    assertRoute(grid, result)
  })
  it('scales the heuristic correctly when every cell costs more than one', () => {
    const grid = emptyGrid(3, 4)
    grid.start = 0
    grid.goal = 11
    grid.costs.fill(7)
    const result = search(grid, algorithm)
    expect(result.cost).toBe(35)
    assertRoute(grid, result)
  })
  it('does not wrap horizontally through row boundaries or enter walls', () => {
    const grid = emptyGrid(2, 3)
    grid.start = 2
    grid.goal = 3
    grid.walls[1] = true
    const result = search(grid, algorithm)
    expect(result.cost).toBe(3)
    assertRoute(grid, result)
  })
  it('returns an explicit unreachable result and a terminal snapshot', () => {
    const grid = preset('blocked'),
      result = search(grid, algorithm)
    expect(result.status).toBe('unreachable')
    expect(result.steps.at(-1)?.status).toBe('unreachable')
    assertRoute(grid, result)
  })
  it('supports start equal to goal, including a single-cell grid', () => {
    const grid = emptyGrid(1, 1),
      result = search(grid, algorithm)
    expect(result).toMatchObject({ status: 'found', cost: 0, path: [0], expanded: 1 })
    expect(result.steps.length).toBe(1)
  })
  it('is deterministic, does not mutate input, and captures independent, monotonic steps', () => {
    const grid = preset('balanced'),
      before = cloneGrid(grid)
    const result = search(grid, algorithm)
    expect(search(grid, algorithm)).toEqual(result)
    expect(grid).toEqual(before)
    let previous = new Set<number>()
    for (const step of result.steps) {
      expect(new Set(step.closed).size).toBe(step.expanded)
      expect(step.closed.every((cell) => !grid.walls[cell])).toBe(true)
      expect(step.frontier.every((cell) => !grid.walls[cell] && !step.closed.includes(cell))).toBe(
        true,
      )
      expect([...previous].every((cell) => step.closed.includes(cell))).toBe(true)
      previous = new Set(step.closed)
    }
    const later = [...result.steps[1].closed]
    result.steps[0].closed.push(9999)
    expect(result.steps[1].closed).toEqual(later)
    assertRoute(grid, result)
  })
})

describe('optimality comparison', () => {
  it('matches Dijkstra cost and reachability on 48 deterministic weighted/blocked maps', () => {
    for (let seed = 0; seed < 48; seed++) {
      const grid = seededGrid(seed, 9, 13)
      const astar = search(grid, 'astar'),
        dijkstra = search(grid, 'dijkstra')
      expect(astar.status, `seed ${seed}`).toBe(dijkstra.status)
      expect(astar.cost, `seed ${seed}`).toBe(dijkstra.cost)
      assertRoute(grid, astar)
      assertRoute(grid, dijkstra)
    }
  })
  it.each(['balanced', 'weighted', 'blocked'] as const)(
    'reproduces preset %s and both costs',
    (id) => {
      const grid = preset(id)
      expect(preset(id)).toEqual(grid)
      expect(search(grid, 'astar').cost).toBe(search(grid, 'dijkstra').cost)
    },
  )
  it('reproduces a seed and returns independent maps', () => {
    const first = seededGrid(2026),
      second = seededGrid(2026)
    expect(first).toEqual(second)
    first.costs[0] = 1000
    expect(second.costs[0]).not.toBe(1000)
    expect(seededGrid(2027)).not.toEqual(second)
  })
})

describe('input boundaries', () => {
  it.each([0, -1, 1.5, 41, Infinity, NaN])(
    'rejects dimension %s before allocating a grid',
    (dimension) => {
      expect(() => emptyGrid(dimension, 3)).toThrow()
      expect(() => emptyGrid(3, dimension)).toThrow()
    },
  )
  it.each([0, -1, 1.1, 1001, Infinity, NaN])('rejects cost %s', (cost) => {
    const grid = emptyGrid(2, 2)
    grid.costs[0] = cost
    expect(() => validateGrid(grid)).toThrow()
  })
  it('rejects array mismatches, holes, invalid indices and walls at either endpoint', () => {
    const grid = emptyGrid(2, 3)
    expect(() => validateGrid({ ...grid, costs: [1] })).toThrow()
    expect(() => validateGrid({ ...grid, costs: Array(6) })).toThrow()
    expect(() => validateGrid({ ...grid, walls: Array(6) })).toThrow()
    expect(() => validateGrid({ ...grid, start: -1 })).toThrow()
    expect(() => validateGrid({ ...grid, goal: 6 })).toThrow()
    for (const endpoint of [grid.start, grid.goal]) {
      const copy = cloneGrid(grid)
      copy.walls[endpoint] = true
      expect(() => search(copy, 'astar')).toThrow()
    }
  })
  it.each([-1, 1.5, 0x100000000, NaN])('rejects invalid seed %s', (seed) => {
    expect(() => seededGrid(seed)).toThrow()
  })
})
