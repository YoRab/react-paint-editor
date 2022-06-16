import _ from 'lodash/fp'
import React, { useState } from 'react'
import { styled } from '@linaria/react'
import { DrawablePolygon, DrawableShape, DrawableText } from 'types/Shapes'
import { calculateTextFontSize, updatePolygonLinesCount } from 'utils/transform'
import ColorField from './ColorField'
import DeleteButton from './DeleteButton'
import LayoutButton from './LayoutButton'
import RangeField from './RangeField'
import FontFamilyField from './FontFamilyField'
import PointsNumberField from './PointsNumberField'
import LineTypeField from './LineTypeField'
import LineArrowField from './LineArrowField'
import { CustomTool, ToolsType } from 'types/tools'

const StyledSettingsBar = styled.div`
  user-select: none;
  display: flex;
  background: var(--toolbar-bg);
  position: relative;
  height: 36px;
  border-top: 1px solid var(--divider-color);
  box-sizing: border-box;
`

const StyledSeparator = styled.div`
  flex: 1;
`

type SettingsBoxType = {
  disabled?: boolean
  availableTools: CustomTool[]
  layersManipulation?: boolean
  activeTool: ToolsType
  selectedShape: DrawableShape | undefined
  canvas: HTMLCanvasElement | null
  updateShape: (shape: DrawableShape, withSave?: boolean) => void
  removeShape: (shape: DrawableShape) => void
  toggleLayoutPanel: () => void
}

const SettingsBar = ({
  disabled = false,
  availableTools,
  layersManipulation,
  toggleLayoutPanel,
  activeTool,
  selectedShape,
  canvas,
  updateShape,
  removeShape
}: SettingsBoxType) => {
  // const shapes = [
  //   ShapeEnum.brush,
  //   ShapeEnum.ellipse,
  //   ShapeEnum.circle,
  //   ShapeEnum.rect,
  //   ShapeEnum.square,
  //   ShapeEnum.line,
  //   ShapeEnum.polygon,
  //   ShapeEnum.curve,
  //   ShapeEnum.text
  // ]

  const [selectedSettings, setSelectedSettings] = useState<string | undefined>(undefined)

  const handleShapeStyleChange = (field: string, value: string | number) => {
    if (selectedShape) {
      updateShape(_.set(field, value, selectedShape), true)
    }
    // } else {
    //   setDefaultConf(prevDefaultConf => _.set(field, value, prevDefaultConf))
    // }
  }

  const handleShapeFontFamilyChange = (field: string, value: string | number) => {
    if (selectedShape) {
      const ctx = canvas?.getContext('2d')
      if (!ctx) return
      const newShape = _.set(field, value, selectedShape) as DrawableText
      const fontSize = calculateTextFontSize(
        ctx,
        newShape.value,
        newShape.width,
        newShape.style?.fontFamily
      )
      const resizedShape = {
        ...newShape,
        fontSize,
        height: fontSize * newShape.value.length
      }
      updateShape(resizedShape, true)
    }
    // else {
    //   setDefaultConf(prevDefaultConf => _.set(field, value, prevDefaultConf))
    // }
  }

  const handlePolygonLinesCount = (field: string, value: string | number) => {
    if (selectedShape) {
      updateShape(updatePolygonLinesCount(selectedShape as DrawablePolygon, value as number), true)
    }
    // else {
    //   setDefaultConf(prevDefaultConf => _.set(field, value, prevDefaultConf))
    // }
  }

  const selectedShapeTool = selectedShape
    ? (_.find({ id: selectedShape.toolId }, availableTools) || _.find({ type: selectedShape.type }, availableTools))
    : undefined

  return (
    <StyledSettingsBar>
      {selectedShape ? (
        <>
        {selectedShapeTool && (
          <>
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

          {'lineWidth' in selectedShapeTool.settings && (
            <RangeField
              selectedSettings={selectedSettings}
              setSelectedSettings={setSelectedSettings}
              title="Epaisseur du trait"
              disabled={disabled}
              field="style.lineWidth"
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

          {'strokeColor' in selectedShapeTool.settings && (
            <ColorField
              selectedSettings={selectedSettings}
              setSelectedSettings={setSelectedSettings}
              title="Couleur du trait"
              disabled={disabled}
              field="style.strokeColor"
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
              field="style.fillColor"
              value={selectedShape.style?.fillColor}
              valueChanged={handleShapeStyleChange}
              values={selectedShapeTool.settings.fillColor.values}
            />
          )}

          {'opacity' in selectedShapeTool.settings && (
            <RangeField
              selectedSettings={selectedSettings}
              setSelectedSettings={setSelectedSettings}
              title="Opacité"
              min={selectedShapeTool.settings.opacity.min}
              max={selectedShapeTool.settings.opacity.max}
              step={selectedShapeTool.settings.opacity.step}
              unity="%"
              disabled={disabled}
              field="style.globalAlpha"
              value={selectedShape.style?.globalAlpha ?? 100}
              valueChanged={handleShapeStyleChange}
            />
          )}
          </>
        )}

          <DeleteButton
            disabled={disabled}
            selectedShape={selectedShape}
            removeShape={removeShape}
          />
        </>
      ) : (
        'settings' in activeTool && (
          <>
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

            {'lineWidth' in activeTool.settings && (
              <RangeField
                selectedSettings={selectedSettings}
                setSelectedSettings={setSelectedSettings}
                title="Epaisseur du trait"
                disabled={disabled}
                field="style.lineWidth"
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

            {'strokeColor' in activeTool.settings && (
              <ColorField
                selectedSettings={selectedSettings}
                setSelectedSettings={setSelectedSettings}
                title="Couleur du trait"
                disabled={disabled}
                field="style.strokeColor"
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
                field="style.fillColor"
                value={activeTool.settings.fillColor.default}
                valueChanged={handleShapeStyleChange}
                values={activeTool.settings.fillColor.values}
              />
            )}

            {'opacity' in activeTool.settings && (
              <RangeField
                selectedSettings={selectedSettings}
                setSelectedSettings={setSelectedSettings}
                title="Opacité"
                min={activeTool.settings.opacity.min}
                max={activeTool.settings.opacity.max}
                step={activeTool.settings.opacity.step}
                unity="%"
                disabled={disabled}
                field="style.globalAlpha"
                value={activeTool.settings.opacity.default}
                valueChanged={handleShapeStyleChange}
              />
            )}

          </>
        )
      )}
      <StyledSeparator />
      {layersManipulation && (
        <LayoutButton
          layersManipulation={layersManipulation}
          disabled={disabled}
          toggleLayoutPanel={toggleLayoutPanel}
        />
      )}
    </StyledSettingsBar>
  )
}

export default SettingsBar
