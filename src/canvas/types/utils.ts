/** Partial at all depths, inside the optional fields too, like the optional settings of a tool */
export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartialValue<NonNullable<T[P]>> | Extract<T[P], undefined>
}

type RecursivePartialValue<V> = V extends (infer U)[]
  ? RecursivePartial<U>[]
  : V extends (...args: never[]) => unknown
    ? V | undefined
    : V extends object
      ? RecursivePartial<V>
      : V | undefined

export type ValueOf<T> = T[keyof T]
