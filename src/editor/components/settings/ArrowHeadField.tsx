import type React from 'react'

const TRIANGLE = 'M16 10 8 6V14Z'
const DIAMOND = 'M16 10 12 6 8 10 12 14Z'

/**
 * Each head of the arrowStart and arrowEnd settings, with its tip at the end of the line, on the right, and where the line
 * stops under it, like on the canvas
 */
const ARROW_HEADS: Record<string, { head: React.ReactNode; lineEnd: number }> = {
  triangle: { head: <path d={TRIANGLE} fill='currentColor' />, lineEnd: 8 },
  triangleOutline: { head: <path d={TRIANGLE} />, lineEnd: 8 },
  open: { head: <path d='M8 6 16 10 8 14' />, lineEnd: 16 },
  circle: { head: <circle cx='16' cy='10' r='3' fill='currentColor' />, lineEnd: 13 },
  circleOutline: { head: <circle cx='16' cy='10' r='3' />, lineEnd: 13 },
  diamond: { head: <path d={DIAMOND} fill='currentColor' />, lineEnd: 8 },
  diamondOutline: { head: <path d={DIAMOND} />, lineEnd: 8 },
  bar: { head: <path d='M16 6V14' />, lineEnd: 16 }
}

const ArrowHeadOption = ({ head, mirrored }: { head: string; mirrored: boolean }) => (
  <svg aria-hidden='true'>
    <g fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinejoin='round' transform={mirrored ? 'matrix(-1 0 0 1 20 0)' : undefined}>
      <path d={`M2 10H${ARROW_HEADS[head]?.lineEnd ?? 16}`} />
      {ARROW_HEADS[head]?.head}
    </g>
  </svg>
)

/** Option of the arrowStart setting: a line with its head on the left */
export const ArrowStartOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => <ArrowHeadOption head={`${children}`} mirrored />

/** Option of the arrowEnd setting: a line with its head on the right */
export const ArrowEndOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => <ArrowHeadOption head={`${children}`} mirrored={false} />
