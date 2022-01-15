import { SnackbarTypeEnum, SNACKBAR_DEFAULT_SETTINGS } from 'constants/snackbar'
import _ from 'lodash/fp'
import { useEffect, useRef, useState } from 'react'

export type SnackBarType = {
  id: string
  type: SnackbarTypeEnum
  text: string
  duration: number
}

const useSnackbar = () => {
  const timers = useRef<NodeJS.Timeout[]>([])
  const [snackbarList, setSnackbarList] = useState<SnackBarType[]>([])

  const removeSnackbar = (id: string) => {
    setSnackbarList(prev => _.remove({ id: id }, prev))
  }

  const addSnackbar = ({
    type = SNACKBAR_DEFAULT_SETTINGS.type,
    duration = SNACKBAR_DEFAULT_SETTINGS.duration,
    text
  }: {
    type?: SnackbarTypeEnum
    duration?: number
    text: string
  }) => {
    const newSnackbar = {
      id: _.uniqueId('snackbar_'),
      duration,
      type,
      text
    }
    setSnackbarList(prev => [...prev, newSnackbar])
    timers.current = [...timers.current, setTimeout(() => removeSnackbar(newSnackbar.id), duration)]
  }

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
