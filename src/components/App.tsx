import React, { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'
import _ from 'lodash/fp'
import {
  DrawableShape,
  DrawableShapeJson,
  Point,
  ShapeEnum,
  StyledShape,
  ToolEnum,
  ToolsType
} from 'types/Shapes'
import Canvas from './Canvas'
import Layouts from './settings/Layouts'
import Toolbar from './toolbox/Toolbar'
import { styled } from '@linaria/react'
import SettingsBar from './settings/SettingsBar'
import { STYLE_FONT_DEFAULT, STYLE_ZINDEX_APP } from 'constants/style'
import useKeyboard from 'hooks/useKeyboard'
import {
  decodeJson,
  decodePicturesInShapes,
  downloadFile,
  encodePicturesInShapes,
  encodeShapesInString,
  getCanvasImage
} from 'utils/file'
import { SelectionModeData, SelectionModeLib } from 'types/Mode'
import useComponent from 'hooks/useComponent'
import useShapes from 'hooks/useShapes'
import SnackbarContainer from './common/Snackbar'
import useSnackbar from 'hooks/useSnackbar'
import { SnackbarTypeEnum } from 'constants/snackbar'
import Loading from 'components/common/Loading'

const StyledApp = styled.div<{
  width: number
}>`
  /* --bg-color: #d7ecec; */
  --bg-color: white;
  --text-color: #364181;
  --btn-hover: #afd8d8;
  --bg-color-selected: #364181;
  --text-color-selected: white;
  /* --shrinkedcanvas-bg-color: #364181; */
  /* --shrinkedcanvas-bg-color: #d7ecec; */
  --shrinkedcanvas-bg-color: white;
  --border-color: #36418129;

  display: flex;
  color: var(--text-color);
  position: relative;
  overflow: hidden;
  flex-direction: column;

  hr {
    width: 100%;
    border: none;
    border-top: 1px solid var(--border-color);
  }

  &[data-grow='false'] {
    width: fit-content;
    max-width: ${({ width }) => `min(100%, ${width}px)`};
  }

  &[data-shrink='false'] {
    min-width: ${({ width }) => width}px;
  }
`

const StyledRow = styled.div<{
  width: number | string
  aspectRatio: string
}>`
  display: flex;
  flex-direction: row;
  position: relative;
  max-width: 100%;
  z-index: ${STYLE_ZINDEX_APP};

  .layoutPanelOpened & {
    background: var(--shrinkedcanvas-bg-color);
  }

  &[data-grow='true'] {
    width: 100%;
  }

  &[data-grow='false'] {
    width: ${({ width }) => width}px;
  }

  aspect-ratio: ${({ aspectRatio }) => aspectRatio};
`

type AppOptionsType = {
  layersManipulation: boolean
  gridVisible: boolean
}

type OptionalAppOptionsType = {
  [K in keyof AppOptionsType]?: AppOptionsType[K]
}

const DEFAULT_TOOLS = [
  ShapeEnum.brush,
  ShapeEnum.line,
  ShapeEnum.polygon,
  ShapeEnum.curve,
  ShapeEnum.rect,
  ShapeEnum.square,
  ShapeEnum.circle,
  ShapeEnum.ellipse,
  ShapeEnum.text,
  ShapeEnum.picture
]

const DEFAULT_OPTIONS: AppOptionsType = {
  layersManipulation: true,
  gridVisible: false
}

type AppType = {
  width?: number
  height?: number
  canGrow?: boolean
  canShrink?: boolean
  shapes?: DrawableShapeJson[]
  className?: string
  mode?: 'editor' | 'viewer'
  disabled?: boolean
  onDataChanged?: () => void
  availableTools?: ShapeEnum[]
  apiRef?: MutableRefObject<
    | undefined
    | {
        getCurrentImage: () => string | undefined
        getCurrentData: () => DrawableShapeJson[]
      }
  >
  options?: OptionalAppOptionsType
}

const App = ({
  width = 1000,
  height = 600,
  canGrow = false,
  canShrink = true,
  shapes: shapesFromProps,
  className: classNameFromProps,
  mode = 'editor',
  disabled: disabledFromProps = false,
  onDataChanged,
  availableTools: availableToolsFromProps = DEFAULT_TOOLS,
  apiRef,
  options
}: AppType) => {
  const { layersManipulation, gridVisible } = {
    ...DEFAULT_OPTIONS,
    ...options
  }
  const isEditMode = mode !== 'viewer'
  const disabled = disabledFromProps || !isEditMode
  const componentRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const availableTools = _.intersection(DEFAULT_TOOLS, availableToolsFromProps)

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
      pointsCount: 3,
      fontFamily: STYLE_FONT_DEFAULT
    }
  })

  const [isLoading, setIsLoading] = useState(false)

  const [isLayoutPanelShown, setIsLayoutPanelShown] = useState(false)
  const [canvasOffset, setCanvasOffset] = useState<Point>([0, 0])
  const [canvasOffsetStartPosition, setCanvasOffsetStartPosition] = useState<Point | undefined>(
    undefined
  )
  const [activeTool, setActiveTool] = useState<ToolsType>(ToolEnum.selection)

  const [selectionMode, setSelectionMode] = useState<SelectionModeData<Point | number>>({
    mode: SelectionModeLib.default
  })

  const [withGrid, setWithGrid] = useState(gridVisible)

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
    toggleShapeVisibility,
    toggleShapeLock,
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
    (shapesToInit: DrawableShape[] = [], clearHistory = false) => {
      clearShapes(shapesToInit, clearHistory)
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
    setIsLoading(true)
    try {
      const dataURL = canvasRef.current && getCanvasImage(canvasRef.current)
      if (!dataURL) {
        throw new Error()
      }
      downloadFile(dataURL, 'drawing.png')
      setIsLoading(false)
    } catch (e) {
      if (e instanceof Error) {
        addSnackbar({ type: SnackbarTypeEnum.Error, text: "L'export a échoué" })
      }
      console.warn(e)
    } finally {
      setIsLoading(false)
    }
  }, [addSnackbar])

  const saveFile = useCallback(() => {
    setIsLoading(true)
    try {
      const content = encodeShapesInString(shapesRef.current)
      if (!content) {
        throw new Error("L'encodage a échoué")
      }
      downloadFile(content, 'drawing.json')
      setIsLoading(false)
    } catch (e) {
      if (e instanceof Error) {
        addSnackbar({ type: SnackbarTypeEnum.Error, text: "L'enregistrement a échoué" })
      }
      console.warn(e)
    } finally {
      setIsLoading(false)
    }
  }, [shapesRef, addSnackbar])

  const loadJson = useCallback(
    async (json: unknown) => {
      const shapes = await decodePicturesInShapes(json as DrawableShapeJson[])
      clearCanvas(shapes, true)
    },
    [clearCanvas]
  )

  const loadFile = useCallback(
    async (file: File) => {
      setIsLoading(true)
      try {
        const json = await decodeJson(file)
        await loadJson(json)
        addSnackbar({ type: SnackbarTypeEnum.Success, text: 'Fichier chargé !' })
      } catch (e) {
        if (e instanceof Error) {
          addSnackbar({ type: SnackbarTypeEnum.Error, text: 'Le chargement a échoué' })
        }
        console.warn(e)
      } finally {
        setIsLoading(false)
      }
    },
    [loadJson, addSnackbar]
  )

  const addPicture = useCallback(
    async (fileOrUrl: File | string) => {
      setIsLoading(true)
      try {
        const pictureShape = await addPictureShape(fileOrUrl, width, height)
        selectShape(pictureShape)
      } catch (e) {
        if (e instanceof Error) {
          addSnackbar({ type: SnackbarTypeEnum.Error, text: 'Le chargement a échoué' })
        }
        console.warn(e)
      } finally {
        setIsLoading(false)
      }
    },
    [addPictureShape, selectShape, addSnackbar, width, height]
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
    <StyledApp
      ref={componentRef}
      className={className}
      width={width}
      data-grow={canGrow}
      data-shrink={canShrink}>
      {isEditMode && (
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
          availableTools={availableTools}
        />
      )}
      <StyledRow data-grow={canGrow} width={width} aspectRatio={`calc(${width} / ${height})`}>
        <Canvas
          canGrow={canGrow}
          withGrid={withGrid}
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
        {isEditMode && layersManipulation && (
          <Layouts
            withGrid={withGrid}
            setWithGrid={setWithGrid}
            disabled={disabled}
            shapes={shapesRef.current}
            moveShapes={moveShapes}
            selectedShape={selectedShape}
            removeShape={removeShape}
            selectShape={selectShape}
            toggleShapeVisibility={toggleShapeVisibility}
            toggleShapeLock={toggleShapeLock}
            isLayoutPanelShown={isLayoutPanelShown}
          />
        )}
      </StyledRow>
      {isEditMode && (
        <>
          <SettingsBar
            disabled={disabled}
            activeTool={activeTool}
            selectedShape={selectedShape}
            removeShape={removeShape}
            updateShape={updateShape}
            defaultConf={defaultConf}
            setDefaultConf={setDefaultConf}
            canvas={canvasRef.current}
            layersManipulation={layersManipulation}
            toggleLayoutPanel={() => {
              setIsLayoutPanelShown(prev => !prev)
            }}
          />
          <Loading isLoading={isLoading} />
          <SnackbarContainer snackbarList={snackbarList} />
        </>
      )}
    </StyledApp>
  )
}

export default App
