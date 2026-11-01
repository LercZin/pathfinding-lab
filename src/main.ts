import { cloneGrid, emptyGrid, preset, seededGrid } from './core/grid'
import type { Grid, Preset } from './core/grid'
import { search } from './core/search'
import type { Algorithm, SearchResult, SearchStep } from './core/search'
import { Playback } from './core/playback'
import type { Frame } from './core/playback'
import './style.css'

type Tool = 'wall' | 'erase' | 'weight' | 'start' | 'goal'
const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <a class="skip-link" href="#controls">Ir para os controles</a>
  <header class="site-header"><a class="brand" href="#"><span class="brand-symbol" aria-hidden="true">⌁</span>pathfinding<span>lab</span></a><a class="method-link" href="#method">Como funciona <span aria-hidden="true">↗</span></a></header>
  <main>
    <section class="hero" aria-labelledby="page-title"><div><p class="eyebrow">ALGORITMOS, EM PERSPECTIVA</p><h1 id="page-title">O caminho importa.<br><span>A escolha também.</span></h1><p class="hero-copy">A* usa uma estimativa. Dijkstra segue o custo acumulado.<br class="desktop-break"> Explore como os dois encontram uma rota no mesmo mapa.</p></div><aside class="hero-note"><span class="note-mark" aria-hidden="true">A* <span>×</span> D</span><p>Um mapa compartilhado.<br>Duas formas de explorar.</p><span class="subtle">Grade ponderada · 4 direções</span></aside></section>

    <section id="controls" class="controls panel" aria-label="Mapa e controles de execução">
      <div class="control-row"><div class="control-field preset-field"><label for="preset">Comece por um cenário</label><select id="preset"><option value="balanced">Corredores</option><option value="weighted">Terreno ponderado</option><option value="blocked">Sem saída</option><option value="custom" disabled>Mapa personalizado</option></select></div><div class="seed-field"><label for="seed">Ou use uma seed</label><div><input id="seed" type="number" min="0" max="4294967295" step="1" value="2026" inputmode="numeric"><button id="generate" class="button secondary">Gerar mapa</button></div></div><div class="play-controls"><button id="run" class="button primary"><span aria-hidden="true">▶</span> Executar</button><button id="step" class="button secondary">Um passo <span aria-hidden="true">→</span></button><button id="reset" class="button icon-button" aria-label="Reiniciar busca" title="Reiniciar busca">↺</button></div></div>
      <div class="edit-row"><div class="tools" role="group" aria-label="Ferramenta de edição"><button class="tool active" data-tool="wall" aria-pressed="true"><span class="tool-swatch wall-swatch" aria-hidden="true"></span>Parede</button><button class="tool" data-tool="weight" aria-pressed="false"><span class="tool-swatch weight-swatch" aria-hidden="true">5</span>Peso</button><button class="tool" data-tool="start" aria-pressed="false"><span class="tool-letter" aria-hidden="true">I</span>Início</button><button class="tool" data-tool="goal" aria-pressed="false"><span class="tool-letter goal-letter" aria-hidden="true">F</span>Destino</button><button class="tool" data-tool="erase" aria-pressed="false"><span aria-hidden="true">⌫</span>Apagar</button></div><label class="weight-field" for="weight">Custo <select id="weight" aria-label="Custo da célula">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => `<option ${value === 5 ? 'selected' : ''}>${value}</option>`).join('')}</select></label><button id="clear" class="text-button">Limpar mapa</button></div>
    </section>

    <div class="exploration-bar"><p id="map-description">Corredores com passagens e uma região de custo maior.</p><label for="speed">Visualização <select id="speed"><option value="160">Lenta</option><option value="70" selected>Normal</option><option value="16">Rápida</option><option value="0">Sem animação</option></select></label></div>
    <div class="comparison" aria-label="Comparação dos algoritmos">${(['astar', 'dijkstra'] as const).map((algorithm, index) => `<section class="algorithm-panel panel ${algorithm}" aria-labelledby="${algorithm}-title"><header class="algorithm-heading"><div><span class="algorithm-index">0${index + 1}</span><div><h2 id="${algorithm}-title">${algorithm === 'astar' ? 'A*' : 'Dijkstra'}</h2><p>${algorithm === 'astar' ? 'Custo + estimativa até o destino' : 'Menor custo acumulado primeiro'}</p></div></div><span class="algorithm-status" id="${algorithm}-status">Pronto</span></header><div class="grid-scroll" tabindex="-1"><div class="map-grid" role="grid" id="${algorithm}-grid" aria-label="Grade de ${algorithm === 'astar' ? 'A estrela' : 'Dijkstra'}, editável" aria-describedby="grid-help"></div></div><dl class="algorithm-metrics"><div><dt>Custo da rota</dt><dd id="${algorithm}-cost">—</dd></div><div><dt>Nós expandidos</dt><dd id="${algorithm}-expanded">0</dd></div><div><dt>Movimentos</dt><dd id="${algorithm}-moves">—</dd></div></dl></section>`).join('')}</div>

    <section class="playback-panel" aria-label="Progresso da comparação"><div class="progress-copy"><span class="live-dot" aria-hidden="true"></span><p id="result-summary">Seu mapa está pronto. Execute ou avance um passo.</p><span id="progress-count">0 passos</span></div><div id="progress" class="progress-track" role="progressbar" aria-label="Passos da visualização" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div></section>
    <div class="legend" aria-label="Legenda"><span><i class="legend-start">I</i>Início</span><span><i class="legend-goal">F</i>Destino</span><span><i class="wall-swatch"></i>Parede</span><span><i class="weight-swatch">5</i>Custo de entrada</span><span><i class="frontier-swatch"></i>Fronteira</span><span><i class="closed-swatch"></i>Expandido</span><span><i class="path-swatch"></i>Rota encontrada</span></div>
    <p id="grid-help" class="grid-help">Edite qualquer uma das grades; a outra acompanha. Pelo teclado: setas para mover, Espaço para aplicar a ferramenta, I/F para início/destino e 1–9 para peso. Editar o mapa cancela a busca atual.</p>
    <p id="announcement" class="announcement" role="status" aria-live="polite" aria-atomic="true">Demonstração com mapas fictícios. Nenhuma localização real.</p>

    <section id="method" class="method-section" aria-labelledby="method-title"><div><p class="eyebrow">A IDEIA POR TRÁS DA ROTA</p><h2 id="method-title">Mesmo objetivo.<br>Critérios diferentes.</h2><p>Os algoritmos recebem as mesmas paredes, pesos, início e destino. O custo é a soma das células em que a rota entra; a célula inicial custa zero.</p></div><div class="method-cards"><article><span class="method-tag astar-tag">A*</span><h3>Uma estimativa que respeita o limite.</h3><p>A distância Manhattan é multiplicada pelo menor custo transitável. Sem diagonais e com pesos positivos, essa estimativa não supera o custo restante.</p></article><article><span class="method-tag dijkstra-tag">Dijkstra</span><h3>O custo orienta toda a exploração.</h3><p>Expande a menor distância acumulada conhecida. Serve como referência de custo ótimo, mesmo quando o trajeto mais barato dá uma volta.</p></article><p class="method-footnote">A* não garante menos expansões em todo mapa. Rotas de mesmo custo podem ser diferentes. A animação mostra até uma expansão por algoritmo a cada passo visual; ela não mede tempo de CPU.</p></div></section>
  </main><footer class="site-footer"><span>Pathfinding Lab</span><p>TypeScript · mapas reproduzíveis · sem serviços externos</p><a href="#controls">Voltar ao mapa ↑</a></footer>
`

function element<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector)
  if (!node) throw new Error(`Missing UI element: ${selector}`)
  return node
}

const algorithms: Algorithm[] = ['astar', 'dijkstra']
let grid: Grid = preset('balanced')
let results: Record<Algorithm, SearchResult> | null = null
let tool: Tool = 'wall'
let weight = 5
let frame: Frame = { index: 0, length: 0, running: false }
let completedAnnouncement = false
const cells: Record<Algorithm, HTMLButtonElement[]> = { astar: [], dijkstra: [] }
const focused: Record<Algorithm, number> = { astar: grid.start, dijkstra: grid.start }
const presetSelect = element<HTMLSelectElement>('#preset')
const speedSelect = element<HTMLSelectElement>('#speed')
const runButton = element<HTMLButtonElement>('#run')
const stepButton = element<HTMLButtonElement>('#step')
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
if (reducedMotion.matches) speedSelect.value = '0'

function announce(message: string) {
  element('#announcement').textContent = message
}

function stepFor(algorithm: Algorithm): SearchStep | null {
  if (!results || frame.index === 0) return null
  const steps = results[algorithm].steps
  return steps[Math.min(frame.index - 1, steps.length - 1)]
}

function render() {
  for (const algorithm of algorithms) {
    const step = stepFor(algorithm)
    const closed = new Set(step?.closed),
      frontier = new Set(step?.frontier),
      path = new Set(step?.path)
    for (let index = 0; index < cells[algorithm].length; index++) {
      const cell = cells[algorithm][index]
      const isStart = index === grid.start,
        isGoal = index === grid.goal
      const classes = ['cell']
      if (grid.walls[index]) classes.push('wall')
      else {
        if (grid.costs[index] > 1) classes.push('weighted')
        if (closed.has(index)) classes.push('closed')
        if (frontier.has(index)) classes.push('frontier')
        if (path.has(index)) classes.push('path')
        if (step?.current === index) classes.push('current')
        if (isStart) classes.push('start')
        if (isGoal) classes.push('goal')
      }
      cell.className = classes.join(' ')
      cell.textContent =
        isStart && isGoal
          ? '◎'
          : isStart
            ? 'I'
            : isGoal
              ? 'F'
              : grid.walls[index] || grid.costs[index] === 1
                ? ''
                : String(grid.costs[index])
      cell.tabIndex = focused[algorithm] === index ? 0 : -1
      const detail =
        isStart && isGoal
          ? 'início e destino'
          : isStart
            ? 'início'
            : isGoal
              ? 'destino'
              : grid.walls[index]
                ? 'parede'
                : `custo ${grid.costs[index]}`
      const state = path.has(index)
        ? ', na rota'
        : closed.has(index)
          ? ', expandida'
          : frontier.has(index)
            ? ', na fronteira'
            : ''
      cell.setAttribute(
        'aria-label',
        `Linha ${Math.floor(index / grid.cols) + 1}, coluna ${(index % grid.cols) + 1}, ${detail}${state}`,
      )
    }
    const status = element(`#${algorithm}-status`)
    status.textContent = !step
      ? 'Pronto'
      : step.status === 'found'
        ? 'Rota encontrada'
        : step.status === 'unreachable'
          ? 'Sem rota'
          : frame.running
            ? 'Explorando'
            : 'Em pausa'
    status.dataset.status = step?.status || 'ready'
    element(`#${algorithm}-cost`).textContent =
      step?.cost === null || !step ? '—' : String(step.cost)
    element(`#${algorithm}-expanded`).textContent = String(step?.expanded || 0)
    element(`#${algorithm}-moves`).textContent =
      step?.status === 'found' ? String(step.path.length - 1) : '—'
  }
  runButton.innerHTML = frame.running
    ? '<span aria-hidden="true">Ⅱ</span> Pausar'
    : `<span aria-hidden="true">▶</span> ${frame.index > 0 && frame.index < frame.length ? 'Continuar' : 'Executar'}`
  stepButton.disabled = frame.length > 0 && frame.index >= frame.length
  element<HTMLButtonElement>('#reset').disabled = !results
  const progress = frame.length ? Math.round((frame.index / frame.length) * 100) : 0
  element('#progress').setAttribute('aria-valuenow', String(progress))
  element<HTMLElement>('#progress > span').style.width = `${progress}%`
  element('#progress-count').textContent = frame.length
    ? `${frame.index} / ${frame.length} passos`
    : '0 passos'
  let summary = 'Seu mapa está pronto. Execute ou avance um passo.'
  if (frame.index > 0 && frame.index < frame.length)
    summary = frame.running
      ? 'Duas explorações. O mesmo terreno.'
      : 'Exploração pausada. Continue no seu ritmo.'
  if (results && frame.index === frame.length) {
    summary =
      results.astar.status === 'unreachable'
        ? 'O destino está inacessível. Os dois confirmaram: sem rota.'
        : `Mesmo custo ótimo: ${results.astar.cost}. Compare os nós expandidos.`
    if (!completedAnnouncement) {
      completedAnnouncement = true
      announce(summary)
    }
  }
  element('#result-summary').textContent = summary
}

const playback = new Playback((next) => {
  frame = next
  render()
})

function resetSearch(message: string) {
  results = null
  completedAnnouncement = false
  playback.reset()
  announce(message)
}

function prepare() {
  if (results && frame.index < frame.length) return
  const original = cloneGrid(grid)
  results = { astar: search(original, 'astar'), dijkstra: search(original, 'dijkstra') }
  completedAnnouncement = false
  playback.load(Math.max(results.astar.steps.length, results.dijkstra.steps.length))
}

function applyCell(index: number, selectedTool = tool) {
  if (selectedTool === 'wall' && (index === grid.start || index === grid.goal)) {
    announce('Mova o início ou o destino antes de colocar uma parede nessa célula.')
    return
  }
  if (selectedTool === 'wall') grid.walls[index] = true
  if (selectedTool === 'erase') {
    grid.walls[index] = false
    grid.costs[index] = 1
  }
  if (selectedTool === 'weight') {
    grid.walls[index] = false
    grid.costs[index] = weight
  }
  if (selectedTool === 'start') {
    grid.walls[index] = false
    grid.start = index
  }
  if (selectedTool === 'goal') {
    grid.walls[index] = false
    grid.goal = index
  }
  presetSelect.value = 'custom'
  element('#map-description').textContent =
    'Mapa personalizado. A edição é compartilhada pelas duas grades.'
  resetSearch('Mapa editado. A busca anterior foi cancelada; execute novamente para comparar.')
}

function selectTool(selected: Tool) {
  tool = selected
  document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((button) => {
    const active = button.dataset.tool === tool
    button.classList.toggle('active', active)
    button.setAttribute('aria-pressed', String(active))
  })
}

for (const algorithm of algorithms) {
  const map = element(`#${algorithm}-grid`)
  map.setAttribute('aria-rowcount', String(grid.rows))
  map.setAttribute('aria-colcount', String(grid.cols))
  for (let row = 0; row < grid.rows; row++) {
    const rowElement = document.createElement('div')
    rowElement.className = 'grid-row'
    rowElement.setAttribute('role', 'row')
    rowElement.setAttribute('aria-rowindex', String(row + 1))
    for (let col = 0; col < grid.cols; col++) {
      const cell = document.createElement('button')
      cell.type = 'button'
      cell.dataset.node = String(row * grid.cols + col)
      cell.setAttribute('role', 'gridcell')
      cell.setAttribute('aria-colindex', String(col + 1))
      rowElement.append(cell)
      cells[algorithm].push(cell)
    }
    map.append(rowElement)
  }
  map.addEventListener('focusin', (event) => {
    const target = event.target as HTMLButtonElement
    if (target.dataset.node) focused[algorithm] = Number(target.dataset.node)
  })
  map.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLButtonElement>('[data-node]')
    if (target) {
      focused[algorithm] = Number(target.dataset.node)
      applyCell(focused[algorithm])
    }
  })
  map.addEventListener('keydown', (event) => {
    const index = focused[algorithm],
      row = Math.floor(index / grid.cols),
      col = index % grid.cols
    let next = index
    if (event.key === 'ArrowUp') next = Math.max(0, row - 1) * grid.cols + col
    else if (event.key === 'ArrowDown') next = Math.min(grid.rows - 1, row + 1) * grid.cols + col
    else if (event.key === 'ArrowLeft') next = row * grid.cols + Math.max(0, col - 1)
    else if (event.key === 'ArrowRight') next = row * grid.cols + Math.min(grid.cols - 1, col + 1)
    else if (event.key === 'Home') next = event.ctrlKey ? 0 : row * grid.cols
    else if (event.key === 'End')
      next = event.ctrlKey ? grid.costs.length - 1 : row * grid.cols + grid.cols - 1
    else if (event.key === ' ' || event.key === 'Enter') applyCell(index)
    else if (event.key.toLowerCase() === 'i') applyCell(index, 'start')
    else if (event.key.toLowerCase() === 'f') applyCell(index, 'goal')
    else if (/^[1-9]$/.test(event.key)) {
      weight = Number(event.key)
      element<HTMLSelectElement>('#weight').value = event.key
      selectTool('weight')
      applyCell(index, 'weight')
    } else if (event.key === 'Escape') {
      playback.pause()
      announce('Exploração pausada.')
    } else return
    event.preventDefault()
    focused[algorithm] = next
    cells[algorithm].forEach((cell, cellIndex) => {
      cell.tabIndex = cellIndex === next ? 0 : -1
    })
    cells[algorithm][next].focus()
  })
}

document
  .querySelectorAll<HTMLButtonElement>('[data-tool]')
  .forEach((button) =>
    button.addEventListener('click', () => selectTool(button.dataset.tool as Tool)),
  )
element<HTMLSelectElement>('#weight').addEventListener('change', (event) => {
  weight = Number((event.target as HTMLSelectElement).value)
  selectTool('weight')
})
presetSelect.addEventListener('change', () => {
  if (presetSelect.value === 'custom') return
  grid = preset(presetSelect.value as Preset)
  element('#map-description').textContent =
    presetSelect.value === 'weighted'
      ? 'O menor número de movimentos nem sempre tem o menor custo.'
      : presetSelect.value === 'blocked'
        ? 'O destino está cercado. Observe a confirmação de ausência de rota.'
        : 'Corredores com passagens e uma região de custo maior.'
  resetSearch('Cenário carregado. A busca anterior foi cancelada.')
})
element('#generate').addEventListener('click', () => {
  const seed = Number(element<HTMLInputElement>('#seed').value)
  try {
    if (element<HTMLInputElement>('#seed').value.trim() === '') throw new Error()
    grid = seededGrid(seed)
    presetSelect.value = 'custom'
    element('#map-description').textContent =
      `Mapa reproduzível · seed ${seed}. Pode haver regiões sem passagem.`
    resetSearch(`Mapa da seed ${seed} carregado. A busca anterior foi cancelada.`)
  } catch {
    announce('Use uma seed inteira entre 0 e 4294967295. O mapa anterior foi preservado.')
  }
})
element('#clear').addEventListener('click', () => {
  const clear = emptyGrid(grid.rows, grid.cols)
  clear.start = grid.start
  clear.goal = grid.goal
  grid = clear
  presetSelect.value = 'custom'
  element('#map-description').textContent = 'Terreno livre: todas as células têm custo 1.'
  resetSearch('Paredes e pesos removidos. Início e destino preservados.')
})
runButton.addEventListener('click', () => {
  if (frame.running) {
    playback.pause()
    announce('Exploração pausada.')
    return
  }
  prepare()
  if (speedSelect.value === '0') playback.finish()
  else {
    playback.setDelay(Number(speedSelect.value))
    playback.play()
  }
})
stepButton.addEventListener('click', () => {
  prepare()
  playback.step()
  if (frame.index < frame.length)
    announce(
      `Passo ${frame.index}. A*: ${stepFor('astar')?.expanded || 0} nós expandidos. Dijkstra: ${stepFor('dijkstra')?.expanded || 0} nós expandidos.`,
    )
})
element('#reset').addEventListener('click', () =>
  resetSearch('Busca reiniciada. O mapa foi preservado.'),
)
speedSelect.addEventListener('change', () => {
  if (speedSelect.value === '0' && frame.running) playback.finish()
  else if (speedSelect.value !== '0') playback.setDelay(Number(speedSelect.value))
})
reducedMotion.addEventListener('change', (event) => {
  if (event.matches) {
    speedSelect.value = '0'
    playback.pause()
    announce(
      'Movimento reduzido ativado. Executar mostrará o resultado sem animação; Um passo continua disponível.',
    )
  }
})
window.addEventListener('pagehide', () => playback.pause())
render()
