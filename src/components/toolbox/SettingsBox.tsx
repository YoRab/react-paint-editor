import _ from 'lodash/fp'
import React from 'react'
import styled from 'styled-components'
import {
  POLYGON_POINTS_VALUES,
  STYLE_COLORS,
  STYLE_FONTS,
  STYLE_LINE_DASH,
  STYLE_LINE_WITH_ARROW,
  STYLE_LINE_WIDTH
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
import { trashIcon } from 'constants/icons'

const StyledSettingsBox = styled.div<{
  hover: boolean
}>`
  user-select: none;
  display: flex;

  ${({ hover }) =>
    hover &&
    `
  position: absolute;
  transform: translate(-50%, 0);
  
  `}

  select {
    // A reset of styles, including removing the default dropdown arrow
    appearance: none;
    // Additional resets for further consistency
    background-color: transparent;
    color: inherit;
    border: none;
    padding: 0 12px 0 0;
    margin: 0;
    font-family: inherit;
    font-size: inherit;
    cursor: inherit;
    line-height: inherit;

    option {
      background-color: black;
    }
  }
`

const StyledSeparator = styled.div`
  flex: 1;
`

const StyleToggleLayoutButton = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: white;

  &:hover:not(:disabled) {
    background: #3a3a3a;
  }
`

const StyledDeleteButton = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: white;

  &:hover:not(:disabled) {
    background: #3a3a3a;
  }

  svg {
    color: inherit;
    width: 16px;
    height: 16px;
  }
`

type DeleteShapeButtonType = {
  selectedShape: DrawableShape
  removeShape: (shape: DrawableShape) => void
}

const DeleteShapeButton = ({ selectedShape, removeShape }: DeleteShapeButtonType) => {
  const handleRemove = () => {
    console.log('remove')
    removeShape(selectedShape)
  }

  return (
    <StyledDeleteButton onClick={handleRemove} dangerouslySetInnerHTML={{__html: trashIcon}}>
    </StyledDeleteButton>
  )
}

type ShapeStyleSelectType = {
  field: string
  values: (string | number)[]
  defaultValue?: number | string | undefined
  valueChanged: (field: string, value: string | number) => void
}

const ShapeStyleSelect = ({ field, values, defaultValue, valueChanged }: ShapeStyleSelectType) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const parsedValue = _.toNumber(event.target.value)
    valueChanged(field, _.isNaN(parsedValue) ? event.target.value : parsedValue)
  }

  return (
    <select onChange={handleChange}>
      {values.map(value => {
        return (
          <option key={value} value={value} selected={defaultValue == value}>
            {value}
          </option>
        )
      })}
    </select>
  )
}

type SettingsBoxType = {
  withLayouts?: 'always' | 'never' | 'visible' | 'hidden'
  activeTool: ToolsType
  settingsHover: boolean
  selectedShape: DrawableShape | undefined
  canvas: HTMLCanvasElement | null
  updateShape: (shape: DrawableShape) => void
  removeShape: (shape: DrawableShape) => void
  defaultConf: StyledShape
  setDefaultConf: React.Dispatch<React.SetStateAction<StyledShape>>
  toggleLayoutPanel: () => void
}

const SettingsBox = ({
  withLayouts,
  toggleLayoutPanel,
  activeTool,
  settingsHover,
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
    ShapeEnum.line,
    ShapeEnum.polygon,
    ShapeEnum.text
  ]
  const handleShapeStyleChange = (field: string, value: string | number) => {
    if (selectedShape) {
      updateShape(_.set(field, value, selectedShape))
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
      updateShape(resizedShape)
    } else {
      setDefaultConf(prevDefaultConf => _.set(field, value, prevDefaultConf))
    }
  }

  const handlePolygonLinesCount = (field: string, value: string | number) => {
    if (selectedShape) {
      updateShape(updatePolygonLinesCount(selectedShape as DrawablePolygon, value as number))
    } else {
      setDefaultConf(prevDefaultConf => _.set(field, value, prevDefaultConf))
    }
  }

  return (
    <StyledSettingsBox hover={settingsHover}>
      {selectedShape ? (
        <>
          {shapes.includes(selectedShape?.type) && (
            <>
              {selectedShape.type === ShapeEnum.polygon && (
                <ShapeStyleSelect
                  field="style.pointsCount"
                  values={POLYGON_POINTS_VALUES}
                  defaultValue={selectedShape.points.length}
                  valueChanged={handlePolygonLinesCount}
                />
              )}
              {selectedShape.type === ShapeEnum.text ? (
                <ShapeStyleSelect
                  field="style.fontFamily"
                  values={STYLE_FONTS}
                  defaultValue={selectedShape.style?.fontFamily}
                  valueChanged={handleShapeFontFamilyChange}
                />
              ) : (
                <>
                  <ShapeStyleSelect
                    field="style.lineWidth"
                    values={STYLE_LINE_WIDTH}
                    defaultValue={selectedShape.style?.lineWidth}
                    valueChanged={handleShapeStyleChange}
                  />
                  <ShapeStyleSelect
                    field="style.lineDash"
                    values={STYLE_LINE_DASH}
                    defaultValue={selectedShape.style?.lineDash}
                    valueChanged={handleShapeStyleChange}
                  />
                </>
              )}

              {selectedShape.type === ShapeEnum.line && (
                <ShapeStyleSelect
                  field="style.lineArrow"
                  values={STYLE_LINE_WITH_ARROW}
                  defaultValue={selectedShape.style?.lineArrow}
                  valueChanged={handleShapeStyleChange}
                />
              )}

              <ShapeStyleSelect
                field="style.strokeColor"
                values={STYLE_COLORS}
                defaultValue={selectedShape.style?.strokeColor}
                valueChanged={handleShapeStyleChange}
              />

              {selectedShape.type !== ShapeEnum.text &&
                selectedShape.type !== ShapeEnum.brush &&
                selectedShape.type !== ShapeEnum.line && (
                  <ShapeStyleSelect
                    field="style.fillColor"
                    values={STYLE_COLORS}
                    defaultValue={selectedShape.style?.fillColor}
                    valueChanged={handleShapeStyleChange}
                  />
                )}
            </>
          )}
          <DeleteShapeButton selectedShape={selectedShape} removeShape={removeShape} />
        </>
      ) : (
        _.includes(activeTool, shapes) && (
          <>
            {activeTool === ShapeEnum.polygon && (
              <ShapeStyleSelect
                field="style.pointsCount"
                values={POLYGON_POINTS_VALUES}
                defaultValue={2}
                valueChanged={handlePolygonLinesCount}
              />
            )}
            {activeTool === ShapeEnum.text ? (
              <ShapeStyleSelect
                field="style.fontFamily"
                values={STYLE_FONTS}
                defaultValue={defaultConf.style?.fontFamily}
                valueChanged={handleShapeStyleChange}
              />
            ) : (
              <>
                <ShapeStyleSelect
                  field="style.lineWidth"
                  values={STYLE_LINE_WIDTH}
                  defaultValue={defaultConf.style?.lineWidth}
                  valueChanged={handleShapeStyleChange}
                />
                <ShapeStyleSelect
                  field="style.lineDash"
                  values={STYLE_LINE_DASH}
                  defaultValue={defaultConf.style?.lineDash}
                  valueChanged={handleShapeStyleChange}
                />
              </>
            )}

            {activeTool === ShapeEnum.line && (
              <ShapeStyleSelect
                field="style.lineArrow"
                values={STYLE_LINE_WITH_ARROW}
                defaultValue={defaultConf.style?.lineArrow}
                valueChanged={handleShapeStyleChange}
              />
            )}

            <ShapeStyleSelect
              field="style.strokeColor"
              values={STYLE_COLORS}
              defaultValue={defaultConf.style?.strokeColor}
              valueChanged={handleShapeStyleChange}
            />

            {activeTool !== ShapeEnum.text &&
              activeTool !== ShapeEnum.brush &&
              activeTool !== ShapeEnum.line && (
                <ShapeStyleSelect
                  field="style.fillColor"
                  values={STYLE_COLORS}
                  defaultValue={defaultConf.style?.fillColor}
                  valueChanged={handleShapeStyleChange}
                />
              )}
          </>
        )
      )}
      <StyledSeparator />
      {withLayouts === 'visible' ||
        (withLayouts === 'hidden' && (
          <StyleToggleLayoutButton onClick={toggleLayoutPanel}>
            Toggle layout
          </StyleToggleLayoutButton>
        ))}
    </StyledSettingsBox>
  )
}

export default SettingsBox
