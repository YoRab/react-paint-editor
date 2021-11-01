import _ from 'lodash/fp'
import React, { useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { STYLE_COLORS, STYLE_LINE_WIDTH } from 'constants/style'
import { DrawableShape, ShapeEnum, StyledShape, ToolsType } from 'types/Shapes'
import { getSettingsPosition } from 'utils/intersect'
import deleteIcon from 'assets/icons/trash.svg'

const POSITION_DELAY = 50

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
}>`
  position: absolute;
  user-select: none;
  display: flex;
  transform: translate(-50%, 0);
  transition: all ${POSITION_DELAY * 2}ms ease-out;
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
          <option key={value} value={value} selected={defaultValue === `${value}`}>
            {value}
          </option>
        )
      })}
    </select>
  )
}

const getSettingsPositionDebounced = _.throttle(
  POSITION_DELAY,
  (
    selectedShape: DrawableShape,
    canvas: HTMLCanvasElement | null,
    givenWidth: number,
    givenHeight: number
  ) => getSettingsPosition(selectedShape, canvas, givenWidth, givenHeight)
)

type SettingsBoxType = {
  activeTool: ToolsType
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
  selectedShape,
  canvas,
  givenWidth,
  givenHeight,
  updateShape,
  removeShape,
  defaultConf,
  setDefaultConf
}: SettingsBoxType) => {
  const shapes = [ShapeEnum.ellipse, ShapeEnum.circle, ShapeEnum.rect]
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

  const pointPosition = useMemo(() => {
    return (
      (selectedShape &&
        getSettingsPositionDebounced(selectedShape, canvas, givenWidth, givenHeight)) ?? [0, 0]
    )
  }, [selectedShape, canvas, givenWidth, givenHeight])

  return (
    <StyledSettingsBox left={pointPosition[0]} top={pointPosition[1]}>
      {selectedShape ? (
        <>
          {shapes.includes(selectedShape?.type) && (
            <>
              <ShapeStyleSelect
                field="style.lineWidth"
                values={STYLE_LINE_WIDTH}
                defaultValue={selectedShape.style?.lineWidth}
                valueChanged={handleShapeStyleChange}
              />
              <ShapeStyleSelect
                field="style.strokeColor"
                values={STYLE_COLORS}
                defaultValue={selectedShape.style?.strokeColor}
                valueChanged={handleShapeStyleChange}
              />
              <ShapeStyleSelect
                field="style.fillColor"
                values={STYLE_COLORS}
                defaultValue={selectedShape.style?.fillColor}
                valueChanged={handleShapeStyleChange}
              />
            </>
          )}
          <DeleteShapeButton selectedShape={selectedShape} removeShape={removeShape} />
        </>
      ) : (
        _.includes(activeTool, shapes) && (
          <>
            <ShapeStyleSelect
              field="style.lineWidth"
              values={STYLE_LINE_WIDTH}
              defaultValue={defaultConf.style?.lineWidth}
              valueChanged={handleShapeStyleChange}
            />
            <ShapeStyleSelect
              field="style.strokeColor"
              values={STYLE_COLORS}
              defaultValue={defaultConf.style?.strokeColor}
              valueChanged={handleShapeStyleChange}
            />
            <ShapeStyleSelect
              field="style.fillColor"
              values={STYLE_COLORS}
              defaultValue={defaultConf.style?.fillColor}
              valueChanged={handleShapeStyleChange}
            />
          </>
        )
      )}
    </StyledSettingsBox>
  )
}

export default SettingsBox
