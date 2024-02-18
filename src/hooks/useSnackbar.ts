import { SNACKBAR_DEFAULT_SETTINGS } from '../constants/snackbar'
import { useEffect, useRef, useState } from 'react'
import type { SnackBarType, SnackbarTypeType } from '../types/snackbar'
import { uniqueId } from '../utils/util'

const useSnackbar = () => {
	const timers = useRef<NodeJS.Timeout[]>([])
	const [snackbarList, setSnackbarList] = useState<SnackBarType[]>([])

	const removeSnackbar = (id: string) => {
		setSnackbarList(prev => prev.filter(snackbar => snackbar.id !== id))
	}

	const addSnackbar = ({
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
