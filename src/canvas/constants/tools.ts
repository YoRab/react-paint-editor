import { STYLE_FONT_DEFAULT } from '@canvas/constants/rendering'
import type {
  ActionsTool,
  CustomToolInput,
  SettingsLineCap,
  SettingsLineJoin,
  ToolsBrushSettings,
  ToolsCurveSettings,
  ToolsEllipseSettings,
  ToolsLineSettings,
  ToolsPictureSettings,
  ToolsPolygonSettings,
  ToolsRectSettings,
  ToolsTextSettings
} from '@canvas/types/tools'

const TOOL_ID_PREFIX = 'react-paint-'

/**
 * Tools handled by the canvas besides the drawing tools. Like them, they hold no visual data:
 * an editor gives them an icon and a label, and selects them by id.
 */
export const SELECTION_TOOL: ActionsTool = {
  id: `${TOOL_ID_PREFIX}selection`,
  type: 'selection'
}

export const MOVE_TOOL: ActionsTool = {
  id: `${TOOL_ID_PREFIX}move`,
  type: 'move'
}

export const PICTURE_TOOL_ID = `${TOOL_ID_PREFIX}picture`

const STYLE_COLORS = ['transparent', 'black', 'white', 'red', 'green', 'blue', 'yellow']
const STYLE_LINE_DASH = [0, 1, 2, 3, 4]
const STYLE_LINE_WITH_ARROW = [0, 1, 2, 3]
const STYLE_FONTS = ['arial', 'serif', 'monospace']

const SETTING_LINE_JOIN: SettingsLineJoin = {
  lineJoin: {
    values: ['round', 'bevel', 'miter'],
    default: 'round'
  }
}

const SETTING_LINE_CAP: SettingsLineCap = {
  lineCap: {
    values: ['round', 'butt', 'square'],
    default: 'round'
  }
}

const SETTINGS_DEFAULT_ELLIPSE: ToolsEllipseSettings = {
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

export const SETTINGS_DEFAULT_RECT: ToolsRectSettings = { ...SETTINGS_DEFAULT_ELLIPSE, ...SETTING_LINE_JOIN }

const SETTINGS_DEFAULT_PICTURE: ToolsPictureSettings = {
  opacity: {
    min: 0,
    max: 100,
    step: 1,
    default: 100
  }
}

const SETTINGS_DEFAULT_TEXT: ToolsTextSettings = {
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
  },
  fontBold: {
    values: [false, true],
    default: false
  },
  fontItalic: {
    values: [false, true],
    default: false
  }
}

const SETTINGS_DEFAULT_BRUSH: ToolsBrushSettings = {
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
  },
  ...SETTING_LINE_JOIN,
  ...SETTING_LINE_CAP
}

const SETTINGS_DEFAULT_LINE: ToolsLineSettings = {
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
  },
  ...SETTING_LINE_CAP
}

const SETTINGS_DEFAULT_CURVE: ToolsCurveSettings = {
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
  },
  closedPoints: {
    default: 0
  },
  ...SETTING_LINE_CAP
}

const SETTINGS_DEFAULT_POLYGON: ToolsPolygonSettings = { ...SETTINGS_DEFAULT_CURVE, ...SETTING_LINE_JOIN }

/**
 * Default drawing tools. They hold the logic needed by the canvas (type and settings) but no visual data:
 * icon and label are optional and resolved by the editor from the tool type when missing.
 */
export const DEFAULT_TOOLS: CustomToolInput[] = [
  { type: 'brush', id: `${TOOL_ID_PREFIX}brush`, settings: SETTINGS_DEFAULT_BRUSH },
  { type: 'line', id: `${TOOL_ID_PREFIX}line`, settings: SETTINGS_DEFAULT_LINE },
  { type: 'polygon', id: `${TOOL_ID_PREFIX}polygon`, settings: SETTINGS_DEFAULT_POLYGON },
  { type: 'curve', id: `${TOOL_ID_PREFIX}curve`, settings: SETTINGS_DEFAULT_CURVE },
  { type: 'rect', id: `${TOOL_ID_PREFIX}rect`, settings: SETTINGS_DEFAULT_RECT },
  { type: 'square', id: `${TOOL_ID_PREFIX}square`, settings: SETTINGS_DEFAULT_RECT },
  { type: 'circle', id: `${TOOL_ID_PREFIX}circle`, settings: SETTINGS_DEFAULT_ELLIPSE },
  { type: 'ellipse', id: `${TOOL_ID_PREFIX}ellipse`, settings: SETTINGS_DEFAULT_ELLIPSE },
  { type: 'picture', id: PICTURE_TOOL_ID, settings: SETTINGS_DEFAULT_PICTURE },
  { type: 'text', id: `${TOOL_ID_PREFIX}text`, settings: SETTINGS_DEFAULT_TEXT }
]
