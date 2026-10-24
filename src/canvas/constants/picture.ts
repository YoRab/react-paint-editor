export const PICTURE_DEFAULT_SIZE = 300

/** Delay after which the loading of a picture fails, in milliseconds */
export const PICTURE_LOAD_TIMEOUT = 4000

/** Largest width or height of the image of a picture, in pixels: the usual limit of a canvas, where it is drawn and encoded */
export const PICTURE_MAX_SIZE = 16384

/** Types of the image files accepted as a picture: the file input of the editor (MenuGroup) lists the same ones */
export const PICTURE_MIME_TYPES = ['image/png', 'image/gif', 'image/jpeg', 'image/svg+xml', 'image/webp']

/** Gap between the pictures added together by a drop, in the units of the drawing */
export const PICTURE_DROP_GAP = 20
