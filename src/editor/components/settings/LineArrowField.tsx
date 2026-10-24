import type React from 'react'
import './LineArrowField.css'

/** Option of the lineArrow setting: a line with its arrows */
export const LineArrowOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => {
  return (
    <span className='react-paint-editor-linearrow-option' data-type={children}>
      <span className='react-paint-editor-linearrow-left' />
      <span className='react-paint-editor-linearrow-right' />
    </span>
  )
}
