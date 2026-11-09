import useEditorLocale from '@editor/hooks/useEditorLocale'
import type React from 'react'

/** Option of the closedPoints setting: 0 or 1 */
export const ClosedPointsOption: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => {
  const { no, yes } = useEditorLocale().editor.settings.closedPoints
  return <span>{children === 0 ? no : yes}</span>
}
