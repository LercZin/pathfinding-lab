export interface Frame {
  index: number
  length: number
  running: boolean
}

export class Playback {
  private index = 0
  private length = 0
  private delay = 70
  private running = false
  private generation = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  constructor(private readonly onFrame: (frame: Frame) => void) {}

  private emit() {
    this.onFrame({ index: this.index, length: this.length, running: this.running })
  }
  private cancelTimer() {
    this.generation++
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.timer = undefined
  }
  private schedule() {
    const generation = this.generation
    this.timer = setTimeout(() => {
      if (generation !== this.generation || !this.running) return
      this.index++
      this.running = this.index < this.length
      this.emit()
      if (this.running) this.schedule()
    }, this.delay)
  }
  load(length: number) {
    if (!Number.isInteger(length) || length < 1 || length > 1601)
      throw new Error('Invalid trace length.')
    this.cancelTimer()
    this.index = 0
    this.length = length
    this.running = false
    this.emit()
  }
  play() {
    if (this.running || !this.length || this.index >= this.length) return
    this.running = true
    this.emit()
    this.schedule()
  }
  pause() {
    this.cancelTimer()
    this.running = false
    this.emit()
  }
  step() {
    this.cancelTimer()
    this.running = false
    this.index = Math.min(this.index + 1, this.length)
    this.emit()
  }
  finish() {
    this.cancelTimer()
    this.running = false
    this.index = this.length
    this.emit()
  }
  reset() {
    this.cancelTimer()
    this.running = false
    this.index = 0
    this.length = 0
    this.emit()
  }
  setDelay(delay: number) {
    if (!Number.isFinite(delay) || delay < 10 || delay > 2000)
      throw new Error('Invalid playback delay.')
    this.delay = delay
    if (this.running) {
      this.cancelTimer()
      this.schedule()
    }
  }
}
