
import type { Point } from './world'
import type { RobotState } from './robot'
import type { RescueMission } from './missions'
import {
  createBeliefNavigationMap,
  findPath,
} from './pathfinding'

export type RescueTeamStatus =
  | 'idle'
  | 'en_route'
  | 'arrived'
  | 'blocked'

export type RescueTeamState = {
  id: string
  position: Point
  status: RescueTeamStatus
  activeMissionId: string | null
  path: Point[]
  distanceTravelled: number
}

export function createRescueTeam(
  start: Point = { x: 10, y: 7 },
  id = 'RESCUE-01',
): RescueTeamState {
  return {
    id,
    position: { ...start },
    status: 'idle',
    activeMissionId: null,
    path: [],
    distanceTravelled: 0,
  }
}

/**
 * Plan a route using only roads currently known to the robot.
 * The team cannot plan through unknown roads or confirmed closures.
 */
export function planRescueRoute(
  team: RescueTeamState,
  mission: RescueMission,
  robot: RobotState,
): RescueTeamState {
  const navigationMap = createBeliefNavigationMap(robot)
  const route = findPath(team.position, mission.target, navigationMap)

  if (!route) {
    return {
      ...team,
      position: { ...team.position },
      path: [],
      status: 'blocked',
      activeMissionId: mission.id,
    }
  }

  return {
    ...team,
    position: { ...team.position },
    path: route.path.map((point) => ({ ...point })),
    status: route.path.length <= 1 ? 'arrived' : 'en_route',
    activeMissionId: mission.id,
  }
}

/** Move one road cell along the planned route per simulation tick. */
export function advanceRescueTeam(
  team: RescueTeamState,
): RescueTeamState {
  if (team.status !== 'en_route' || team.path.length < 2) {
    return {
      ...team,
      position: { ...team.position },
      path: team.path.map((point) => ({ ...point })),
    }
  }

  const nextPosition = team.path[1]
  const remainingPath = team.path.slice(1).map((point) => ({ ...point }))
  const arrived = remainingPath.length <= 1

  return {
    ...team,
    position: { ...nextPosition },
    path: remainingPath,
    distanceTravelled: team.distanceTravelled + 1,
    status: arrived ? 'arrived' : 'en_route',
  }
}
