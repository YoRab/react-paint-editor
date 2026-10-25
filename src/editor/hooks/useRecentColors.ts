import { useCallback, useState } from 'react'

/** Number of custom colors kept by the color fields */
const RECENT_COLORS_COUNT = 8

/** The custom colors chosen or picked last, newest first, kept for the lifetime of the editor */
const useRecentColors = () => {
  const [recentColors, setRecentColors] = useState<string[]>([])
  const addRecentColor = useCallback(
    (color: string) => setRecentColors(previous => [color, ...previous.filter(recent => recent !== color)].slice(0, RECENT_COLORS_COUNT)),
    []
  )
  return { recentColors, addRecentColor }
}

export default useRecentColors
