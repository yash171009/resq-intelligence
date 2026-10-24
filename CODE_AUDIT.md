# ResQ Intelligence code audit

## Fixes applied in this pass

1. **CSV export omitted flood-environment metrics.** The experiment rows already included final water level, wet cells, caution roads, and closed roads, but the dashboard's CSV export did not include them. The export and comparison table now include all four fields.
2. **Evaluation test structure was confusing/nested incorrectly.** The multi-scenario `describe` block was not closed before the flood validation block. The test file has been reorganized into separate, readable suites while retaining the existing checks.
3. **CSV download cleanup could happen too early.** Object URL revocation is now deferred briefly after triggering the download.
4. **Metric labels are clearer.** Blocked-route counts are labelled as distinct reports because the engine intentionally suppresses duplicate blocked-route log messages for the same mission.

## Confirmed from source inspection

- The engine passes `state.floodScenario` into `updateFlood()` each tick. It does not silently revert to the baseline scenario in the current uploaded source.
- The evaluation runs all three strategies against each configured flood scenario, with a fresh simulation and the same tick budget for each strategy within a scenario.
- Mission-aware exploration uses building/access-road coordinates as prior map metadata and does not use hidden occupant counts in its frontier score.
- The robot's route planner uses its belief map; the flood model maintains the separate ground-truth world.

## Remaining limitations (not hidden or claimed as fixed)

- Flooding is a synthetic grid model, not a hydrodynamic or real-world flood forecast.
- The sensor is simulated and has perfect local readings within its radius; real sensor noise, communication loss, and sensor failures are not modelled.
- Building locations are supplied as prior scenario metadata. Occupant counts remain unknown to missions because no trusted report feed exists.
- Mission priority is an illustrative heuristic, not a validated emergency triage score.
- Rescue arrival means reaching an access road. Occupant search, pickup, evacuation, and mission completion are not simulated.
- The stationary strategy still observes within its sensor radius; it is a no-movement baseline, not a no-sensor/no-information baseline.
- The blocked-route event history is capped at 100 entries, so metrics derived from that event list should be interpreted as retained distinct reports, not a complete lifetime counter.
- Scenario variations are deterministic profiles, not probabilistic forecasts. Baseline and early-surge profiles have equal total surge rises and can have the same final water level while differing at intermediate ticks.

## Verification status

Source files were inspected and updated. A clean dependency installation timed out in this execution environment, and offline installation was unavailable because required packages were not cached. Therefore, tests and production build are **not claimed as run or passed in this environment**. Run `npm ci`, `npm test`, `npm run build`, and `npm run lint` locally before presenting a new build.
