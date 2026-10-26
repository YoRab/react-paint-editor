import { TEXT_ALIGN_PATHS } from '@editor/constants/icons'
import type React from 'react'

/** Option of the textAlign setting: a paragraph with its lines aligned */
export const TextAlignOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => {
  return (
    <svg aria-hidden='true'>
      <path d={TEXT_ALIGN_PATHS[`${children}`]} />
    </svg>
  )
}
