import _ from 'lodash/fp'
import React, { useState } from 'react'
import { styled } from '@linaria/react'
import {
  DrawablePolygon,
  DrawableShape,
  DrawableText,
  ShapeEnum,
  StyledShape,
  ToolsType
} from 'types/Shapes'
import { calculateTextFontSize, updatePolygonLinesCount } from 'utils/transform'
import ColorField from './ColorField'
import DeleteButton from './DeleteButton'
import LayoutButton from './LayoutButton'
import RangeField from './RangeField'
import FontFamilyField from './FontFamilyField'
import PointsNumberField from './PointsNumberField'
import LineTypeField from './LineTypeField'
import LineArrowField from './LineArrowField'
import { CURVE_POINTS_VALUES, POLYGON_POINTS_VALUES } from 'constants/style'

const StyledSettingsBar = styled.div`
  user-select: none;
  display: flex;
  background: var(--bg-color);
  position: relative;
  min-height: 36px;
`

const StyledSeparator = styled.div`
  flex: 1;
`

type SettingsBoxType = {
  disabled?: boolean
  layersManipulation?: boolean
  activeTool: ToolsType
  selectedShape: DrawableShape | undefined
  canvas: HTMLCanvasElement | null
  updateShape: (shape: DrawableShape, withSave?: boolean) => void
  removeShape: (shape: DrawableShape) => void
  defaultConf: StyledShape
  setDefaultConf: React.Dispatch<React.SetStateAction<StyledShape>>
  toggleLayoutPanel: () => void
}

const SettingsBar = ({
  disabled = false,
  layersManipulation,
  toggleLayoutPanel,
  activeTool,
  selectedShape,
  canvas,
  updateShape,
  removeShape,
  defaultConf,
  setDefaultConf
}: SettingsBoxType) => {
  const shapes = [
    ShapeEnum.brush,
    ShapeEnum.ellipse,
    ShapeEnum.circle,
    ShapeEnum.rect,
    ShapeEnum.square,
    ShapeEnum.line,
    ShapeEnum.polygon,
    ShapeEnum.curve,
    ShapeEnum.text
  ]

  const [selectedSettings, setSelectedSettings] = useState<string | undefined>(undefined)

  const handleShapeStyleChange = (field: string, value: string | number) => {
    if (selectedShape) {
      updateShape(_.set(field, value, selectedShape), true)
    } else {
      setDefaultConf(prevDefaultConf => _.set(field, value, prevDefaultConf))
    }
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
    } else {
      setDefaultConf(prevDefaultConf => _.set(field, value, prevDefaultConf))
    }
  }

  const handlePolygonLinesCount = (field: string, value: string | number) => {
    if (selectedShape) {
      updateShape(updatePolygonLinesCount(selectedShape as DrawablePolygon, value as number), true)
    } else {
      setDefaultConf(prevDefaultConf => _.set(field, value, prevDefaultConf))
    }
  }

  return (
    <StyledSettingsBar>
      {selectedShape ? (
        <>
          {shapes.includes(selectedShape?.type) && (
            <>
              {(selectedShape.type === ShapeEnum.polygon ||
                selectedShape.type === ShapeEnum.curve) && (
                <PointsNumberField
                  selectedSettings={selectedSettings}
                  setSelectedSettings={setSelectedSettings}
                  disabled={disabled}
                  defaultValue={selectedShape.points.length}
                  valueChanged={handlePolygonLinesCount}
                  values={
                    selectedShape.type === ShapeEnum.curve
                      ? CURVE_POINTS_VALUES
                      : POLYGON_POINTS_VALUES
                  }
                />
              )}
              {selectedShape.type === ShapeEnum.text ? (
                <FontFamilyField
                  selectedSettings={selectedSettings}
                  setSelectedSettings={setSelectedSettings}
                  disabled={disabled}
                  defaultValue={selectedShape.style?.fontFamily}
                  valueChanged={handleShapeFontFamilyChange}
                />
              ) : (
                <>
                  <RangeField
                    selectedSettings={selectedSettings}
                    setSelectedSettings={setSelectedSettings}
                    title="Epaisseur du trait"
                    disabled={disabled}
                    field="style.lineWidth"
                    value={selectedShape.style?.lineWidth}
                    valueChanged={handleShapeStyleChange}
                    unity="px"
                  />
                  <LineTypeField
                    selectedSettings={selectedSettings}
                    setSelectedSettings={setSelectedSettings}
                    disabled={disabled}
                    defaultValue={selectedShape.style?.lineDash}
                    valueChanged={handleShapeStyleChange}
                  />
                </>
              )}

              {selectedShape.type === ShapeEnum.line && (
                <LineArrowField
                  selectedSettings={selectedSettings}
                  setSelectedSettings={setSelectedSettings}
                  disabled={disabled}
                  defaultValue={selectedShape.style?.lineArrow}
                  valueChanged={handleShapeStyleChange}
                />
              )}

              <ColorField
                selectedSettings={selectedSettings}
                setSelectedSettings={setSelectedSettings}
                title="Couleur du trait"
                disabled={disabled}
                field="style.strokeColor"
                value={selectedShape.style?.strokeColor}
                valueChanged={handleShapeStyleChange}
              />

              {selectedShape.type !== ShapeEnum.text &&
                selectedShape.type !== ShapeEnum.brush &&
                selectedShape.type !== ShapeEnum.line && (
                  <ColorField
                    selectedSettings={selectedSettings}
                    setSelectedSettings={setSelectedSettings}
                    title="Couleur de fond"
                    disabled={disabled}
                    field="style.fillColor"
                    value={selectedShape.style?.fillColor}
                    valueChanged={handleShapeStyleChange}
                  />
                )}
            </>
          )}
          <RangeField
            selectedSettings={selectedSettings}
            setSelectedSettings={setSelectedSettings}
            title="Opacité"
            min={0}
            max={100}
            step={1}
            unity="%"
            disabled={disabled}
            field="style.globalAlpha"
            value={selectedShape.style?.globalAlpha ?? 100}
            valueChanged={handleShapeStyleChange}
          />
          <DeleteButton
            disabled={disabled}
            selectedShape={selectedShape}
            removeShape={removeShape}
          />
        </>
      ) : (
        _.includes(activeTool, shapes) && (
          <>
            {(activeTool === ShapeEnum.polygon || activeTool === ShapeEnum.curve) && (
              <PointsNumberField
                selectedSettings={selectedSettings}
                setSelectedSettings={setSelectedSettings}
                disabled={disabled}
                defaultValue={3}
                valueChanged={handlePolygonLinesCount}
                values={
                  activeTool === ShapeEnum.curve ? CURVE_POINTS_VALUES : POLYGON_POINTS_VALUES
                }
              />
            )}
            {activeTool === ShapeEnum.text ? (
              <FontFamilyField
                selectedSettings={selectedSettings}
                setSelectedSettings={setSelectedSettings}
                disabled={disabled}
                defaultValue={defaultConf.style?.fontFamily}
                valueChanged={handleShapeStyleChange}
              />
            ) : (
              <>
                <RangeField
                  selectedSettings={selectedSettings}
                  setSelectedSettings={setSelectedSettings}
                  title="Epaisseur du trait"
                  disabled={disabled}
                  field="style.lineWidth"
                  value={defaultConf.style?.lineWidth}
                  valueChanged={handleShapeStyleChange}
                  unity="px"
                />
                <LineTypeField
                  selectedSettings={selectedSettings}
                  setSelectedSettings={setSelectedSettings}
                  disabled={disabled}
                  defaultValue={defaultConf.style?.lineDash}
                  valueChanged={handleShapeStyleChange}
                />
              </>
            )}

            {activeTool === ShapeEnum.line && (
              <LineArrowField
                selectedSettings={selectedSettings}
                setSelectedSettings={setSelectedSettings}
                disabled={disabled}
                defaultValue={defaultConf.style?.lineArrow}
                valueChanged={handleShapeStyleChange}
              />
            )}

            <ColorField
              selectedSettings={selectedSettings}
              setSelectedSettings={setSelectedSettings}
              title="Couleur du trait"
              disabled={disabled}
              field="style.strokeColor"
              value={defaultConf.style?.strokeColor}
              valueChanged={handleShapeStyleChange}
            />

            {activeTool !== ShapeEnum.text &&
              activeTool !== ShapeEnum.brush &&
              activeTool !== ShapeEnum.line && (
                <ColorField
                  selectedSettings={selectedSettings}
                  setSelectedSettings={setSelectedSettings}
                  title="Couleur de fond"
                  disabled={disabled}
                  field="style.fillColor"
                  value={defaultConf.style?.fillColor}
                  valueChanged={handleShapeStyleChange}
                />
              )}

            <RangeField
              selectedSettings={selectedSettings}
              setSelectedSettings={setSelectedSettings}
              title="Opacité"
              min={0}
              max={100}
              step={1}
              unity="%"
              disabled={disabled}
              field="style.globalAlpha"
              value={defaultConf.style?.globalAlpha}
              valueChanged={handleShapeStyleChange}
            />
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
