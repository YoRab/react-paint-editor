import _ from 'lodash/fp'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  DrawableShape,
  DrawableShapeJson,
  Point,
  StyledShape,
  ToolEnum,
  ToolsType
} from 'types/Shapes'
import Canvas from './Canvas'
import Layouts from './toolbox/Layouts'
import Toolbox from './toolbox/Toolbox'
import styled from 'styled-components'
import SettingsBox from './toolbox/SettingsBox'
import { STYLE_FONT_DEFAULT } from 'constants/style'
import { useKeyboard } from 'hooks/useKeyboard'
import {
  decodeJson,
  decodePicturesInShapes,
  downloadFile,
  encodeShapesInString,
  validateJson
} from 'utils/file'
import { SelectionModeData, SelectionModeLib } from 'types/Mode'

const StyledApp = styled.div<{
  toolboxposition: 'top' | 'left'
}>`
  display: flex;
  width: fit-content;
  background:#ededed
  flex-direction: ${({ toolboxposition }) => (toolboxposition === 'top' ? 'column' : 'row')};
`

const StyledRow = styled.div`
  display: flex;
  flex-direction: row;
  position: relative;
`

type AppType = {
  hover?: boolean
  settingsHover?: boolean
  toolboxPosition?: 'top' | 'left'
  width?: number
  height?: number
  withLayouts?: 'always' | 'never' | 'visible' | 'hidden'
  className?: string
}

const App = ({
  hover = false,
  settingsHover = false,
  toolboxPosition = 'top',
  width = 1000,
  height = 600,
  withLayouts = 'hidden',
  className
}: AppType) => {
  const [defaultConf, setDefaultConf] = useState<StyledShape>({
    style: {
      fillColor: 'transparent',
      strokeColor: 'black',
      lineWidth: 1,
      lineDash: 0,
      lineArrow: 0,
      pointsCount: 2,
      fontFamily: STYLE_FONT_DEFAULT
    }
  })
  const componentRef = useRef<HTMLDivElement>(null)

  const [isLayoutPanelShown, setIsLayoutPanelShown] = useState(
    withLayouts === 'always' || withLayouts === 'visible'
  )
  const [canvasOffset, setCanvasOffset] = useState<Point>([0, 0])
  const [canvasOffsetStartPosition, setCanvasOffsetStartPosition] = useState<Point | undefined>(
    undefined
  )
  const [activeTool, setActiveTool] = useState<ToolsType>(ToolEnum.selection)
  const [selectedShape, setSelectedShape] = useState<DrawableShape | undefined>(undefined)

  const shapesRef = useRef<DrawableShape[]>([])

  const [savedShapes, setSavedShapes] = useState<{
    states: {
      shapes: DrawableShape[]
      selectedShape: DrawableShape | undefined
    }[]
    cursor: number
  }>({
    states: [{ shapes: [], selectedShape: undefined }],
    cursor: 0
  })

  const [selectionMode, setSelectionMode] = useState<SelectionModeData<Point | number>>({
    mode: SelectionModeLib.default
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const selectTool = useCallback((tool: ToolsType) => {
    setSelectedShape(undefined)
    setActiveTool(tool)
  }, [])

  const saveShapes = useCallback(() => {
    setSavedShapes(prevSavedShaped => {
      return _.isEqual(
        _.get([prevSavedShaped.cursor, 'shapes'], prevSavedShaped.states),
        shapesRef.current
      )
        ? prevSavedShaped
        : {
            states: [
              ...prevSavedShaped.states.slice(0, prevSavedShaped.cursor + 1),
              {
                shapes: shapesRef.current,
                selectedShape
              }
            ],
            cursor: prevSavedShaped.cursor + 1
          }
    })
  }, [selectedShape])

  const undoAction = useCallback(() => {
    selectTool(ToolEnum.selection)

    setSavedShapes(prevSavedShaped => {
      const newCursor = Math.max(0, prevSavedShaped.cursor - 1)
      shapesRef.current = _.get([newCursor, 'shapes'], prevSavedShaped.states)
      setSelectedShape(_.get([newCursor, 'selectedShape'], prevSavedShaped.states))
      return _.set('cursor', newCursor, prevSavedShaped)
    })
  }, [selectTool])

  const redoAction = useCallback(() => {
    selectTool(ToolEnum.selection)

    setSavedShapes(prevSavedShaped => {
      const newCursor = Math.min(prevSavedShaped.states.length - 1, prevSavedShaped.cursor + 1)
      shapesRef.current = _.get([newCursor, 'shapes'], prevSavedShaped.states)
      setSelectedShape(_.get([newCursor, 'selectedShape'], prevSavedShaped.states))
      return _.set('cursor', newCursor, prevSavedShaped)
    })
  }, [selectTool])

  const addShape = useCallback((newShape: DrawableShape) => {
    shapesRef.current = [newShape, ...shapesRef.current]
  }, [])

  const updateShape = useCallback(
    (updatedShape: DrawableShape) => {
      shapesRef.current = shapesRef.current.map(marker => {
        return marker.id === selectedShape?.id ? updatedShape : marker
      })
      setSelectedShape(prevSelectedShape =>
        prevSelectedShape?.id === updatedShape.id ? updatedShape : prevSelectedShape
      )
    },
    [selectedShape]
  )

  const updateShapes = useCallback(
    (newShapes: DrawableShape[]) => {
      const pureShapes = newShapes.map(shape => _.omit(['chosen'], shape)) as DrawableShape[]
      shapesRef.current = pureShapes
      saveShapes()
    },
    [saveShapes]
  )

  const removeShape = useCallback(
    (shape: DrawableShape) => {
      setSelectedShape(prevSelectedShape =>
        prevSelectedShape?.id === shape.id ? undefined : prevSelectedShape
      )
      shapesRef.current = _.remove({ id: shape.id }, shapesRef.current)
      saveShapes()
    },
    [saveShapes]
  )

  const clearCanvas = useCallback(
    (shapesToInit: DrawableShape[] = []) => {
      setSelectedShape(undefined)
      shapesRef.current = shapesToInit
      setSavedShapes({
        states: [{ shapes: shapesToInit, selectedShape: undefined }],
        cursor: 0
      })
      selectTool(ToolEnum.selection)
      setCanvasOffset([0, 0])
    },
    [selectTool]
  )

  const exportCanvasInFile = useCallback(() => {
    const dataURL = canvasRef.current?.toDataURL('image/png')
    if (!dataURL) return
    downloadFile(dataURL, 'drawing.png')
  }, [])

  const saveFile = useCallback(() => {
    const content = encodeShapesInString(shapesRef.current)
    if (!content) return
    downloadFile(content, 'drawing.json')
  }, [])

  const loadJson = useCallback(
    (json: unknown) => {
      try {
        const isValidated = validateJson(json)
        if (!isValidated) throw new Error('Le fichier est corrompu')
        const shapes = decodePicturesInShapes(json as DrawableShapeJson[])
        clearCanvas(shapes)
      } catch (e) {
        console.warn(e)
      }
    },
    [clearCanvas]
  )

  const loadFile = useCallback(
    async (file: File) => {
      try {
        const json = await decodeJson(file)
        loadJson(json)
      } catch (e) {
        console.warn(e)
      }
    },
    [loadJson]
  )

  const onPasteShape = useCallback(
    (shape: DrawableShape) => {
      addShape(shape)
      setActiveTool(ToolEnum.selection)
      setSelectedShape(shape)
    },
    [addShape]
  )

  const { isInsideComponent } = useKeyboard({
    selectionMode,
    componentRef,
    selectedShape,
    setSelectedShape,
    removeShape,
    onPasteShape,
    updateShape
  })

  useEffect(() => {
    if (!isInsideComponent) setSelectedShape(undefined)
  }, [isInsideComponent])
  const hasActionToUndo = savedShapes.cursor > 0
  const hasActionToRedo = savedShapes.cursor < savedShapes.states.length - 1
  const hasActionToClear = savedShapes.states.length > 1

  return (
    <StyledApp ref={componentRef} toolboxposition={toolboxPosition} className={className}>
      <Toolbox
        activeTool={activeTool}
        clearCanvas={clearCanvas}
        setSelectedShape={setSelectedShape}
        setActiveTool={selectTool}
        exportCanvasInFile={exportCanvasInFile}
        saveFile={saveFile}
        loadFile={loadFile}
        addShape={addShape}
        hasActionToUndo={hasActionToUndo}
        hasActionToRedo={hasActionToRedo}
        hasActionToClear={hasActionToClear}
        undoAction={undoAction}
        redoAction={redoAction}
        toolboxPosition={toolboxPosition}
        hover={hover}
      />
      <StyledRow>
        <Canvas
          isInsideComponent={isInsideComponent}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          canvasOffsetStartPosition={canvasOffsetStartPosition}
          setCanvasOffsetStartPosition={setCanvasOffsetStartPosition}
          shapes={shapesRef.current}
          addShape={addShape}
          updateSingleShape={updateShape}
          selectedShape={selectedShape}
          setSelectedShape={setSelectedShape}
          canvasOffset={canvasOffset}
          setCanvasOffset={setCanvasOffset}
          defaultConf={defaultConf}
          saveShapes={saveShapes}
          ref={canvasRef}
          width={width}
          height={height}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
        />
        {isLayoutPanelShown && (
          <Layouts
            shapes={shapesRef.current}
            updateShapes={updateShapes}
            selectedShape={selectedShape}
            removeShape={removeShape}
            setSelectedShape={setSelectedShape}
            setActiveTool={setActiveTool}
            hover={hover}
          />
        )}
      </StyledRow>
      {(!settingsHover || selectedShape) && (
        <SettingsBox
          activeTool={activeTool}
          settingsHover={settingsHover}
          selectedShape={selectedShape}
          removeShape={removeShape}
          updateShape={updateShape}
          defaultConf={defaultConf}
          setDefaultConf={setDefaultConf}
          canvas={canvasRef.current}
          withLayouts={withLayouts}
          toggleLayoutPanel={() => {
            setIsLayoutPanelShown(prev => !prev)
          }}
        />
      )}
    </StyledApp>
  )
}

export default App
