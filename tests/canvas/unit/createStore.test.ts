import { createStore } from '@canvas/store/createStore'
import { describe, expect, it, vi } from 'vitest'

describe('createStore', () => {
  it('notifies the listeners when the state changes', () => {
    const store = createStore({ count: 0 })
    const listener = vi.fn()
    store.subscribe(listener)

    store.setState(state => ({ count: state.count + 1 }))
    expect(store.getState()).toEqual({ count: 1 })
    expect(listener).toHaveBeenCalledTimes(1)

    store.setState({ count: 5 })
    expect(store.getState()).toEqual({ count: 5 })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('does not notify when the updater returns the same state', () => {
    const store = createStore({ count: 0 })
    const listener = vi.fn()
    store.subscribe(listener)

    store.setState(state => state)
    expect(listener).not.toHaveBeenCalled()
  })

  it('notifies once at the end of a batch', () => {
    const store = createStore({ count: 0 })
    const listener = vi.fn(() => store.getState().count)
    store.subscribe(listener)

    const result = store.batch(() => {
      store.setState(state => ({ count: state.count + 1 }))
      store.batch(() => store.setState(state => ({ count: state.count + 1 })))
      store.setState(state => ({ count: state.count + 1 }))
      expect(listener).not.toHaveBeenCalled()
      return 'done'
    })

    expect(result).toBe('done')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveReturnedWith(3)
  })

  it('does not notify after a batch without change', () => {
    const store = createStore({ count: 0 })
    const listener = vi.fn()
    store.subscribe(listener)

    store.batch(() => store.setState(state => state))
    expect(listener).not.toHaveBeenCalled()
  })

  it('notifies even when the batch throws', () => {
    const store = createStore({ count: 0 })
    const listener = vi.fn()
    store.subscribe(listener)

    expect(() =>
      store.batch(() => {
        store.setState({ count: 1 })
        throw new Error('failure')
      })
    ).toThrow('failure')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('stops notifying an unsubscribed listener', () => {
    const store = createStore({ count: 0 })
    const listener = vi.fn()
    const otherListener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.subscribe(otherListener)

    unsubscribe()
    unsubscribe()
    store.setState({ count: 1 })
    expect(listener).not.toHaveBeenCalled()
    expect(otherListener).toHaveBeenCalledTimes(1)
  })

  it('watches a part of the state', () => {
    const store = createStore({ count: 0, other: 0 })
    const onChange = vi.fn()
    const unwatch = store.watch(state => state.count, onChange)

    store.setState(state => ({ ...state, other: 1 }))
    expect(onChange).not.toHaveBeenCalled()
    store.setState(state => ({ ...state, count: 1 }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(1, 0)

    unwatch()
    store.setState(state => ({ ...state, count: 2 }))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('compares the watched values with the equality function', () => {
    const store = createStore({ a: 0, b: 0 })
    const onChange = vi.fn()
    store.watch(
      state => [state.a, state.b],
      onChange,
      (x, y) => x[0] === y[0] && x[1] === y[1]
    )

    store.setState(state => ({ ...state }))
    expect(onChange).not.toHaveBeenCalled()
    store.setState(state => ({ ...state, b: 1 }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith([0, 1], [0, 0])
  })

  it('keeps notifying the current listeners when one unsubscribes another during the notification', () => {
    const store = createStore({ count: 0 })
    const calls: string[] = []
    let unsubscribeSecond = () => {}
    store.subscribe(() => {
      calls.push('first')
      unsubscribeSecond()
    })
    unsubscribeSecond = store.subscribe(() => calls.push('second'))

    store.setState({ count: 1 })
    store.setState({ count: 2 })
    expect(calls).toEqual(['first', 'second', 'first'])
  })
})
