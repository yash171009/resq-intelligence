
import { describe, expect, it } from 'vitest'
import {
  advanceSimulation,
  createSimulation,
  getCoveragePercent,
} from './engine'

describe('integrated simulation engine', () => {
  it('initializes a simulation at tick zero', () => {
    const state = createSimulation()

    expect(state.tick).toBe(0)
    expect(state.strategy).toBe('explore')
    expect(state.robot.position).toEqual({ x: 10, y: 2 })
    expect(state.rescueTeam.position).toEqual({ x: 10, y: 7 })
    expect(state.events.length).toBeGreaterThan(0)
  })

  it('advances the simulation and flood by one tick', () => {
    const initial = createSimulation()
    const next = advanceSimulation(initial)

    expect(next.tick).toBe(1)
    expect(next.flood.tick).toBe(1)
    expect(next.flood.waterLevel).toBeGreaterThan(initial.flood.waterLevel)
  })

  it('keeps coverage within zero and one hundred percent', () => {
    const state = createSimulation()
    const coverage = getCoveragePercent(state.robot)

    expect(coverage).toBeGreaterThan(0)
    expect(coverage).toBeLessThanOrEqual(100)
  })

  it('keeps the robot stationary in stationary strategy', () => {
    const state = createSimulation('stationary')
    const initialPosition = { ...state.robot.position }
    const next = advanceSimulation(state)

    expect(next.strategy).toBe('stationary')
    expect(next.robot.position).toEqual(initialPosition)
    expect(next.tick).toBe(1)
  })

  it('records events as time advances', () => {
    const initial = createSimulation()
    const next = advanceSimulation(initial)

    expect(next.events.length).toBeGreaterThanOrEqual(
      initial.events.length,
    )
    expect(next.events.every((event) => event.tick <= next.tick)).toBe(true)
  })

  it('initializes mission-aware strategy explicitly', () => {
    const state = createSimulation('mission-aware')
    expect(state.strategy).toBe('mission-aware')
    const next = advanceSimulation(state)
    expect(next.tick).toBe(1)
    expect(next.robot.position).not.toEqual({ x: 10, y: 2 })
  })

})
