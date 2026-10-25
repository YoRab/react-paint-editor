import type { Point } from '@canvas/types/Shapes'
import {
  degreesToRadians,
  getAngleFromVector,
  getBoundingRect,
  getCenter,
  getDistanceBetweenPoints,
  getPointsBounds,
  isCircleIntersectRect,
  isPointInsideRect,
  radiansToDegrees,
  rotatePoint,
  sampleSegment
} from '@canvas/utils/trigo'
import { describe, expect, it } from 'vitest'

const expectPointCloseTo = ([x, y]: Point, [expectedX, expectedY]: Point) => {
  expect(x).toBeCloseTo(expectedX)
  expect(y).toBeCloseTo(expectedY)
}

describe('rotatePoint', () => {
  it('turns a point around the origin, a positive angle going from the right to the top of the screen', () => {
    expectPointCloseTo(rotatePoint({ point: [1, 0], rotation: Math.PI / 2 }), [0, -1])
    expectPointCloseTo(rotatePoint({ point: [1, 0], rotation: Math.PI }), [-1, 0])
  })

  it('turns a point around a given origin', () => {
    expectPointCloseTo(rotatePoint({ origin: [10, 10], point: [20, 10], rotation: Math.PI / 2 }), [10, 0])
  })

  it('gives back the point turned by the opposite angle', () => {
    const turned = rotatePoint({ origin: [3, -2], point: [7, 5], rotation: 0.7 })
    expectPointCloseTo(rotatePoint({ origin: [3, -2], point: turned, rotation: -0.7 }), [7, 5])
  })

  it('gives the same point without rotation', () => {
    const point: Point = [7, 5]
    expect(rotatePoint({ point, rotation: 0 })).toBe(point)
    expect(rotatePoint({ point, rotation: undefined })).toBe(point)
  })
})

describe('getAngleFromVector', () => {
  const vector = (from: Point, to: Point): [Point, Point] => [from, to]
  /** Angle of the vector from (0, 0) to a point */
  const angleTo = (to: Point, options: { originVector?: [Point, Point]; radian?: boolean } = {}) =>
    getAngleFromVector({ targetVector: vector([0, 0], to), ...options })

  it('gives the angle of a vector from 0 to 2π, in radians or in degrees', () => {
    expect(angleTo([0, 1])).toBeCloseTo(Math.PI / 2)
    expect(angleTo([-1, 0])).toBeCloseTo(Math.PI)
    expect(angleTo([0, -1])).toBeCloseTo((3 * Math.PI) / 2)
    expect(angleTo([0, -1], { radian: false })).toBeCloseTo(270)
  })

  it('gives the angle from another vector, from 0 to 2π', () => {
    expect(angleTo([0, 1], { originVector: vector([0, 0], [1, 0]) })).toBeCloseTo(Math.PI / 2)
    expect(angleTo([1, 0], { originVector: vector([0, 0], [0, 1]) })).toBeCloseTo((3 * Math.PI) / 2)
    // only the direction of the origin vector counts
    expect(angleTo([1, 0], { originVector: vector([5, 5], [5, 6]), radian: false })).toBeCloseTo(270)
  })
})

describe('bounds', () => {
  it('gives the bounds of the points of several lists', () => {
    expect(
      getPointsBounds([
        [
          [0, 5],
          [10, -5]
        ],
        [[-3, 2]]
      ])
    ).toEqual({ minX: -3, minY: -5, maxX: 10, maxY: 5 })
  })

  it('gives infinite bounds without points', () => {
    const infinite = {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY
    }
    expect(getPointsBounds([])).toEqual(infinite)
    expect(getPointsBounds([[]])).toEqual(infinite)
  })

  it('gives the smallest rectangle containing rectangles', () => {
    expect(
      getBoundingRect([
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: -5, width: 10, height: 10 }
      ])
    ).toEqual({ x: 0, y: -5, width: 30, height: 15 })
  })
})

describe('intersections', () => {
  const rect = { x: 0, y: 0, width: 10, height: 10 }

  it('finds a point inside a rectangle, its sides included', () => {
    expect(isPointInsideRect(rect, [0, 0])).toBe(true)
    expect(isPointInsideRect(rect, [10, 10])).toBe(true)
    expect(isPointInsideRect(rect, [10.01, 5])).toBe(false)
    expect(isPointInsideRect(rect, [5, -0.01])).toBe(false)
  })

  it('finds a circle touching a rectangle by its corner, from the distance of its center to the corner', () => {
    // (13, 14) is 5 from the corner (10, 10)
    expect(isCircleIntersectRect(rect, { x: 13, y: 14, radius: 5 })).toBe(true)
    expect(isCircleIntersectRect(rect, { x: 13, y: 14, radius: 4.9 })).toBe(false)
  })

  it('finds a circle inside a rectangle, or crossing one of its sides', () => {
    expect(isCircleIntersectRect(rect, { x: 5, y: 5, radius: 1 })).toBe(true)
    expect(isCircleIntersectRect(rect, { x: 5, y: 12, radius: 2 })).toBe(true)
    expect(isCircleIntersectRect(rect, { x: 5, y: 12, radius: 1.9 })).toBe(false)
  })
})

describe('measures', () => {
  it('gives the distance and the middle of two points', () => {
    expect(getDistanceBetweenPoints([0, 0], [3, 4])).toBe(5)
    expect(getCenter([0, 0], [10, 20])).toEqual([5, 10])
  })

  it('samples a segment at most a step apart, from the point after its start to its end', () => {
    expect(sampleSegment([0, 0], [10, 0], 3)).toEqual([
      [2.5, 0],
      [5, 0],
      [7.5, 0],
      [10, 0]
    ])
    expect(sampleSegment([0, 0], [0, 8], 4)).toEqual([
      [0, 4],
      [0, 8]
    ])
    // a press without a move tests its point
    expect(sampleSegment([5, 5], [5, 5], 4)).toEqual([[5, 5]])
  })

  it('converts the angles between degrees and radians', () => {
    expect(degreesToRadians(180)).toBe(Math.PI)
    expect(radiansToDegrees(Math.PI / 2)).toBe(90)
  })
})
