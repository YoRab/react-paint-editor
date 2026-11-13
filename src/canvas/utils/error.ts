/**
 * What went wrong when a file, a picture or an export failed: an editor tells it to the user in their language. The
 * message of the error, in English, is meant for the developers
 */
export type ReactPaintErrorCode =
  /** The file could not be read */
  | 'fileReadFailed'
  /** The data file is larger than the largest one loadFile reads: details.max, in MB */
  | 'fileTooLarge'
  /** The data file is not JSON */
  | 'fileInvalidJson'
  /**
   * A shape of loaded data cannot be built, like a polygon without its points: details.index, its place in the shapes of
   * the data, the one of its outer group for a shape of a group
   */
  | 'dataInvalid'
  /** The file dropped or pasted is not a picture: details.type */
  | 'fileTypeUnsupported'
  /** The SVG of a picture has no <svg> element */
  | 'pictureInvalidSvg'
  /** The server of a remote picture answered with an error: details.status */
  | 'pictureFetchFailed'
  /** The source of a picture is not an image, a blob, SVG markup or an http(s) URL */
  | 'pictureSourceUnsupported'
  /** The resolvePictureSrc option refused the source of a picture */
  | 'pictureSourceRefused'
  /** The resolvePictureSrc option returned a source which is not an http(s) URL */
  | 'pictureSourceInvalid'
  /** A picture took too long to load */
  | 'pictureTimeout'
  /** A picture is wider or higher than the largest size drawn: details.max, in pixels */
  | 'pictureTooLarge'
  /** The image of a picture could not be loaded */
  | 'pictureLoadFailed'
  /** The fitToShapes view of an export has no shape */
  | 'exportEmpty'
  /** The browser gave no canvas to draw the export in */
  | 'exportContextUnavailable'
  /** The data of the drawing could not be encoded */
  | 'exportEncodingFailed'

/** An error of the canvas that the user may meet, with its code and the values it depends on */
export class ReactPaintError extends Error {
  readonly code: ReactPaintErrorCode
  readonly details: Readonly<Record<string, string | number>>

  constructor(code: ReactPaintErrorCode, message: string, details: Record<string, string | number> = {}, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ReactPaintError'
    this.code = code
    this.details = details
  }
}
