import {
  type CustomTool,
  type EditorState,
  getSelectedShapes,
  getSelectedShapesTools,
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
  boldIcon,
  cornerRadiusIcon,
  fontIcon,
  fontSizeIcon,
  italicIcon,
  lineCapIcon,
  lineEndIcon,
  lineJoinIcon,
  lineTypeIcon,
  lineWidthIcon,
  moreIcon,
  opacityIcon,
  polygonIcon,
  settingsIcon,
  textAlignIcon
} from '@editor/constants/icons'
import { uniqueId } from '@editor/utils/util'
import type React from 'react'
import { Fragment, useState } from 'react'
import { ClosedPointsOption } from './ClosedPointsField'
import ColorField from './ColorField'
import DeleteButton from './DeleteButton'
import { FontFamilyOption } from './FontFamilyField'
import LayoutButton from './LayoutButton'
import { LineArrowOption } from './LineArrowField'
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

/** A field of the settings, shown when the tool has a setting of its name which is not hidden */
type SettingField = {
  title: string
  /** Shown in the panel of the other options instead of the settings bar */
  advanced?: boolean
  /** A field of the selected shapes instead of their style, like the font size of a text */
  ofShapes?: boolean
} & (
  | { kind: 'color'; field: SettingsOfType<{ values: string[] }>; mode?: 'fill' | 'stroke' }
  /** A slider, or a number typed in a field for a setting which can have no upper limit */
  | { kind: 'range' | 'number'; field: SettingsOfType<{ min: number }>; icon: string; unity: string }
  | { kind: 'toggle'; field: SettingsOfType<{ values: boolean[] }>; icon: string }
  | {
      kind: 'select'
      field: SettingsOfType<{ default: string | number }>
      icon: string
      option: React.FC<{ children?: React.ReactNode }>
      /** Values of a setting without a list of values */
      values?: (string | number)[]
    }
)

/** The fields of the settings, in their order */
const SETTING_FIELDS: SettingField[] = [
  { field: 'strokeColor', kind: 'color', title: 'Couleur du trait', mode: 'stroke' },
  { field: 'fillColor', kind: 'color', title: 'Couleur de fond' },
  { field: 'lineWidth', kind: 'range', title: 'Epaisseur du trait', icon: lineWidthIcon, unity: 'px' },
  { field: 'lineDash', kind: 'select', title: 'Type de traits', icon: lineTypeIcon, option: LineTypeOption },
  { field: 'lineJoin', kind: 'select', title: 'Angles du trait', icon: lineJoinIcon, option: LineJoinOption, advanced: true },
  { field: 'lineCap', kind: 'select', title: 'Extrémités du trait', icon: lineCapIcon, option: LineCapOption, advanced: true },
  { field: 'cornerRadius', kind: 'range', title: 'Arrondi des angles', icon: cornerRadiusIcon, unity: 'px', advanced: true },
  { field: 'lineArrow', kind: 'select', title: 'Flèches', icon: lineEndIcon, option: LineArrowOption },
  { field: 'closedPoints', kind: 'select', title: 'Fermer les points', icon: polygonIcon, option: ClosedPointsOption, values: [0, 1] },
  { field: 'fontFamily', kind: 'select', title: 'Police', icon: fontIcon, option: FontFamilyOption },
  { field: 'fontSize', kind: 'number', title: 'Taille du texte', icon: fontSizeIcon, unity: 'px', ofShapes: true },
  { field: 'fontBold', kind: 'toggle', title: 'Gras', icon: boldIcon },
  { field: 'fontItalic', kind: 'toggle', title: 'Italique', icon: italicIcon },
  { field: 'textAlign', kind: 'select', title: 'Alignement du texte', icon: textAlignIcon, option: TextAlignOption },
  { field: 'opacity', kind: 'range', title: 'Opacité', icon: opacityIcon, unity: '%' }
]

const SHAPES_FIELDS: string[] = SETTING_FIELDS.filter(({ ofShapes }) => ofShapes).map(({ field }) => field)

/** Values of the fields: the style and the font size of the selection, or the default values of the settings of the active tool */
type SettingValues = StyleShape & { fontSize?: number | undefined }

type SettingsItemsType = {
  fields: SettingField[]
  settings: Partial<ToolSettings>
  style: SettingValues
  disabled: boolean
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  saveShapes: () => void
  valueChanged: (field: string, value: ToolSettingValue, needHistorySave?: boolean) => void
}

const renderSettingField = (item: SettingField, { settings, style, saveShapes, ...props }: Omit<SettingsItemsType, 'fields'>) => {
  switch (item.kind) {
    case 'color':
      return (
        <ColorField
          {...props}
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
  const [customKey] = useState(() => uniqueId('settings_'))
  const [selectedMoreSettings, setSelectedMoreSettings] = useState<string | undefined>(undefined)
  const isPanelVisible = selectedSettings === customKey

  const togglePanel = () => {
    setSelectedMoreSettings(undefined)
    setSelectedSettings(prev => (prev === customKey ? undefined : customKey))
  }

  return (
    <>
      <Button selected={isPanelVisible} title="Plus d'options" icon={moreIcon} disabled={props.disabled} onClick={togglePanel} />
      {isPanelVisible && (
        <Panel title="Plus d'options" alignment='left' position='bottom'>
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
  selectedShapeIds: string[]
  selectedShapeTool: CustomTool | undefined
}

/** Font size of the selected texts, when they all have the same */
const getSelectedFontSize = (selection: EditorState['selection']) => {
  const shapes = getSelectedShapes(selection)
  const first = shapes[0]
  if (first?.type !== 'text') return undefined
  return shapes.every(shape => shape.type === 'text' && shape.fontSize === first.fontSize) ? first.fontSize : undefined
}

const createSettingsBarSelector = () => {
  // the tool of the selection only depends on the selected ids and on the tools: a shape keeps its type and its tool
  let lastTool: { ids: string[]; tools: CustomTool[]; tool: CustomTool | undefined } | undefined
  return (state: EditorState): SettingsBarState => {
    if (lastTool?.ids !== state.selectedShapeIds || lastTool.tools !== state.tools) {
      lastTool = { ids: state.selectedShapeIds, tools: state.tools, tool: getSelectedShapesTools(state.selection, state.tools) }
    }
    return {
      width: state.view.displayWidth,
      activeTool: state.activeTool,
      selectedStyle: state.selection?.style,
      selectedFontSize: getSelectedFontSize(state.selection),
      selectedShapeIds: state.selectedShapeIds,
      selectedShapeTool: lastTool.tool
    }
  }
}

const isSameSettingsBarState = (a: SettingsBarState, b: SettingsBarState) =>
  a.width === b.width &&
  a.activeTool === b.activeTool &&
  a.selectedShapeIds === b.selectedShapeIds &&
  a.selectedShapeTool === b.selectedShapeTool &&
  a.selectedFontSize === b.selectedFontSize &&
  shallowEqual(a.selectedStyle, b.selectedStyle)

type SettingsBarType = {
  disabled: boolean
  withZoom: boolean
  layersManipulation?: boolean
  toggleLayoutPanel: () => void
  isZoomPanelShown: boolean
  setIsZoomPanelShown: React.Dispatch<React.SetStateAction<boolean>>
}

const SettingsBar = ({
  disabled,
  withZoom,
  layersManipulation = false,
  toggleLayoutPanel,
  isZoomPanelShown,
  setIsZoomPanelShown
}: SettingsBarType) => {
  const paint = usePaint()
  const { actions } = paint
  const [selectSettingsBarState] = useState(createSettingsBarSelector)
  const { width, activeTool, selectedStyle, selectedFontSize, selectedShapeIds, selectedShapeTool } = usePaintState(
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
  const settings: Partial<ToolSettings> = hasSelection ? (selectedShapeTool?.settings ?? {}) : 'settings' in activeTool ? activeTool.settings : {}
  const fields = SETTING_FIELDS.filter(({ field }) => settings[field] && !settings[field].hidden)
  const barFields = fields.filter(({ advanced }) => !advanced)
  const advancedFields = fields.filter(({ advanced }) => advanced)

  // the delete button of a selection is counted with any tool
  const nbSettingsTools = barFields.length + +(advancedFields.length > 0) + +hasSelectionTool + +layersManipulation + +withZoom

  const settingsBreakpoint = nbSettingsTools * SETTING_WIDTH

  const settingsInMenu = width < settingsBreakpoint

  const handleShapeStyleChange = (field: string, value: ToolSettingValue, needHistorySave = true) => {
    if (!selectedShapeIds.length) {
      actions.updateToolSettings(activeTool.id, field, value)
    } else if (SHAPES_FIELDS.includes(field)) {
      // the field is changed on the shapes which have it, and their tools keep the value for the next shapes
      const shapes = getSelectedShapes(paint.getState().selection).filter(shape => field in shape)
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
    style: hasSelection
      ? { ...selectedStyle, fontSize: selectedFontSize }
      : (Object.fromEntries(fields.map(({ field }) => [field, settings[field]?.default])) as SettingValues),
    disabled,
    selectedSettings,
    setSelectedSettings,
    saveShapes: actions.saveShapes,
    valueChanged: handleShapeStyleChange
  }

  return (
    <>
      <div className='react-paint-editor-settings-bar'>
        <div className='react-paint-editor-settings-shrinkable'>
          {withZoom && (
            <ZoomButton className={isZoomPanelShown ? 'react-paint-editor-bar-zoom-button-opened' : undefined} toggleZoomPanel={toggleZoom} />
          )}
          {settingsInMenu && nbSettingsTools > 2 && <Button disabled={disabled} onClick={toggleTools} title='Toggle settings' icon={settingsIcon} />}
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
        {layersManipulation && <LayoutButton disabled={disabled} toggleLayoutPanel={toggleLayoutPanel} />}
      </div>
      {isMenuOpen && (
        <Modal className='react-paint-editor-settings-modal' onClose={toggleTools} position='bottom' title='Settings'>
          <SettingsItems {...itemsProps} fields={fields} />
        </Modal>
      )}
    </>
  )
}

export default SettingsBar
