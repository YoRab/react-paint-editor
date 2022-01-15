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
import useKeyboard from 'hooks/useKeyboard'
import {
  decodeJson,
  decodePicturesInShapes,
  downloadFile,
  encodeShapesInString,
  validateJson
} from 'utils/file'
import { SelectionModeData, SelectionModeLib } from 'types/Mode'
import useComponent from 'hooks/useComponent'
import useShapes from 'hooks/useShapes'
import SnackbarContainer from './common/Snackbar'
import useSnackbar from 'hooks/useSnackbar'
import { SnackbarTypeEnum } from 'constants/snackbar'

const StyledApp = styled.div<{
  toolboxposition: 'top' | 'left'
}>`
  display: flex;
  width: fit-content;
  background: #ededed;
  position: relative;
  max-width: 100%;
  flex-direction: ${({ toolboxposition }) => (toolboxposition === 'top' ? 'column' : 'row')};
`

const StyledRow = styled.div<{
  width: number
  height: number
}>`
  display: flex;
  flex-direction: row;
  position: relative;
  max-width: 100%;
  ${({ width, height }) => `
    width:${width}px;
    aspect-ratio:${width / height}
  `}
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
  const componentRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { isInsideComponent } = useComponent({
    componentRef
  })

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

  const [isLayoutPanelShown, setIsLayoutPanelShown] = useState(
    withLayouts === 'always' || withLayouts === 'visible'
  )
  const [canvasOffset, setCanvasOffset] = useState<Point>([0, 0])
  const [canvasOffsetStartPosition, setCanvasOffsetStartPosition] = useState<Point | undefined>(
    undefined
  )
  const [activeTool, setActiveTool] = useState<ToolsType>(ToolEnum.selection)

  const [selectionMode, setSelectionMode] = useState<SelectionModeData<Point | number>>({
    mode: SelectionModeLib.default
  })

  const {
    shapesRef,
    selectedShape,
    addShape,
    addPictureShape,
    moveShapes,
    setSelectedShape,
    removeShape,
    updateShape,
    backwardShape,
    forwardShape,
    clearShapes,
    saveShapes,
    canGoBackward,
    canGoForward,
    canClear
  } = useShapes()

  const { snackbarList, addSnackbar } = useSnackbar()

  const selectTool = useCallback(
    (tool: ToolsType) => {
      setSelectedShape(undefined)
      setActiveTool(tool)
    },
    [setSelectedShape]
  )

  const undoAction = useCallback(() => {
    selectTool(ToolEnum.selection)
    backwardShape()
  }, [selectTool, backwardShape])

  const redoAction = useCallback(() => {
    selectTool(ToolEnum.selection)
    forwardShape()
  }, [selectTool, forwardShape])

  const clearCanvas = useCallback(
    (shapesToInit: DrawableShape[] = []) => {
      clearShapes(shapesToInit)
      selectTool(ToolEnum.selection)
      setCanvasOffset([0, 0])
    },
    [selectTool, clearShapes]
  )

  const selectShape = useCallback(
    (shape: DrawableShape) => {
      setActiveTool(ToolEnum.selection)
      setSelectedShape(shape)
    },
    [setSelectedShape]
  )

  const pasteShape = useCallback(
    (shape: DrawableShape) => {
      addShape(shape)
      selectShape(shape)
    },
    [addShape, selectShape]
  )

  const exportCanvasInFile = useCallback(() => {
    addSnackbar({ type: SnackbarTypeEnum.Infos, text: 'Export en cours...' })
    const dataURL = canvasRef.current?.toDataURL('image/png')
    if (!dataURL) {
      addSnackbar({ type: SnackbarTypeEnum.Error, text: "L'export a échoué" })
      return
    }
    downloadFile(dataURL, 'drawing.png')
    addSnackbar({ type: SnackbarTypeEnum.Success, text: 'Export terminé !' })
  }, [addSnackbar])

  const saveFile = useCallback(() => {
    addSnackbar({ type: SnackbarTypeEnum.Infos, text: 'Enregistrement...' })
    const content = encodeShapesInString(shapesRef.current)
    if (!content) {
      addSnackbar({ type: SnackbarTypeEnum.Error, text: "L'enregistrement a échoué" })
      return
    }
    downloadFile(content, 'drawing.json')
    addSnackbar({ type: SnackbarTypeEnum.Success, text: 'Fichier enregistré !' })
  }, [shapesRef, addSnackbar])

  const loadJson = useCallback(
    async (json: unknown) => {
      const isValidated = validateJson(json)
      if (!isValidated) throw new Error('Le fichier est corrompu')
      const shapes = await decodePicturesInShapes(json as DrawableShapeJson[])
      clearCanvas(shapes)
    },
    [clearCanvas]
  )

  const loadFile = useCallback(
    async (file: File) => {
      try {
        addSnackbar({ type: SnackbarTypeEnum.Infos, text: 'Chargement...' })

        const json = await decodeJson(file)
        await loadJson(json)
        addSnackbar({ type: SnackbarTypeEnum.Success, text: 'Fichier chargé !' })
      } catch (e) {
        if (e instanceof Error) {
          addSnackbar({ type: SnackbarTypeEnum.Error, text: e.message })
        } else {
          console.warn(e)
        }
      }
    },
    [loadJson, addSnackbar]
  )

  const addPicture = useCallback(
    async (file: File) => {
      const pictureShape = await addPictureShape(file)
      selectShape(pictureShape)
    },
    [addPictureShape, selectShape]
  )

  useKeyboard({
    isInsideComponent,
    isEditingText: selectionMode.mode === SelectionModeLib.textedition,
    selectedShape,
    setSelectedShape,
    removeShape,
    pasteShape,
    updateShape,
    backwardShape,
    forwardShape
  })

  useEffect(() => {
    if (!isInsideComponent) setSelectedShape(undefined)
  }, [isInsideComponent, setSelectedShape])

  return (
    <StyledApp ref={componentRef} toolboxposition={toolboxPosition} className={className}>
      <Toolbox
        activeTool={activeTool}
        clearCanvas={clearCanvas}
        setActiveTool={selectTool}
        exportCanvasInFile={exportCanvasInFile}
        saveFile={saveFile}
        loadFile={loadFile}
        addPicture={addPicture}
        hasActionToUndo={canGoBackward}
        hasActionToRedo={canGoForward}
        hasActionToClear={canClear}
        undoAction={undoAction}
        redoAction={redoAction}
        toolboxPosition={toolboxPosition}
        hover={hover}
      />
      <StyledRow width={width} height={height}>
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
            moveShapes={moveShapes}
            selectedShape={selectedShape}
            removeShape={removeShape}
            selectShape={selectShape}
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
      <SnackbarContainer snackbarList={snackbarList} />
    </StyledApp>
  )
}

export default App
