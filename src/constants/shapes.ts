import {
  Point,
  ShapeEnum,
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
} from 'types/Shapes'
import { CustomTool } from 'types/tools'
import {
  STYLE_COLORS,
  STYLE_FONTS,
  STYLE_FONT_DEFAULT,
  STYLE_LINE_DASH,
  STYLE_LINE_WITH_ARROW
} from './style'

export const SELECTION_DEFAULT_PADDING = 0
export const SELECTION_DEFAULT_WIDTH = 2
export const SELECTION_DEFAULT_COLOR = 'blue'
export const SELECTION_ANCHOR_SIZE = 14
export const SELECTION_ROTATED_ANCHOR_POSITION = 16
export const SELECTION_RESIZE_ANCHOR_POSITIONS: Point[] = [
  [0, 0],
  [0.5, 0],
  [1, 0],
  [1, 0.5],
  [1, 1],
  [0.5, 1],
  [0, 1],
  [0, 0.5]
]

export const SETTINGS_DEFAULT_RECT: ToolsRectSettings = {
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
  }
}

export const SETTINGS_DEFAULT_SQUARE: ToolsSquareSettings = {
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
  }
}

export const SETTINGS_DEFAULT_CIRCLE: ToolsCircleSettings = {
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
  }
}

export const SETTINGS_DEFAULT_ELLIPSE: ToolsEllipseSettings = {
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

export const SETTINGS_DEFAULT_PEN: ToolsBrushSettings = {
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
    max: 6,
    step: 1,
    default: 1
  },
  lineDash: {
    values: STYLE_LINE_DASH,
    default: 0
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

export const DEFAULT_TOOLS: CustomTool<ShapeEnum>[] = [
  {
    type: ShapeEnum.brush,
    lib: 'Pinceau',
    settings: SETTINGS_DEFAULT_PEN
  },
  {
    type: ShapeEnum.brush,
    lib: 'Brosse',
    settings: SETTINGS_DEFAULT_BRUSH
  },
  {
    type: ShapeEnum.line,
    lib: 'Ligne',
    settings: SETTINGS_DEFAULT_LINE
  },
  {
    type: ShapeEnum.polygon,
    lib: 'Polygone',
    settings: SETTINGS_DEFAULT_POLYGON
  },
  {
    type: ShapeEnum.curve,
    lib: 'Courbe',
    settings: SETTINGS_DEFAULT_CURVE
  },
  {
    type: ShapeEnum.rect,
    lib: 'Rectangle',
    settings: SETTINGS_DEFAULT_RECT
  },
  {
    type: ShapeEnum.square,
    lib: 'Carré',
    settings: SETTINGS_DEFAULT_SQUARE
  },
  {
    type: ShapeEnum.circle,
    lib: 'Cercle',
    settings: SETTINGS_DEFAULT_CIRCLE
  },
  {
    type: ShapeEnum.ellipse,
    lib: 'Ellipse',
    settings: SETTINGS_DEFAULT_ELLIPSE
  },
  {
    type: ShapeEnum.text,
    lib: 'Texte',
    settings: SETTINGS_DEFAULT_TEXT
  },
  {
    type: ShapeEnum.picture,
    lib: 'Image',
    settings: SETTINGS_DEFAULT_PICTURE
  }
]
