import type React from 'react'

/** Outer corner of a thick angle, for each value of the lineJoin setting */
const LINE_JOIN_PATHS: Record<string, string> = {
  round: 'M3 17V6.5A3.5 3.5 0 0 1 6.5 3H17V10H10V17Z',
  bevel: 'M3 17V6.5L6.5 3H17V10H10V17Z',
  miter: 'M3 17V3H17V10H10V17Z'
}

/** Option of the lineJoin setting: a thick angle with its corner */
export const LineJoinOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => {
  return (
    <svg aria-hidden='true'>
      <path d={LINE_JOIN_PATHS[`${children}`]} />
    </svg>
  )
}
