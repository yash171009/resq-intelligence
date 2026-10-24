
import { BUILDINGS } from './world'
import type { Cell } from './world'
import { createFloodScenario, updateFlood, FLOOD_SCENARIOS } from './flood'
import type { FloodScenarioConfig, FloodSummary } from './flood'
import { createRobot, observeNearby } from './robot'
import type { RobotState } from './robot'
import { stepExploration, stepMissionAwareExploration } from './exploration'
import {
  assignNextMission,
  discoverMissions,
  updateMissionStatus,
} from './missions'
import type { RescueMission } from './missions'
import {
  advanceRescueTeam,
  createRescueTeam,
  planRescueRoute,
} from './rescueTeam'
import type { RescueTeamState } from './rescueTeam'

export type SimulationStrategy = 'explore' | 'mission-aware' | 'stationary'

export type SimulationEvent = {
  tick: number
  message: string
}

export type SimulationState = {
  tick: number
  strategy: SimulationStrategy
  floodScenario: FloodScenarioConfig
  world: Cell[][]
  robot: RobotState
  rescueTeam: RescueTeamState
  missions: RescueMission[]
  flood: FloodSummary
  events: SimulationEvent[]
  explorationStatus: 'exploring' | 'complete' | 'blocked'
}

function countObservedCells(robot: RobotState): number {
  return robot.belief.reduce(
    (total, row) =>
      total + row.filter((cell) => cell.observed).length,
    0,
  )
}

export function getCoveragePercent(robot: RobotState): number {
  const totalCells = robot.belief.length * (robot.belief[0]?.length ?? 0)
  if (totalCells === 0) return 0

  return Math.round((countObservedCells(robot) / totalCells) * 100)
}

function addEvent(
  events: SimulationEvent[],
  tick: number,
  message: string,
): SimulationEvent[] {
  // A blocked route is an ongoing condition, not a new event every tick.
  // Log the first occurrence per mission; the planner can still retry on later ticks.
  if (
    message.includes('currently blocked by unknown or impassable roads') &&
    events.some((event) => event.message === message)
  ) {
    return events
  }
  return [...events, { tick, message }].slice(-100)
}

export function createSimulation(
  strategy: SimulationStrategy = 'explore',
  floodScenario: FloodScenarioConfig = FLOOD_SCENARIOS[0],
): SimulationState {
  const scenario = createFloodScenario(0, floodScenario)
  const robot = createRobot({ x: 10, y: 2 }, 2)
  const rescueTeam = createRescueTeam({ x: 10, y: 7 })

  observeNearby(robot, scenario.world, 0)

  return {
    tick: 0,
    strategy,
    floodScenario,
    world: scenario.world,
    robot,
    rescueTeam,
    missions: [],
    flood: scenario.summary,
    events: [
      {
        tick: 0,
        message: `Simulation started using the ${strategy} strategy.`,
      },
      {
        tick: 0,
        message: 'Robot sensors initialized; map knowledge is partial.',
      },
    ],
    explorationStatus: 'exploring',
  }
}

/**
 * Advances the entire simulation by one tick.
 * Ground truth is updated first; the robot only learns what its sensors observe.
 */
export function advanceSimulation(
  state: SimulationState,
): SimulationState {
  const nextTick = state.tick + 1
  let events = [...state.events]

  // 1. Advance flood conditions in the hidden ground-truth world.
  const flood = updateFlood(state.world, nextTick, state.floodScenario)

  if (flood.closedRoads > state.flood.closedRoads) {
    events = addEvent(
      events,
      nextTick,
      `Flooding closed ${flood.closedRoads - state.flood.closedRoads} additional road cell(s).`,
    )
  }

  // 2. Update the robot's local observations and, if enabled, explore.
  let robot = state.robot
  let explorationStatus = state.explorationStatus

  if (state.strategy === 'explore' || state.strategy === 'mission-aware') {
    const result =
      state.strategy === 'mission-aware'
        ? stepMissionAwareExploration(
            robot,
            state.world,
            nextTick,
            BUILDINGS.map(({ position, accessRoad }) => ({ position, accessRoad })),
          )
        : stepExploration(robot, state.world, nextTick)
    explorationStatus = result.status

    if (result.moved) {
      events = addEvent(events, nextTick, result.message)
    }

    if (result.status === 'complete') {
      events = addEvent(
        events,
        nextTick,
        'Robot reports no reachable frontiers remaining.',
      )
    }
  } else {
    observeNearby(robot, state.world, nextTick)
  }

  // 3. Discover tasks only from the robot's current observations.
  const discovery = discoverMissions(
    BUILDINGS,
    robot,
    state.missions,
    nextTick,
  )
  let missions = discovery.missions

  if (discovery.created > 0) {
    events = addEvent(events, nextTick, discovery.message)
  }

  // 4. Assign a mission when the rescue unit is available.
  let rescueTeam = state.rescueTeam

  const activeMission = missions.find(
    (mission) =>
      mission.id === rescueTeam.activeMissionId &&
      mission.status !== 'completed',
  )

  if (!activeMission && rescueTeam.status !== 'en_route') {
    rescueTeam = {
      ...rescueTeam,
      activeMissionId: null,
      path: [],
      status: 'idle',
    }
    missions = assignNextMission(missions, rescueTeam.id)
  }

  const assignedMission = missions.find(
    (mission) =>
      mission.assignedTo === rescueTeam.id &&
      (mission.status === 'assigned' ||
        mission.status === 'in_progress'),
  )

  if (
    assignedMission &&
    rescueTeam.status !== 'arrived'
  ) {
    const planned = planRescueRoute(
      rescueTeam,
      assignedMission,
      robot,
    )

    rescueTeam = planned

    if (planned.status === 'blocked') {
      events = addEvent(
        events,
        nextTick,
        `Rescue route to ${assignedMission.buildingName} is currently blocked by unknown or impassable roads.`,
      )
    } else {
      if (assignedMission.status === 'assigned') {
        missions = updateMissionStatus(
          missions,
          assignedMission.id,
          'in_progress',
          nextTick,
        )
        events = addEvent(
          events,
          nextTick,
          `Rescue team dispatched to ${assignedMission.buildingName}.`,
        )
      }

      if (planned.status === 'en_route') {
        rescueTeam = advanceRescueTeam(rescueTeam)
      }

      if (rescueTeam.status === 'arrived') {
        events = addEvent(
          events,
          nextTick,
          `Rescue team reached the access road for ${assignedMission.buildingName}. Evacuation has not yet been simulated.`,
        )
      }
    }
  } else if (
    assignedMission &&
    rescueTeam.status === 'arrived'
  ) {
    // Arrival is not the same as evacuation. Keep the mission in progress.
    // A later phase will simulate evacuation and completion.
  }

  return {
    ...state,
    tick: nextTick,
    world: state.world,
    robot,
    rescueTeam,
    missions,
    flood,
    events,
    explorationStatus,
  }
}
