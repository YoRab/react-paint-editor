import type React from 'react'

/** Option of the closedPoints setting: 0 or 1 */
export const ClosedPointsOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => {
  return <span>{children === 0 ? 'Non' : 'Oui'}</span>
}
