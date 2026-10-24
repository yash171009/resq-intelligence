
import type { Cell, Point } from './world'
import type { RobotState } from './robot'
import { observeNearby, findFrontiers } from './robot'
import {
  createBeliefNavigationMap,
  findPath,
} from './pathfinding'

export type ExplorationStatus =
  | 'exploring'
  | 'complete'
  | 'blocked'

export type ExplorationStepResult = {
  status: ExplorationStatus
  moved: boolean
  position: Point
  observationsAdded: number
  frontiersRemaining: number
  message: string
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y
}

/**
 * Advance autonomous reconnaissance by one movement step.
 *
 * The robot plans against its belief map, moves at most one
 * road cell, and then observes the world around its new position.
 */
export function stepExploration(
  robot: RobotState,
  groundTruth: Cell[][],
  tick: number,
): ExplorationStepResult {
  const observationsBefore = robot.observations

  // Observe before planning so the robot knows its starting area.
  observeNearby(robot, groundTruth, tick)

  const frontiers = findFrontiers(robot)

  if (frontiers.length === 0) {
    robot.path = []

    return {
      status: 'complete',
      moved: false,
      position: { ...robot.position },
      observationsAdded: robot.observations - observationsBefore,
      frontiersRemaining: 0,
      message: 'No reachable frontier remains in the observed map.',
    }
  }

  const map = createBeliefNavigationMap(robot)
  let bestPath: Point[] | null = null
  let bestCost = Infinity

  // Choose the lowest-cost reachable frontier.
  for (const frontier of frontiers) {
    const route = findPath(robot.position, frontier, map)

    if (route && route.cost < bestCost) {
      bestPath = route.path
      bestCost = route.cost
    }
  }

  if (!bestPath) {
    robot.path = []

    return {
      status: 'blocked',
      moved: false,
      position: { ...robot.position },
      observationsAdded: robot.observations - observationsBefore,
      frontiersRemaining: frontiers.length,
      message: 'No reachable frontier can be reached using known roads.',
    }
  }

  robot.path = bestPath.map((point) => ({ ...point }))

  // The first path point is the current position.
  const nextPosition = bestPath[1]

  if (nextPosition && !samePoint(nextPosition, robot.position)) {
    robot.position = { ...nextPosition }
  }

  // The sensor reveals additional information from the new position.
  observeNearby(robot, groundTruth, tick)

  const updatedFrontiers = findFrontiers(robot)

  return {
    status: updatedFrontiers.length > 0 ? 'exploring' : 'complete',
    moved: nextPosition !== undefined,
    position: { ...robot.position },
    observationsAdded: robot.observations - observationsBefore,
    frontiersRemaining: updatedFrontiers.length,
    message: nextPosition
      ? `Robot moved to (${robot.position.x}, ${robot.position.y}) and updated its observations.`
      : 'Robot remains at its current position.',
  }
}


/**
 * Mission-aware exploration uses only explicitly supplied map metadata
 * (building/access-road locations), the robot's belief map, and known-road
 * route costs. It never reads building occupant counts or hidden ground truth
 * to choose a frontier.
 */
export function stepMissionAwareExploration(
  robot: RobotState,
  groundTruth: Cell[][],
  tick: number,
  knownTargets: Array<{ position: Point; accessRoad: Point }>,
): ExplorationStepResult {
  const observationsBefore = robot.observations
  observeNearby(robot, groundTruth, tick)

  const frontiers = findFrontiers(robot)
  if (frontiers.length === 0) {
    robot.path = []
    return {
      status: 'complete',
      moved: false,
      position: { ...robot.position },
      observationsAdded: robot.observations - observationsBefore,
      frontiersRemaining: 0,
      message: 'No reachable frontier remains in the observed map.',
    }
  }

  const map = createBeliefNavigationMap(robot)
  let bestPath: Point[] | null = null
  let bestScore = -Infinity

  for (const frontier of frontiers) {
    const route = findPath(robot.position, frontier, map)
    if (!route) continue

    const unknownNeighbors = [
      { x: frontier.x, y: frontier.y - 1 },
      { x: frontier.x + 1, y: frontier.y },
      { x: frontier.x, y: frontier.y + 1 },
      { x: frontier.x - 1, y: frontier.y },
    ].filter((point) => {
      const cell = robot.belief[point.y]?.[point.x]
      return Boolean(cell && !cell.observed)
    }).length

    // Locations are prior map metadata; occupancy and unobserved conditions
    // are intentionally excluded from the score.
    const targetRelevance = knownTargets.reduce((sum, target) => {
      const distance =
        Math.abs(frontier.x - target.accessRoad.x) +
        Math.abs(frontier.y - target.accessRoad.y)
      return sum + 1 / (distance + 1)
    }, 0)

    const score =
      (unknownNeighbors * 2 + targetRelevance * 3) / (route.cost + 1)

    if (score > bestScore) {
      bestScore = score
      bestPath = route.path
    }
  }

  if (!bestPath) {
    robot.path = []
    return {
      status: 'blocked',
      moved: false,
      position: { ...robot.position },
      observationsAdded: robot.observations - observationsBefore,
      frontiersRemaining: frontiers.length,
      message: 'No reachable frontier can be reached using known roads.',
    }
  }

  robot.path = bestPath.map((point) => ({ ...point }))
  const nextPosition = bestPath[1]
  if (nextPosition && !samePoint(nextPosition, robot.position)) {
    robot.position = { ...nextPosition }
  }

  observeNearby(robot, groundTruth, tick)
  const updatedFrontiers = findFrontiers(robot)

  return {
    status: updatedFrontiers.length > 0 ? 'exploring' : 'complete',
    moved: nextPosition !== undefined,
    position: { ...robot.position },
    observationsAdded: robot.observations - observationsBefore,
    frontiersRemaining: updatedFrontiers.length,
    message: nextPosition
      ? `Mission-aware scout moved to (${robot.position.x}, ${robot.position.y}) to gather useful route information.`
      : 'Robot remains at its current position.',
  }
}
