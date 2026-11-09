import {
  type CustomShapeParams,
  type CustomTool,
  type EditorState,
  getSelectedLeaves,
  getSelectedShapesTools,
  getSelectionStyle,
  type ShapeEntity,
  type ShapePatch,
  type ShapeStyleField,
  type StyleShape,
  shallowEqual,
  type ToolSettingValue,
  type ToolsType,
  usePaint,
  usePaintState
} from '@canvas/index'
import Button from '@editor/components/common/Button'
import Modal from '@editor/components/common/Modal'
import Panel from '@editor/components/common/Panel'
import {
  arrowEndIcon,
  arrowSizeIcon,
  arrowStartIcon,
  boldIcon,
  cornerRadiusIcon,
  fillGradientAngleIcon,
  fillGradientIcon,
  fillPatternIcon,
  fontIcon,
  fontSizeIcon,
  italicIcon,
  lineCapIcon,
  lineHeightIcon,
  lineJoinIcon,
  lineTypeIcon,
  lineWidthIcon,
  moreIcon,
  opacityIcon,
  paramIcon,
  polygonIcon,
  settingsIcon,
  strikethroughIcon,
  textAlignIcon,
  textOutlineIcon,
  underlineIcon
} from '@editor/constants/icons'
import type { EditorMessages, SettingFieldName } from '@editor/constants/locale'
import type { Disclosure } from '@editor/hooks/useDisclosure'
import useEditorLocale from '@editor/hooks/useEditorLocale'
import useSettingsPanel from '@editor/hooks/useSettingsPanel'
import { getDefaultParams } from '@editor/utils/style'
import type React from 'react'
import { Fragment, useState } from 'react'
import { ArrowEndOption, ArrowStartOption } from './ArrowHeadField'
import { ClosedPointsOption } from './ClosedPointsField'
import ColorField from './ColorField'
import DeleteButton from './DeleteButton'
import { FillGradientOption, FillPatternOption } from './FillField'
import { FontFamilyOption } from './FontFamilyField'
import LayoutButton from './LayoutButton'
import { LineCapOption } from './LineCapField'
import { LineJoinOption } from './LineJoinField'
import { LineTypeOption } from './LineTypeField'
import NumberField from './NumberField'
import RangeField from './RangeField'
import SelectField from './SelectField'
import './SettingsBar.css'
import { TextAlignOption } from './TextAlignField'
import ToggleField from './ToggleField'
import ZoomButton from './ZoomButton'

const SETTING_WIDTH = 40

/** The settings a tool can have, each one with its type */
type ToolSettings = Extract<CustomTool, { type: 'polygon' }>['settings'] &
  Extract<CustomTool, { type: 'line' }>['settings'] &
  Extract<CustomTool, { type: 'text' }>['settings']

type SettingName = keyof ToolSettings

/** Names of the settings of the given type, optional or not */
type SettingsOfType<T> = { [K in SettingName]-?: NonNullable<ToolSettings[K]> extends T ? K : never }[SettingName]

/** The parameters a custom tool declares: their own fields are named params.<parameter> */
type CustomParams = NonNullable<Extract<CustomTool, { type: 'custom' }>['settings']['params']>

const PARAM_FIELD_PREFIX = 'params.'

/** The parameters kept in the settings bar: the other ones go to the panel of the other options */
const PARAMS_IN_BAR = 2

/** A field of the settings, shown when the tool has a setting of its name which is not hidden */
type SettingField = {
  /** Its name in the locale, or the label of a parameter of a custom tool */
  title: string
  /** Shown in the panel of the other options instead of the settings bar */
  advanced?: boolean
  /** A field of the selected shapes instead of their style, like the font size of a text */
  ofShapes?: boolean
  /** Shown only for these values of the fields, like the angle of a gradient */
  visibleIf?: (style: SettingValues) => boolean
} & (
  | { kind: 'color'; field: SettingsOfType<{ values: string[] }>; mode?: 'fill' | 'stroke' }
  /** A slider, or a number typed in a field for a setting which can have no upper limit */
  | { kind: 'range' | 'number'; field: SettingsOfType<{ min: number }>; icon: React.ReactNode; unity: string }
  | { kind: 'toggle'; field: SettingsOfType<{ values: boolean[] }>; icon: React.ReactNode }
  | {
      kind: 'select'
      field: SettingsOfType<{ default: string | number }>
      icon: React.ReactNode
      option: React.FC<{ children?: React.ReactNode }>
      /** Names of the values drawn by their option, given to the assistive technologies */
      optionLabels?: Record<string, string> | undefined
      /** Values of a setting without a list of values */
      values?: (string | number)[]
    }
  /** A slider of a parameter of a custom shape, declared by its tool: its value is kept on each shape */
  | { kind: 'param'; field: string; param: string; icon: React.ReactNode; min: number; max: number; step: number }
)

/** The fields of the parameters a custom tool declares, in the order of their declaration */
const getParamFields = (params: CustomParams | undefined): SettingField[] =>
  Object.entries(params ?? {})
    .filter(([, declaration]) => !declaration.hidden)
    .map(([param, declaration], index) => ({
      kind: 'param',
      field: `${PARAM_FIELD_PREFIX}${param}`,
      param,
      title: declaration.label,
      icon: paramIcon,
      min: declaration.min,
      max: declaration.max,
      step: declaration.step,
      advanced: index >= PARAMS_IN_BAR
    }))

/** The fields with the parameters of a custom shape, before the opacity which closes the bar */
const withParamFields = (fields: SettingField[], paramFields: SettingField[]): SettingField[] => {
  if (!paramFields.length) return fields
  const opacityIndex = fields.findIndex(({ field }) => field === 'opacity')
  return opacityIndex < 0 ? [...fields, ...paramFields] : [...fields.slice(0, opacityIndex), ...paramFields, ...fields.slice(opacityIndex)]
}

/** A field of a setting a tool declares by its name: the parameters of a custom tool come with their own declarations */
type DeclaredSettingField = Exclude<SettingField, { kind: 'param' }>

/** A declared field before its texts: they come from the locale, by the name of its setting and of its values */
type SettingFieldDeclaration = DeclaredSettingField extends infer F
  ? F extends DeclaredSettingField
    ? Omit<F, 'title' | 'optionLabels'>
    : never
  : never

/** The fields of the settings, in their order */
const SETTING_FIELDS: SettingFieldDeclaration[] = [
  { field: 'strokeColor', kind: 'color', mode: 'stroke' },
  { field: 'fillColor', kind: 'color' },
  {
    field: 'fillPattern',
    kind: 'select',

    icon: fillPatternIcon,
    option: FillPatternOption
  },
  {
    field: 'fillGradient',
    kind: 'select',

    icon: fillGradientIcon,
    option: FillGradientOption,
    advanced: true
  },
  {
    field: 'fillColor2',
    kind: 'color',

    advanced: true,
    visibleIf: ({ fillGradient }) => fillGradient !== undefined && fillGradient !== 'none'
  },
  {
    field: 'fillGradientAngle',
    kind: 'range',

    icon: fillGradientAngleIcon,
    unity: '°',
    advanced: true,
    visibleIf: ({ fillGradient }) => fillGradient === 'linear' || fillGradient === 'conic'
  },
  { field: 'lineWidth', kind: 'range', icon: lineWidthIcon, unity: 'px' },
  {
    field: 'lineDash',
    kind: 'select',

    icon: lineTypeIcon,
    option: LineTypeOption
  },
  {
    field: 'lineJoin',
    kind: 'select',

    icon: lineJoinIcon,
    option: LineJoinOption,
    advanced: true
  },
  {
    field: 'lineCap',
    kind: 'select',

    icon: lineCapIcon,
    option: LineCapOption,
    advanced: true
  },
  { field: 'cornerRadius', kind: 'range', icon: cornerRadiusIcon, unity: 'px', advanced: true },
  { field: 'arrowStart', kind: 'select', icon: arrowStartIcon, option: ArrowStartOption },
  { field: 'arrowEnd', kind: 'select', icon: arrowEndIcon, option: ArrowEndOption },
  { field: 'arrowSize', kind: 'range', icon: arrowSizeIcon, unity: '', advanced: true },
  {
    field: 'closedPoints',
    kind: 'select',

    icon: polygonIcon,
    option: ClosedPointsOption,
    values: [0, 1]
  },
  { field: 'fontFamily', kind: 'select', icon: fontIcon, option: FontFamilyOption },
  { field: 'fontSize', kind: 'number', icon: fontSizeIcon, unity: 'px', ofShapes: true },
  { field: 'fontBold', kind: 'toggle', icon: boldIcon },
  { field: 'fontItalic', kind: 'toggle', icon: italicIcon },
  { field: 'fontUnderline', kind: 'toggle', icon: underlineIcon },
  { field: 'fontStrikethrough', kind: 'toggle', icon: strikethroughIcon, advanced: true },
  {
    field: 'textAlign',
    kind: 'select',

    icon: textAlignIcon,
    option: TextAlignOption
  },
  { field: 'lineHeight', kind: 'range', icon: lineHeightIcon, unity: '', advanced: true },
  { field: 'outlineColor', kind: 'color', mode: 'stroke', advanced: true },
  { field: 'outlineWidth', kind: 'range', icon: textOutlineIcon, unity: 'px', advanced: true },
  { field: 'opacity', kind: 'range', icon: opacityIcon, unity: '%' }
]

const SHAPES_FIELDS: string[] = SETTING_FIELDS.filter(({ ofShapes }) => ofShapes).map(({ field }) => field)

/** Names of the values of a setting drawn by their option: the dashes are numbered, the other values are named */
const getOptionLabels = (field: SettingFieldName, { settings }: EditorMessages): Record<string, string> | undefined => {
  switch (field) {
    case 'fillPattern':
      return settings.fillPattern
    case 'fillGradient':
      return settings.fillGradient
    case 'lineDash': {
      const { solid, dotted, dashed, longDashed, dashDotted } = settings.lineDash
      return { 0: solid, 1: dotted, 2: dashed, 3: longDashed, 4: dashDotted }
    }
    case 'lineJoin':
      return settings.lineJoin
    case 'lineCap':
      return settings.lineCap
    case 'arrowStart':
    case 'arrowEnd':
      return settings.arrowHeads
    case 'textAlign':
      return settings.textAlign
    case 'closedPoints':
      return { 0: settings.closedPoints.no, 1: settings.closedPoints.yes }
    default:
      return undefined
  }
}

/** A declared field with its texts in the locale */
const withTexts = (declaration: SettingFieldDeclaration, messages: EditorMessages): DeclaredSettingField =>
  ({
    ...declaration,
    title: messages.settings.fields[declaration.field],
    ...(declaration.kind === 'select' ? { optionLabels: getOptionLabels(declaration.field, messages) } : {})
  }) as DeclaredSettingField

/** Values of the fields: the style and the font size of the selection, or the default values of the settings of the active tool */
type SettingValues = StyleShape & { fontSize?: number | undefined }

type SettingsItemsType = {
  fields: SettingField[]
  settings: Partial<ToolSettings>
  style: SettingValues
  /** Values of the parameters of the selected custom shapes, or the defaults of the active custom tool */
  params: CustomShapeParams | undefined
  disabled: boolean
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  saveShapes: () => void
  valueChanged: (field: string, value: ToolSettingValue, needHistorySave?: boolean) => void
  colors: Pick<React.ComponentProps<typeof ColorField>, 'recentColors' | 'addRecentColor' | 'pickColor' | 'isPicking'>
}

const renderSettingField = (item: SettingField, { settings, style, params, saveShapes, colors, ...props }: Omit<SettingsItemsType, 'fields'>) => {
  switch (item.kind) {
    case 'param':
      return (
        <RangeField
          {...props}
          saveShapes={saveShapes}
          title={item.title}
          icon={item.icon}
          field={item.field}
          value={params?.[item.param]}
          min={item.min}
          max={item.max}
          step={item.step}
        />
      )
    case 'color':
      return (
        <ColorField
          {...props}
          {...colors}
          title={item.title}
          mode={item.mode ?? 'fill'}
          field={item.field}
          value={style[item.field]}
          values={settings[item.field]?.values ?? []}
        />
      )
    case 'range':
    case 'number': {
      const NumberOrRangeField = item.kind === 'number' ? NumberField : RangeField
      const setting = settings[item.field]
      return (
        <NumberOrRangeField
          {...props}
          saveShapes={saveShapes}
          title={item.title}
          icon={item.icon}
          field={item.field}
          value={style[item.field]}
          unity={item.unity}
          min={setting?.min}
          max={setting?.max}
          step={setting?.step}
        />
      )
    }
    case 'toggle':
      return (
        <ToggleField
          {...props}
          title={item.title}
          icon={item.icon}
          field={item.field}
          value={style[item.field]}
          values={settings[item.field]?.values ?? []}
        />
      )
    case 'select': {
      const setting = settings[item.field]
      return (
        <SelectField
          {...props}
          CustomOption={item.option}
          optionLabels={item.optionLabels}
          title={item.title}
          icon={item.icon}
          field={item.field}
          values={item.values ?? (setting && 'values' in setting ? setting.values : [])}
          defaultValue={style[item.field]}
        />
      )
    }
  }
}

const SettingsItems = ({ fields, ...props }: SettingsItemsType) =>
  fields.map(item => <Fragment key={item.field}>{renderSettingField(item, props)}</Fragment>)

/** Button of the panel of the other options. Their own panels open above it, the panel staying open */
const MoreSettings = ({ selectedSettings, setSelectedSettings, ...props }: SettingsItemsType) => {
  const { editor: messages } = useEditorLocale()
  const { isPanelVisible, togglePanel, triggerProps, panelProps } = useSettingsPanel(selectedSettings, setSelectedSettings)
  const [selectedMoreSettings, setSelectedMoreSettings] = useState<string | undefined>(undefined)

  const handleToggle = () => {
    setSelectedMoreSettings(undefined)
    togglePanel()
  }

  return (
    <>
      <Button title={messages.settings.moreOptions} icon={moreIcon} disabled={props.disabled} {...triggerProps} onClick={handleToggle} />
      {isPanelVisible && (
        <Panel title={messages.settings.moreOptions} alignment='left' position='bottom' {...panelProps}>
          <div className='react-paint-editor-settings-more'>
            <SettingsItems {...props} selectedSettings={selectedMoreSettings} setSelectedSettings={setSelectedMoreSettings} />
          </div>
        </Panel>
      )}
    </>
  )
}

type SettingsBarState = {
  width: number
  activeTool: ToolsType
  /** Only the style of the selection is shown: its geometry changes on each move of a drag */
  selectedStyle: StyleShape | undefined
  selectedFontSize: number | undefined
  selectedParams: CustomShapeParams | undefined
  selectedShapeIds: string[]
  selectedShapeTool: CustomTool | undefined
  isPickingColor: boolean
}

/** Font size of the selected texts, the texts of the selected groups too, when they all have the same */
const getSelectedFontSize = (leaves: ShapeEntity[]) => {
  const first = leaves[0]
  if (first?.type !== 'text') return undefined
  return leaves.every(shape => shape.type === 'text' && shape.fontSize === first.fontSize) ? first.fontSize : undefined
}

const NO_PARAMS: Record<string, number> = {}

/** Parameters of the selected custom shapes, the ones of the selected groups too, when they all have the same */
const getSelectedParams = (leaves: ShapeEntity[]) => {
  const first = leaves[0]
  if (first?.type !== 'custom') return undefined
  return leaves.every(shape => shape.type === 'custom' && shallowEqual(shape.params ?? NO_PARAMS, first.params ?? NO_PARAMS))
    ? first.params
    : undefined
}

const createSettingsBarSelector = () => {
  // the tool of the selection only depends on the shapes it draws and on the tools: a shape keeps its type and its tool
  let lastTool: { leafIds: string[]; tools: CustomTool[]; tool: CustomTool | undefined } | undefined
  return (state: EditorState): SettingsBarState => {
    const leaves = getSelectedLeaves(state.selection)
    const leafIds = leaves.map(shape => shape.id)
    if (!lastTool || lastTool.tools !== state.tools || !shallowEqual(lastTool.leafIds, leafIds)) {
      lastTool = { leafIds, tools: state.tools, tool: getSelectedShapesTools(state.selection, state.tools) }
    }
    return {
      width: state.view.displayWidth,
      activeTool: state.activeTool,
      // the style of the shapes of the selected groups, and the opacity of the groups
      selectedStyle: getSelectionStyle(state.selection),
      selectedFontSize: getSelectedFontSize(leaves),
      selectedParams: getSelectedParams(leaves),
      selectedShapeIds: state.selectedShapeIds,
      selectedShapeTool: lastTool.tool,
      isPickingColor: state.interaction.mode === 'eyedropper'
    }
  }
}

const isSameSettingsBarState = (a: SettingsBarState, b: SettingsBarState) =>
  a.width === b.width &&
  a.activeTool === b.activeTool &&
  a.selectedShapeIds === b.selectedShapeIds &&
  a.selectedShapeTool === b.selectedShapeTool &&
  a.selectedFontSize === b.selectedFontSize &&
  a.isPickingColor === b.isPickingColor &&
  shallowEqual(a.selectedStyle, b.selectedStyle) &&
  shallowEqual(a.selectedParams ?? NO_PARAMS, b.selectedParams ?? NO_PARAMS)

type SettingsBarType = {
  disabled: boolean
  withZoom: boolean
  layersManipulation?: boolean
  toggleLayoutPanel: () => void
  /** The panels of the layers and of the zoom, which their buttons control */
  layersPanel: Disclosure
  zoomPanel: Disclosure
  isZoomPanelShown: boolean
  setIsZoomPanelShown: React.Dispatch<React.SetStateAction<boolean>>
  recentColors: string[]
  addRecentColor: (color: string) => void
}

const SettingsBar = ({
  disabled,
  withZoom,
  layersManipulation = false,
  toggleLayoutPanel,
  layersPanel,
  zoomPanel,
  isZoomPanelShown,
  setIsZoomPanelShown,
  recentColors,
  addRecentColor
}: SettingsBarType) => {
  const paint = usePaint()
  const { actions } = paint
  const { lang, editor: messages } = useEditorLocale()
  const [selectSettingsBarState] = useState(createSettingsBarSelector)
  const { width, activeTool, selectedStyle, selectedFontSize, selectedParams, selectedShapeIds, selectedShapeTool, isPickingColor } = usePaintState(
    paint,
    selectSettingsBarState,
    isSameSettingsBarState
  )
  const hasSelection = selectedShapeIds.length > 0
  const hasSelectionTool = hasSelection && !!selectedShapeTool
  const [selectedSettings, setSelectedSettings] = useState<string | undefined>(undefined)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleTools = () => {
    setIsMenuOpen(prev => !prev)
  }

  const toggleZoom = () => {
    setIsZoomPanelShown(prev => !prev)
  }

  // the settings of the tool of the selection, or of the active tool without selection
  const tool = hasSelection ? selectedShapeTool : activeTool
  const settings: Partial<ToolSettings> = tool && 'settings' in tool ? tool.settings : {}
  const toolFields = SETTING_FIELDS.filter(({ field }) => settings[field] && !settings[field].hidden).map(declaration =>
    withTexts(declaration, messages)
  )
  const style: SettingValues = hasSelection
    ? { ...selectedStyle, fontSize: selectedFontSize }
    : (Object.fromEntries(toolFields.map(({ field }) => [field, settings[field]?.default])) as SettingValues)
  // the parameters of a custom tool are declared by it, not by the fields: their values are kept on its shapes
  const paramSettings = tool?.type === 'custom' ? tool.settings.params : undefined
  const params = hasSelection ? selectedParams : getDefaultParams(paramSettings)
  const fields = withParamFields(
    toolFields.filter(({ visibleIf }) => visibleIf?.(style) ?? true),
    getParamFields(paramSettings)
  )
  const barFields = fields.filter(({ advanced }) => !advanced)
  const advancedFields = fields.filter(({ advanced }) => advanced)

  const nbSettingsTools = barFields.length + +(advancedFields.length > 0) + +hasSelectionTool + +layersManipulation + +withZoom

  const settingsBreakpoint = nbSettingsTools * SETTING_WIDTH

  const settingsInMenu = width < settingsBreakpoint

  const handleShapeStyleChange = (field: string, value: ToolSettingValue, needHistorySave = true) => {
    if (!selectedShapeIds.length) {
      actions.updateToolSettings(activeTool.id, field, value)
    } else if (field.startsWith(PARAM_FIELD_PREFIX)) {
      // the parameter is changed on the selected custom shapes, and their tools keep the value for the next shapes
      const param = field.slice(PARAM_FIELD_PREFIX.length)
      const shapes = getSelectedLeaves(paint.getState().selection).filter(shape => shape.type === 'custom')
      actions.updateShapes(
        shapes.map(shape => ({ id: shape.id, params: { [param]: value } }) as ShapePatch),
        { save: needHistorySave, updateTool: true }
      )
    } else if (SHAPES_FIELDS.includes(field)) {
      // the field is changed on the shapes which have it, the shapes of the groups too, and their tools keep the value for the next shapes
      const shapes = getSelectedLeaves(paint.getState().selection).filter(shape => field in shape)
      actions.updateShapes(
        shapes.map(shape => ({ id: shape.id, [field]: value }) as ShapePatch),
        { save: needHistorySave, updateTool: true }
      )
    } else {
      // the tools of the shapes keep the value for the next shapes
      actions.setShapesStyle(selectedShapeIds, { [field as ShapeStyleField]: value }, { save: needHistorySave, updateTool: true })
    }
  }

  const itemsProps = {
    settings,
    style,
    params,
    disabled,
    selectedSettings,
    setSelectedSettings,
    saveShapes: actions.saveShapes,
    valueChanged: handleShapeStyleChange,
    colors: { recentColors, addRecentColor, pickColor: actions.pickColor, isPicking: isPickingColor }
  }

  return (
    <>
      <div className='react-paint-editor-settings-bar' lang={lang}>
        <div className='react-paint-editor-settings-shrinkable'>
          {withZoom && (
            <ZoomButton
              className={isZoomPanelShown ? 'react-paint-editor-bar-zoom-button-opened' : undefined}
              panel={zoomPanel}
              toggleZoomPanel={toggleZoom}
            />
          )}
          {settingsInMenu && nbSettingsTools > 2 && (
            <Button
              disabled={disabled}
              onClick={toggleTools}
              title={messages.settings.showSettings}
              icon={settingsIcon}
              aria-haspopup='dialog'
              aria-expanded={isMenuOpen}
            />
          )}
          {!settingsInMenu && (
            <>
              <SettingsItems {...itemsProps} fields={barFields} />
              {advancedFields.length > 0 && <MoreSettings {...itemsProps} fields={advancedFields} />}
            </>
          )}
          {hasSelectionTool && activeTool.type === 'selection' && (
            <DeleteButton disabled={disabled} selectedShapeIds={selectedShapeIds} removeShapes={actions.removeShapes} />
          )}
        </div>
        <div className='react-paint-editor-settings-separator' />
        {layersManipulation && <LayoutButton disabled={disabled} panel={layersPanel} toggleLayoutPanel={toggleLayoutPanel} />}
      </div>
      {isMenuOpen && (
        <Modal
          className='react-paint-editor-settings-modal'
          onClose={toggleTools}
          position='bottom'
          title={messages.settings.settings}
          withCloseButton
        >
          <SettingsItems {...itemsProps} fields={fields} />
        </Modal>
      )}
    </>
  )
}

export default SettingsBar
