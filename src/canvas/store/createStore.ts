type StoreListener = () => void

type Store<T> = {
  getState: () => T
  /** Replaces the state. Listeners are notified when it changes, once at the end of the outermost batch */
  setState: (updater: T | ((state: T) => T)) => void
  subscribe: (listener: StoreListener) => () => void
  /** Calls onChange with the new and the previous value when the selected value changes, compared with isEqual. Returns the function that unsubscribes it */
  watch: <S>(select: (state: T) => S, onChange: (value: S, previous: S) => void, isEqual?: (a: S, b: S) => boolean) => () => void
  /** Runs the function and notifies the listeners only once at the end, if the state changed */
  batch: <R>(fn: () => R) => R
}

/** Minimal external store, usable with useSyncExternalStore. It knows nothing about React */
export const createStore = <T>(initialState: T): Store<T> => {
  let state = initialState
  let listeners: StoreListener[] = []
  let batchDepth = 0
  let hasPendingChange = false

  const notify = () => {
    if (batchDepth > 0) {
      hasPendingChange = true
      return
    }
    // listeners is replaced, never mutated: (un)subscribing during the loop does not affect it
    for (const listener of listeners) listener()
  }

  const subscribe: Store<T>['subscribe'] = listener => {
    listeners = [...listeners, listener]
    return () => {
      const index = listeners.indexOf(listener)
      if (index !== -1) listeners = [...listeners.slice(0, index), ...listeners.slice(index + 1)]
    }
  }

  return {
    getState: () => state,
    setState: updater => {
      const nextState = typeof updater === 'function' ? (updater as (state: T) => T)(state) : updater
      if (Object.is(nextState, state)) return
      state = nextState
      notify()
    },
    subscribe,
    watch: (select, onChange, isEqual = Object.is) => {
      let lastValue = select(state)
      return subscribe(() => {
        const value = select(state)
        if (isEqual(lastValue, value)) return
        const previous = lastValue
        lastValue = value
        onChange(value, previous)
      })
    },
    batch: fn => {
      batchDepth++
      try {
        return fn()
      } finally {
        batchDepth--
        if (batchDepth === 0 && hasPendingChange) {
          hasPendingChange = false
          notify()
        }
      }
    }
  }
}
