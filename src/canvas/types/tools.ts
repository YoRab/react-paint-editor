import type { ArrowHead, FillGradient, FillPattern, ShapeType, TextAlign } from './Shapes'

export type CustomToolInput = {
  id: string
  /** SVG markup, rendered as HTML by the editor: it must be trusted, never built from what a user typed or loaded */
  icon?: string
  label?: string
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

export type CustomTool = {
  id: string
  /** SVG markup, rendered as HTML by the editor: it must be trusted, never built from what a user typed or loaded */
  icon?: string
  label?: string
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
  | {
      type: 'group'
      settings: ToolsSettingsType<'group'>
    }
)

export type SettingsOpacity = {
  opacity: {
    min: number
    max: number
    step: number
    default: number
    hidden?: boolean
  }
}

export type SettingsStrokeColor = {
  strokeColor: {
    values: string[]
    default: string
    hidden?: boolean
  }
}

export type SettingsFillColor = {
  fillColor: {
    values: string[]
    default: string
    hidden?: boolean
  }
}

/** Pattern and gradient of the fill of a shape, inside its path */
export type SettingsFill = {
  fillPattern: {
    values: FillPattern[]
    default: FillPattern
    hidden?: boolean
  }
  fillGradient: {
    values: FillGradient[]
    default: FillGradient
    hidden?: boolean
  }
  fillColor2: {
    values: string[]
    default: string
    hidden?: boolean
  }
  /** In degrees */
  fillGradientAngle: {
    min: number
    max: number
    step: number
    default: number
    hidden?: boolean
  }
}

export type SettingsLineWidth = {
  lineWidth: {
    min: number
    max: number
    step: number
    default: number
    hidden?: boolean
  }
}

export type SettingsLineDash = {
  lineDash: {
    values: number[]
    default: number
    hidden?: boolean
  }
}

export type SettingsLineJoin = {
  lineJoin: {
    values: CanvasLineJoin[]
    default: CanvasLineJoin
    hidden?: boolean
  }
}

export type SettingsLineCap = {
  lineCap: {
    values: CanvasLineCap[]
    default: CanvasLineCap
    hidden?: boolean
  }
}

export type SettingsCornerRadius = {
  cornerRadius: {
    min: number
    max: number
    step: number
    default: number
    hidden?: boolean
  }
}

/** Heads of the first and the last point of a line, or of an open polygon or curve */
export type SettingsArrowHeads = {
  arrowStart: {
    values: ArrowHead[]
    default: ArrowHead
    hidden?: boolean
  }
  arrowEnd: {
    values: ArrowHead[]
    default: ArrowHead
    hidden?: boolean
  }
}

/** Size of the heads, as a multiplier of their default size */
export type SettingsArrowSize = {
  arrowSize: {
    min: number
    max: number
    step: number
    default: number
    hidden?: boolean
  }
}

export type SettingsFont = {
  fontFamily: {
    values: string[]
    default: string
    hidden?: boolean
  }
  fontBold: {
    values: boolean[]
    default: boolean
    hidden?: boolean
  }
  fontItalic: {
    values: boolean[]
    default: boolean
    hidden?: boolean
  }
}

export type SettingsTextDecoration = {
  fontUnderline: {
    values: boolean[]
    default: boolean
    hidden?: boolean
  }
  fontStrikethrough: {
    values: boolean[]
    default: boolean
    hidden?: boolean
  }
}

/** Outline around the letters of a text */
export type SettingsTextOutline = {
  outlineColor: {
    values: string[]
    default: string
    hidden?: boolean
  }
  outlineWidth: {
    min: number
    max: number
    step: number
    default: number
    hidden?: boolean
  }
}

export type SettingsTextAlign = {
  textAlign: {
    values: TextAlign[]
    default: TextAlign
    hidden?: boolean
  }
}

/** Height of the lines of a text, in font sizes */
export type SettingsLineHeight = {
  lineHeight: {
    min: number
    max: number
    step: number
    default: number
    hidden?: boolean
  }
}

/** Font size of the new texts, which are as wide as their content. Without it, a new text is 150 wide */
export type SettingsFontSize = {
  fontSize: {
    min: number
    /** No limit by default: a text can be made as big as wanted */
    max?: number
    step: number
    default: number
    hidden?: boolean
  }
}

export type SettingsClosedPoints = {
  closedPoints: {
    default: number
    hidden?: boolean
  }
}

export type ToolsRectSettings = SettingsStrokeColor &
  SettingsFillColor &
  SettingsOpacity &
  SettingsLineWidth &
  SettingsLineDash &
  Partial<SettingsLineJoin & SettingsCornerRadius & SettingsFill>

export type ToolsSquareSettings = ToolsRectSettings

export type ToolsEllipseSettings = SettingsStrokeColor &
  SettingsFillColor &
  SettingsOpacity &
  SettingsLineWidth &
  SettingsLineDash &
  Partial<SettingsFill>

export type ToolsCircleSettings = ToolsEllipseSettings

export type ToolsTextSettings = SettingsOpacity &
  SettingsStrokeColor &
  SettingsFont &
  Partial<SettingsFontSize & SettingsTextAlign & SettingsLineHeight & SettingsFillColor & SettingsTextDecoration & SettingsTextOutline>
export type ToolsLineSettings = SettingsOpacity &
  SettingsStrokeColor &
  SettingsLineWidth &
  SettingsLineDash &
  Partial<SettingsArrowHeads & SettingsArrowSize & SettingsLineCap>

export type ToolsBrushSettings = SettingsOpacity &
  SettingsStrokeColor &
  SettingsLineWidth &
  SettingsLineDash &
  Partial<SettingsLineJoin & SettingsLineCap>

export type ToolsPolygonSettings = SettingsOpacity &
  SettingsStrokeColor &
  SettingsFillColor &
  SettingsLineWidth &
  SettingsLineDash &
  SettingsClosedPoints &
  Partial<SettingsLineJoin & SettingsLineCap & SettingsCornerRadius & SettingsArrowHeads & SettingsArrowSize & SettingsFill>

export type ToolsCurveSettings = SettingsOpacity &
  SettingsStrokeColor &
  SettingsFillColor &
  SettingsLineWidth &
  SettingsLineDash &
  SettingsClosedPoints &
  Partial<SettingsLineCap & SettingsArrowHeads & SettingsArrowSize & SettingsFill>

export type ToolsPictureSettings = SettingsOpacity & Partial<SettingsStrokeColor & SettingsLineWidth & SettingsCornerRadius>

export type ToolsGroupSettings = Partial<
  SettingsOpacity &
    SettingsStrokeColor &
    SettingsFillColor &
    SettingsLineWidth &
    SettingsLineDash &
    SettingsArrowHeads &
    SettingsArrowSize &
    SettingsLineJoin &
    SettingsLineCap &
    SettingsCornerRadius &
    SettingsFill
>

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
                    : T extends 'group'
                      ? ToolsGroupSettings
                      : never

/** Tools handled by the canvas besides the drawing tools. The buttons of an editor (undo, export...) are not tools */
export type ActionsType = 'selection' | 'move'

export type ActionsTool = {
  id: string
  type: ActionsType
  /** SVG markup, rendered as HTML by the editor: it must be trusted, never built from what a user typed or loaded */
  icon?: string
  label?: string
}

export type ToolsType = CustomTool | ActionsTool
