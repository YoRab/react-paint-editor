export type RecursivePartial<T> = {
    // eslint-disable-next-line @typescript-eslint/ban-types
    [P in keyof T]?: T[P] extends (infer U)[] ?  RecursivePartial<U>[]: T[P] extends object ? RecursivePartial<T[P]> : T[P]
  }