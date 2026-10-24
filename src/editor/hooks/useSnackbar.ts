import { SNACKBAR_DEFAULT_SETTINGS } from '@editor/constants/snackbar'
import type { SnackBarType, SnackbarTypeType } from '@editor/types/snackbar'
import { uniqueId } from '@editor/utils/util'
import { useCallback, useEffect, useRef, useState } from 'react'

const useSnackbar = () => {
  const timers = useRef<NodeJS.Timeout[]>([])
  const [snackbarList, setSnackbarList] = useState<SnackBarType[]>([])

  const removeSnackbar = useCallback((id: string) => {
    setSnackbarList(prev => prev.filter(snackbar => snackbar.id !== id))
  }, [])

  // stable, so that the callbacks and the effects using it are not rebuilt at each render
  const addSnackbar = useCallback(
    ({
      type = SNACKBAR_DEFAULT_SETTINGS.type,
      duration = SNACKBAR_DEFAULT_SETTINGS.duration,
      text
    }: {
      type?: SnackbarTypeType
      duration?: number
      text: string
    }) => {
      const newSnackbar = {
        id: uniqueId('snackbar_'),
        duration,
        type,
        text
      }
      setSnackbarList(prev => [...prev, newSnackbar])
      const timerId = setTimeout(() => {
        removeSnackbar(newSnackbar.id)
        timers.current = timers.current.filter(t => t !== timerId)
      }, duration)
      timers.current = [...timers.current, timerId]
    },
    [removeSnackbar]
  )

  useEffect(() => {
    return () => {
      for (const timer of timers.current) {
        clearTimeout(timer)
      }
    }
  }, [])

  return { snackbarList, addSnackbar }
}

export default useSnackbar
