import _ from 'lodash/fp'
import React, { useState } from 'react'
import { styled } from '@linaria/react'
import {
  POLYGON_POINTS_VALUES,
  STYLE_FONTS,
  STYLE_LINE_DASH,
  STYLE_LINE_WITH_ARROW
} from 'constants/style'
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
import SelectField from './SelectField'
import DeleteButton from './DeleteButton'
import LayoutButton from './LayoutButton'
import RangeField from './RangeField'

const StyledSettingsBar = styled.div`
  user-select: none;
  display: flex;
  background: var(--bg-color);
  position: relative;
`

const StyledSeparator = styled.div`
  flex: 1;
`

type SettingsBoxType = {
  disabled?: boolean
  withLayouts?: 'always' | 'never' | 'visible' | 'hidden'
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
  withLayouts,
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
              {selectedShape.type === ShapeEnum.polygon && (
                <SelectField
                  selectedSettings={selectedSettings}
                  setSelectedSettings={setSelectedSettings}
                  title="Nombre de points"
                  disabled={disabled}
                  field="style.pointsCount"
                  values={POLYGON_POINTS_VALUES}
                  defaultValue={selectedShape.points.length}
                  valueChanged={handlePolygonLinesCount}
                />
              )}
              {selectedShape.type === ShapeEnum.text ? (
                <SelectField
                  selectedSettings={selectedSettings}
                  setSelectedSettings={setSelectedSettings}
                  title="Font"
                  disabled={disabled}
                  field="style.fontFamily"
                  values={STYLE_FONTS}
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
                  />
                  <SelectField
                    selectedSettings={selectedSettings}
                    setSelectedSettings={setSelectedSettings}
                    title="Type de traits"
                    disabled={disabled}
                    field="style.lineDash"
                    values={STYLE_LINE_DASH}
                    defaultValue={selectedShape.style?.lineDash}
                    valueChanged={handleShapeStyleChange}
                  />
                </>
              )}

              {selectedShape.type === ShapeEnum.line && (
                <SelectField
                  selectedSettings={selectedSettings}
                  setSelectedSettings={setSelectedSettings}
                  title="Flèches"
                  disabled={disabled}
                  field="style.lineArrow"
                  values={STYLE_LINE_WITH_ARROW}
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
            {activeTool === ShapeEnum.polygon && (
              <SelectField
                selectedSettings={selectedSettings}
                setSelectedSettings={setSelectedSettings}
                title="Nombre de points"
                disabled={disabled}
                field="style.pointsCount"
                values={POLYGON_POINTS_VALUES}
                defaultValue={2}
                valueChanged={handlePolygonLinesCount}
              />
            )}
            {activeTool === ShapeEnum.text ? (
              <SelectField
                selectedSettings={selectedSettings}
                setSelectedSettings={setSelectedSettings}
                title="Font"
                disabled={disabled}
                field="style.fontFamily"
                values={STYLE_FONTS}
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
                />
                <SelectField
                  selectedSettings={selectedSettings}
                  setSelectedSettings={setSelectedSettings}
                  title="Type de traits"
                  disabled={disabled}
                  field="style.lineDash"
                  values={STYLE_LINE_DASH}
                  defaultValue={defaultConf.style?.lineDash}
                  valueChanged={handleShapeStyleChange}
                />
              </>
            )}

            {activeTool === ShapeEnum.line && (
              <SelectField
                selectedSettings={selectedSettings}
                setSelectedSettings={setSelectedSettings}
                title="Flèches"
                disabled={disabled}
                field="style.lineArrow"
                values={STYLE_LINE_WITH_ARROW}
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

      <LayoutButton
        withLayouts={withLayouts}
        disabled={disabled}
        toggleLayoutPanel={toggleLayoutPanel}
      />
    </StyledSettingsBar>
  )
}

export default SettingsBar
