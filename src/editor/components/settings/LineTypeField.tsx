import type React from 'react'
import './LineTypeField.css'

/** Option of the lineDash setting: a line with its dashes */
export const LineTypeOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => {
  return (
    <span className='react-paint-editor-linetype-option' data-type={children}>
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </span>
  )
}
