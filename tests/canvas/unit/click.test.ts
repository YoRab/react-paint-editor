import { CLICK_MAX_DURATION_MS, createClickTracker, DOUBLE_CLICK_DELAY_MS, DOUBLE_TAP_MAX_DISTANCE } from '@canvas/utils/click'
import { describe, expect, it } from 'vitest'

/** A press at a time and a place of the screen, released after its duration, moved by moveBy pixels */
type Press = { at: number; x?: number; moveBy?: number; duration?: number; pointerType?: string; button?: number }

const pointer = (timeStamp: number, clientX: number, pointerType: string, button: number) =>
  ({ pointerId: 1, button, pointerType, clientX, clientY: 100, timeStamp }) as PointerEvent

/** What each release ends */
const play = (presses: Press[]) => {
  const clicks = createClickTracker()
  return presses.map(({ at, x = 100, moveBy = 0, duration = 50, pointerType = 'mouse', button = 0 }) => {
    clicks.press(pointer(at, x, pointerType, button))
    return clicks.release(pointer(at + duration, x + moveBy, pointerType, button))
  })
}

describe('createClickTracker', () => {
  it('tells a double click from a second click at the same place, soon after the first one', () => {
    expect(play([{ at: 0 }, { at: 200 }])).toEqual(['click', 'doubleClick'])
    // the releases are DOUBLE_CLICK_DELAY_MS apart
    expect(play([{ at: 0 }, { at: DOUBLE_CLICK_DELAY_MS }])).toEqual(['click', 'click'])
  })

  it('starts a new double click with a third click', () => {
    expect(play([{ at: 0 }, { at: 150 }, { at: 300 }, { at: 450 }])).toEqual(['click', 'doubleClick', 'click', 'doubleClick'])
  })

  it('takes neither the end of a drag nor a long press for a click, and starts a new double click after them', () => {
    expect(play([{ at: 0, moveBy: 10 }, { at: 100 }])).toEqual([undefined, 'click'])
    expect(play([{ at: 0, duration: CLICK_MAX_DURATION_MS }, { at: 600 }])).toEqual([undefined, 'click'])
    expect(play([{ at: 0 }, { at: 100, moveBy: 10 }, { at: 200 }])).toEqual(['click', undefined, 'click'])
  })

  it('needs the two clicks of a mouse at the same place, and lets a finger move more between two taps', () => {
    expect(play([{ at: 0 }, { at: 150, x: 110 }])).toEqual(['click', 'click'])
    const tap = { pointerType: 'touch' }
    expect(
      play([
        { at: 0, ...tap },
        { at: 150, x: 110, ...tap }
      ])
    ).toEqual(['click', 'doubleClick'])
    expect(
      play([
        { at: 0, ...tap },
        { at: 150, x: 101 + DOUBLE_TAP_MAX_DISTANCE, ...tap }
      ])
    ).toEqual(['click', 'click'])
  })

  it('ignores the other buttons, and a release of another pointer', () => {
    expect(play([{ at: 0, button: 2 }])).toEqual([undefined])

    const clicks = createClickTracker()
    clicks.press(pointer(0, 100, 'touch', 0))
    expect(clicks.release({ ...pointer(50, 100, 'touch', 0), pointerId: 2 } as PointerEvent)).toBeUndefined()
  })

  it('starts a new double click after a reset', () => {
    const clicks = createClickTracker()
    clicks.press(pointer(0, 100, 'mouse', 0))
    expect(clicks.release(pointer(50, 100, 'mouse', 0))).toBe('click')
    clicks.reset()
    clicks.press(pointer(100, 100, 'mouse', 0))
    expect(clicks.release(pointer(150, 100, 'mouse', 0))).toBe('click')
  })
})
