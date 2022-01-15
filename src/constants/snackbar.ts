export enum SnackbarTypeEnum {
  Infos,
  Warning,
  Error,
  Success
}

export const SNACKBAR_DEFAULT_SETTINGS = {
  type: SnackbarTypeEnum.Infos,
  duration: 4000
}

export const SNACKBAR_ANIMATION_DUURATION = 400
