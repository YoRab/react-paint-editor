import type React from 'react'
import './LineTypeField.css'

/** Dashes and gaps of each value of the lineDash setting, in pixels: the patterns of the canvas for a line of 2 pixels */
const LINE_DASHES: Record<string, number[]> = {
  1: [2, 4],
  2: [8, 12],
  3: [16, 12],
  4: [8, 8, 2, 8]
}

/** A solid line, or the dashes of the pattern repeated */
const getLineBackground = (dashes: number[] | undefined) => {
  if (!dashes) return 'currentColor'
  let position = 0
  const stops = dashes.map((length, index) => {
    const stop = `${index % 2 ? 'transparent' : 'currentColor'} ${position}px ${position + length}px`
    position += length
    return stop
  })
  return `repeating-linear-gradient(to right, ${stops.join(', ')})`
}

/** Option of the lineDash setting: a line with its dashes */
export const LineTypeOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => {
  return <span className='react-paint-editor-linetype-option' style={{ background: getLineBackground(LINE_DASHES[`${children}`]) }} />
}
