import type { ReactElement } from 'react'

/** Partial at all depths, inside the optional fields too, like the optional settings of a tool */
export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartialValue<NonNullable<T[P]>> | Extract<T[P], null | undefined>
}

// a React element, like the icon of a tool, is given whole
type RecursivePartialValue<V> = V extends (infer U)[]
  ? RecursivePartial<U>[]
  : V extends ((...args: never[]) => unknown) | ReactElement
    ? V | undefined
    : V extends object
      ? RecursivePartial<V>
      : V | undefined

export type ValueOf<T> = T[keyof T]
