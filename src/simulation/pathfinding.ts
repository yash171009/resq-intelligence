
import {
  getNeighbors,
  type Point,
  type RoadStatus,
} from './world'
import type { BeliefCell, RobotState } from './robot'

export type RouteResult = {
  path: Point[]
  cost: number
}

export type NavigationMap = {
  isRoad: (point: Point) => boolean
  getRoadStatus: (point: Point) => RoadStatus
}

function pointKey(point: Point): string {
  return `${point.x},${point.y}`
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y
}

function heuristic(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function movementCost(status: RoadStatus, unknownCost: number): number {
  switch (status) {
    case 'open':
      return 1
    case 'caution':
      return 3
    case 'unknown':
      return unknownCost
    case 'closed':
      return Infinity
  }
}

/**
 * A* search over four-direction grid movement.
 * The returned path includes the start and goal positions.
 */
export function findPath(
  start: Point,
  goal: Point,
  map: NavigationMap,
  unknownCost = 5,
): RouteResult | null {
  if (samePoint(start, goal)) {
    return { path: [{ ...start }], cost: 0 }
  }

  if (!map.isRoad(goal) || map.getRoadStatus(goal) === 'closed') {
    return null
  }

  const open = new Map<string, Point>()
  const cameFrom = new Map<string, string>()
  const gScore = new Map<string, number>()

  open.set(pointKey(start), start)
  gScore.set(pointKey(start), 0)

  while (open.size > 0) {
    let current: Point | undefined
    let bestScore = Infinity

    for (const candidate of open.values()) {
      const score =
        (gScore.get(pointKey(candidate)) ?? Infinity) +
        heuristic(candidate, goal)

      if (score < bestScore) {
        bestScore = score
        current = candidate
      }
    }

    if (!current) break

    const currentKey = pointKey(current)
    open.delete(currentKey)

    if (samePoint(current, goal)) {
      const path: Point[] = [goal]
      let key = currentKey

      while (cameFrom.has(key)) {
        key = cameFrom.get(key)!
        const [x, y] = key.split(',').map(Number)
        path.unshift({ x, y })
      }

      return { path, cost: gScore.get(currentKey) ?? Infinity }
    }

    for (const neighbor of getNeighbors(current)) {
      if (!map.isRoad(neighbor)) continue

      const status = map.getRoadStatus(neighbor)
      const stepCost = movementCost(status, unknownCost)

      if (!Number.isFinite(stepCost)) continue

      const neighborKey = pointKey(neighbor)
      const tentative = (gScore.get(currentKey) ?? Infinity) + stepCost

      if (tentative >= (gScore.get(neighborKey) ?? Infinity)) continue

      cameFrom.set(neighborKey, currentKey)
      gScore.set(neighborKey, tentative)
      open.set(neighborKey, neighbor)
    }
  }

  return null
}

export function createBeliefNavigationMap(
  robot: RobotState,
): NavigationMap {
  return {
    isRoad(point) {
      const cell = robot.belief[point.y]?.[point.x]
      return cell?.observed === true && cell.road === true
    },
    getRoadStatus(point) {
      const cell = robot.belief[point.y]?.[point.x]
      return cell?.observed ? cell.roadStatus : 'unknown'
    },
  }
}

export function createTruthNavigationMap(
  roadAt: (point: Point) => boolean,
  statusAt: (point: Point) => RoadStatus,
): NavigationMap {
  return {
    isRoad: roadAt,
    getRoadStatus: statusAt,
  }
}

/**
 * Find the closest reachable frontier by route cost.
 * Only known, traversable roads are used for robot movement.
 */
export function findNearestReachableFrontier(
  robot: RobotState,
): RouteResult | null {
  const map = createBeliefNavigationMap(robot)
  const frontiers = findReachableFrontiers(robot)

  let best: RouteResult | null = null

  for (const frontier of frontiers) {
    const route = findPath(robot.position, frontier, map)

    if (route && (!best || route.cost < best.cost)) {
      best = route
    }
  }

  return best
}

function findReachableFrontiers(robot: RobotState): Point[] {
  const frontiers: Point[] = []
  const seen = new Set<string>()
  const queue: Point[] = [robot.position]
  let head = 0

  while (head < queue.length) {
    const current = queue[head++]
    const key = pointKey(current)

    if (seen.has(key)) continue
    seen.add(key)

    const neighbors = getNeighbors(current)

    for (const next of neighbors) {
      const cell: BeliefCell | undefined = robot.belief[next.y]?.[next.x]

      if (!cell) continue

      if (
        cell.observed &&
        cell.road === true &&
        cell.roadStatus !== 'closed' &&
        !seen.has(pointKey(next))
      ) {
        queue.push(next)
      }
    }

    const currentCell = robot.belief[current.y]?.[current.x]

    if (
      currentCell?.observed &&
      currentCell.road === true &&
      currentCell.roadStatus !== 'closed' &&
      neighbors.some((next) => !robot.belief[next.y][next.x].observed)
    ) {
      frontiers.push(current)
    }
  }

  return frontiers
}
