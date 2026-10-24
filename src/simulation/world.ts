
export type Point = {
  x: number
  y: number
}

export type RoadStatus = 'open' | 'caution' | 'closed' | 'unknown'

export type Cell = {
  x: number
  y: number
  road: boolean
  river: boolean
  elevation: number
  waterDepth: number
  roadStatus: RoadStatus
}

export type Building = {
  id: string
  name: string
  position: Point
  accessRoad: Point
  occupants: number
  kind: 'residential' | 'hospital' | 'shelter' | 'depot'
}

export const WIDTH = 20
export const HEIGHT = 14

const ROAD_LAYOUT = [
  '..........#.........',
  '.....###########....',
  '~~~.......#.........',
  '~~~.......#.........',
  '~~~.##############..',
  '~~~.#.....#......#..',
  '~~~.#.....#......#..',
  '~~~.#.....#......#..',
  '~~~.#.....#......#..',
  '~~~.##############..',
  '~~~.......#.........',
  '~~~.......#.........',
  '..........#.........',
  '..........#.........',
]

export const BUILDINGS: Building[] = [
  { id: 'BLD-01', name: 'Riverside apartments', position: { x: 3, y: 5 }, accessRoad: { x: 4, y: 5 }, occupants: 24, kind: 'residential' },
  { id: 'BLD-02', name: 'Riverside homes', position: { x: 3, y: 6 }, accessRoad: { x: 4, y: 6 }, occupants: 18, kind: 'residential' },
  { id: 'BLD-03', name: 'Central housing', position: { x: 8, y: 3 }, accessRoad: { x: 8, y: 4 }, occupants: 32, kind: 'residential' },
  { id: 'BLD-04', name: 'East housing', position: { x: 13, y: 3 }, accessRoad: { x: 13, y: 4 }, occupants: 20, kind: 'residential' },
  { id: 'BLD-05', name: 'South housing', position: { x: 7, y: 8 }, accessRoad: { x: 7, y: 9 }, occupants: 26, kind: 'residential' },
  { id: 'BLD-06', name: 'Southeast housing', position: { x: 14, y: 8 }, accessRoad: { x: 14, y: 9 }, occupants: 16, kind: 'residential' },
  { id: 'FAC-01', name: 'District hospital', position: { x: 13, y: 2 }, accessRoad: { x: 13, y: 1 }, occupants: 0, kind: 'hospital' },
  { id: 'SHEL-01', name: 'Emergency shelter', position: { x: 16, y: 8 }, accessRoad: { x: 16, y: 9 }, occupants: 0, kind: 'shelter' },
  { id: 'SUP-01', name: 'Supply depot', position: { x: 15, y: 2 }, accessRoad: { x: 15, y: 1 }, occupants: 0, kind: 'depot' },
]

function getElevation(x: number, y: number): number {
  if (x <= 2 && y >= 2 && y <= 11) return 0.2
  if (x === 3 && y >= 2 && y <= 7) return 0.75
  if (y <= 1) return 2.8
  if (y >= 12) return 2.5
  if (y >= 8 && y <= 11) return 1.8 + 0.1 * (y - 8)

  if (y >= 2 && y <= 7 && x >= 4 && x <= 9) {
    let elevation = 1.1 + 0.1 * (x - 4)

    if (y === 3 && x >= 4 && x <= 7) elevation = 0.85
    if (y === 4 && x === 7) elevation = 0.9
    if (y === 4 && x >= 4 && x <= 6) elevation = 1.4
    if (y >= 4 && y <= 9 && x === 4) elevation = 1.4
    if (y === 4 && (x === 8 || x === 9)) elevation = 1.5
    if (x === 8 && y === 3) elevation = 1.6

    return elevation
  }

  if (x === 10 && y >= 2 && y <= 7) return 2.2
  if ((y === 4 && x >= 11 && x <= 17) || (x === 17 && y >= 4 && y <= 9)) return 1.9

  return 1.8
}

export function createWorld(): Cell[][] {
  return ROAD_LAYOUT.map((row, y) =>
    [...row].map((char, x) => {
      const road = char === '#'
      const river = char === '~'

      return {
        x,
        y,
        road,
        river,
        elevation: getElevation(x, y),
        waterDepth: 0,
        roadStatus: road ? 'open' : 'unknown',
      }
    }),
  )
}

export function getNeighbors(point: Point): Point[] {
  return [
    { x: point.x, y: point.y - 1 },
    { x: point.x + 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x - 1, y: point.y },
  ].filter(
    (p) => p.x >= 0 && p.x < WIDTH && p.y >= 0 && p.y < HEIGHT,
  )
}
