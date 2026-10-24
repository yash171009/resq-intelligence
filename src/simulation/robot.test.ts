
import { describe, expect, it } from 'vitest'
import { createFloodScenario } from './flood'
import {
  createRobot,
  findFrontiers,
  observeNearby,
} from './robot'

describe('robot belief map', () => {
  it('starts with an entirely unknown map', () => {
    const robot = createRobot()

    expect(robot.belief.flat().every((cell) => !cell.observed)).toBe(true)
  })

  it('observes cells only within sensor radius', () => {
    const { world } = createFloodScenario(0)
    const robot = createRobot({ x: 10, y: 2 }, 2)

    observeNearby(robot, world, 0)

    expect(robot.belief[2][10].observed).toBe(true)
    expect(robot.belief[2][13].observed).toBe(false)
    expect(robot.belief[2][10].road).toBe(true)
  })

  it('updates observations as the robot discovers terrain', () => {
    const { world } = createFloodScenario(0)
    const robot = createRobot({ x: 10, y: 2 }, 2)

    const observations = observeNearby(robot, world, 0)

    expect(observations.length).toBeGreaterThan(0)
    expect(robot.observations).toBe(observations.length)
    expect(robot.belief[2][10].lastObservedTick).toBe(0)
  })

  it('identifies frontiers beside unknown terrain', () => {
    const { world } = createFloodScenario(0)
    const robot = createRobot({ x: 10, y: 2 }, 2)

    observeNearby(robot, world, 0)

    expect(findFrontiers(robot).length).toBeGreaterThan(0)
  })
})
