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
import { cleanShapesBeforeExport } from 'utils/data'
import useResizeObserver from 'hooks/useResizeObserver'
import { RecursivePartial } from 'types/utils'
import {
  DEFAULT_TOOLS,
  SELECTION_DEFAULT_COLOR,
  SELECTION_DEFAULT_PADDING,
  SELECTION_DEFAULT_WIDTH
} from 'constants/shapes'
import { CustomTool } from 'types/tools'
import { sanitizeTools } from 'utils/toolbar'

const StyledApp = styled.div<{
  canvasWidth: number
  toolbarBackgroundColor: string
  dividerColor: string
  fontRadius: number
  fontDisabledColor: string
  fontDisabledBackgroundColor: string
  fontColor: string
  fontBackgroundColor: string
  fontSelectedColor: string
  fontSelectedBackgroundColor: string
  fontHoverColor: string
  fontHoverBackgroundColor: string
  canvasBackgroundColor: string
}>`
  --toolbar-bg: ${props => props.toolbarBackgroundColor};
  --divider-color: ${props => props.dividerColor};
  --font-radius: ${props => props.fontRadius}px;
  --font-disabled-color: ${props => props.fontDisabledColor};
  --font-disabled-bg: ${props => props.fontDisabledBackgroundColor};
  --font-color: ${props => props.fontColor};
  --font-bg: ${props => props.fontBackgroundColor};
  --font-selected-color: ${props => props.fontSelectedColor};
  --font-selected-bg: ${props => props.fontSelectedBackgroundColor};
  --font-hover-color: ${props => props.fontHoverColor};
  --font-hover-bg: ${props => props.fontHoverBackgroundColor};
  --canvas-bg: ${props => props.canvasBackgroundColor};

  display: flex;
  color: var(--font-color);
  position: relative;
  flex-direction: column;

  hr {
    width: 100%;
    border: none;
    border-top: 1px solid var(--divider-color);
  }

  &[data-grow='false'] {
    max-width: ${({ canvasWidth }) => `min(100%, ${canvasWidth}px)`};
  }

  &[data-shrink='false'] {
    min-width: ${({ canvasWidth }) => canvasWidth}px;
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
  canGrow: boolean
  canShrink: boolean
  availableTools: CustomTool<ShapeEnum>[]
  withExport: boolean
  withLoadAndSave: boolean
  uiStyle: {
    toolbarBackgroundColor: string
    dividerColor: string
    fontRadius: number
    fontDisabledColor: string
    fontDisabledBackgroundColor: string
    fontColor: string
    fontBackgroundColor: string
    fontSelectedColor: string
    fontSelectedBackgroundColor: string
    fontHoverColor: string
    fontHoverBackgroundColor: string
    canvasBackgroundColor: string
    canvasSelectionColor: string
    canvasSelectionWidth: number
    canvasSelectionPadding: number
  }
}

type OptionalAppOptionsType = RecursivePartial<AppOptionsType>

const DEFAULT_OPTIONS: AppOptionsType = {
  layersManipulation: true,
  gridVisible: false,
  canGrow: false,
  canShrink: true,
  withExport: true,
  withLoadAndSave: true,
  availableTools: DEFAULT_TOOLS,
  uiStyle: {
    toolbarBackgroundColor: 'white',
    dividerColor: '#36418129',
    fontRadius: 8,
    fontDisabledColor: '#3641812b',
    fontDisabledBackgroundColor: 'transparent',
    fontColor: '#364181',
    fontBackgroundColor: 'transparent',
    fontSelectedColor: 'white',
    fontSelectedBackgroundColor: '#364181',
    fontHoverColor: '#364181',
    fontHoverBackgroundColor: '#afd8d8',
    canvasBackgroundColor: 'white',
    canvasSelectionColor: SELECTION_DEFAULT_COLOR,
    canvasSelectionWidth: SELECTION_DEFAULT_WIDTH,
    canvasSelectionPadding: SELECTION_DEFAULT_PADDING
  }
}

type AppType = {
  className?: string
  width?: number
  height?: number
  shapes?: DrawableShapeJson[]
  onDataChanged?: () => void
  mode?: 'editor' | 'viewer'
  disabled?: boolean
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
  width: canvasWidth = 1000,
  height: canvasHeight = 600,
  shapes: shapesFromProps,
  className: classNameFromProps,
  mode = 'editor',
  disabled: disabledFromProps = false,
  onDataChanged,
  apiRef,
  options
}: AppType) => {
  const {
    layersManipulation,
    gridVisible,
    canGrow,
    canShrink,
    withExport,
    withLoadAndSave,
    availableTools: availableToolsFromProps
  } = {
    ...DEFAULT_OPTIONS,
    ...options
  }

  const {
    toolbarBackgroundColor,
    dividerColor,
    fontRadius,
    fontDisabledColor,
    fontDisabledBackgroundColor,
    fontColor,
    fontBackgroundColor,
    fontSelectedColor,
    fontSelectedBackgroundColor,
    fontHoverColor,
    fontHoverBackgroundColor,
    canvasBackgroundColor,
    canvasSelectionColor,
    canvasSelectionWidth,
    canvasSelectionPadding
  } = {
    ...DEFAULT_OPTIONS.uiStyle,
    ...(options?.uiStyle ?? {})
  }
  const isEditMode = mode !== 'viewer'
  const disabled = disabledFromProps || !isEditMode
  const componentRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({
    width: canvasWidth,
    height: canvasHeight,
    scaleRatio: 1
  })

  const availableTools = sanitizeTools(availableToolsFromProps)

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
      const dataURL =
        canvasRef.current &&
        getCanvasImage(
          shapesRef.current,
          canvasOffset,
          canvasWidth,
          canvasHeight,
          canvasSelectionPadding
        )
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
  }, [addSnackbar, shapesRef, canvasOffset, canvasWidth, canvasHeight, canvasSelectionPadding])

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
        const pictureShape = await addPictureShape(fileOrUrl, canvasWidth, canvasHeight)
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
    [addPictureShape, selectShape, addSnackbar, canvasWidth, canvasHeight]
  )

  const onResized = useCallback(
    (measuredWidth: number, measuredHeight: number) => {
      const scaleRatio = measuredWidth / canvasWidth
      setCanvasSize({ width: measuredWidth, height: canvasHeight * scaleRatio, scaleRatio })
    },
    [canvasWidth, canvasHeight]
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

  useResizeObserver({ element: componentRef, onResized })

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
        return canvasRef.current
          ? getCanvasImage(
              shapesRef.current,
              canvasOffset,
              canvasWidth,
              canvasHeight,
              canvasSelectionPadding
            )
          : undefined
      },

      getCurrentData: () => {
        return cleanShapesBeforeExport(shapesRef.current) as DrawableShapeJson[] //TODO : create different types for stored shapes
      }
    }
  }, [apiRef, shapesRef, canvasOffset, canvasWidth, canvasHeight, canvasSelectionPadding])

  const className = `${classNameFromProps ?? ''} ${isLayoutPanelShown ? 'layoutPanelOpened' : ''}`

  return (
    <StyledApp
      ref={componentRef}
      className={className}
      data-grow={canGrow}
      data-shrink={canShrink}
      canvasWidth={canvasWidth}
      toolbarBackgroundColor={toolbarBackgroundColor}
      dividerColor={dividerColor}
      fontRadius={fontRadius}
      fontDisabledColor={fontDisabledColor}
      fontDisabledBackgroundColor={fontDisabledBackgroundColor}
      fontColor={fontColor}
      fontBackgroundColor={fontBackgroundColor}
      fontSelectedColor={fontSelectedColor}
      fontSelectedBackgroundColor={fontSelectedBackgroundColor}
      fontHoverColor={fontHoverColor}
      fontHoverBackgroundColor={fontHoverBackgroundColor}
      canvasBackgroundColor={canvasBackgroundColor}>
      {isEditMode && (
        <Toolbar
          width={canvasSize.width}
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
          withExport={withExport}
          withLoadAndSave={withLoadAndSave}
        />
      )}
      <StyledRow
        data-grow={canGrow}
        width={canvasSize.width}
        aspectRatio={`calc(${canvasSize.width} / ${canvasSize.height})`}>
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
          canvasSize={canvasSize}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
          selectionColor={canvasSelectionColor}
          selectionWidth={canvasSelectionWidth}
          selectionPadding={canvasSelectionPadding}
          isEditMode={isEditMode}
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
