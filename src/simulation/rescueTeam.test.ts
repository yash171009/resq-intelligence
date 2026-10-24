
import { describe, expect, it } from 'vitest'
import { createWorld } from './world'
import { createRobot, observeNearby } from './robot'
import {
  advanceRescueTeam,
  createRescueTeam,
  planRescueRoute,
} from './rescueTeam'
import type { RescueMission } from './missions'

function makeMission(
  target: { x: number; y: number },
): RescueMission {
  return {
    id: 'MISSION-TEST',
    buildingId: 'BLD-TEST',
    buildingName: 'Test building',
    target,
    occupants: 12,
    priority: 12,
    status: 'assigned',
    assignedTo: 'RESCUE-01',
    createdAtTick: 0,
    completedAtTick: null,
  }
}

describe('rescue team navigation', () => {
  it('does not move when its route is blocked', () => {
  const team = createRescueTeam({ x: 10, y: 7 })

  const blockedTeam = {
    ...team,
    status: 'blocked' as const,
    activeMissionId: 'MISSION-TEST',
    path: [],
  }

  const result = advanceRescueTeam(blockedTeam)

  expect(result.status).toBe('blocked')
  expect(result.position).toEqual(team.position)
  expect(result.distanceTravelled).toBe(0)
})
  it('creates the team at its configured start position', () => {
    const team = createRescueTeam({ x: 10, y: 7 })

    expect(team.position).toEqual({ x: 10, y: 7 })
    expect(team.status).toBe('idle')
    expect(team.distanceTravelled).toBe(0)
  })

  it('blocks a route when the target is not a known road', () => {
    const robot = createRobot({ x: 10, y: 2 }, 2)
    observeNearby(robot, createWorld(), 0)

    const team = createRescueTeam({ x: 10, y: 2 })
    const result = planRescueRoute(
      team,
      makeMission({ x: 0, y: 0 }),
      robot,
    )

    expect(result.status).toBe('blocked')
    expect(result.path).toHaveLength(0)
  })

  it('plans a route when the robot has observed the road network', () => {
    const robot = createRobot({ x: 10, y: 2 }, 20)
    observeNearby(robot, createWorld(), 0)

    const team = createRescueTeam({ x: 10, y: 7 })
    const result = planRescueRoute(
      team,
      makeMission({ x: 13, y: 4 }),
      robot,
    )

    expect(['en_route', 'arrived']).toContain(result.status)
    expect(result.path.length).toBeGreaterThan(0)
    expect(result.path[0]).toEqual(team.position)
  })

  
it('moves one cell per tick and counts distance', () => {
  const robot = createRobot({ x: 10, y: 2 }, 20)
  observeNearby(robot, createWorld(), 0)

  const team = createRescueTeam({ x: 10, y: 7 })
  const planned = planRescueRoute(
    team,
    makeMission({ x: 13, y: 4 }),
    robot,
  )

  expect(planned.status).toBe('en_route')
  expect(planned.path.length).toBeGreaterThan(2)

  const next = advanceRescueTeam(planned)

  expect(next.distanceTravelled).toBe(1)
  expect(next.position).toEqual(planned.path[1])
  expect(next.status).toBe('en_route')
  expect(next.path.length).toBe(planned.path.length - 1)
})


  it('does not move when idle', () => {
    const team = createRescueTeam()
    const result = advanceRescueTeam(team)

    expect(result.position).toEqual(team.position)
    expect(result.distanceTravelled).toBe(0)
  })
})
it('keeps a blocked rescue team stationary until a route is available', () => {
  const team = createRescueTeam({ x: 10, y: 7 })

  const blockedTeam = {
    ...team,
    status: 'blocked' as const,
    activeMissionId: 'MISSION-TEST',
    path: [],
  }

  const result = advanceRescueTeam(blockedTeam)

  expect(result.status).toBe('blocked')
  expect(result.position).toEqual({ x: 10, y: 7 })
  expect(result.distanceTravelled).toBe(0)
})
