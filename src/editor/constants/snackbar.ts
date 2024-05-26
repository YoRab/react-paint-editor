import type { SnackbarTypeType } from '@editor/types/snackbar'

export const SNACKBAR_DEFAULT_SETTINGS: {
	type: SnackbarTypeType
	duration: number
} = {
	type: 'infos',
	duration: 4000
}

export const SNACKBAR_DURATION = 500
export const SNACKBAR_TOGGLE_ANIMATION_DURATION = 100
