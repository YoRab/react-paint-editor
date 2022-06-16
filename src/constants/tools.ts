import { ShapeEnum } from 'types/Shapes'
import {
  ActionsEnum,
  ActionsTool,
  CustomTool,
  ToolsBrushSettings,
  ToolsCircleSettings,
  ToolsCurveSettings,
  ToolsEllipseSettings,
  ToolsLineSettings,
  ToolsPictureSettings,
  ToolsPolygonSettings,
  ToolsRectSettings,
  ToolsSquareSettings,
  ToolsTextSettings
} from 'types/tools'
import {
  arrowIcon,
  brushIcon,
  circleIcon,
  clearIcon,
  curveIcon,
  ellipseIcon,
  exportFileIcon,
  openFileIcon,
  pictureIcon,
  polygonIcon,
  recIcon,
  redoIcon,
  saveIcon,
  selectIcon,
  squareIcon,
  textIcon,
  undoIcon
} from './icons'
import {
  STYLE_COLORS,
  STYLE_FONTS,
  STYLE_FONT_DEFAULT,
  STYLE_LINE_DASH,
  STYLE_LINE_WITH_ARROW
} from './style'

const PREFIX_ID = 'react-paint-'

export const SETTINGS_DEFAULT_RECT: ToolsRectSettings = {
  strokeColor: {
    values: STYLE_COLORS,
    default: 'black'
  },
  fillColor: {
    values: STYLE_COLORS,
    default: 'transparent'
  },
  opacity: {
    min: 0,
    max: 100,
    step: 1,
    default: 100
  },
  lineWidth: {
    min: 1,
    max: 20,
    step: 1,
    default: 1
  },
  lineDash: {
    values: STYLE_LINE_DASH,
    default: 0
  }
}

export const SETTINGS_DEFAULT_SQUARE: ToolsSquareSettings = {
  strokeColor: {
    values: STYLE_COLORS,
    default: 'black'
  },
  fillColor: {
    values: STYLE_COLORS,
    default: 'transparent'
  },
  opacity: {
    min: 0,
    max: 100,
    step: 1,
    default: 100
  },
  lineWidth: {
    min: 1,
    max: 20,
    step: 1,
    default: 1
  },
  lineDash: {
    values: STYLE_LINE_DASH,
    default: 0
  }
}

export const SETTINGS_DEFAULT_CIRCLE: ToolsCircleSettings = {
  strokeColor: {
    values: STYLE_COLORS,
    default: 'black'
  },
  fillColor: {
    values: STYLE_COLORS,
    default: 'transparent'
  },
  opacity: {
    min: 0,
    max: 100,
    step: 1,
    default: 100
  },
  lineWidth: {
    min: 1,
    max: 20,
    step: 1,
    default: 1
  },
  lineDash: {
    values: STYLE_LINE_DASH,
    default: 0
  }
}

export const SETTINGS_DEFAULT_ELLIPSE: ToolsEllipseSettings = {
  strokeColor: {
    values: STYLE_COLORS,
    default: 'black'
  },
  fillColor: {
    values: STYLE_COLORS,
    default: 'transparent'
  },
  opacity: {
    min: 0,
    max: 100,
    step: 1,
    default: 100
  },
  lineWidth: {
    min: 1,
    max: 20,
    step: 1,
    default: 1
  },
  lineDash: {
    values: STYLE_LINE_DASH,
    default: 0
  }
}

export const SETTINGS_DEFAULT_PICTURE: ToolsPictureSettings = {
  opacity: {
    min: 0,
    max: 100,
    step: 1,
    default: 100
  }
}

export const SETTINGS_DEFAULT_TEXT: ToolsTextSettings = {
  strokeColor: {
    values: STYLE_COLORS,
    default: 'black'
  },
  opacity: {
    min: 0,
    max: 100,
    step: 1,
    default: 100
  },
  fontFamily: {
    values: STYLE_FONTS,
    default: STYLE_FONT_DEFAULT
  }
}

export const SETTINGS_DEFAULT_BRUSH: ToolsBrushSettings = {
  strokeColor: {
    values: STYLE_COLORS,
    default: 'black'
  },
  opacity: {
    min: 0,
    max: 100,
    step: 1,
    default: 100
  },
  lineWidth: {
    min: 6,
    max: 20,
    step: 2,
    default: 10
  },
  lineDash: {
    values: STYLE_LINE_DASH,
    default: 0
  }
}

export const SETTINGS_DEFAULT_LINE: ToolsLineSettings = {
  strokeColor: {
    values: STYLE_COLORS,
    default: 'black'
  },
  opacity: {
    min: 0,
    max: 100,
    step: 1,
    default: 100
  },
  lineWidth: {
    min: 1,
    max: 20,
    step: 1,
    default: 1
  },
  lineDash: {
    values: STYLE_LINE_DASH,
    default: 0
  },
  lineArrow: {
    values: STYLE_LINE_WITH_ARROW,
    default: 0
  }
}

export const SETTINGS_DEFAULT_POLYGON: ToolsPolygonSettings = {
  strokeColor: {
    values: STYLE_COLORS,
    default: 'black'
  },
  fillColor: {
    values: STYLE_COLORS,
    default: 'black'
  },
  opacity: {
    min: 0,
    max: 100,
    step: 1,
    default: 100
  },
  lineWidth: {
    min: 1,
    max: 20,
    step: 1,
    default: 1
  },
  lineDash: {
    values: STYLE_LINE_DASH,
    default: 0
  },
  pointsCount: {
    min: 3,
    max: 10,
    step: 1,
    default: 3
  }
}

export const SETTINGS_DEFAULT_CURVE: ToolsCurveSettings = {
  strokeColor: {
    values: STYLE_COLORS,
    default: 'black'
  },
  fillColor: {
    values: STYLE_COLORS,
    default: 'black'
  },
  opacity: {
    min: 0,
    max: 100,
    step: 1,
    default: 100
  },
  lineWidth: {
    min: 1,
    max: 20,
    step: 1,
    default: 1
  },
  lineDash: {
    values: STYLE_LINE_DASH,
    default: 0
  },
  pointsCount: {
    min: 3,
    max: 10,
    step: 1,
    default: 3
  }
}

export const DEFAULT_SHAPE_PICTURE: CustomTool = {
  type: ShapeEnum.picture,
  id: `${PREFIX_ID}picture`,
  icon: pictureIcon,
  lib: 'Image',
  settings: SETTINGS_DEFAULT_PICTURE
}

export const DEFAULT_SHAPE_BRUSH: CustomTool = {
  type: ShapeEnum.brush,
  id: `${PREFIX_ID}brush`,
  icon: brushIcon,
  lib: 'Brosse',
  settings: SETTINGS_DEFAULT_BRUSH
}

export const DEFAULT_SHAPE_LINE: CustomTool = {
  type: ShapeEnum.line,
  id: `${PREFIX_ID}line`,
  icon: arrowIcon,
  lib: 'Ligne',
  settings: SETTINGS_DEFAULT_LINE
}

export const DEFAULT_SHAPE_POLYGON: CustomTool = {
  type: ShapeEnum.polygon,
  id: `${PREFIX_ID}polygon`,
  icon: polygonIcon,
  lib: 'Polygone',
  settings: SETTINGS_DEFAULT_POLYGON
}

export const DEFAULT_SHAPE_CURVE: CustomTool = {
  type: ShapeEnum.curve,
  id: `${PREFIX_ID}curve`,
  icon: curveIcon,
  lib: 'Courbe',
  settings: SETTINGS_DEFAULT_CURVE
}

export const DEFAULT_SHAPE_RECT: CustomTool = {
  type: ShapeEnum.rect,
  id: `${PREFIX_ID}rect`,
  icon: squareIcon, // temporary
  lib: 'Rectangle',
  settings: SETTINGS_DEFAULT_RECT
}

export const DEFAULT_SHAPE_SQUARE: CustomTool = {
  type: ShapeEnum.square,
  id: `${PREFIX_ID}square`,
  icon: squareIcon,
  lib: 'Carré',
  settings: SETTINGS_DEFAULT_SQUARE
}

export const DEFAULT_SHAPE_CIRCLE: CustomTool = {
  type: ShapeEnum.circle,
  id: `${PREFIX_ID}circle`,
  icon: circleIcon,
  lib: 'Cercle',
  settings: SETTINGS_DEFAULT_CIRCLE
}

export const DEFAULT_SHAPE_ELLIPSE: CustomTool = {
  type: ShapeEnum.ellipse,
  id: `${PREFIX_ID}ellipse`,
  icon: circleIcon, // temporary
  lib: 'Ellipse',
  settings: SETTINGS_DEFAULT_ELLIPSE
}
export const DEFAULT_SHAPE_TEXT: CustomTool = {
  type: ShapeEnum.text,
  id: `${PREFIX_ID}text`,
  icon: textIcon,
  lib: 'Texte',
  settings: SETTINGS_DEFAULT_TEXT
}

export const DEFAULT_SHAPE_TOOLS: CustomTool[] = [
  DEFAULT_SHAPE_BRUSH,
  DEFAULT_SHAPE_LINE,
  DEFAULT_SHAPE_POLYGON,
  DEFAULT_SHAPE_CURVE,
  DEFAULT_SHAPE_RECT,
  DEFAULT_SHAPE_SQUARE,
  DEFAULT_SHAPE_CIRCLE,
  DEFAULT_SHAPE_ELLIPSE,
  DEFAULT_SHAPE_PICTURE,
  DEFAULT_SHAPE_TEXT
]

export const SELECTION_TOOL: ActionsTool = {
  id: `${PREFIX_ID}selection`,
  type: ActionsEnum.selection,
  icon: selectIcon,
  lib: 'Sélection'
}

export const UNDO_TOOL: ActionsTool = {
  id: `${PREFIX_ID}undo`,
  type: ActionsEnum.undo,
  icon: undoIcon,
  lib: 'Undo'
}

export const REDO_TOOL: ActionsTool = {
  id: `${PREFIX_ID}redo`,
  type: ActionsEnum.redo,
  icon: redoIcon,
  lib: 'Redo'
}

export const CLEAR_TOOL: ActionsTool = {
  id: `${PREFIX_ID}clear`,
  type: ActionsEnum.clear,
  icon: clearIcon,
  lib: 'Clear'
}

export const EXPORT_TOOL: ActionsTool = {
  id: `${PREFIX_ID}export`,
  type: ActionsEnum.export,
  icon: exportFileIcon,
  lib: 'Export PNG'
}

export const LOAD_TOOL: ActionsTool = {
  id: `${PREFIX_ID}load`,
  type: ActionsEnum.loadFile,
  icon: openFileIcon,
  lib: 'Load project'
}

export const SAVE_TOOL: ActionsTool = {
  id: `${PREFIX_ID}save`,
  type: ActionsEnum.saveFile,
  icon: saveIcon,
  lib: 'Save project'
}

export const MOVE_TOOL: ActionsTool = {
  id: `${PREFIX_ID}move`,
  type: ActionsEnum.move,
  icon: selectIcon,
  lib: 'Move'
}

export const UPLOAD_PICTURE_TOOL: ActionsTool = {
  id: `${PREFIX_ID}upload-picture`,
  type: ActionsEnum.uploadPicture,
  icon: pictureIcon,
  lib: 'Upload picture'
}

export const ADD_URL_PICTURE_TOOL: ActionsTool = {
  id: `${PREFIX_ID}upload-picture`,
  type: ActionsEnum.addUrlPicture,
  icon: pictureIcon,
  lib: 'Add picture from URL'
}
