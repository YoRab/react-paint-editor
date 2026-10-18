import {
  type CustomTool,
  type EditorState,
  getSelectedShapesTools,
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
import { boldIcon, italicIcon, lineWidthIcon, opacityIcon, settingsIcon } from '@editor/constants/icons'
import type React from 'react'
import { useState } from 'react'
import ColorField from './ColorField'
import DeleteButton from './DeleteButton'
import FontFamilyField from './FontFamilyField'
import LayoutButton from './LayoutButton'
import LineArrowField from './LineArrowField'
import LineTypeField from './LineTypeField'
import RangeField from './RangeField'
import './SettingsBar.css'
import ClosedPointsField from '@editor/components/settings/ClosedPointsField'
import ZoomButton from '@editor/components/settings/ZoomButton'
import ToggleField from './ToggleField'

const SETTING_WIDTH = 40

type SettingsItemsType = {
  disabled?: boolean
  activeTool: ToolsType
  hasSelection: boolean
  selectedStyle: StyleShape | undefined
  selectedShapeTool: CustomTool | undefined
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  saveShapes: () => void
  handleShapeStyleChange: (field: string, value: string | number | boolean) => void
}

const SettingsItems = ({
  activeTool,
  hasSelection,
  selectedStyle,
  selectedShapeTool,
  disabled,
  selectedSettings,
  setSelectedSettings,
  saveShapes,
  handleShapeStyleChange
}: SettingsItemsType) => {
  return hasSelection ? (
    selectedShapeTool && (
      <>
        {'strokeColor' in selectedShapeTool.settings && !selectedShapeTool.settings.strokeColor.hidden && (
          <ColorField
            selectedSettings={selectedSettings}
            setSelectedSettings={setSelectedSettings}
            title='Couleur du trait'
            mode='stroke'
            disabled={disabled}
            field='strokeColor'
            value={selectedStyle?.strokeColor}
            valueChanged={handleShapeStyleChange}
            values={selectedShapeTool.settings.strokeColor.values}
          />
        )}

        {'fillColor' in selectedShapeTool.settings && !selectedShapeTool.settings.fillColor.hidden && (
          <ColorField
            selectedSettings={selectedSettings}
            setSelectedSettings={setSelectedSettings}
            title='Couleur de fond'
            disabled={disabled}
            field='fillColor'
            value={selectedStyle?.fillColor}
            valueChanged={handleShapeStyleChange}
            values={selectedShapeTool.settings.fillColor.values}
          />
        )}

        {'lineWidth' in selectedShapeTool.settings && !selectedShapeTool.settings.lineWidth.hidden && (
          <RangeField
            saveShapes={saveShapes}
            selectedSettings={selectedSettings}
            setSelectedSettings={setSelectedSettings}
            title='Epaisseur du trait'
            icon={lineWidthIcon}
            disabled={disabled}
            field='lineWidth'
            value={selectedStyle?.lineWidth}
            valueChanged={handleShapeStyleChange}
            unity='px'
            min={selectedShapeTool.settings.lineWidth.min}
            max={selectedShapeTool.settings.lineWidth.max}
            step={selectedShapeTool.settings.lineWidth.step}
          />
        )}

        {'lineDash' in selectedShapeTool.settings && !selectedShapeTool.settings.lineDash.hidden && (
          <LineTypeField
            selectedSettings={selectedSettings}
            setSelectedSettings={setSelectedSettings}
            disabled={disabled}
            defaultValue={selectedStyle?.lineDash}
            valueChanged={handleShapeStyleChange}
            values={selectedShapeTool.settings.lineDash.values}
          />
        )}

        {'lineArrow' in selectedShapeTool.settings && !selectedShapeTool.settings.lineArrow.hidden && (
          <LineArrowField
            selectedSettings={selectedSettings}
            setSelectedSettings={setSelectedSettings}
            disabled={disabled}
            defaultValue={selectedStyle?.lineArrow}
            valueChanged={handleShapeStyleChange}
            values={selectedShapeTool.settings.lineArrow.values}
          />
        )}

        {'closedPoints' in selectedShapeTool.settings && !selectedShapeTool.settings.closedPoints.hidden && (
          <ClosedPointsField
            selectedSettings={selectedSettings}
            setSelectedSettings={setSelectedSettings}
            disabled={disabled}
            valueChanged={handleShapeStyleChange}
            defaultValue={selectedStyle?.closedPoints}
          />
        )}

        {'fontFamily' in selectedShapeTool.settings && !selectedShapeTool.settings.fontFamily.hidden && (
          <FontFamilyField
            selectedSettings={selectedSettings}
            setSelectedSettings={setSelectedSettings}
            disabled={disabled}
            valueChanged={handleShapeStyleChange}
            values={selectedShapeTool.settings.fontFamily.values}
            defaultValue={selectedStyle?.fontFamily}
          />
        )}

        {'fontBold' in selectedShapeTool.settings && !selectedShapeTool.settings.fontBold.hidden && (
          <ToggleField
            setSelectedSettings={setSelectedSettings}
            disabled={disabled}
            field='fontBold'
            icon={boldIcon}
            title='Gras'
            valueChanged={handleShapeStyleChange}
            values={selectedShapeTool.settings.fontBold.values}
            value={selectedStyle?.fontBold}
          />
        )}

        {'fontItalic' in selectedShapeTool.settings && !selectedShapeTool.settings.fontItalic.hidden && (
          <ToggleField
            setSelectedSettings={setSelectedSettings}
            disabled={disabled}
            field='fontItalic'
            icon={italicIcon}
            title='Italique'
            valueChanged={handleShapeStyleChange}
            values={selectedShapeTool.settings.fontItalic.values}
            value={selectedStyle?.fontItalic}
          />
        )}

        {'opacity' in selectedShapeTool.settings && !selectedShapeTool.settings.opacity.hidden && (
          <RangeField
            saveShapes={saveShapes}
            selectedSettings={selectedSettings}
            setSelectedSettings={setSelectedSettings}
            title='Opacité'
            icon={opacityIcon}
            min={selectedShapeTool.settings.opacity.min}
            max={selectedShapeTool.settings.opacity.max}
            step={selectedShapeTool.settings.opacity.step}
            unity='%'
            disabled={disabled}
            field='opacity'
            value={selectedStyle?.opacity}
            valueChanged={handleShapeStyleChange}
          />
        )}
      </>
    )
  ) : 'settings' in activeTool ? (
    <>
      {'strokeColor' in activeTool.settings && !activeTool.settings.strokeColor.hidden && (
        <ColorField
          selectedSettings={selectedSettings}
          setSelectedSettings={setSelectedSettings}
          title='Couleur du trait'
          mode='stroke'
          disabled={disabled}
          field='strokeColor'
          value={activeTool.settings.strokeColor.default}
          valueChanged={handleShapeStyleChange}
          values={activeTool.settings.strokeColor.values}
        />
      )}

      {'fillColor' in activeTool.settings && !activeTool.settings.fillColor.hidden && (
        <ColorField
          selectedSettings={selectedSettings}
          setSelectedSettings={setSelectedSettings}
          title='Couleur de fond'
          disabled={disabled}
          field='fillColor'
          value={activeTool.settings.fillColor.default}
          valueChanged={handleShapeStyleChange}
          values={activeTool.settings.fillColor.values}
        />
      )}

      {'lineWidth' in activeTool.settings && !activeTool.settings.lineWidth.hidden && (
        <RangeField
          saveShapes={saveShapes}
          selectedSettings={selectedSettings}
          setSelectedSettings={setSelectedSettings}
          title='Epaisseur du trait'
          disabled={disabled}
          field='lineWidth'
          icon={lineWidthIcon}
          value={activeTool.settings.lineWidth.default}
          valueChanged={handleShapeStyleChange}
          unity='px'
          min={activeTool.settings.lineWidth.min}
          max={activeTool.settings.lineWidth.max}
          step={activeTool.settings.lineWidth.step}
        />
      )}

      {'lineDash' in activeTool.settings && !activeTool.settings.lineDash.hidden && (
        <LineTypeField
          selectedSettings={selectedSettings}
          setSelectedSettings={setSelectedSettings}
          disabled={disabled}
          defaultValue={activeTool.settings.lineDash.default}
          valueChanged={handleShapeStyleChange}
          values={activeTool.settings.lineDash.values}
        />
      )}

      {'lineArrow' in activeTool.settings && !activeTool.settings.lineArrow.hidden && (
        <LineArrowField
          selectedSettings={selectedSettings}
          setSelectedSettings={setSelectedSettings}
          disabled={disabled}
          defaultValue={activeTool.settings.lineArrow.default}
          valueChanged={handleShapeStyleChange}
          values={activeTool.settings.lineArrow.values}
        />
      )}

      {'closedPoints' in activeTool.settings && !activeTool.settings.closedPoints.hidden && (
        <ClosedPointsField
          selectedSettings={selectedSettings}
          setSelectedSettings={setSelectedSettings}
          disabled={disabled}
          valueChanged={handleShapeStyleChange}
          defaultValue={activeTool.settings?.closedPoints.default}
        />
      )}

      {'fontFamily' in activeTool.settings && !activeTool.settings.fontFamily.hidden && (
        <FontFamilyField
          selectedSettings={selectedSettings}
          setSelectedSettings={setSelectedSettings}
          disabled={disabled}
          valueChanged={handleShapeStyleChange}
          values={activeTool.settings.fontFamily.values}
          defaultValue={activeTool.settings.fontFamily.default}
        />
      )}

      {'fontBold' in activeTool.settings && !activeTool.settings.fontBold.hidden && (
        <ToggleField
          setSelectedSettings={setSelectedSettings}
          disabled={disabled}
          field='fontBold'
          icon={boldIcon}
          title='Gras'
          valueChanged={handleShapeStyleChange}
          values={activeTool.settings.fontBold.values}
          value={activeTool.settings.fontBold.default}
        />
      )}

      {'fontItalic' in activeTool.settings && !activeTool.settings.fontItalic.hidden && (
        <ToggleField
          setSelectedSettings={setSelectedSettings}
          disabled={disabled}
          field='fontItalic'
          icon={italicIcon}
          title='Italique'
          valueChanged={handleShapeStyleChange}
          values={activeTool.settings.fontItalic.values}
          value={activeTool.settings.fontItalic.default}
        />
      )}

      {'opacity' in activeTool.settings && !activeTool.settings.opacity.hidden && (
        <RangeField
          saveShapes={saveShapes}
          selectedSettings={selectedSettings}
          setSelectedSettings={setSelectedSettings}
          title='Opacité'
          icon={opacityIcon}
          min={activeTool.settings.opacity.min}
          max={activeTool.settings.opacity.max}
          step={activeTool.settings.opacity.step}
          unity='%'
          disabled={disabled}
          field='opacity'
          value={activeTool.settings.opacity.default}
          valueChanged={handleShapeStyleChange}
        />
      )}
    </>
  ) : null
}

type SettingsBarState = {
  width: number
  activeTool: ToolsType
  /** Only the style of the selection is shown: its geometry changes on each move of a drag */
  selectedStyle: StyleShape | undefined
  selectedShapeIds: string[]
  selectedShapeTool: CustomTool | undefined
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
  const { width, activeTool, selectedStyle, selectedShapeIds, selectedShapeTool } = usePaintState(
    paint,
    selectSettingsBarState,
    isSameSettingsBarState
  )
  const hasSelection = selectedShapeIds.length > 0
  const [selectedSettings, setSelectedSettings] = useState<string | undefined>(undefined)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleTools = () => {
    setIsMenuOpen(prev => !prev)
  }

  const toggleZoom = () => {
    setIsZoomPanelShown(prev => !prev)
  }

  const nbSettingsTools =
    (selectedShapeTool
      ? Object.keys(selectedShapeTool.settings).length + 1
      : 'settings' in activeTool
        ? Object.keys(activeTool.settings).length
        : 0) +
    +layersManipulation +
    +withZoom

  const settingsBreakpoint = nbSettingsTools * SETTING_WIDTH

  const settingsInMenu = width < settingsBreakpoint

  const handleShapeStyleChange = (field: string, value: ToolSettingValue, needHistorySave = true) => {
    if (selectedShapeIds.length) {
      // the tools of the shapes keep the value for the next shapes
      actions.setShapesStyle(selectedShapeIds, { [field as ShapeStyleField]: value }, { save: needHistorySave, updateTool: true })
    } else {
      actions.updateToolSettings(activeTool.id, field, value)
    }
  }

  return (
    <>
      <div className='react-paint-editor-settings-bar'>
        <div className='react-paint-editor-settings-shrinkable'>
          {withZoom && (
            <ZoomButton className={isZoomPanelShown ? 'react-paint-editor-bar-zoom-button-opened' : undefined} toggleZoomPanel={toggleZoom} />
          )}
          {settingsInMenu && nbSettingsTools > 2 && <Button disabled={disabled} onClick={toggleTools} title='Toggle settings' icon={settingsIcon} />}
          {hasSelection
            ? selectedShapeTool && (
                <>
                  {!settingsInMenu && (
                    <SettingsItems
                      saveShapes={actions.saveShapes}
                      activeTool={activeTool}
                      hasSelection={hasSelection}
                      selectedStyle={selectedStyle}
                      selectedShapeTool={selectedShapeTool}
                      disabled={disabled}
                      selectedSettings={selectedSettings}
                      setSelectedSettings={setSelectedSettings}
                      handleShapeStyleChange={handleShapeStyleChange}
                    />
                  )}

                  {activeTool.type === 'selection' && (
                    <DeleteButton disabled={disabled} selectedShapeIds={selectedShapeIds} removeShapes={actions.removeShapes} />
                  )}
                </>
              )
            : !settingsInMenu && (
                <SettingsItems
                  saveShapes={actions.saveShapes}
                  activeTool={activeTool}
                  hasSelection={hasSelection}
                  selectedStyle={selectedStyle}
                  selectedShapeTool={selectedShapeTool}
                  disabled={disabled}
                  selectedSettings={selectedSettings}
                  setSelectedSettings={setSelectedSettings}
                  handleShapeStyleChange={handleShapeStyleChange}
                />
              )}
        </div>
        <div className='react-paint-editor-settings-separator' />
        {layersManipulation && <LayoutButton disabled={disabled} toggleLayoutPanel={toggleLayoutPanel} />}
      </div>
      {isMenuOpen && (
        <Modal className='react-paint-editor-settings-modal' onClose={toggleTools} position='bottom' title='Settings'>
          <SettingsItems
            saveShapes={actions.saveShapes}
            activeTool={activeTool}
            hasSelection={hasSelection}
            selectedStyle={selectedStyle}
            selectedShapeTool={selectedShapeTool}
            disabled={disabled}
            selectedSettings={selectedSettings}
            setSelectedSettings={setSelectedSettings}
            handleShapeStyleChange={handleShapeStyleChange}
          />
        </Modal>
      )}
    </>
  )
}

export default SettingsBar
