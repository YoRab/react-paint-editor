import { type CanvasLocale, DEFAULT_CANVAS_LOCALE, type Message, type ReactPaintErrorCode, type ShapeType } from '@canvas/index'
import type { EditorActionType } from '@editor/types/tools'

/** The fields of the settings bar, named after the settings of the tools */
export type SettingFieldName =
  | 'strokeColor'
  | 'fillColor'
  | 'fillPattern'
  | 'fillGradient'
  | 'fillColor2'
  | 'fillGradientAngle'
  | 'lineWidth'
  | 'lineDash'
  | 'lineJoin'
  | 'lineCap'
  | 'cornerRadius'
  | 'arrowStart'
  | 'arrowEnd'
  | 'arrowSize'
  | 'closedPoints'
  | 'fontFamily'
  | 'fontSize'
  | 'fontBold'
  | 'fontItalic'
  | 'fontUnderline'
  | 'fontStrikethrough'
  | 'textAlign'
  | 'lineHeight'
  | 'outlineColor'
  | 'outlineWidth'
  | 'opacity'

type GridSize = {
  /** Shown in the button */
  letter: string
  name: string
}

/**
 * Texts of the editor. The names of the keys and of the shapes are the ones of the canvas part of the locale. The parameters
 * of a message are told in its comment
 */
export type EditorMessages = {
  /** Names of the tools: the tools of the canvas, and the drawing tools by type. A tool given with a label keeps it */
  tools: Record<'selection' | 'move' | 'eraser' | 'laser' | ShapeType, string>
  /** Buttons of the actions of the editor */
  actions: Record<EditorActionType, string>
  toolbar: {
    /** Groups of tools of the toolbar */
    groups: { brush: string; lines: string; shapes: string; stickers: string }
    /** Button showing the tools in a dialog, on a narrow editor */
    showTools: string
    /** Dialog of the tools */
    tools: string
    menu: string
    pictureFromUrl: string
  }
  pictureUrl: { url: string; add: string }
  export: { title: string; currentZoom: string; defaultView: string; fitToShapes: string }
  properties: { title: string; x: string; y: string; width: string; height: string; rotation: string }
  settings: {
    fields: Record<SettingFieldName, string>
    fillPattern: { solid: string; hatch: string; crossHatch: string; dots: string }
    fillGradient: { none: string; linear: string; radial: string; conic: string }
    lineDash: { solid: string; dotted: string; dashed: string; longDashed: string; dashDotted: string }
    lineJoin: { round: string; bevel: string; miter: string }
    lineCap: { round: string; butt: string; square: string }
    arrowHeads: {
      none: string
      triangle: string
      triangleOutline: string
      open: string
      circle: string
      circleOutline: string
      diamond: string
      diamondOutline: string
      bar: string
    }
    textAlign: { left: string; center: string; right: string }
    closedPoints: { no: string; yes: string }
    /** Names of the colors of the palettes, by value: a color without a name is named after its value */
    colorNames: Record<string, string>
    noColor: string
    customColor: string
    eyedropper: string
    recentColors: string
    moreOptions: string
    /** Button showing the settings in a dialog, on a narrow editor */
    showSettings: string
    /** Dialog of the settings */
    settings: string
    /** Value of a field when the selected shapes have different values */
    differentValues: string
    /** Shown instead of the value when the selected shapes have different values */
    noValue: string
    removeShapes: string
  }
  layers: {
    togglePanel: string
    grid: string
    noGrid: string
    gridSizes: { small: GridSize; medium: GridSize; large: GridSize }
    /** Name of a button of the grid: {letter} and {name} of its size */
    gridSize: Message
    layers: string
    groupShapes: string
    ungroupShapes: string
    empty: string
    layerName: string
    dragHandle: string
    expand: string
    collapse: string
    bringForward: string
    sendBackward: string
    hide: string
    show: string
    lock: string
    unlock: string
    remove: string
    /** Name of a shape without a name: {type}, its tool or its type, and its {number} */
    defaultName: Message
    /** Place of a moved shape: its {name}, its {position} and the {count} of the shapes of the drawing */
    position: Message
    /** Place of a moved shape in its group: its {name}, its {position}, the {count} of the shapes of the {group} */
    positionInGroup: Message
  }
  zoom: {
    togglePanel: string
    zoomIn: string
    zoomOut: string
    reset: string
    minimap: string
    minimapHint: string
  }
  contextMenu: {
    menu: string
    removePoint: string
    organize: string
    bringForward: string
    bringToFront: string
    sendBackward: string
    sendToBack: string
    transform: string
    flipHorizontally: string
    flipVertically: string
    rotateClockwise: string
    rotateCounterclockwise: string
    cut: string
    copy: string
    paste: string
    duplicate: string
    group: string
    ungroup: string
    hide: string
    show: string
    lock: string
    unlock: string
    remove: string
    selectAll: string
    properties: string
  }
  shortcuts: {
    title: string
    sections: { tools: string; edition: string; drawing: string; view: string; keyboard: string }
    /** A line giving several shortcuts names their commands in the order of their keys */
    rows: {
      undo: string
      redo: string
      cutCopyPaste: string
      duplicate: string
      remove: string
      selectAll: string
      addToSelection: string
      groupUngroup: string
      forwardBackward: string
      frontBack: string
      flip: string
      lockHide: string
      moveSelection: string
      escape: string
      contextMenu: string
      keepRatio: string
      resizeFromCenter: string
      endShape: string
      addShape: string
      zoom: string
      fit: string
      pan: string
      browse: string
      openProject: string
      saveProject: string
      exportPicture: string
      help: string
    }
    /** Gestures, with the names of the keys {alt}, {shift}, {space} and {arrows} */
    gestures: {
      altDrag: Message
      shiftClick: Message
      shiftArrows: Message
      spaceDrag: Message
      arrowsWithoutSelection: Message
    }
  }
  /** Read by the assistive technologies when the user changes the drawing */
  announcements: {
    /** The tool chosen: its {name} */
    tool: Message
    noSelection: Message
    /** The shape selected alone: its {name} */
    selection: Message
    /** The {count} of the shapes selected */
    selectionCount: Message
    /** The shape added alone: its {name} */
    added: Message
    addedCount: Message
    /** The shape removed alone: its {name} */
    removed: Message
    removedCount: Message
    /** The zoom: its {value} in percent */
    zoom: Message
  }
  snackbars: {
    exportFailed: string
    saveFailed: string
    loadFailed: string
    fileLoaded: string
    picturesNotLoaded: string
    customShapesNotLoaded: string
  }
  /** What went wrong, told instead of the message of the action when the canvas gives the code of its error */
  errors: Record<ReactPaintErrorCode, Message>
  common: {
    close: string
    cancel: string
    loading: string
    /** Title of a button with a shortcut: its {label} and its {shortcut} */
    shortcutTitle: Message
  }
  /** Names of the files saved, without their extension */
  files: { drawing: string }
}

/** A zoom in whole percent, written in the language of the locale, like 150 % in French */
export const ZOOM_FORMAT: Intl.NumberFormatOptions = { style: 'percent', maximumFractionDigits: 0 }

/** Language and texts of the editor and of its canvas */
export type EditorLocale = CanvasLocale & { editor: EditorMessages }

/** The texts of the editor in English, its only language: the other ones are given by the consumers */
export const DEFAULT_EDITOR_LOCALE: EditorLocale = {
  lang: DEFAULT_CANVAS_LOCALE.lang,
  canvas: DEFAULT_CANVAS_LOCALE.canvas,
  editor: {
    tools: {
      selection: 'Selection',
      move: 'Move',
      eraser: 'Eraser',
      laser: 'Laser pointer',
      brush: 'Brush',
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
    actions: {
      undo: 'Undo',
      redo: 'Redo',
      clear: 'Clear',
      export: 'Export PNG',
      loadfile: 'Load project',
      savefile: 'Save project',
      uploadpicture: 'Upload picture'
    },
    toolbar: {
      groups: { brush: 'Brushes', lines: 'Lines', shapes: 'Shapes', stickers: 'Stickers' },
      showTools: 'Toggle tools',
      tools: 'Tools',
      menu: 'Menu',
      pictureFromUrl: 'Add picture from URL'
    },
    pictureUrl: { url: 'URL', add: 'Add' },
    export: {
      title: 'Choose export settings',
      currentZoom: 'Export the current view',
      defaultView: 'Export the default canvas',
      fitToShapes: 'Export the whole drawing'
    },
    properties: { title: 'Properties', x: 'X', y: 'Y', width: 'Width', height: 'Height', rotation: 'Rotation' },
    settings: {
      fields: {
        strokeColor: 'Stroke color',
        fillColor: 'Fill color',
        fillPattern: 'Fill pattern',
        fillGradient: 'Fill gradient',
        fillColor2: 'Second color of the gradient',
        fillGradientAngle: 'Angle of the gradient',
        lineWidth: 'Stroke width',
        lineDash: 'Stroke type',
        lineJoin: 'Stroke corners',
        lineCap: 'Stroke ends',
        cornerRadius: 'Corner radius',
        arrowStart: 'Arrow at the start',
        arrowEnd: 'Arrow at the end',
        arrowSize: 'Arrow size',
        closedPoints: 'Close the points',
        fontFamily: 'Font',
        fontSize: 'Text size',
        fontBold: 'Bold',
        fontItalic: 'Italic',
        fontUnderline: 'Underline',
        fontStrikethrough: 'Strikethrough',
        textAlign: 'Text alignment',
        lineHeight: 'Line height',
        outlineColor: 'Outline color',
        outlineWidth: 'Outline width',
        opacity: 'Opacity'
      },
      fillPattern: { solid: 'Solid', hatch: 'Hatching', crossHatch: 'Cross hatching', dots: 'Dots' },
      fillGradient: { none: 'None', linear: 'Linear', radial: 'Radial', conic: 'Conic' },
      lineDash: { solid: 'Solid line', dotted: 'Dotted', dashed: 'Dashed', longDashed: 'Long dashes', dashDotted: 'Dashes and dots' },
      lineJoin: { round: 'Round', bevel: 'Beveled', miter: 'Sharp' },
      lineCap: { round: 'Round', butt: 'Flat', square: 'Square' },
      arrowHeads: {
        none: 'None',
        triangle: 'Triangle',
        triangleOutline: 'Empty triangle',
        open: 'Open',
        circle: 'Circle',
        circleOutline: 'Empty circle',
        diamond: 'Diamond',
        diamondOutline: 'Empty diamond',
        bar: 'Bar'
      },
      textAlign: { left: 'Left', center: 'Center', right: 'Right' },
      closedPoints: { no: 'No', yes: 'Yes' },
      colorNames: { black: 'Black', white: 'White', red: 'Red', green: 'Green', blue: 'Blue', yellow: 'Yellow' },
      noColor: 'No color',
      customColor: 'Custom color',
      eyedropper: 'Eyedropper',
      recentColors: 'Recent colors',
      moreOptions: 'More options',
      showSettings: 'Toggle settings',
      settings: 'Settings',
      differentValues: 'Different values',
      noValue: 'N/A',
      removeShapes: 'Delete'
    },
    layers: {
      togglePanel: 'Toggle layers panel',
      grid: 'Grid',
      noGrid: 'No grid',
      gridSizes: {
        small: { letter: 'S', name: 'Small grid' },
        medium: { letter: 'M', name: 'Medium grid' },
        large: { letter: 'L', name: 'Large grid' }
      },
      gridSize: '{letter}, {name}',
      layers: 'Layers',
      groupShapes: 'Group shapes',
      ungroupShapes: 'Ungroup shapes',
      empty: 'No layer yet',
      layerName: 'Layer name',
      dragHandle: 'Drag to reorder',
      expand: 'Expand',
      collapse: 'Collapse',
      bringForward: 'Bring forward',
      sendBackward: 'Send backward',
      hide: 'Hide',
      show: 'Show',
      lock: 'Lock',
      unlock: 'Unlock',
      remove: 'Delete',
      defaultName: '{type} {number}',
      position: '{name}: position {position} of {count}',
      positionInGroup: '{name}: position {position} of {count} in {group}'
    },
    zoom: {
      togglePanel: 'Toggle zoom panel',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      reset: 'Reset zoom',
      minimap: 'Minimap',
      minimapHint: 'The arrows move the view'
    },
    contextMenu: {
      menu: 'Context menu',
      removePoint: 'Delete point',
      organize: 'Organize',
      bringForward: 'Bring forward',
      bringToFront: 'Bring to front',
      sendBackward: 'Send backward',
      sendToBack: 'Send to back',
      transform: 'Transform',
      flipHorizontally: 'Flip horizontally',
      flipVertically: 'Flip vertically',
      rotateClockwise: 'Rotate clockwise',
      rotateCounterclockwise: 'Rotate counterclockwise',
      cut: 'Cut',
      copy: 'Copy',
      paste: 'Paste',
      duplicate: 'Duplicate',
      group: 'Group',
      ungroup: 'Ungroup',
      hide: 'Hide',
      show: 'Show',
      lock: 'Lock',
      unlock: 'Unlock',
      remove: 'Delete',
      selectAll: 'Select all',
      properties: 'Properties'
    },
    shortcuts: {
      title: 'Keyboard shortcuts',
      sections: { tools: 'Tools', edition: 'Edition', drawing: 'Drawing', view: 'View', keyboard: 'Keyboard' },
      rows: {
        undo: 'Undo',
        redo: 'Redo',
        cutCopyPaste: 'Cut, copy, paste',
        duplicate: 'Duplicate',
        remove: 'Delete',
        selectAll: 'Select all',
        addToSelection: 'Add to the selection',
        groupUngroup: 'Group, ungroup',
        forwardBackward: 'Bring forward, send backward',
        frontBack: 'Bring to front, send to back',
        flip: 'Flip horizontally, vertically',
        lockHide: 'Lock, hide',
        moveSelection: 'Move the selection, further',
        escape: 'Cancel a gesture, go up to the group, deselect',
        contextMenu: 'Context menu',
        keepRatio: 'Keep the proportions, snap the angles by 15°',
        resizeFromCenter: 'Resize from the center',
        endShape: 'End a polygon or a curve, remove its last point',
        addShape: 'Add a shape at the center of the view',
        zoom: 'Zoom in, zoom out, 100%',
        fit: 'Show the whole drawing, the selection',
        pan: 'Move the view',
        browse: 'Go through the shapes, open a group, edit a text',
        openProject: 'Open a project',
        saveProject: 'Save the project',
        exportPicture: 'Export a picture',
        help: 'This list'
      },
      gestures: {
        altDrag: '{alt} + drag',
        shiftClick: '{shift} + click',
        shiftArrows: '{shift} + {arrows}',
        spaceDrag: '{space} + drag',
        arrowsWithoutSelection: '{arrows} without a selection'
      }
    },
    announcements: {
      tool: '{name} tool',
      noSelection: 'No shape selected',
      selection: '{name} selected',
      selectionCount: { one: '{count} shape selected', other: '{count} shapes selected' },
      added: '{name} added',
      addedCount: { one: '{count} shape added', other: '{count} shapes added' },
      removed: '{name} removed',
      removedCount: { one: '{count} shape removed', other: '{count} shapes removed' },
      zoom: 'Zoom {value}'
    },
    snackbars: {
      exportFailed: 'The export failed',
      saveFailed: 'The saving failed',
      loadFailed: 'The loading failed',
      fileLoaded: 'File loaded',
      picturesNotLoaded: 'Some pictures could not be loaded',
      customShapesNotLoaded: 'Some custom shapes could not be loaded'
    },
    errors: {
      fileReadFailed: 'The file could not be read',
      fileTooLarge: 'The file is larger than {max} MB',
      fileInvalidJson: 'The file is not a project',
      fileTypeUnsupported: 'This type of file is not supported: {type}',
      pictureInvalidSvg: 'The SVG picture is invalid',
      pictureFetchFailed: 'The picture could not be downloaded ({status})',
      pictureSourceUnsupported: 'This source of picture is not supported',
      pictureSourceRefused: 'This picture is not allowed',
      pictureSourceInvalid: 'This picture is not allowed',
      pictureTimeout: 'The picture took too long to load',
      pictureTooLarge: 'The picture is larger than {max} pixels',
      pictureLoadFailed: 'The picture could not be loaded',
      exportEmpty: 'There is no shape to export',
      exportContextUnavailable: 'The browser could not draw the picture',
      exportEncodingFailed: 'The drawing could not be encoded'
    },
    common: {
      close: 'Close',
      cancel: 'Cancel',
      loading: 'Loading',
      shortcutTitle: '{label} ({shortcut})'
    },
    files: { drawing: 'drawing' }
  }
}
