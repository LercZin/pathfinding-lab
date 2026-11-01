# Pathfinding Lab

[![CI](https://github.com/LercZin/pathfinding-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/LercZin/pathfinding-lab/actions/workflows/ci.yml)

[Live demonstration](https://lerczin.github.io/pathfinding-lab/) · [Verification](docs/verification.md) · [Portfolio](https://github.com/LercZin/portfolio)

![A* and Dijkstra find the same cost on the weighted preset](docs/assets/comparison.png)

A small, interactive TypeScript lab comparing **A\*** and **Dijkstra** on the same weighted grid. The interface is in Portuguese. Both algorithms receive identical walls, costs and endpoints; the demo shows exploration, an optimal route when one exists, route cost and expanded nodes.

Created as a new learning/engineering lab in November 2026. This is not a client system or a historical production project. All maps are synthetic; no locations, accounts, external APIs or telemetry are involved.

## Run

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
```

Open the local Vite URL followed by `/pathfinding-lab/`.

```sh
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run preview
```

Vite's base is `/pathfinding-lab/`, ready for a project site at `https://lerczin.github.io/pathfinding-lab/`. The build output is `dist/`. The included CI validates the project; it does not publish a deployment.

## Explore

- Choose **Corredores**, **Terreno ponderado** or **Sem saída**. Presets are deterministic.
- A seed between 0 and 4,294,967,295 creates a reproducible map. A generated map may be unreachable.
- Choose a wall, weight, start, goal or erase tool, then edit either grid. Both views share one map.
- Use **Executar**, **Pausar**, **Continuar**, **Um passo** and **Reiniciar busca**. Reset preserves the map; **Limpar mapa** removes walls and restores costs to one.
- Editing, changing a preset/seed or resetting cancels the active trace and removes old results. An editing attempt that would put a wall on an endpoint is rejected.
- Arrow keys move within a grid. Space/Enter applies the selected tool. I/F sets start/goal; 1–9 sets a weight. Home/End moves within a row, and Ctrl+Home/End moves to the first/last cell.

Grids use DOM cells, row/column semantics, labels and roving keyboard focus rather than an inaccessible canvas-only view. Small screens can scroll the grid horizontally. With reduced motion enabled, execution defaults to the final result without animation; manual steps remain available. Every visual frame is discrete, with no cell animation.

## Rules and decisions

Movement is cardinal only: up, right, down and left. A wall cannot be traversed. The cost of a route is the sum of the cells **entered**; the starting cell costs zero and the goal's entry cost counts. A start equal to the goal has cost zero.

Dijkstra prioritizes accumulated cost `g`. A\* prioritizes `g + h`, where:

```text
h(cell) = Manhattan(cell, goal) × minimum traversable cell cost
```

For cardinal moves with positive entry costs, this heuristic is admissible and consistent: one move changes Manhattan distance by at most one, and its cost is at least the multiplier. Closed nodes therefore do not need to be reopened. Both algorithms find the same optimal cost, or agree that no route exists. They can select different equal-cost routes. **A\* is not guaranteed to expand fewer nodes on every map.**

The binary heap breaks ties by priority, then heuristic, then insertion sequence. Neighbor order is fixed. Stale heap entries are skipped, input grids are not mutated, and trace snapshots do not share mutable arrays.

An **expanded node** is a unique node removed from the frontier and closed, including the goal when reached. A visual step shows at most one expansion for each algorithm. An unreachable result adds a terminal frame. Animation speed is not a CPU benchmark; searches are computed before their traces are played.

### Complexity and limits

The underlying heap search is `O((V + E) log V)` time with lazy duplicate entries and `O(V + E)` working storage. In a four-neighbor grid, `E` is `O(V)`.

This visualizer deliberately stores full frontier/closed snapshots: every expansion scans the distances and copies visited cells. **Trace generation and storage are `O(V²)` in the worst case.** The entire visualizer must not be described using only the heap's complexity. Rendering also visits grid cells per visual frame.

The core accepts dimensions from 1 to 40 per axis, dense matching arrays, integer entry costs from 1 to 1,000, boolean walls and valid traversable endpoints. The UI uses a fixed 15 × 23 grid and weights from 1 to 9. These bounds keep synchronous trace generation small; the app is not intended for large graphs, routing real vehicles or geographic distance calculations.

There is no server, persistence, path export, diagonal movement, drag painting or worker-thread computation. Maps and results reset when the page reloads. Seed generation is a local xorshift32 implementation; the seed is a reproducibility input, not cryptographic randomness.

## Structure

```text
src/core/grid.ts       validation, cloning, presets, seeded maps
src/core/search.ts     binary heap, Dijkstra, A*, immutable traces
src/core/playback.ts   cancelable trace lifecycle
src/core/*.test.ts     algorithm and lifecycle tests
src/main.ts           shared-map editing and accessible DOM interface
src/style.css         responsive local styles; no external fonts/assets
```

Tests cover known optimal costs, weighted detours, row boundaries, unreachable maps, start equal to goal, sparse/invalid input, deterministic presets and seeds, route invariants, trace independence, and agreement between both algorithms on 48 seeded maps. Fake-timer tests cover pause/resume, speed changes, immediate completion and canceling/replacing a trace without orphan timers. The current suite does not automate browser accessibility or mobile layout; those require interface review.

## License

MIT — Lucas Emanuel Ramos Carvalho. See [LICENSE](LICENSE).
