/** Levels of setZoom, from the smallest to the largest zoom: every zoom stays between them */
export const ZOOM_LEVELS = [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8] as const

/** Index of the zoom 1 in ZOOM_LEVELS */
export const ZOOM_LEVEL_DEFAULT = 4

export const ZOOM_BG_COLOR = '#f5f5f5'

export const ZOOM_DETECTION_OFFSET = 30

export const IOS_TRACKPAD_PINCH_FACTOR = 5
