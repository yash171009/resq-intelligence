
import {
  HEIGHT,
  WIDTH,
  createWorld,
  getNeighbors,
  type Cell,
  type Point,
} from './world'

export type SurgeEvent = {
  tick: number
  riseMeters: number
  label: string
}

export type FloodScenarioConfig = {
  id: string
  label: string
  baseWaterLevel: number
  risingRatePerTick: number
  surgeEvents: SurgeEvent[]
}

export const FLOOD_SCENARIOS: FloodScenarioConfig[] = [
  { id: 'baseline', label: 'Baseline flood', baseWaterLevel: 0.8, risingRatePerTick: 0.01, surgeEvents: [
    { tick: 5, riseMeters: 0.4, label: 'First flood surge' },
    { tick: 12, riseMeters: 0.4, label: 'Second flood surge' },
  ] },
  { id: 'early-surge', label: 'Early surge', baseWaterLevel: 0.8, risingRatePerTick: 0.01, surgeEvents: [
    { tick: 3, riseMeters: 0.4, label: 'Early first surge' },
    { tick: 8, riseMeters: 0.4, label: 'Early second surge' },
  ] },
  { id: 'severe', label: 'Higher water level', baseWaterLevel: 0.95, risingRatePerTick: 0.012, surgeEvents: [
    { tick: 4, riseMeters: 0.55, label: 'Severe first surge' },
    { tick: 10, riseMeters: 0.55, label: 'Severe second surge' },
  ] },
]

export type FloodSummary = {
  tick: number
  waterLevel: number
  wetCells: number
  cautionRoads: number
  closedRoads: number
}

export const SURGE_EVENTS: SurgeEvent[] = [
  { tick: 5, riseMeters: 0.4, label: 'First flood surge' },
  { tick: 12, riseMeters: 0.4, label: 'Second flood surge' },
]

export const CAUTION_DEPTH = 0.1
export const CLOSED_DEPTH = 0.25

/**
 * Calculate the water level for a simulation tick.
 * This is a simplified, synthetic flood-stage model,
 * not a hydrodynamic prediction.
 */
export function getWaterLevel(
  tick: number,
  config: FloodScenarioConfig = FLOOD_SCENARIOS[0],
): number {
  const elapsedTicks = Math.max(0, Math.floor(tick))

  const surgeRise = config.surgeEvents
    .filter((event) => elapsedTicks >= event.tick)
    .reduce((total, event) => total + event.riseMeters, 0)

  return config.baseWaterLevel
    + config.risingRatePerTick * elapsedTicks
    + surgeRise
}

/**
 * Find flood-connected cells using four-direction connectivity.
 *
 * The river is the source. Floodwater can spread from it into
 * neighboring cells whose elevation is below the current level.
 */
export function findFloodedCells(
  world: Cell[][],
  waterLevel: number,
): Set<string> {
  const flooded = new Set<string>()
  const queue: Point[] = []

  for (const row of world) {
    for (const cell of row) {
      if (cell.river) {
        const key = `${cell.x},${cell.y}`

        if (!flooded.has(key)) {
          flooded.add(key)
          queue.push({ x: cell.x, y: cell.y })
        }
      }
    }
  }

  let head = 0

  while (head < queue.length) {
    const current = queue[head++]

    for (const next of getNeighbors(current)) {
      const key = `${next.x},${next.y}`

      if (flooded.has(key)) continue

      const cell = world[next.y]?.[next.x]
      if (!cell) continue

      if (cell.elevation < waterLevel) {
        flooded.add(key)
        queue.push(next)
      }
    }
  }

  return flooded
}

/**
 * Update the hidden, ground-truth world for a given tick.
 * This function must not be used to update the robot's belief map.
 */
export function updateFlood(
  world: Cell[][],
  tick: number,
  config: FloodScenarioConfig = FLOOD_SCENARIOS[0],
): FloodSummary {
  const waterLevel = getWaterLevel(tick, config)
  const flooded = findFloodedCells(world, waterLevel)

  let wetCells = 0
  let cautionRoads = 0
  let closedRoads = 0

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const cell = world[y]?.[x]
      if (!cell) continue

      const isFlooded = flooded.has(`${x},${y}`)

      cell.waterDepth = isFlooded
        ? Math.max(0, waterLevel - cell.elevation)
        : 0

      if (cell.waterDepth > 0) wetCells++

      if (!cell.road) {
        cell.roadStatus = 'unknown'
        continue
      }

      if (cell.waterDepth < CAUTION_DEPTH) {
        cell.roadStatus = 'open'
      } else if (cell.waterDepth <= CLOSED_DEPTH) {
        cell.roadStatus = 'caution'
        cautionRoads++
      } else {
        cell.roadStatus = 'closed'
        closedRoads++
      }
    }
  }

  return {
    tick,
    waterLevel: Number(waterLevel.toFixed(2)),
    wetCells,
    cautionRoads,
    closedRoads,
  }
}

/**
 * Create a fresh world and initialize its flood state.
 * Useful for reproducible simulations and comparison runs.
 */
export function createFloodScenario(
  tick = 0,
  config: FloodScenarioConfig = FLOOD_SCENARIOS[0],
): {
  world: Cell[][]
  summary: FloodSummary
} {
  const world = createWorld()
  const summary = updateFlood(world, tick, config)

  return { world, summary }
}
