import { SNACKBAR_DEFAULT_SETTINGS, SNACKBAR_ERROR_DURATION } from '@editor/constants/snackbar'
import type { SnackBarType, SnackbarTypeType } from '@editor/types/snackbar'
import { uniqueId } from '@editor/utils/util'
import { useCallback, useState } from 'react'

/** The messages shown by the editor: each message removes itself at the end of its duration, see Snackbar */
const useSnackbar = () => {
  const [snackbarList, setSnackbarList] = useState<SnackBarType[]>([])

  const removeSnackbar = useCallback((id: string) => {
    setSnackbarList(prev => prev.filter(snackbar => snackbar.id !== id))
  }, [])

  // stable, so that the callbacks and the effects using it are not rebuilt at each render
  const addSnackbar = useCallback(
    ({ type = SNACKBAR_DEFAULT_SETTINGS.type, duration, text }: { type?: SnackbarTypeType; duration?: number; text: string }) => {
      const newSnackbar = {
        id: uniqueId('snackbar_'),
        // an error stays longer, to be read
        duration: duration ?? (type === 'error' ? SNACKBAR_ERROR_DURATION : SNACKBAR_DEFAULT_SETTINGS.duration),
        type,
        text
      }
      setSnackbarList(prev => [...prev, newSnackbar])
    },
    []
  )

  return { snackbarList, addSnackbar, removeSnackbar }
}

export default useSnackbar
