import type React from 'react'

/** End of a thick line, for each value of the lineCap setting */
const LINE_CAP_PATHS: Record<string, string> = {
  round: 'M3 6.5H12A3.5 3.5 0 0 1 12 13.5H3Z',
  butt: 'M3 6.5H12V13.5H3Z',
  square: 'M3 6.5H15.5V13.5H3Z'
}

/** Option of the lineCap setting: a thick line with its end, and a mark at the last point of the line */
export const LineCapOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => {
  return (
    <svg aria-hidden='true'>
      <path d={LINE_CAP_PATHS[`${children}`]} />
      <path d='M11.5 2.5H12.5V17.5H11.5Z' opacity='0.5' />
    </svg>
  )
}
