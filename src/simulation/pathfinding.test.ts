
import { describe, expect, it } from 'vitest'
import { findPath, type NavigationMap } from './pathfinding'
import type { Point, RoadStatus } from './world'

function makeMap(roads: Set<string>): NavigationMap {
  return {
    isRoad: (point: Point) => roads.has(`${point.x},${point.y}`),
    getRoadStatus: () => 'open' as RoadStatus,
  }
}

describe('A* pathfinding', () => {
  it('finds a route between connected road cells', () => {
    const map = makeMap(
      new Set(['0,0', '1,0', '2,0', '2,1']),
    )

    const result = findPath(
      { x: 0, y: 0 },
      { x: 2, y: 1 },
      map,
    )

    expect(result).not.toBeNull()
    expect(result!.path[0]).toEqual({ x: 0, y: 0 })
    expect(result!.path.at(-1)).toEqual({ x: 2, y: 1 })
    expect(result!.cost).toBe(3)
  })

  it('returns null if the goal is not a road', () => {
    const map = makeMap(new Set(['0,0', '1,0']))

    expect(
      findPath({ x: 0, y: 0 }, { x: 2, y: 0 }, map),
    ).toBeNull()
  })

  it('returns null when a closed road blocks the goal', () => {
    const map: NavigationMap = {
      isRoad: () => true,
      getRoadStatus: (point) =>
        point.x === 1 && point.y === 0 ? 'closed' : 'open',
    }

    expect(
      findPath({ x: 0, y: 0 }, { x: 1, y: 0 }, map),
    ).toBeNull()
  })

  it('prefers an open route when the alternative is more costly', () => {
    const map: NavigationMap = {
      isRoad: (point) =>
        [
          '0,0', '1,0', '2,0',
          '0,1', '1,1', '2,1',
        ].includes(`${point.x},${point.y}`),
      getRoadStatus: (point) =>
        point.y === 0 && point.x === 1 ? 'caution' : 'open',
    }

    const result = findPath(
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      map,
    )

    expect(result).not.toBeNull()
    expect(result!.cost).toBeLessThan(5)
  })
})
