import type { ShapeType } from '@canvas/types/Shapes'

/**
 * Forms of a message by plural category, chosen by Intl.PluralRules from its {count} parameter in the language of the
 * locale: 'other' is the form used when the category has none
 */
export type PluralMessage = { [K in Intl.LDMLPluralRule]?: string } & { other: string }

/**
 * A text of a locale. Its {name} parameters are replaced by their values, the numbers being written in the language of the
 * locale. A plural message gives a form for each count
 */
export type Message = string | PluralMessage

/** Names of the keys, as the shortcuts and the instructions write them */
export type KeyNames = {
  ctrl: string
  shift: string
  alt: string
  delete: string
  backspace: string
  escape: string
  enter: string
  tab: string
  space: string
  /** The four arrows of the keyboard together */
  arrows: string
}

/** Texts of the canvas: what the assistive technologies read, the hint of the keyboard and the content of a new text */
export type CanvasMessages = {
  /** Name of the canvas */
  canvas: string
  /** What the canvas is, read instead of its role */
  roleDescription: string
  /**
   * Keys of the canvas, read when it takes the focus. Its parameters are the shortcuts of CANVAS_SHORTCUTS by their name, like
   * {enter} or {duplicate}, and the keys {arrows} and {shift}
   */
  instructions: string
  /** Shown over the canvas when it takes the focus from the keyboard, after the key moving the focus onto the shapes */
  keyboardHint: string
  /** Name of the box editing a text */
  textBox: string
  /** Name of the list of the shapes of the drawing */
  shapesList: string
  /** A shape with a name: {type} and {name} */
  namedShape: Message
  /** A text: {label}, its type or namedShape, and {text}, its content */
  textShape: Message
  /** A selected shape: {label}, its description */
  selectedShape: Message
  /** Content of a new text */
  defaultText: string
  /** Name of a shape by type, numbered by the editor when it has no name */
  shapeTypes: Record<ShapeType, string>
  keys: KeyNames
}

/** Language of the texts of the canvas, and its texts */
export type CanvasLocale = {
  /** Language of the texts, a BCP 47 tag like 'en' or 'fr-CA': it sets the lang attribute, the plurals and the numbers */
  lang: string
  canvas: CanvasMessages
}

/**
 * Some texts of a locale, given to replace the ones it is merged into: a message is given whole, a plural message with all
 * its forms
 */
export type PartialLocale<T> = {
  [K in keyof T]?: (T[K] extends Message ? T[K] : PartialLocale<T[K]>) | undefined
}

/** The texts of the canvas in English, its only language: the other ones are given by the consumers */
export const DEFAULT_CANVAS_LOCALE: CanvasLocale = {
  lang: 'en',
  canvas: {
    canvas: 'Drawing',
    roleDescription: 'drawing area',
    instructions:
      '{enter}: go through the shapes with {nextShape} and {previousShape}, then open a group or edit a text. With a drawing tool, {enter} adds a shape at the center of the view. ' +
      '{arrows}: move the selection, with {shift} to go further, or move the view without a selection. {remove}: remove. ' +
      '{duplicate}: duplicate. {forward} and {backward}: bring forward and send backward, with {shift} to the front and to the back. ' +
      '{escape}: go up to the group, then leave the shapes. {contextMenu}: context menu.',
    keyboardHint: 'Move the focus onto the canvas',
    textBox: 'Text',
    shapesList: 'Shapes of the drawing',
    namedShape: '{type} “{name}”',
    textShape: '{label}: {text}',
    selectedShape: '{label}, selected',
    defaultText: 'Text',
    shapeTypes: {
      brush: 'Freehand line',
      line: 'Line',
      polygon: 'Polygon',
      curve: 'Curve',
      rect: 'Rectangle',
      square: 'Square',
      circle: 'Circle',
      ellipse: 'Ellipse',
      picture: 'Picture',
      text: 'Text',
      custom: 'Shape',
      group: 'Group'
    },
    keys: {
      ctrl: 'Ctrl',
      shift: 'Shift',
      alt: 'Alt',
      delete: 'Delete',
      backspace: 'Backspace',
      escape: 'Esc',
      enter: 'Enter',
      tab: 'Tab',
      space: 'Space',
      arrows: 'Arrows'
    }
  }
}
