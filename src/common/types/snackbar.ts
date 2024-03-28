export type SnackbarTypeType = 'infos' | 'error' | 'success'

export type SnackBarType = {
	id: string
	type: SnackbarTypeType
	text: string
	duration: number
}
