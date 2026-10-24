import type { Building, Point } from './world'
import type { RobotState } from './robot'

export type MissionStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'blocked'

export type RescueMission = {
  id: string
  buildingId: string
  buildingName: string
  target: Point
  /** Occupant count is unknown unless a trusted report supplies it. */
  occupants: number | null
  /** Illustrative urgency score based only on locally observed conditions. */
  priority: number
  status: MissionStatus
  assignedTo: string | null
  createdAtTick: number
  completedAtTick: number | null
}

export type MissionUpdate = {
  missions: RescueMission[]
  created: number
  message: string
}

function copyPoint(point: Point): Point {
  return { x: point.x, y: point.y }
}

/**
 * Creates potential welfare-check missions only when the building area and
 * access road have been observed. BUILDINGS is scenario/map metadata; its
 * occupants value is ground truth and is deliberately NOT copied into the
 * robot's mission knowledge. No occupancy report feed exists in this demo.
 *
 * Priority is an illustrative score from observed water depth and access-road
 * condition, not a validated real-world risk score.
 */
export function discoverMissions(
  buildings: Building[],
  robot: RobotState,
  existingMissions: RescueMission[],
  tick: number,
): MissionUpdate {
  const missions = existingMissions.map((mission) => ({
    ...mission,
    target: copyPoint(mission.target),
  }))

  const knownBuildingIds = new Set(
    missions.map((mission) => mission.buildingId),
  )

  let created = 0

  for (const building of buildings) {
    // Residential locations are known from the scenario's map metadata.
    // Whether anyone is present is not assumed; this is a potential check.
    if (building.kind !== 'residential') continue
    if (knownBuildingIds.has(building.id)) continue

    const { x, y } = building.position
    const observedBuildingCell = robot.belief[y]?.[x]

    const { x: roadX, y: roadY } = building.accessRoad
    const observedAccessRoad = robot.belief[roadY]?.[roadX]

    if (!observedBuildingCell?.observed) continue
    if (!observedAccessRoad?.observed || !observedAccessRoad.road) continue

    const waterDepth = observedBuildingCell.waterDepth ?? 0
    const roadStatus = observedAccessRoad.roadStatus
    const accessRiskBonus =
      roadStatus === 'closed' ? 25 : roadStatus === 'caution' ? 10 : 0
    const priority = 1 + Math.round(waterDepth * 100) + accessRiskBonus

    missions.push({
      id: `MISSION-${building.id}`,
      buildingId: building.id,
      buildingName: building.name,
      target: copyPoint(building.accessRoad),
      occupants: null,
      priority,
      status: 'pending',
      assignedTo: null,
      createdAtTick: tick,
      completedAtTick: null,
    })

    knownBuildingIds.add(building.id)
    created += 1
  }

  missions.sort((a, b) => b.priority - a.priority)

  return {
    missions,
    created,
    message:
      created > 0
        ? `${created} potential welfare-check mission${created === 1 ? '' : 's'} discovered from observed conditions. Occupant counts are unknown.`
        : 'No new rescue missions discovered.',
  }
}

/** Assigns the highest-priority pending mission to an available unit. */
export function assignNextMission(
  missions: RescueMission[],
  unitId: string,
): RescueMission[] {
  const alreadyAssigned = missions.some(
    (mission) =>
      mission.assignedTo === unitId &&
      (mission.status === 'assigned' ||
        mission.status === 'in_progress'),
  )

  if (alreadyAssigned) {
    return missions.map((mission) => ({ ...mission }))
  }

  const nextMission = missions
    .filter((mission) => mission.status === 'pending')
    .sort((a, b) => b.priority - a.priority)[0]

  if (!nextMission) {
    return missions.map((mission) => ({ ...mission }))
  }

  return missions.map((mission) => {
    if (mission.id !== nextMission.id) {
      return { ...mission }
    }

    return {
      ...mission,
      status: 'assigned',
      assignedTo: unitId,
    }
  })
}

/** Updates a mission's status while preserving task history. */
export function updateMissionStatus(
  missions: RescueMission[],
  missionId: string,
  status: MissionStatus,
  tick: number,
): RescueMission[] {
  return missions.map((mission) => {
    if (mission.id !== missionId) {
      return { ...mission }
    }

    return {
      ...mission,
      status,
      completedAtTick:
        status === 'completed' ? tick : mission.completedAtTick,
    }
  })
}
