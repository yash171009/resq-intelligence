
import {
  advanceSimulation,
  createSimulation,
  getCoveragePercent,
} from './engine'
import type { SimulationStrategy } from './engine'
import { FLOOD_SCENARIOS } from './flood'
import type { FloodScenarioConfig } from './flood'

export type StrategyComparisonRow = {
  scenarioId: string
  scenarioLabel: string
  strategy: SimulationStrategy
  label: string
  ticksRun: number
  coveragePercent: number
  missionsDiscovered: number
  rescueArrived: boolean
  arrivalTick: number | null
  rescueDistance: number
  blockedRouteEvents: number
  uniqueBlockedMissions: number
  finalWaterLevel: number
  wetCells: number
  cautionRoads: number
  closedRoads: number
}

const STRATEGIES: Array<{
  strategy: SimulationStrategy
  label: string
}> = [
  { strategy: 'stationary', label: 'Stationary baseline' },
  { strategy: 'explore', label: 'Nearest frontier' },
  { strategy: 'mission-aware', label: 'Mission-aware' },
]

function runOneScenario(
  tickBudget: number,
  floodScenario: FloodScenarioConfig,
): StrategyComparisonRow[] {
  return STRATEGIES.map(({ strategy, label }) => {
    let state = createSimulation(strategy, floodScenario)
    let arrivalTick: number | null = null

    for (let i = 0; i < tickBudget; i += 1) {
      state = advanceSimulation(state)

      if (
        arrivalTick === null &&
        state.rescueTeam.status === 'arrived'
      ) {
        arrivalTick = state.tick
      }
    }

    const blockedMessages = state.events
      .filter((event) =>
        event.message.includes(
          'currently blocked by unknown or impassable roads',
        ),
      )

    const blockedMissionNames = new Set(
      blockedMessages
        .map(
          (event) =>
            event.message.match(
              /^Rescue route to (.+) is currently blocked/,
            )?.[1],
        )
        .filter((name): name is string => Boolean(name)),
    )

    return {
      scenarioId: floodScenario.id,
      scenarioLabel: floodScenario.label,
      strategy,
      label,
      ticksRun: state.tick,
      coveragePercent: getCoveragePercent(state.robot),
      missionsDiscovered: state.missions.length,
      rescueArrived: arrivalTick !== null,
      arrivalTick,
      rescueDistance: state.rescueTeam.distanceTravelled,
      blockedRouteEvents: blockedMessages.length,
      uniqueBlockedMissions: blockedMissionNames.size,
      finalWaterLevel: state.flood.waterLevel,
      wetCells: state.flood.wetCells,
      cautionRoads: state.flood.cautionRoads,
      closedRoads: state.flood.closedRoads,
    }
  })
}

/** Deterministic comparison for one flood scenario. */
export function runStrategyComparison(
  tickBudget = 30,
  floodScenario: FloodScenarioConfig = FLOOD_SCENARIOS[0],
): StrategyComparisonRow[] {
  const safeTickBudget = Math.max(1, Math.floor(tickBudget))
  return runOneScenario(safeTickBudget, floodScenario)
}

/**
 * Compares three strategies across multiple synthetic flood profiles.
 * Each strategy within a scenario starts from a fresh world and receives
 * the same tick budget. Results are simulated, not real-world forecasts.
 */
export function runMultiScenarioComparison(
  tickBudget = 30,
): StrategyComparisonRow[] {
  const safeTickBudget = Math.max(1, Math.floor(tickBudget))

  return FLOOD_SCENARIOS.flatMap((scenario) =>
    runOneScenario(safeTickBudget, scenario),
  )
}
