
import { useState } from 'react'
import {
  Activity,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crosshair,
  Droplets,
  MapPin,
  Navigation,
  Play,
  Radio,
  RotateCcw,
  ShieldAlert,
  Siren,
  Users,
  Waves,
  Zap,
  BarChart3,
  FlaskConical,
} from 'lucide-react'
import './App.css'

import { BUILDINGS, WIDTH, HEIGHT } from './simulation/world'
import {
  advanceSimulation,
  createSimulation,
  getCoveragePercent,
} from './simulation/engine'
import type { SimulationState } from './simulation/engine'
import { runMultiScenarioComparison } from './simulation/evaluation'

function StatCard({
  label,
  value,
  detail,
  icon,
  tone = 'blue',
}: {
  label: string
  value: string
  detail: string
  icon: React.ReactNode
  tone?: string
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <strong>{value}</strong>
        <span className="stat-detail">{detail}</span>
      </div>
    </div>
  )
}

function App() {
  const [simulation, setSimulation] = useState<SimulationState>(
    () => createSimulation('explore'),
  )
  const [selectedBuilding, setSelectedBuilding] = useState('BLD-01')
  const [showTruth, setShowTruth] = useState(false)
  const [comparison, setComparison] = useState<ReturnType<typeof runMultiScenarioComparison> | null>(null)

  const exportComparisonCsv = () => {
    if (!comparison) return
    const columns = [
      'Flood scenario',
      'Strategy',
      'Ticks run',
      'Coverage percent',
      'Missions discovered',
      'Reached access road',
      'Arrival tick',
      'Rescue distance cells',
      'Distinct blocked-route reports',
      'Unique blocked missions',
      'Final water level',
      'Wet cells',
      'Caution roads',
      'Closed roads',
    ]
    const rows = comparison.map((row) => [
      row.scenarioLabel,
      row.label,
      row.ticksRun,
      row.coveragePercent,
      row.missionsDiscovered,
      row.rescueArrived ? 'yes' : 'no',
      row.arrivalTick ?? '',
      row.rescueDistance,
      row.blockedRouteEvents,
      row.uniqueBlockedMissions,
      row.finalWaterLevel,
      row.wetCells,
      row.cautionRoads,
      row.closedRoads,
    ])
    const csv = [columns, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `resq-strategy-comparison-${comparisonTicks}-ticks.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const [comparisonTicks, setComparisonTicks] = useState('30')

  const {
    tick,
    world,
    robot,
    rescueTeam,
    missions,
    flood,
    events,
    explorationStatus,
  } = simulation

  const elapsed =
    String(Math.floor(tick / 60)).padStart(2, '0') +
    ':' +
    String(tick % 60).padStart(2, '0')

  const coverage = getCoveragePercent(robot)
  const residentialBuildings = BUILDINGS.filter(
    (building) => building.kind === 'residential',
  )
  const totalOccupants = residentialBuildings.reduce(
    (total, building) => total + building.occupants,
    0,
  )
  const roadCount = world.flat().filter((cell) => cell.road).length
  const affectedRoads = flood.cautionRoads + flood.closedRoads

  const selected =
    residentialBuildings.find((building) => building.id === selectedBuilding) ??
    residentialBuildings[0]

  const selectedMission = missions.find(
    (mission) => mission.buildingId === selected.id,
  )

  function advance() {
    setSimulation((current) => advanceSimulation(current))
  }

  function reset() {
    setSimulation((current) => createSimulation(current.strategy))
    setShowTruth(false)
  }

  // Manual surge activation is not yet implemented in the flood engine.
  // Keep this control honest instead of pretending a surge was applied.
  const nextScheduledSurge = tick < 5 ? 5 : tick < 12 ? 12 : null

  function advanceToSurge() {
    if (nextScheduledSurge === null) return

    setSimulation((current) => {
      let next = current

      while (next.tick < nextScheduledSurge) {
        next = advanceSimulation(next)
      }

      return next
    })
  }

  const robotStatus =
    explorationStatus === 'complete'
      ? 'EXPLORATION COMPLETE'
      : explorationStatus === 'blocked'
        ? 'ROUTE BLOCKED'
        : 'SCOUTING'

  const teamStatus =
    rescueTeam.status === 'en_route'
      ? 'EN ROUTE'
      : rescueTeam.status === 'arrived'
        ? 'AT TARGET'
        : rescueTeam.status === 'blocked'
          ? 'ROUTE BLOCKED'
          : 'STANDBY'

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Siren size={23} />
          </div>
          <div>
            <div className="brand-name">
              RESQ<span>INTELLIGENCE</span>
            </div>
            <div className="brand-subtitle">
              ROBOT-ASSISTED DISASTER RESPONSE
            </div>
          </div>
        </div>

        <div className="incident-chip">
          <span className="live-dot" />
          SIMULATED INCIDENT
          <span className="chip-divider" />
          <span>WARD 07 · FLOOD RESPONSE</span>
        </div>

        <div className="topbar-right">
          <div className="system-status">
            <span /> SYSTEM ONLINE
          </div>
          <div className="avatar">ER</div>
        </div>
      </header>

      <section className="incident-banner">
        <div className="banner-icon">
          <ShieldAlert size={21} />
        </div>
        <div className="banner-copy">
          <strong>Flood emergency — Riverside District</strong>
          <span>
            Synthetic training scenario · Conditions and thresholds are
            illustrative, not operational safety guidance.
          </span>
        </div>
        <div className="banner-meta">
          <span>SEVERITY</span>
          <strong className="severity">HIGH</strong>
        </div>
        <div className="banner-meta">
          <span>SIMULATION TIME</span>
          <strong>{elapsed}</strong>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          label="PEOPLE IN SCENARIO"
          value={String(totalOccupants)}
          detail={`Across ${residentialBuildings.length} residential zones · Evacuation not yet simulated`}
          icon={<Users size={19} />}
          tone="orange"
        />
        <StatCard
          label="ROADS AFFECTED"
          value={`${affectedRoads} / ${roadCount}`}
          detail={`${flood.cautionRoads} caution · ${flood.closedRoads} closed`}
          icon={<Waves size={19} />}
          tone="cyan"
        />
        <StatCard
          label="ROBOT STATUS"
          value={robotStatus}
          detail={`${coverage}% map coverage`}
          icon={<Bot size={19} />}
          tone="violet"
        />
        <StatCard
          label="RESCUE TEAM"
          value={teamStatus}
          detail={`${rescueTeam.distanceTravelled} simulated road cells travelled`}
          icon={<Radio size={19} />}
          tone="green"
        />
      </section>

      <section className="panel comparison-panel">
        <div className="panel-header">
          <div>
            <div className="eyebrow">EXPERIMENT LAB</div>
            <h2>Strategy comparison</h2>
          </div>
          <div className="comparison-actions">
            <label>
              Tick budget
              <select
                value={comparisonTicks}
                onChange={(event) => setComparisonTicks(event.target.value)}
                aria-label="Comparison tick budget"
              >
                <option value="15">15 ticks</option>
                <option value="30">30 ticks</option>
                <option value="45">45 ticks</option>
                <option value="60">60 ticks</option>
              </select>
            </label>
            <button
              className="primary-button"
              onClick={() => setComparison(runMultiScenarioComparison(Number(comparisonTicks)))}
            >
              <FlaskConical size={15} /> Run comparison
            </button>
          </div>
        </div>
        <p className="comparison-intro">
          Each strategy is compared under the same starting conditions within each of three synthetic flood profiles.
          All receive the same tick budget. These are simulation results, not real-world performance claims. Arrival means reaching a targets
          access road; evacuation is not simulated.
        </p>
        {!comparison ? (
          <div className="comparison-empty">
            <BarChart3 size={22} />
            <span>Run the experiment to compare exploration coverage, discovered missions, and rescue-team progress.</span>
          </div>
        ) : (
          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Flood scenario</th>
                  <th>Strategy</th>
                  <th>Coverage</th>
                  <th>Missions found</th>
                  <th>Reached access road</th>
                  <th>Arrival tick</th>
                  <th>Team distance</th>
                  <th>Distinct blocked-route reports</th>
                  <th>Unique blocked missions</th>
                  <th>Water level</th>
                  <th>Wet cells</th>
                  <th>Caution roads</th>
                  <th>Closed roads</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={`${row.scenarioId}-${row.strategy}`}>
                    <td>{row.scenarioLabel}</td>
                    <td><strong>{row.label}</strong></td>
                    <td>
                      <div className="metric-with-bar">
                        <span>{row.coveragePercent}%</span>
                        <i><b style={{ width: `${row.coveragePercent}%` }} /></i>
                      </div>
                    </td>
                    <td>{row.missionsDiscovered}</td>
                    <td>{row.rescueArrived ? 'Yes' : 'Not within budget'}</td>
                    <td>{row.arrivalTick ?? '—'}</td>
                    <td>{row.rescueDistance} cells</td>
                    <td>{row.blockedRouteEvents}</td>
                    <td>{row.uniqueBlockedMissions}</td>
                    <td>{row.finalWaterLevel.toFixed(2)}</td>
                    <td>{row.wetCells}</td>
                    <td>{row.cautionRoads}</td>
                    <td>{row.closedRoads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="comparison-export-row">
              <button className="secondary-button" onClick={exportComparisonCsv}>Export results CSV</button>
              <span>Three synthetic flood profiles × three strategies. Each scenario uses the same tick budget.</span>
            </div>
            <div className="comparison-note">
              <strong>Interpretation:</strong> More coverage or more missions discovered is not automatically better.
              Compare all metrics, and compare results across all three flood profiles before drawing conclusions.
            </div>
          </div>
        )}
      </section>

      <section className="workspace">
        <div className="panel map-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">GEOSPATIAL OPERATIONS</div>
              <h2>Live incident map</h2>
            </div>
            <button
              className={`toggle-button ${showTruth ? 'active' : ''}`}
              onClick={() => setShowTruth((value) => !value)}
            >
              <Crosshair size={15} />
              {showTruth ? 'Ground truth' : 'Robot view'}
            </button>
          </div>

          <div className="map-toolbar">
            <span>
              <span className="map-live" /> MAP{' '}
              {showTruth ? 'GROUND TRUTH' : 'BELIEF VIEW'}
            </span>
            <span>GRID {WIDTH} × {HEIGHT}</span>
            <span>CELL ≈ 20 M</span>
          </div>

          <div className="map-viewport">
            <div
              className="map-grid"
              style={{
                gridTemplateColumns: `repeat(${WIDTH}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: WIDTH * HEIGHT }, (_, index) => {
                const x = index % WIDTH
                const y = Math.floor(index / WIDTH)
                const truthCell = world[y]?.[x]
                const beliefCell = robot.belief[y]?.[x]

                if (!truthCell || !beliefCell) return null

                const observed = beliefCell.observed
                const isUnknown = !showTruth && !observed

                const isRoad = showTruth
                  ? truthCell.road
                  : observed && beliefCell.road === true

                const isWater = showTruth
                  ? truthCell.river || truthCell.waterDepth > 0
                  : observed && (beliefCell.waterDepth ?? 0) > 0

                const status = showTruth
                  ? truthCell.roadStatus
                  : observed
                    ? beliefCell.roadStatus
                    : 'unknown'

                const building = BUILDINGS.find(
                  (item) => item.position.x === x && item.position.y === y,
                )

                const showBuilding =
                  Boolean(building) && (showTruth || observed)

                const isSelectedBuilding =
                  showBuilding && building?.id === selectedBuilding

                const isRobot =
                  robot.position.x === x && robot.position.y === y

                const isTeam =
                  rescueTeam.position.x === x &&
                  rescueTeam.position.y === y

                let cls = 'map-cell '

                if (isUnknown) {
                  cls += 'terrain-cell unexplored '
                } else if (isWater) {
                  cls += 'water-cell '
                } else if (isRoad) {
                  cls += `road-cell ${status} `
                } else {
                  cls += 'terrain-cell '
                }

                return (
                  <button
                    key={`${x}-${y}`}
                    className={`${cls}${
                      isSelectedBuilding ? ' selected-building-cell' : ''
                    }`}
                    title={
                      isUnknown
                        ? `Grid (${x}, ${y}) · Unknown to robot`
                        : `Grid (${x}, ${y})${
                            isRoad ? ` · ${status}` : ''
                          }`
                    }
                    onClick={() => {
                      if (showBuilding && building?.kind === 'residential') {
                        setSelectedBuilding(building.id)
                      }
                    }}
                  >
                    {isWater && <span className="water-wave">≈</span>}

                    {showBuilding && building && (
                      <span
                        className={`building-marker ${
                          isSelectedBuilding ? 'selected-building-marker' : ''
                        }`}
                      >
                        {isSelectedBuilding ? '◆' : '⌂'}
                      </span>
                    )}

                    {isRobot && (
                      <span className="unit-marker robot-marker">
                        <Bot size={13} />
                      </span>
                    )}

                    {isTeam && (
                      <span className="unit-marker team-marker">
                        <Crosshair size={12} />
                      </span>
                    )}

                    {isRoad && status === 'closed' && (
                      <span className="closure-marker">×</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="map-legend">
            <span>
              <i className="legend-dot road-open" /> Open
            </span>
            <span>
              <i className="legend-dot road-caution" /> Caution
            </span>
            <span>
              <i className="legend-dot road-closed" /> Closed
            </span>
            <span>
              <i className="legend-dot water-legend" /> Floodwater
            </span>
            <span>
              <i className="legend-dot building-legend" /> Building
            </span>
            <span>
              <i className="legend-unit" /> Robot
            </span>
          </div>

          <div className="map-footer">
            <div>
              <MapPin size={14} />
              <span>RIVERSIDE DISTRICT</span>
            </div>
            <div>
              <Activity size={14} />
              <span>
                {showTruth
                  ? 'ALL SIMULATED TERRAIN VISIBLE'
                  : 'UNKNOWN TERRAIN PRESERVED'}
              </span>
            </div>
          </div>
        </div>

        <aside className="right-column">
          <section className="panel unit-panel">
            <div className="panel-header compact">
              <div>
                <div className="eyebrow">FIELD UNITS</div>
                <h2>Deployment status</h2>
              </div>
              <span className="count-pill">02 UNITS</span>
            </div>

            <div className="unit-card">
              <div className="unit-icon robot-bg">
                <Bot size={21} />
              </div>
              <div className="unit-details">
                <strong>Recon Rover R-01</strong>
                <span>Autonomous ground robot</span>
                <div className="unit-progress">
                  <i style={{ width: `${coverage}%` }} />
                </div>
                <small>
                  Exploration coverage <b>{coverage}%</b>
                </small>
                <small>
                  Position <b>({robot.position.x}, {robot.position.y})</b>
                </small>
              </div>
              <span className="status-tag status-active">
                {explorationStatus === 'blocked' ? 'BLOCKED' : 'ACTIVE'}
              </span>
            </div>

            <div className="unit-card">
              <div className="unit-icon team-bg">
                <Users size={21} />
              </div>
              <div className="unit-details">
                <strong>Rescue Team T-01</strong>
                <span>Ground evacuation team</span>
                <div className="unit-progress">
                  <i
                    className="team-progress"
                    style={{
                      width: `${Math.min(
                        100,
                        rescueTeam.distanceTravelled * 5,
                      )}%`,
                    }}
                  />
                </div>
                <small>
                  Travel distance <b>{rescueTeam.distanceTravelled} cells</b>
                </small>
                <small>
                  Position{' '}
                  <b>
                    ({rescueTeam.position.x}, {rescueTeam.position.y})
                  </b>
                </small>
              </div>
              <span className="status-tag status-ready">{teamStatus}</span>
            </div>
          </section>

          <section className="panel mission-panel">
            <div className="panel-header compact">
              <div>
                <div className="eyebrow">DECISION SUPPORT</div>
                <h2>Priority missions</h2>
              </div>
              <span className="count-pill orange-pill">
                {String(missions.length).padStart(2, '0')} TASKS
              </span>
            </div>

            <div className="mission-list">
              {missions.length === 0 ? (
                <div className="mission-item">
                  <span className="priority-number priority-medium">—</span>
                  <span className="mission-copy">
                    <strong>No missions discovered yet</strong>
                    <small>
                      The robot must observe a building and its access road. Occupant counts are not provided.
                    </small>
                  </span>
                </div>
              ) : (
                [...missions]
                  .sort((a, b) => b.priority - a.priority)
                  .map((mission, index) => {
                    const building = residentialBuildings.find(
                      (item) => item.id === mission.buildingId,
                    )

                    return (
                      <button
                        key={mission.id}
                        className={`mission-item ${
                          selectedBuilding === mission.buildingId
                            ? 'selected'
                            : ''
                        }`}
                        onClick={() =>
                          setSelectedBuilding(mission.buildingId)
                        }
                      >
                        <span
                          className={`priority-number priority-${
                            index < 2 ? 'high' : index < 4 ? 'medium' : 'low'
                          }`}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="mission-copy">
                          <strong>{mission.buildingName}</strong>
                          <small>
                            {mission.buildingId} · {mission.occupants == null ? 'occupants unknown' : `${mission.occupants} reported occupants`}
                          </small>
                          <small>
                            {mission.status.replace('_', ' ').toUpperCase()}
                          </small>
                        </span>
                        <ChevronRight size={16} />
                        {building && null}
                      </button>
                    )
                  })
              )}
            </div>

            <div className="selected-mission">
              <div className="selected-heading">
                <Building2 size={15} /> SELECTED TARGET
              </div>
              <strong>{selected.name}</strong>
              <div className="selected-details">
                <span>
                  <Users size={14} /> Scenario truth: {selected.occupants} occupants
                </span>
                <span>
                  <MapPin size={14} /> (
                  {selected.position.x}, {selected.position.y})
                </span>
              </div>
              <small>
                {selectedMission
                  ? `Mission status: ${selectedMission.status.replace('_', ' ')}`
                  : 'Mission not yet discovered by the robot.'}
              </small>
            </div>
          </section>

          <section className="panel controls-panel">
            <div className="panel-header compact">
              <div>
                <div className="eyebrow">SIMULATION CONTROL</div>
                <h2>Incident timeline</h2>
              </div>
              <span className="time-pill">
                <Clock3 size={13} /> T+{tick}
              </span>
            </div>

            <div className="control-buttons">
              <label className="strategy-control">
                Strategy
                <select
                  value={simulation.strategy}
                  onChange={(event) => {
                    const strategy = event.target.value as SimulationState['strategy']
                    setSimulation(createSimulation(strategy))
                  }}
                  aria-label="Exploration strategy"
                >
                  <option value="explore">Nearest frontier</option>
                  <option value="mission-aware">Mission-aware</option>
                  <option value="stationary">Stationary baseline</option>
                </select>
              </label>
              <button className="primary-button" onClick={advance}>
                <Play size={15} /> Advance tick
              </button>
              <button
                className="secondary-button"
                onClick={advanceToSurge}
                disabled={nextScheduledSurge === null}
                title={
                  nextScheduledSurge === null
                    ? 'All scheduled surges have occurred'
                    : `Advance the simulation to tick ${nextScheduledSurge}`
                }
              >
                <Zap size={15} />{' '}
                {nextScheduledSurge === null
                  ? 'Surges complete'
                  : `Advance to surge T+${nextScheduledSurge}`}
              </button>
              <button
                className="icon-button"
                title="Reset simulation"
                onClick={reset}
              >
                <RotateCcw size={16} />
              </button>
            </div>

            <div className="event-list">
              {[...events]
                .reverse()
                .slice(0, 6)
                .map((event, index) => (
                  <div
                    className="event-row"
                    key={`${event.tick}-${event.message}-${index}`}
                  >
                    <span className="event-marker event-info" />
                    <span className="event-time">
                      {String(Math.floor(event.tick / 60)).padStart(2, '0')}:
                      {String(event.tick % 60).padStart(2, '0')}
                    </span>
                    <span className="event-message">{event.message}</span>
                  </div>
                ))}
            </div>
          </section>
        </aside>
      </section>

      <footer className="bottom-bar">
        <div>
          <span className="footer-pulse" /> SIMULATION ENGINE <b>CONNECTED</b>
        </div>
        <div>
          <Droplets size={14} /> FLOOD MODEL <b>SYNTHETIC</b>
        </div>
        <div>
          <Navigation size={14} /> PATHFINDING <b>SIMULATED</b>
        </div>
        <div>
          <CheckCircle2 size={14} /> DATA INTEGRITY <b>LOCAL ONLY</b>
        </div>
        <div className="footer-right">
          RESQ INTELLIGENCE <span>v0.1.0</span>
        </div>
      </footer>
    </main>
  )
}

export default App
