import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Playback } from './playback'
import type { Frame } from './playback'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function controller() {
  const frames: Frame[] = [],
    playback = new Playback((frame) => frames.push(frame))
  return { playback, frames }
}

describe('playback lifecycle', () => {
  it('advances one frame per tick and terminates with no outstanding loop', () => {
    const { playback, frames } = controller()
    playback.load(3)
    playback.setDelay(20)
    playback.play()
    playback.play()
    vi.advanceTimersByTime(60)
    expect(frames.at(-1)).toEqual({ index: 3, length: 3, running: false })
    expect(frames.filter((frame) => frame.index > 0).map((frame) => frame.index)).toEqual([1, 2, 3])
    expect(vi.getTimerCount()).toBe(0)
  })
  it('invalidates an active trace on edits/reset, with no stale callbacks', () => {
    const { playback, frames } = controller()
    playback.load(10)
    playback.play()
    vi.advanceTimersByTime(70)
    playback.reset()
    const count = frames.length
    vi.advanceTimersByTime(2000)
    expect(frames.length).toBe(count)
    expect(frames.at(-1)).toEqual({ index: 0, length: 0, running: false })
    expect(vi.getTimerCount()).toBe(0)
  })
  it('replaces a running preset without advancing the new map from an old timer', () => {
    const { playback, frames } = controller()
    playback.load(20)
    playback.play()
    vi.advanceTimersByTime(20)
    playback.load(2)
    vi.advanceTimersByTime(1000)
    expect(frames.at(-1)).toEqual({ index: 0, length: 2, running: false })
    playback.step()
    playback.step()
    playback.step()
    expect(frames.at(-1)).toEqual({ index: 2, length: 2, running: false })
    expect(vi.getTimerCount()).toBe(0)
  })
  it('pauses, steps, resumes and changes speed without spawning duplicate loops', () => {
    const { playback, frames } = controller()
    playback.load(8)
    playback.play()
    vi.advanceTimersByTime(70)
    playback.pause()
    vi.advanceTimersByTime(700)
    expect(frames.at(-1)?.index).toBe(1)
    playback.step()
    expect(frames.at(-1)?.index).toBe(2)
    playback.play()
    playback.setDelay(10)
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(60)
    expect(frames.at(-1)).toEqual({ index: 8, length: 8, running: false })
    expect(vi.getTimerCount()).toBe(0)
  })
  it('can show the final result immediately for reduced motion', () => {
    const { playback, frames } = controller()
    playback.load(300)
    playback.play()
    playback.finish()
    expect(frames.at(-1)).toEqual({ index: 300, length: 300, running: false })
    expect(vi.getTimerCount()).toBe(0)
  })
  it('validates lengths and speeds', () => {
    const { playback } = controller()
    for (const length of [0, -1, 1.5, 1602, NaN]) expect(() => playback.load(length)).toThrow()
    for (const delay of [0, -1, Infinity, NaN, 3000])
      expect(() => playback.setDelay(delay)).toThrow()
  })
})
