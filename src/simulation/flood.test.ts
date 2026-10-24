
import { describe, expect, it } from 'vitest'
import {
  createFloodScenario,
  FLOOD_SCENARIOS,
  getWaterLevel,
  updateFlood,
} from './flood'
import { createWorld } from './world'

describe('flood model', () => {
  it('calculates the expected water levels', () => {
    expect(getWaterLevel(0)).toBeCloseTo(0.8)
    expect(getWaterLevel(5)).toBeCloseTo(1.25)
    expect(getWaterLevel(10)).toBeCloseTo(1.3)
    expect(getWaterLevel(12)).toBeCloseTo(1.72)
  })

  it('supports distinct deterministic flood profiles for evaluation', () => {
    const baseline = FLOOD_SCENARIOS.find((scenario) => scenario.id === 'baseline')!
    const early = FLOOD_SCENARIOS.find((scenario) => scenario.id === 'early-surge')!
    const severe = FLOOD_SCENARIOS.find((scenario) => scenario.id === 'severe')!
    expect(getWaterLevel(4, early)).toBeGreaterThan(getWaterLevel(4, baseline))
    expect(getWaterLevel(12, severe)).toBeGreaterThan(getWaterLevel(12, baseline))
    expect(new Set(FLOOD_SCENARIOS.map((scenario) => scenario.id)).size).toBe(FLOOD_SCENARIOS.length)
  })

  it('starts with a fresh world at tick zero', () => {
    const { world, summary } = createFloodScenario(0)

    expect(world).toHaveLength(14)
    expect(world[0]).toHaveLength(20)
    expect(summary.tick).toBe(0)
    expect(summary.waterLevel).toBe(0.8)
  })

  it('marks deep water on roads as closed', () => {
    const world = createWorld()

    const summary = updateFlood(world, 5)

    expect(summary.tick).toBe(5)
    expect(world[4][7].waterDepth).toBeGreaterThan(0.25)
    expect(world[4][7].roadStatus).toBe('closed')
  })

  it('produces repeatable results for the same tick', () => {
    const first = createFloodScenario(12)
    const second = createFloodScenario(12)

    expect(first.summary).toEqual(second.summary)
    expect(first.world).toEqual(second.world)
  })
})
