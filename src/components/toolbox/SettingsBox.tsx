import _ from 'lodash/fp'
import React, { useCallback, useMemo } from 'react'
import styled from 'styled-components'
import {
  POLYGON_POINTS_VALUES,
  STYLE_COLORS,
  STYLE_FONTS,
  STYLE_LINE_DASH,
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
import { getSettingsPosition } from 'utils/intersect'
import deleteIcon from 'assets/icons/trash.svg'
import { calculateTextFontSize, updatePolygonLinesCount } from 'utils/transform'

const StyledSettingsBox = styled.div.attrs<{
  left: number
  top: number
}>(({ left, top }) => ({
  style: {
    left: `${left}px`,
    top: `${top}px`
  }
}))<{
  left: number
  top: number
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

  &:hover:not(:disabled) {
    background: lightgray;
  }

  img {
    width: 16px;
    height: 16px;
  }
`

type DeleteShapeButtonType = {
  selectedShape: DrawableShape
  removeShape: (shape: DrawableShape) => void
}

const DeleteShapeButton = ({ selectedShape, removeShape }: DeleteShapeButtonType) => {
  const handleRemove = useCallback(() => {
    removeShape(selectedShape)
  }, [selectedShape, removeShape])

  return (
    <StyledDeleteButton onClick={handleRemove}>
      <img src={deleteIcon} />
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
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      valueChanged(field, event.target.value)
    },
    [field, valueChanged]
  )

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
  activeTool: ToolsType
  settingsHover: boolean
  selectedShape: DrawableShape | undefined
  canvas: HTMLCanvasElement | null
  givenWidth: number
  givenHeight: number
  updateShape: (shape: DrawableShape) => void
  removeShape: (shape: DrawableShape) => void
  defaultConf: StyledShape
  setDefaultConf: React.Dispatch<React.SetStateAction<StyledShape>>
}

const SettingsBox = ({
  activeTool,
  settingsHover,
  selectedShape,
  canvas,
  givenWidth,
  givenHeight,
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
  const handleShapeStyleChange = useCallback(
    (field: string, value: string | number) => {
      if (selectedShape) {
        updateShape(_.set(field, value, selectedShape))
      } else {
        setDefaultConf(prevDefaultConf => _.set(field, value, prevDefaultConf))
      }
    },
    [selectedShape, updateShape, setDefaultConf]
  )

  const handleShapeFontFamilyChange = useCallback(
    (field: string, value: string | number) => {
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
    },
    [canvas, selectedShape, updateShape, setDefaultConf]
  )

  const handlePolygonLinesCount = useCallback(
    (field: string, value: string | number) => {
      if (selectedShape) {
        updateShape(updatePolygonLinesCount(selectedShape as DrawablePolygon, value as number))
      } else {
        setDefaultConf(prevDefaultConf => _.set(field, value, prevDefaultConf))
      }
    },
    [selectedShape, updateShape, setDefaultConf]
  )

  const pointPosition = useMemo(() => {
    return settingsHover && selectedShape
      ? getSettingsPosition(selectedShape, canvas, givenWidth, givenHeight)
      : [0, 0]
  }, [selectedShape, settingsHover, canvas, givenWidth, givenHeight])

  return (
    <StyledSettingsBox hover={settingsHover} left={pointPosition[0]} top={pointPosition[1]}>
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
    </StyledSettingsBox>
  )
}

export default SettingsBox
