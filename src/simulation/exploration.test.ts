
import { describe, expect, it } from 'vitest'
import { createFloodScenario } from './flood'
import { stepExploration, stepMissionAwareExploration } from './exploration'
import { createRobot } from './robot'

describe('autonomous exploration', () => {
  it('observes and moves using its belief map', () => {
    const { world } = createFloodScenario(0)
    const robot = createRobot({ x: 10, y: 2 }, 2)

    const result = stepExploration(robot, world, 0)

    expect(result.observationsAdded).toBeGreaterThan(0)
    expect(robot.belief.flat().some((cell) => cell.observed)).toBe(true)
    expect(
      robot.position.x !== 10 || robot.position.y !== 2,
    ).toBe(true)
  })

  it('never moves to a cell outside the world', () => {
    const { world } = createFloodScenario(0)
    const robot = createRobot({ x: 10, y: 2 }, 2)

    for (let tick = 0; tick < 8; tick++) {
      stepExploration(robot, world, tick)

      expect(robot.position.x).toBeGreaterThanOrEqual(0)
      expect(robot.position.x).toBeLessThan(20)
      expect(robot.position.y).toBeGreaterThanOrEqual(0)
      expect(robot.position.y).toBeLessThan(14)
    }
  })

  it('returns a defined exploration state', () => {
    const { world } = createFloodScenario(0)
    const robot = createRobot({ x: 10, y: 2 }, 2)

    const result = stepExploration(robot, world, 0)

    expect(['exploring', 'complete', 'blocked']).toContain(result.status)
    expect(result.message.length).toBeGreaterThan(0)
  })

  it('supports mission-aware exploration using target locations only', () => {
    const { world } = createFloodScenario(0)
    const robot = createRobot({ x: 10, y: 2 }, 2)

    const result = stepMissionAwareExploration(robot, world, 0, [
      { position: { x: 8, y: 3 }, accessRoad: { x: 8, y: 4 } },
      { position: { x: 13, y: 3 }, accessRoad: { x: 13, y: 4 } },
    ])

    expect(['exploring', 'complete', 'blocked']).toContain(result.status)
    expect(result.message).toContain('Mission-aware')
    expect(robot.position).not.toEqual({ x: 10, y: 2 })
    expect(robot.belief.flat().some((cell) => cell.observed)).toBe(true)
  })

  it('does not require or accept occupant counts for frontier scoring', () => {
    const { world } = createFloodScenario(0)
    const robot = createRobot({ x: 10, y: 2 }, 2)

    expect(() =>
      stepMissionAwareExploration(robot, world, 1, [
        { position: { x: 8, y: 3 }, accessRoad: { x: 8, y: 4 } },
      ]),
    ).not.toThrow()
  })

})
