import { validateGrid } from './grid'
import type { Grid } from './grid'

export type Algorithm = 'astar' | 'dijkstra'
export interface SearchStep {
  current: number
  frontier: number[]
  closed: number[]
  path: number[]
  cost: number | null
  status: 'searching' | 'found' | 'unreachable'
  expanded: number
}
export interface SearchResult {
  status: 'found' | 'unreachable'
  path: number[]
  cost: number | null
  expanded: number
  steps: SearchStep[]
}

interface Entry {
  index: number
  g: number
  priority: number
  h: number
  sequence: number
}

class MinHeap {
  private values: Entry[] = []
  private before(a: Entry, b: Entry) {
    return (
      a.priority < b.priority ||
      (a.priority === b.priority && (a.h < b.h || (a.h === b.h && a.sequence < b.sequence)))
    )
  }
  push(entry: Entry) {
    const values = this.values
    values.push(entry)
    let index = values.length - 1
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2)
      if (!this.before(values[index], values[parent])) break
      ;[values[index], values[parent]] = [values[parent], values[index]]
      index = parent
    }
  }
  pop(): Entry | undefined {
    const first = this.values[0]
    const last = this.values.pop()
    if (!this.values.length || !last) return first
    this.values[0] = last
    let index = 0
    while (true) {
      const left = index * 2 + 1,
        right = left + 1
      let smallest = index
      if (left < this.values.length && this.before(this.values[left], this.values[smallest]))
        smallest = left
      if (right < this.values.length && this.before(this.values[right], this.values[smallest]))
        smallest = right
      if (smallest === index) break
      ;[this.values[index], this.values[smallest]] = [this.values[smallest], this.values[index]]
      index = smallest
    }
    return first
  }
}

function neighbors(index: number, grid: Grid) {
  const row = Math.floor(index / grid.cols),
    col = index % grid.cols
  return [
    row > 0 ? index - grid.cols : -1,
    col < grid.cols - 1 ? index + 1 : -1,
    row < grid.rows - 1 ? index + grid.cols : -1,
    col > 0 ? index - 1 : -1,
  ].filter((next) => next >= 0 && !grid.walls[next])
}

export function search(grid: Grid, algorithm: Algorithm): SearchResult {
  validateGrid(grid)
  if (algorithm !== 'astar' && algorithm !== 'dijkstra') throw new Error('Unknown algorithm.')
  const size = grid.rows * grid.cols
  const distance = Array<number>(size).fill(Infinity),
    parent = Array<number>(size).fill(-1)
  const closed = Array<boolean>(size).fill(false),
    expanded: number[] = [],
    steps: SearchStep[] = []
  const minCost = Math.min(...grid.costs.filter((_, index) => !grid.walls[index]))
  const heuristic = (index: number) =>
    algorithm === 'dijkstra'
      ? 0
      : minCost *
        (Math.abs(Math.floor(index / grid.cols) - Math.floor(grid.goal / grid.cols)) +
          Math.abs((index % grid.cols) - (grid.goal % grid.cols)))
  const open = new MinHeap()
  let sequence = 0
  distance[grid.start] = 0
  open.push({
    index: grid.start,
    g: 0,
    priority: heuristic(grid.start),
    h: heuristic(grid.start),
    sequence: sequence++,
  })
  const snapshot = (
    current: number,
    status: SearchStep['status'],
    path: number[] = [],
  ): SearchStep => ({
    current,
    status,
    path: [...path],
    closed: [...expanded],
    frontier: distance.flatMap((cost, index) =>
      Number.isFinite(cost) && !closed[index] ? [index] : [],
    ),
    cost: status === 'found' ? distance[grid.goal] : null,
    expanded: expanded.length,
  })
  let entry: Entry | undefined
  while ((entry = open.pop())) {
    const current = entry.index
    if (closed[current] || entry.g !== distance[current]) continue
    closed[current] = true
    expanded.push(current)
    if (current === grid.goal) {
      const path: number[] = []
      for (let cursor = current; cursor !== -1; cursor = parent[cursor]) path.push(cursor)
      path.reverse()
      steps.push(snapshot(current, 'found', path))
      return { status: 'found', path, cost: distance[current], expanded: expanded.length, steps }
    }
    for (const next of neighbors(current, grid)) {
      const candidate = distance[current] + grid.costs[next]
      if (!closed[next] && candidate < distance[next]) {
        distance[next] = candidate
        parent[next] = current
        const h = heuristic(next)
        open.push({ index: next, g: candidate, priority: candidate + h, h, sequence: sequence++ })
      }
    }
    steps.push(snapshot(current, 'searching'))
  }
  steps.push(snapshot(expanded.at(-1) ?? grid.start, 'unreachable'))
  return { status: 'unreachable', path: [], cost: null, expanded: expanded.length, steps }
}
