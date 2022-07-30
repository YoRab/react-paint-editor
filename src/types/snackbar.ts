export type SnackbarTypeType = 'Infos' | 'Error' | 'Success'

export type SnackBarType = {
  id: string
  type: SnackbarTypeType
  text: string
  duration: number
}
