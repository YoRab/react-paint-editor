import React, { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'
import {
  DrawableShape,
  DrawableShapeJson,
  Point,
  StyledShape,
  ToolEnum,
  ToolsType
} from 'types/Shapes'
import Canvas from './Canvas'
import Layouts from './settings/Layouts'
import Toolbar from './toolbox/Toolbar'
import { styled } from '@linaria/react'
import SettingsBar from './settings/SettingsBar'
import { STYLE_FONT_DEFAULT } from 'constants/style'
import useKeyboard from 'hooks/useKeyboard'
import {
  decodeJson,
  decodePicturesInShapes,
  downloadFile,
  encodePicturesInShapes,
  encodeShapesInString,
  getCanvasImage,
  validateJson
} from 'utils/file'
import { SelectionModeData, SelectionModeLib } from 'types/Mode'
import useComponent from 'hooks/useComponent'
import useShapes from 'hooks/useShapes'
import SnackbarContainer from './common/Snackbar'
import useSnackbar from 'hooks/useSnackbar'
import { SnackbarTypeEnum } from 'constants/snackbar'

const StyledApp = styled.div<{
  maxWidth: string
}>`
  --bg-color: #d7ecec;
  --text-color: #364181;
  --btn-hover: #afd8d8;
  --bg-color-selected: #364181;
  --text-color-selected: white;
  /* --shrinkedcanvas-bg-color: #364181; */
  --shrinkedcanvas-bg-color: #d7ecec;
  display: flex;
  width: fit-content;
  color: var(--text-color);
  position: relative;
  max-width: ${({ maxWidth }) => maxWidth};

  flex-direction: column;
`

const StyledRow = styled.div<{
  width: number
  aspectRatio: string
}>`
  display: flex;
  flex-direction: row;
  position: relative;
  max-width: 100%;

  .layoutPanelOpened & {
    background: var(--shrinkedcanvas-bg-color);
  }

  width: ${({ width }) => width}px;

  aspect-ratio: ${({ aspectRatio }) => aspectRatio};
`

type AppType = {
  width?: number
  height?: number
  withLayouts?: 'always' | 'never' | 'visible' | 'hidden'
  shapes?: DrawableShapeJson[]
  className?: string
  disabled?: boolean
  onDataChanged?: () => void
  apiRef?: MutableRefObject<
    | undefined
    | {
        getCurrentImage: () => string | undefined
        getCurrentData: () => DrawableShapeJson[]
      }
  >
}

const App = ({
  width = 1000,
  height = 600,
  withLayouts = 'hidden',
  shapes: shapesFromProps,
  className: classNameFromProps,
  disabled = false,
  onDataChanged,
  apiRef
}: AppType) => {
  const componentRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { isInsideComponent } = useComponent({
    disabled,
    componentRef
  })

  const [defaultConf, setDefaultConf] = useState<StyledShape>({
    style: {
      fillColor: 'transparent',
      strokeColor: 'black',
      globalAlpha: 100,
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
  } = useShapes(onDataChanged)

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
    const dataURL = canvasRef.current && getCanvasImage(canvasRef.current)
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
      addSnackbar({ type: SnackbarTypeEnum.Infos, text: 'Chargement...' })

      try {
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

  useEffect(() => {
    if (shapesFromProps !== undefined) {
      void loadJson(shapesFromProps)
    }
  }, [loadJson, shapesFromProps])

  useEffect(() => {
    if (!apiRef) return
    apiRef.current = {
      getCurrentImage: () => {
        return canvasRef.current ? getCanvasImage(canvasRef.current) : undefined
      },

      getCurrentData: () => {
        return encodePicturesInShapes(shapesRef.current)
      }
    }
  }, [apiRef, shapesRef])

  const className = `${classNameFromProps ?? ''} ${isLayoutPanelShown ? 'layoutPanelOpened' : ''}`

  return (
    <StyledApp ref={componentRef} className={className} maxWidth={`min(100%, ${width}px)`}>
      <Toolbar
        disabled={disabled}
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
      />
      <StyledRow width={width} aspectRatio={`calc(${width} / ${height})`}>
        <Canvas
          disabled={disabled}
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
            disabled={disabled}
            shapes={shapesRef.current}
            moveShapes={moveShapes}
            selectedShape={selectedShape}
            removeShape={removeShape}
            selectShape={selectShape}
          />
        )}
      </StyledRow>
      <SettingsBar
        disabled={disabled}
        activeTool={activeTool}
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
      <SnackbarContainer snackbarList={snackbarList} />
    </StyledApp>
  )
}

export default App
