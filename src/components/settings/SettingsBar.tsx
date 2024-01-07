import React, { useState } from 'react'
import type { ShapeEntity } from '../../types/Shapes'
import { updatePolygonLinesCount } from '../../utils/shapes/polygon'
import ColorField from './ColorField'
import DeleteButton from './DeleteButton'
import LayoutButton from './LayoutButton'
import RangeField from './RangeField'
import FontFamilyField from './FontFamilyField'
import PointsNumberField from './PointsNumberField'
import LineTypeField from './LineTypeField'
import LineArrowField from './LineArrowField'
import type { CustomTool, ToolsType } from '../../types/tools'
import ToggleField from './ToggleField'
import { boldIcon, italicIcon, lineWidthIcon, opacityIcon, settingsIcon } from '../../constants/icons'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import { calculateTextFontSize } from '../../utils/shapes/text'
import { refreshShape } from '../../utils/shapes'
import './SettingsBar.css'
import { set } from '../../utils/object'
import { updateCurveLinesCount } from 'src/utils/shapes/curve'

const SETTING_WIDTH = 40

type SettingsBoxType = {
  width: number
  disabled?: boolean
  availableTools: CustomTool[]
  updateToolSettings: (toolId: string, field: string, value: string | number | boolean) => void
  layersManipulation?: boolean
  activeTool: ToolsType
  selectedShape: ShapeEntity | undefined
  canvas: HTMLCanvasElement | null
  currentScale: number
  selectionPadding: number
  updateShape: (shape: ShapeEntity, withSave?: boolean) => void
  removeShape: (shape: ShapeEntity) => void
  toggleLayoutPanel: () => void
}

type SettingsItemsType = {
  disabled?: boolean
  activeTool: ToolsType
  selectedShape: ShapeEntity | undefined
  selectedShapeTool: CustomTool | undefined
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  handleShapeStyleChange: (field: string, value: string | number | boolean) => void
  handlePolygonLinesCount: (field: string, value: string | number) => void
  handleShapeFontFamilyChange: (field: string, value: string | number | boolean) => void
}

const SettingsItems = ({
  activeTool,
  selectedShape,
  selectedShapeTool,
  disabled,
  selectedSettings,
  setSelectedSettings,
  handleShapeStyleChange,
  handlePolygonLinesCount,
  handleShapeFontFamilyChange
}: SettingsItemsType) => {
  return selectedShape ? (
    <>
      {selectedShapeTool && (
        <>
          {'strokeColor' in selectedShapeTool.settings && (
            <ColorField
              selectedSettings={selectedSettings}
              setSelectedSettings={setSelectedSettings}
              title="Couleur du trait"
              mode="stroke"
              disabled={disabled}
              field="strokeColor"
              value={selectedShape.style?.strokeColor}
              valueChanged={handleShapeStyleChange}
              values={selectedShapeTool.settings.strokeColor.values}
            />
          )}

          {'fillColor' in selectedShapeTool.settings && (
            <ColorField
              selectedSettings={selectedSettings}
              setSelectedSettings={setSelectedSettings}
              title="Couleur de fond"
              disabled={disabled}
              field="fillColor"
              value={selectedShape.style?.fillColor}
              valueChanged={handleShapeStyleChange}
              values={selectedShapeTool.settings.fillColor.values}
            />
          )}

          {'lineWidth' in selectedShapeTool.settings && (
            <RangeField
              selectedSettings={selectedSettings}
              setSelectedSettings={setSelectedSettings}
              title="Epaisseur du trait"
              icon={lineWidthIcon}
              disabled={disabled}
              field="lineWidth"
              value={selectedShape.style?.lineWidth}
              valueChanged={handleShapeStyleChange}
              unity="px"
              min={selectedShapeTool.settings.lineWidth.min}
              max={selectedShapeTool.settings.lineWidth.max}
              step={selectedShapeTool.settings.lineWidth.step}
            />
          )}

          {'lineDash' in selectedShapeTool.settings && (
            <LineTypeField
              selectedSettings={selectedSettings}
              setSelectedSettings={setSelectedSettings}
              disabled={disabled}
              defaultValue={selectedShape.style?.lineDash}
              valueChanged={handleShapeStyleChange}
              values={selectedShapeTool.settings.lineDash.values}
            />
          )}

          {'lineArrow' in selectedShapeTool.settings && (
            <LineArrowField
              selectedSettings={selectedSettings}
              setSelectedSettings={setSelectedSettings}
              disabled={disabled}
              defaultValue={selectedShape.style?.lineArrow}
              valueChanged={handleShapeStyleChange}
              values={selectedShapeTool.settings.lineArrow.values}
            />
          )}

          {'pointsCount' in selectedShapeTool.settings && (
            <PointsNumberField
              selectedSettings={selectedSettings}
              setSelectedSettings={setSelectedSettings}
              disabled={disabled}
              valueChanged={handlePolygonLinesCount}
              min={selectedShapeTool.settings.pointsCount.min}
              max={selectedShapeTool.settings.pointsCount.max}
              step={selectedShapeTool.settings.pointsCount.step}
              value={selectedShape.style?.pointsCount}
            />
          )}

          {'fontFamily' in selectedShapeTool.settings && (
            <FontFamilyField
              selectedSettings={selectedSettings}
              setSelectedSettings={setSelectedSettings}
              disabled={disabled}
              valueChanged={handleShapeFontFamilyChange}
              values={selectedShapeTool.settings.fontFamily.values}
              defaultValue={selectedShape.style?.fontFamily}
            />
          )}

          {'fontBold' in selectedShapeTool.settings && (
            <ToggleField
              setSelectedSettings={setSelectedSettings}
              disabled={disabled}
              field="fontBold"
              icon={boldIcon}
              valueChanged={handleShapeFontFamilyChange}
              values={selectedShapeTool.settings.fontBold.values}
              value={selectedShape.style?.fontBold}
            />
          )}

          {'fontItalic' in selectedShapeTool.settings && (
            <ToggleField
              setSelectedSettings={setSelectedSettings}
              disabled={disabled}
              field="fontItalic"
              icon={italicIcon}
              valueChanged={handleShapeFontFamilyChange}
              values={selectedShapeTool.settings.fontItalic.values}
              value={selectedShape.style?.fontItalic}
            />
          )}

          {'opacity' in selectedShapeTool.settings && (
            <RangeField
              selectedSettings={selectedSettings}
              setSelectedSettings={setSelectedSettings}
              title="Opacité"
              icon={opacityIcon}
              min={selectedShapeTool.settings.opacity.min}
              max={selectedShapeTool.settings.opacity.max}
              step={selectedShapeTool.settings.opacity.step}
              unity="%"
              disabled={disabled}
              field="opacity"
              value={selectedShape.style?.opacity ?? 100}
              valueChanged={handleShapeStyleChange}
            />
          )}
        </>
      )}
    </>
  ) : 'settings' in activeTool ? (
    <>
      {'strokeColor' in activeTool.settings && (
        <ColorField
          selectedSettings={selectedSettings}
          setSelectedSettings={setSelectedSettings}
          title="Couleur du trait"
          mode="stroke"
          disabled={disabled}
          field="strokeColor"
          value={activeTool.settings.strokeColor.default}
          valueChanged={handleShapeStyleChange}
          values={activeTool.settings.strokeColor.values}
        />
      )}

      {'fillColor' in activeTool.settings && (
        <ColorField
          selectedSettings={selectedSettings}
          setSelectedSettings={setSelectedSettings}
          title="Couleur de fond"
          disabled={disabled}
          field="fillColor"
          value={activeTool.settings.fillColor.default}
          valueChanged={handleShapeStyleChange}
          values={activeTool.settings.fillColor.values}
        />
      )}

      {'lineWidth' in activeTool.settings && (
        <RangeField
          selectedSettings={selectedSettings}
          setSelectedSettings={setSelectedSettings}
          title="Epaisseur du trait"
          disabled={disabled}
          field="lineWidth"
          icon={lineWidthIcon}
          value={activeTool.settings.lineWidth.default}
          valueChanged={handleShapeStyleChange}
          unity="px"
          min={activeTool.settings.lineWidth.min}
          max={activeTool.settings.lineWidth.max}
          step={activeTool.settings.lineWidth.step}
        />
      )}

      {'lineDash' in activeTool.settings && (
        <LineTypeField
          selectedSettings={selectedSettings}
          setSelectedSettings={setSelectedSettings}
          disabled={disabled}
          defaultValue={activeTool.settings.lineDash.default}
          valueChanged={handleShapeStyleChange}
          values={activeTool.settings.lineDash.values}
        />
      )}

      {'lineArrow' in activeTool.settings && (
        <LineArrowField
          selectedSettings={selectedSettings}
          setSelectedSettings={setSelectedSettings}
          disabled={disabled}
          defaultValue={activeTool.settings.lineArrow.default}
          valueChanged={handleShapeStyleChange}
          values={activeTool.settings.lineArrow.values}
        />
      )}
      {'pointsCount' in activeTool.settings && (
        <PointsNumberField
          selectedSettings={selectedSettings}
          setSelectedSettings={setSelectedSettings}
          disabled={disabled}
          valueChanged={handlePolygonLinesCount}
          min={activeTool.settings.pointsCount.min}
          max={activeTool.settings.pointsCount.max}
          step={activeTool.settings.pointsCount.step}
          value={activeTool.settings.pointsCount.default}
        />
      )}

      {'fontFamily' in activeTool.settings && (
        <FontFamilyField
          selectedSettings={selectedSettings}
          setSelectedSettings={setSelectedSettings}
          disabled={disabled}
          valueChanged={handleShapeFontFamilyChange}
          values={activeTool.settings.fontFamily.values}
          defaultValue={activeTool.settings.fontFamily.default}
        />
      )}

      {'fontBold' in activeTool.settings && (
        <ToggleField
          setSelectedSettings={setSelectedSettings}
          disabled={disabled}
          field="fontBold"
          icon={boldIcon}
          valueChanged={handleShapeFontFamilyChange}
          values={activeTool.settings.fontBold.values}
          value={activeTool.settings.fontBold.default}
        />
      )}

      {'fontItalic' in activeTool.settings && (
        <ToggleField
          setSelectedSettings={setSelectedSettings}
          disabled={disabled}
          field="fontItalic"
          icon={italicIcon}
          valueChanged={handleShapeFontFamilyChange}
          values={activeTool.settings.fontItalic.values}
          value={activeTool.settings.fontItalic.default}
        />
      )}

      {'opacity' in activeTool.settings && (
        <RangeField
          selectedSettings={selectedSettings}
          setSelectedSettings={setSelectedSettings}
          title="Opacité"
          icon={opacityIcon}
          min={activeTool.settings.opacity.min}
          max={activeTool.settings.opacity.max}
          step={activeTool.settings.opacity.step}
          unity="%"
          disabled={disabled}
          field="opacity"
          value={activeTool.settings.opacity.default}
          valueChanged={handleShapeStyleChange}
        />
      )}
    </>
  ) : null
}

const SettingsBar = ({
  width,
  disabled = false,
  availableTools,
  updateToolSettings,
  layersManipulation,
  toggleLayoutPanel,
  activeTool,
  selectedShape,
  canvas,
  currentScale,
  selectionPadding,
  updateShape,
  removeShape
}: SettingsBoxType) => {
  const [selectedSettings, setSelectedSettings] = useState<string | undefined>(undefined)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleTools = () => {
    setIsMenuOpen(prev => !prev)
  }

  const selectedShapeTool = selectedShape
    ? availableTools.find(tool => tool.id === selectedShape.toolId) ||
    availableTools.find(tool => tool.type === selectedShape.type)
    : undefined


  const nbSettingsTools =
    (selectedShapeTool
      ? Object.keys(selectedShapeTool.settings).length + 1
      : 'settings' in activeTool
        ? Object.keys(activeTool.settings).length
        : 0) + (layersManipulation ? 1 : 0)

  const settingsBreakpoint = nbSettingsTools * SETTING_WIDTH

  const settingsInMenu = width < settingsBreakpoint

  const handleShapeStyleChange = (field: string, value: string | number | boolean, needHistorySave = true) => {
    if (selectedShape) {
      updateShape(
        refreshShape(set(['style', field], value, selectedShape), currentScale, selectionPadding),
        needHistorySave
      )
      selectedShapeTool && updateToolSettings(selectedShapeTool.id, field, value)
    } else {
      updateToolSettings(activeTool.id, field, value)
    }
  }

  const handleShapeFontFamilyChange = (field: string, value: string | number | boolean) => {
    if (selectedShape) {
      if (selectedShape.type !== 'text') return
      const ctx = canvas?.getContext('2d')
      if (!ctx) return
      const newShape = set(['style', field], value, selectedShape)
      const fontSize = calculateTextFontSize(
        ctx,
        newShape.value,
        newShape.width,
        newShape.style?.fontBold ?? false,
        newShape.style?.fontItalic ?? false,
        newShape.style?.fontFamily
      )
      const resizedShape = refreshShape(
        {
          ...newShape,
          fontSize,
          height: fontSize * newShape.value.length
        },
        currentScale,
        selectionPadding
      )
      updateShape(resizedShape, true)
      selectedShapeTool && updateToolSettings(selectedShapeTool.id, field, value)
    } else {
      updateToolSettings(activeTool.id, field, value)
    }
  }

  const handlePolygonLinesCount = (field: string, value: string | number) => {
    if (selectedShape) {
      if (selectedShape.type !== "polygon" && selectedShape.type !== "curve") return
      updateShape(
        (selectedShape.type === "polygon" ? updatePolygonLinesCount(selectedShape, value as number, currentScale, selectionPadding) :
          updateCurveLinesCount(selectedShape, value as number, currentScale, selectionPadding)),
        true
      )
      selectedShapeTool && updateToolSettings(selectedShapeTool.id, field, value)
    } else {
      updateToolSettings(activeTool.id, field, value)
    }
  }

  return (
    <>
      <div className='react-paint-editor-settings-bar'>
        <div className='react-paint-editor-settings-shrinkable'>

          {settingsInMenu && nbSettingsTools > 2 && (
            <Button
              disabled={disabled}
              onClick={toggleTools}
              title="Toggle settings"
              icon={settingsIcon}
            />
          )}
          {selectedShape ? (
            <>
              {selectedShapeTool && (
                <>
                  {!settingsInMenu && (
                    <SettingsItems
                      activeTool={activeTool}
                      selectedShape={selectedShape}
                      selectedShapeTool={selectedShapeTool}
                      disabled={disabled}
                      selectedSettings={selectedSettings}
                      setSelectedSettings={setSelectedSettings}
                      handleShapeStyleChange={handleShapeStyleChange}
                      handlePolygonLinesCount={handlePolygonLinesCount}
                      handleShapeFontFamilyChange={handleShapeFontFamilyChange}
                    />
                  )}

                  <DeleteButton
                    disabled={disabled}
                    selectedShape={selectedShape}
                    removeShape={removeShape}
                  />
                </>
              )}
            </>
          ) : (
            !settingsInMenu && (
              <SettingsItems
                activeTool={activeTool}
                selectedShape={selectedShape}
                selectedShapeTool={selectedShapeTool}
                disabled={disabled}
                selectedSettings={selectedSettings}
                setSelectedSettings={setSelectedSettings}
                handleShapeStyleChange={handleShapeStyleChange}
                handlePolygonLinesCount={handlePolygonLinesCount}
                handleShapeFontFamilyChange={handleShapeFontFamilyChange}
              />
            )
          )}
        </div>
        <div className='react-paint-editor-settings-separator' />
        {layersManipulation && (
          <LayoutButton
            disabled={disabled}
            toggleLayoutPanel={toggleLayoutPanel}
          />
        )}
      </div>
      {isMenuOpen && (
        <Modal className='react-paint-editor-settings-modal' onClose={toggleTools} position="bottom">
          <SettingsItems
            activeTool={activeTool}
            selectedShape={selectedShape}
            selectedShapeTool={selectedShapeTool}
            disabled={disabled}
            selectedSettings={selectedSettings}
            setSelectedSettings={setSelectedSettings}
            handleShapeStyleChange={handleShapeStyleChange}
            handlePolygonLinesCount={handlePolygonLinesCount}
            handleShapeFontFamilyChange={handleShapeFontFamilyChange}
          />
        </Modal>
      )}
    </>
  )
}

export default SettingsBar
