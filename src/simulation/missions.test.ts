
import { describe, expect, it } from 'vitest'
import { BUILDINGS, createWorld } from './world'
import { createRobot, observeNearby } from './robot'
import {
  assignNextMission,
  discoverMissions,
  updateMissionStatus,
  type RescueMission,
} from './missions'

function makeMission(
  id: string,
  priority: number,
  status: RescueMission['status'] = 'pending',
): RescueMission {
  return {
    id,
    buildingId: id,
    buildingName: id,
    target: { x: 10, y: 2 },
    occupants: 10,
    priority,
    status,
    assignedTo: null,
    createdAtTick: 0,
    completedAtTick: null,
  }
}

describe('rescue mission engine', () => {
  it('does not discover buildings that the robot has not observed', () => {
    const robot = createRobot({ x: 10, y: 2 }, 1)
    const result = discoverMissions(
      BUILDINGS,
      robot,
      [],
      0,
    )

    expect(result.created).toBe(0)
    expect(result.missions).toHaveLength(0)
  })

  it('creates missions for observed residential buildings with known access roads', () => {
    const world = createWorld()
    const robot = createRobot({ x: 10, y: 2 }, 20)
    observeNearby(robot, world, 0)

    const result = discoverMissions(
      BUILDINGS,
      robot,
      [],
      0,
    )

    expect(result.created).toBeGreaterThan(0)
    expect(
      result.missions.every(
        (mission) => mission.status === 'pending',
      ),
    ).toBe(true)
    expect(
      result.missions.every(
        (mission) => mission.target.x >= 0 && mission.target.y >= 0,
      ),
    ).toBe(true)
  })

  it('does not leak hidden occupant counts into mission knowledge or priority', () => {
    const world = createWorld()
    const robot = createRobot({ x: 10, y: 2 }, 20)
    observeNearby(robot, world, 0)

    const changedGroundTruth = BUILDINGS.map((building) => ({
      ...building,
      occupants: building.occupants + 1000,
    }))

    const original = discoverMissions(BUILDINGS, robot, [], 0)
    const changed = discoverMissions(changedGroundTruth, robot, [], 0)

    expect(original.missions.map(({ buildingId, occupants, priority }) => ({
      buildingId,
      occupants,
      priority,
    }))).toEqual(changed.missions.map(({ buildingId, occupants, priority }) => ({
      buildingId,
      occupants,
      priority,
    })))
    expect(original.missions.every((mission) => mission.occupants === null)).toBe(true)
  })

  it('uses observed water and access-road conditions for illustrative priority', () => {
    const world = createWorld()
    const robot = createRobot({ x: 10, y: 2 }, 20)
    observeNearby(robot, world, 0)

    const result = discoverMissions(BUILDINGS, robot, [], 0)
    expect(result.missions.length).toBeGreaterThan(0)
    expect(result.missions.every((mission) => mission.priority >= 1)).toBe(true)
    expect(result.missions.every((mission) => mission.occupants === null)).toBe(true)
  })

  it('does not create duplicate missions for the same building', () => {
    const robot = createRobot({ x: 10, y: 2 }, 20)
    observeNearby(robot, createWorld(), 0)

    const first = discoverMissions(BUILDINGS, robot, [], 0)
    const second = discoverMissions(
      BUILDINGS,
      robot,
      first.missions,
      1,
    )

    expect(second.created).toBe(0)
    expect(second.missions).toHaveLength(first.missions.length)
  })

  it('assigns the highest-priority pending mission', () => {
    const missions = [
      makeMission('MISSION-LOW', 10),
      makeMission('MISSION-HIGH', 50),
    ]

    const result = assignNextMission(missions, 'RESCUE-01')
    const assigned = result.find(
      (mission) => mission.status === 'assigned',
    )

    expect(assigned?.id).toBe('MISSION-HIGH')
    expect(assigned?.assignedTo).toBe('RESCUE-01')
  })

  it('does not assign a second active mission to the same unit', () => {
    const missions = [
      {
        ...makeMission('MISSION-A', 50),
        status: 'assigned' as const,
        assignedTo: 'RESCUE-01',
      },
      makeMission('MISSION-B', 40),
    ]

    const result = assignNextMission(missions, 'RESCUE-01')

    expect(result.find((mission) => mission.id === 'MISSION-B')?.status)
      .toBe('pending')
  })

  it('records the completion tick', () => {
    const missions = [makeMission('MISSION-A', 50)]

    const assigned = assignNextMission(missions, 'RESCUE-01')
    const result = updateMissionStatus(
      assigned,
      'MISSION-A',
      'completed',
      8,
    )

    expect(result[0].status).toBe('completed')
    expect(result[0].completedAtTick).toBe(8)
  })
})
