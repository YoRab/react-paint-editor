import type { UtilsSettings } from '@canvas/constants/app'
import { PICTURE_DEFAULT_SIZE } from '@canvas/constants/picture'
import { boundVectorToSingleAxis, fitContentInsideContainer, roundForGrid, roundRotationForGrid } from '@canvas/utils/transform'
import { degreesToRadians, radiansToDegrees } from '@canvas/utils/trigo'
import { describe, expect, it } from 'vitest'

const ROTATION_STEP = Math.PI / 18

describe('roundRotationForGrid', () => {
  const withoutGrid = { gridGap: 0 } as UtilsSettings

  it('keeps a free rotation without the grid and Shift, to a thousandth of a radian', () => {
    expect(roundRotationForGrid(0.2, withoutGrid, false)).toBe(0.2)
    expect(roundRotationForGrid(0.12345, withoutGrid, false)).toBe(0.123)
  })

  it('turns by steps of 10° with Shift or the grid', () => {
    expect(roundRotationForGrid(0.2, withoutGrid, true)).toBeCloseTo(ROTATION_STEP)
    expect(roundRotationForGrid(0.3, withoutGrid, true)).toBeCloseTo(2 * ROTATION_STEP)
    expect(roundRotationForGrid(0.3, { gridGap: 20 } as UtilsSettings, false)).toBeCloseTo(2 * ROTATION_STEP)
  })

  it('turns a negative rotation to its closest step, like a positive one', () => {
    const snap = (degrees: number) => radiansToDegrees(roundRotationForGrid(degreesToRadians(degrees), withoutGrid, true))
    expect(snap(-3)).toBeCloseTo(0)
    expect(snap(-8)).toBeCloseTo(-10)
    expect(snap(-12)).toBeCloseTo(-10)
    expect(snap(-17)).toBeCloseTo(-20)
    expect(snap(-22)).toBeCloseTo(-20)
    expect(snap(-178)).toBeCloseTo(-180)
    // the steps are the same on both sides of 0
    for (const degrees of [3, 8, 12, 17, 22, 95, 173, 178, 352]) expect(snap(-degrees)).toBeCloseTo(-snap(degrees))
  })
})

describe('roundForGrid', () => {
  const grid = { gridGap: 20 } as UtilsSettings

  it('rounds to 2 decimals without the grid', () => {
    expect(roundForGrid(12.3456, { gridGap: 0 } as UtilsSettings)).toBe(12.35)
  })

  it('goes to the closest line of the grid, the half of a gap going away from 0', () => {
    expect(roundForGrid(9, grid)).toBe(0)
    expect(roundForGrid(10, grid)).toBe(20)
    expect(roundForGrid(29, grid)).toBe(20)
    expect(roundForGrid(31, grid)).toBe(40)
  })

  it('goes to the closest line of the grid for a negative value', () => {
    expect(roundForGrid(-9, grid)).toBe(0)
    expect(roundForGrid(-11, grid)).toBe(-20)
    expect(roundForGrid(-31, grid)).toBe(-40)
  })

  it('follows a grid shifted by an offset', () => {
    // the lines are at -5, 15, 35...
    expect(roundForGrid(13, grid, 5)).toBe(15)
    expect(roundForGrid(24, grid, 5)).toBe(15)
    expect(roundForGrid(26, grid, 5)).toBe(35)
  })
})

describe('boundVectorToSingleAxis', () => {
  it('keeps only the main axis of a move with Shift', () => {
    expect(boundVectorToSingleAxis([30, -10], true)).toEqual([30, 0])
    expect(boundVectorToSingleAxis([5, -10], true)).toEqual([0, -10])
    expect(boundVectorToSingleAxis([5, -10], false)).toEqual([5, -10])
  })
})

describe('fitContentInsideContainer', () => {
  it('reduces a content larger than its container, keeping its ratio', () => {
    expect(fitContentInsideContainer(400, 100, 200, 200)).toEqual([200, 50])
    expect(fitContentInsideContainer(100, 400, 200, 200)).toEqual([50, 200])
  })

  it('enlarges a smaller content only when it must fill the container', () => {
    expect(fitContentInsideContainer(100, 25, 200, 200)).toEqual([100, 25])
    expect(fitContentInsideContainer(100, 25, 200, 200, true)).toEqual([200, 50])
    expect(fitContentInsideContainer(25, 100, 200, 200, true)).toEqual([50, 200])
  })

  it('gives the default size of a picture to a content without size', () => {
    expect(fitContentInsideContainer(0, 100, 200, 200)).toEqual([PICTURE_DEFAULT_SIZE, PICTURE_DEFAULT_SIZE])
  })
})
