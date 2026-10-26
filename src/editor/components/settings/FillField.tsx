import { FILL_SQUARE_PATH, GRADIENT_BANDS, GRADIENT_OPACITIES, HATCH_PATH } from '@editor/constants/icons'
import type React from 'react'

/** Lines of each pattern of the fillPattern setting inside a square, the solid one being filled */
const FILL_PATTERNS: Record<string, React.ReactNode> = {
  solid: <path d={FILL_SQUARE_PATH} fill='currentColor' />,
  hatch: <path d={HATCH_PATH} />,
  crossHatch: <path d={`${HATCH_PATH}M3 10 10 17M3 3 17 17M10 3 17 10`} />,
  dots: (
    <path d='M6.5 6.5h0M10 6.5h0M13.5 6.5h0M6.5 10h0M10 10h0M13.5 10h0M6.5 13.5h0M10 13.5h0M13.5 13.5h0' strokeWidth='2.5' strokeLinecap='round' />
  )
}

/** Option of the fillPattern setting: a square filled with the pattern */
export const FillPatternOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => (
  <svg aria-hidden='true'>
    <g fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinejoin='round'>
      {FILL_PATTERNS[`${children}`]}
      <path d={FILL_SQUARE_PATH} />
    </g>
  </svg>
)

/** Quarters of a circle, from the start of a conic gradient */
const CONIC_QUARTERS = ['M10 10H17A7 7 0 0 1 10 17Z', 'M10 10V17A7 7 0 0 1 3 10Z', 'M10 10H3A7 7 0 0 1 10 3Z', 'M10 10V3A7 7 0 0 1 17 10Z']

/** Bands of each gradient of the fillGradient setting, the solid fill without gradient */
const FILL_GRADIENTS: Record<string, React.ReactNode> = {
  none: <path d={FILL_SQUARE_PATH} />,
  linear: GRADIENT_BANDS.map(({ opacity, path }) => <path key={path} opacity={opacity} d={path} />),
  // the circles darken each other towards the center
  radial: [7, 5, 3, 1.5].map((radius, index) => <circle key={radius} cx='10' cy='10' r={radius} opacity={GRADIENT_OPACITIES[3 - index]} />),
  conic: CONIC_QUARTERS.map((path, index) => <path key={path} opacity={GRADIENT_OPACITIES[index]} d={path} />)
}

/** Option of the fillGradient setting: bands of the gradient from the color to a lighter one */
export const FillGradientOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => (
  <svg aria-hidden='true'>
    <g fill='currentColor'>{FILL_GRADIENTS[`${children}`]}</g>
  </svg>
)
