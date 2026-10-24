import { describe, expect, it } from 'vitest'
import {
  runMultiScenarioComparison,
  runStrategyComparison,
} from './evaluation'
import {
  FLOOD_SCENARIOS,
  getWaterLevel,
} from './flood'

describe('strategy comparison', () => {
  it('compares all three strategies over the same tick budget', () => {
    const results = runStrategyComparison(8)

    expect(results.map((row) => row.strategy)).toEqual([
      'stationary',
      'explore',
      'mission-aware',
    ])
    expect(results.every((row) => row.ticksRun === 8)).toBe(true)
  })

  it('returns valid outcome and flood metrics', () => {
    const results = runStrategyComparison(5)

    for (const result of results) {
      expect(result.coveragePercent).toBeGreaterThanOrEqual(0)
      expect(result.coveragePercent).toBeLessThanOrEqual(100)
      expect(result.missionsDiscovered).toBeGreaterThanOrEqual(0)
      expect(result.rescueDistance).toBeGreaterThanOrEqual(0)
      expect(result.blockedRouteEvents).toBeGreaterThanOrEqual(0)
      expect(result.uniqueBlockedMissions).toBeGreaterThanOrEqual(0)
      expect(result.uniqueBlockedMissions).toBeLessThanOrEqual(result.blockedRouteEvents)
      expect(result.rescueArrived).toBe(result.arrivalTick !== null)
      expect(result.finalWaterLevel).toBeGreaterThan(0)
      expect(result.wetCells).toBeGreaterThanOrEqual(0)
      expect(result.cautionRoads).toBeGreaterThanOrEqual(0)
      expect(result.closedRoads).toBeGreaterThanOrEqual(0)
    }
  })

  it('is deterministic for the same scenario and tick budget', () => {
    expect(runStrategyComparison(10)).toEqual(runStrategyComparison(10))
  })
})

describe('multi-scenario validation', () => {
  it('runs each strategy in every flood scenario', () => {
    const results = runMultiScenarioComparison(8)
    expect(results).toHaveLength(FLOOD_SCENARIOS.length * 3)

    for (const scenario of FLOOD_SCENARIOS) {
      const rows = results.filter((row) => row.scenarioId === scenario.id)
      expect(rows.map((row) => row.strategy)).toEqual([
        'stationary',
        'explore',
        'mission-aware',
      ])
      expect(rows.every((row) => row.ticksRun === 8)).toBe(true)
    }
  })

  it('is repeatable for the same tick budget', () => {
    expect(runMultiScenarioComparison(6)).toEqual(runMultiScenarioComparison(6))
  })

  it('reports the same final flood conditions for all strategies within a scenario', () => {
    const results = runMultiScenarioComparison(30)

    for (const scenario of FLOOD_SCENARIOS) {
      const rows = results.filter((row) => row.scenarioId === scenario.id)
      expect(rows).toHaveLength(3)

      for (const row of rows) {
        expect(row.finalWaterLevel).toBe(rows[0].finalWaterLevel)
        expect(row.wetCells).toBe(rows[0].wetCells)
        expect(row.cautionRoads).toBe(rows[0].cautionRoads)
        expect(row.closedRoads).toBe(rows[0].closedRoads)
      }
    }
  })
})

describe('flood profile validation', () => {
  it('has a higher final water level in the severe profile', () => {
    const baseline = FLOOD_SCENARIOS.find((scenario) => scenario.id === 'baseline')!
    const severe = FLOOD_SCENARIOS.find((scenario) => scenario.id === 'severe')!

    expect(getWaterLevel(30, severe)).toBeGreaterThan(getWaterLevel(30, baseline))
  })

  it('applies the early surge before the baseline first surge', () => {
    const baseline = FLOOD_SCENARIOS.find((scenario) => scenario.id === 'baseline')!
    const early = FLOOD_SCENARIOS.find((scenario) => scenario.id === 'early-surge')!

    expect(getWaterLevel(3, early)).toBeGreaterThan(getWaterLevel(3, baseline))
  })
})
