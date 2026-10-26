import type React from 'react'
import './FontFamilyField.css'

/** Option of the fontFamily setting: the name of the font, written with it */
export const FontFamilyOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => {
  return (
    <span
      className='react-paint-editor-fontfamily-option'
      style={{
        '--react-paint-editor-fontfamily-family': children as string
      }}
    >
      {children}
    </span>
  )
}
