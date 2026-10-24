
import {
  HEIGHT,
  WIDTH,
  getNeighbors,
  type Cell,
  type Point,
  type RoadStatus,
} from './world'

export type BeliefCell = {
  x: number
  y: number
  observed: boolean
  road: boolean | null
  waterDepth: number | null
  roadStatus: RoadStatus
  lastObservedTick: number | null
}

export type RobotState = {
  id: string
  position: Point
  sensorRadius: number
  belief: BeliefCell[][]
  observations: number
  path: Point[]
}

export type Observation = {
  position: Point
  road: boolean
  waterDepth: number
  roadStatus: RoadStatus
  tick: number
}

export function createBeliefMap(): BeliefCell[][] {
  return Array.from({ length: HEIGHT }, (_, y) =>
    Array.from({ length: WIDTH }, (_, x) => ({
      x,
      y,
      observed: false,
      road: null,
      waterDepth: null,
      roadStatus: 'unknown' as RoadStatus,
      lastObservedTick: null,
    })),
  )
}

export function createRobot(
  start: Point = { x: 10, y: 2 },
  sensorRadius = 2,
): RobotState {
  return {
    id: 'ROB-01',
    position: { ...start },
    sensorRadius,
    belief: createBeliefMap(),
    observations: 0,
    path: [],
  }
}

/**
 * The sensor reads ground truth only for cells within its range.
 * The resulting observations are copied into the belief map.
 *
 * This is a simulated sensor, not a physical sensor driver.
 */
export function observeNearby(
  robot: RobotState,
  groundTruth: Cell[][],
  tick: number,
): Observation[] {
  const observations: Observation[] = []
  const radiusSquared = robot.sensorRadius ** 2

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const dx = x - robot.position.x
      const dy = y - robot.position.y

      if (dx * dx + dy * dy > radiusSquared) continue

      const truth = groundTruth[y]?.[x]
      const belief = robot.belief[y]?.[x]

      if (!truth || !belief) continue

      const observation: Observation = {
        position: { x, y },
        road: truth.road,
        waterDepth: truth.waterDepth,
        roadStatus: truth.road
          ? truth.roadStatus
          : truth.waterDepth > 0
            ? 'caution'
            : 'unknown',
        tick,
      }

      belief.observed = true
      belief.road = observation.road
      belief.waterDepth = observation.waterDepth
      belief.roadStatus = observation.roadStatus
      belief.lastObservedTick = tick

      observations.push(observation)
    }
  }

  robot.observations += observations.length
  return observations
}

/**
 * A cell is a frontier if it is known traversable road and has
 * at least one adjacent cell that has not yet been observed.
 */
export function findFrontiers(robot: RobotState): Point[] {
  const frontiers: Point[] = []

  for (const row of robot.belief) {
    for (const cell of row) {
      if (!cell.observed || cell.road !== true) continue
      if (cell.roadStatus === 'closed') continue

      const neighbors = getNeighbors({ x: cell.x, y: cell.y })
      const bordersUnknown = neighbors.some(
        (point) => !robot.belief[point.y][point.x].observed,
      )

      if (bordersUnknown) {
        frontiers.push({ x: cell.x, y: cell.y })
      }
    }
  }

  return frontiers
}
