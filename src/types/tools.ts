import type { ShapeType } from './Shapes'

export type CustomToolInput = {
  id: string
  type: ShapeType
  icon?: string
  label?: string
  settings?: ToolsSettingsType<ShapeType>
}

export type CustomTool = {
  id: string
  icon: string
  label: string
} & (
  | {
      type: 'brush'
      settings: ToolsSettingsType<'brush'>
    }
  | {
      type: 'circle'
      settings: ToolsSettingsType<'circle'>
    }
  | {
      type: 'ellipse'
      settings: ToolsSettingsType<'ellipse'>
    }
  | {
      type: 'rect'
      settings: ToolsSettingsType<'rect'>
    }
  | {
      type: 'square'
      settings: ToolsSettingsType<'square'>
    }
  | {
      type: 'line'
      settings: ToolsSettingsType<'line'>
    }
  | {
      type: 'polygon'
      settings: ToolsSettingsType<'polygon'>
    }
  | {
      type: 'curve'
      settings: ToolsSettingsType<'curve'>
    }
  | {
      type: 'text'
      settings: ToolsSettingsType<'text'>
    }
  | {
      type: 'picture'
      settings: ToolsSettingsType<'picture'>
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

export type ToolsSettingsType<T extends ShapeType> = T extends 'rect'
  ? ToolsRectSettings
  : T extends 'square'
  ? ToolsSquareSettings
  : T extends 'circle'
  ? ToolsCircleSettings
  : T extends 'ellipse'
  ? ToolsEllipseSettings
  : T extends 'text'
  ? ToolsTextSettings
  : T extends 'line'
  ? ToolsLineSettings
  : T extends 'brush'
  ? ToolsBrushSettings
  : T extends 'polygon'
  ? ToolsPolygonSettings
  : T extends 'curve'
  ? ToolsCurveSettings
  : T extends 'picture'
  ? ToolsPictureSettings
  : unknown // default

export type ActionsType =
  | 'selection'
  | 'undo'
  | 'redo'
  | 'clear'
  | 'export'
  | 'loadfile'
  | 'savefile'
  | 'move'
  | 'uploadpicture'
  | 'addurlpicture'

export type ActionsTool = {
  id: string
  type: ActionsType
  icon: string
  label: string
}

export type ToolsType = CustomTool | ActionsTool
