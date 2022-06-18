import { ShapeEnum } from './Shapes'

export type CustomToolInput = {
  id: string
  type: ShapeEnum
  icon?: string
  lib?: string
  settings?: ToolsSettingsType<ShapeEnum>
}

export type CustomTool = {
  id: string
  icon: string
  lib: string
} & (
  | {
      type: ShapeEnum.brush
      settings: ToolsSettingsType<ShapeEnum.brush>
    }
  | {
      type: ShapeEnum.circle
      settings: ToolsSettingsType<ShapeEnum.circle>
    }
  | {
      type: ShapeEnum.ellipse
      settings: ToolsSettingsType<ShapeEnum.ellipse>
    }
  | {
      type: ShapeEnum.rect
      settings: ToolsSettingsType<ShapeEnum.rect>
    }
  | {
      type: ShapeEnum.square
      settings: ToolsSettingsType<ShapeEnum.square>
    }
  | {
      type: ShapeEnum.line
      settings: ToolsSettingsType<ShapeEnum.line>
    }
  | {
      type: ShapeEnum.polygon
      settings: ToolsSettingsType<ShapeEnum.polygon>
    }
  | {
      type: ShapeEnum.curve
      settings: ToolsSettingsType<ShapeEnum.curve>
    }
  | {
      type: ShapeEnum.text
      settings: ToolsSettingsType<ShapeEnum.text>
    }
  | {
      type: ShapeEnum.picture
      settings: ToolsSettingsType<ShapeEnum.picture>
    }
)

export type SettingsOpacity = {
  opacity: {
    min: number
    max: number
    step: number
    default: number
  }
}

export type SettingsStrokeColor = {
  strokeColor: {
    values: string[]
    default: string
  }
}

export type SettingsFillColor = {
  fillColor: {
    values: string[]
    default: string
  }
}

export type SettingsLineWidth = {
  lineWidth: {
    min: number
    max: number
    step: number
    default: number
  }
}

export type SettingsLineDash = {
  lineDash: {
    values: number[]
    default: number
  }
}

export type SettingsLineArrow = {
  lineArrow: {
    values: number[]
    default: number
  }
}

export type SettingsFont = {
  fontFamily: {
    values: string[]
    default: string
  }
  fontBold: {
    values: boolean[]
    default: boolean
  }
  fontItalic: {
    values: boolean[]
    default: boolean
  }
}

export type SettingsPointsCount = {
  pointsCount: {
    min: number
    max: number
    step: number
    default: number
  }
}

export type ToolsRectSettings = SettingsStrokeColor &
  SettingsFillColor &
  SettingsOpacity &
  SettingsLineWidth &
  SettingsLineDash

export type ToolsSquareSettings = SettingsStrokeColor &
  SettingsFillColor &
  SettingsOpacity &
  SettingsLineWidth &
  SettingsLineDash

export type ToolsCircleSettings = SettingsStrokeColor &
  SettingsFillColor &
  SettingsOpacity &
  SettingsLineWidth &
  SettingsLineDash

export type ToolsEllipseSettings = SettingsStrokeColor &
  SettingsFillColor &
  SettingsOpacity &
  SettingsLineWidth &
  SettingsLineDash

export type ToolsTextSettings = SettingsOpacity & SettingsStrokeColor & SettingsFont
export type ToolsLineSettings = SettingsOpacity &
  SettingsStrokeColor &
  SettingsLineWidth &
  SettingsLineDash &
  SettingsLineArrow

export type ToolsBrushSettings = SettingsOpacity &
  SettingsStrokeColor &
  SettingsLineWidth &
  SettingsLineDash

export type ToolsPolygonSettings = SettingsOpacity &
  SettingsStrokeColor &
  SettingsFillColor &
  SettingsLineWidth &
  SettingsLineDash &
  SettingsPointsCount

export type ToolsCurveSettings = SettingsOpacity &
  SettingsStrokeColor &
  SettingsFillColor &
  SettingsLineWidth &
  SettingsLineDash &
  SettingsPointsCount

export type ToolsPictureSettings = SettingsOpacity

export type ToolsSettingsType<T extends ShapeEnum> = T extends ShapeEnum.rect
  ? ToolsRectSettings
  : T extends ShapeEnum.square
  ? ToolsSquareSettings
  : T extends ShapeEnum.circle
  ? ToolsCircleSettings
  : T extends ShapeEnum.ellipse
  ? ToolsEllipseSettings
  : T extends ShapeEnum.text
  ? ToolsTextSettings
  : T extends ShapeEnum.line
  ? ToolsLineSettings
  : T extends ShapeEnum.brush
  ? ToolsBrushSettings
  : T extends ShapeEnum.polygon
  ? ToolsPolygonSettings
  : T extends ShapeEnum.curve
  ? ToolsCurveSettings
  : T extends ShapeEnum.picture
  ? ToolsPictureSettings
  : unknown // default

export enum ActionsEnum {
  selection = 'selection',
  undo = 'undo',
  redo = 'redo',
  clear = 'clear',
  export = 'export',
  loadFile = 'loadfile',
  saveFile = 'savefile',
  move = 'move',
  uploadPicture = 'uploadpicture',
  addUrlPicture = 'addurlpicture'
}

export type ActionsTool = {
  id: string
  type: ActionsEnum
  icon: string
  lib: string
}

export type ToolsType = CustomTool | ActionsTool
