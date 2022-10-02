import React, { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'
import type { DrawableShapeJson, ExportDataType, Point, ShapeEntity } from 'types/Shapes'
import type { ToolsType } from 'types/tools'
import Canvas from './Canvas'
import Layouts from './settings/Layouts'
import Toolbar from './toolbox/Toolbar'
import { styled } from '@linaria/react'
import SettingsBar from './settings/SettingsBar'
import { STYLE_ZINDEX } from 'constants/style'
import useKeyboard from 'hooks/useKeyboard'
import {
  decodeJson,
  decodeImportedData,
  downloadFile,
  encodeShapesInString as encodeProjectDataInString,
  getCanvasImage
} from 'utils/file'
import type { SelectionModeData } from 'types/Mode'
import useComponent from 'hooks/useComponent'
import useShapes from 'hooks/useShapes'
import SnackbarContainer from './common/Snackbar'
import useSnackbar from 'hooks/useSnackbar'
import Loading from 'components/common/Loading'
import { buildDataToExport } from 'utils/data'
import useResizeObserver from 'hooks/useResizeObserver'
import { sanitizeTools } from 'utils/toolbar'
import { SELECTION_TOOL } from 'constants/tools'
import _ from 'lodash/fp'
import { DEFAULT_OPTIONS, GridFormatType, OptionalAppOptionsType } from 'constants/app'

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
  z-index: ${STYLE_ZINDEX.APP};

  &[data-grow='true'] {
    width: 100%;
  }

  &[data-grow='false'] {
    width: ${({ width }) => width}px;
  }

  aspect-ratio: ${({ aspectRatio }) => aspectRatio};
`

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
        getCurrentData: () => ExportDataType
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
    grid,
    canGrow,
    canShrink,
    withExport,
    withLoadAndSave,
    withUploadPicture,
    withUrlPicture,
    clearCallback,
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

  const [availableTools, setAvailableTools] = useState(
    sanitizeTools(availableToolsFromProps, withUploadPicture || withUrlPicture)
  )

  useEffect(() => {
    setAvailableTools(sanitizeTools(availableToolsFromProps, withUploadPicture || withUrlPicture))
  }, [availableToolsFromProps, withUploadPicture, withUrlPicture])

  const { isInsideComponent } = useComponent({
    disabled,
    componentRef
  })

  const [isLoading, setIsLoading] = useState(false)

  const [isLayoutPanelShown, setIsLayoutPanelShown] = useState(false)
  const [canvasOffset, setCanvasOffset] = useState<Point>([0, 0])
  const [canvasOffsetStartPosition, setCanvasOffsetStartPosition] = useState<Point | undefined>(
    undefined
  )
  const [activeTool, setActiveTool] = useState<ToolsType>(SELECTION_TOOL)

  const [selectionMode, setSelectionMode] = useState<SelectionModeData<Point | number>>({
    mode: 'default'
  })

  const [gridFormat, setGridFormat] = useState<GridFormatType>(grid)
  const [isShiftPressed, setShiftPressed] = useState<boolean>(false)

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
  } = useShapes(onDataChanged, canvasSelectionPadding, canvasSize)

  const { snackbarList, addSnackbar } = useSnackbar()

  const selectTool = useCallback(
    (tool: ToolsType) => {
      setSelectedShape(undefined)
      setActiveTool(tool)
    },
    [setSelectedShape]
  )

  const updateToolSettings = useCallback(
    (toolId: string, field: string, value: string | number | boolean) => {
      setAvailableTools(availableTools =>
        availableTools.map(tool =>
          tool.id === toolId ? _.set(['settings', field, 'default'], value, tool) : tool
        )
      )
      setActiveTool(activeTool =>
        activeTool.id === toolId
          ? _.set(['settings', field, 'default'], value, activeTool)
          : activeTool
      )
    },
    []
  )

  const undoAction = useCallback(() => {
    selectTool(SELECTION_TOOL)
    backwardShape()
  }, [selectTool, backwardShape])

  const redoAction = useCallback(() => {
    selectTool(SELECTION_TOOL)
    forwardShape()
  }, [selectTool, forwardShape])

  const resetCanvas = useCallback(
    (shapesToInit: ShapeEntity[] = [], clearHistory = false) => {
      clearShapes(shapesToInit, clearHistory)
      selectTool(SELECTION_TOOL)
      setCanvasOffset([0, 0])
    },
    [selectTool, clearShapes]
  )

  const loadImportedData = useCallback(
    async (json: ExportDataType, clearHistory = true) => {
      const shapes = await decodeImportedData(json, canvasSize.scaleRatio, canvasSelectionPadding)
      resetCanvas(shapes, clearHistory)
    },
    [resetCanvas, canvasSize, canvasSelectionPadding]
  )

  const clearCanvas = useCallback(() => {
    if (typeof clearCallback !== 'string') {
      void loadImportedData({ shapes: clearCallback() } as ExportDataType, false)
    } else {
      if (clearCallback === 'defaultShapes' && shapesFromProps !== undefined) {
        void loadImportedData({ shapes: shapesFromProps } as ExportDataType, false)
      } else {
        resetCanvas()
      }
    }
  }, [resetCanvas, loadImportedData, shapesFromProps, clearCallback])

  const selectShape = useCallback(
    (shape: ShapeEntity) => {
      setActiveTool(SELECTION_TOOL)
      setSelectedShape(shape)
    },
    [setSelectedShape]
  )

  const pasteShape = useCallback(
    (shape: ShapeEntity) => {
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
        addSnackbar({ type: 'error', text: "L'export a échoué" })
      }
      console.warn(e)
    } finally {
      setIsLoading(false)
    }
  }, [addSnackbar, shapesRef, canvasOffset, canvasWidth, canvasHeight, canvasSelectionPadding])

  const saveFile = useCallback(() => {
    setIsLoading(true)
    try {
      const content = encodeProjectDataInString(shapesRef.current, canvasWidth, canvasHeight)
      if (!content) {
        throw new Error("L'encodage a échoué")
      }
      downloadFile(content, 'drawing.json')
      setIsLoading(false)
    } catch (e) {
      if (e instanceof Error) {
        addSnackbar({ type: 'error', text: "L'enregistrement a échoué" })
      }
      console.warn(e)
    } finally {
      setIsLoading(false)
    }
  }, [shapesRef, addSnackbar, canvasWidth, canvasHeight])

  const loadFile = useCallback(
    async (file: File) => {
      setIsLoading(true)
      try {
        const json = await decodeJson(file)
        await loadImportedData(json as ExportDataType)
        addSnackbar({ type: 'success', text: 'Fichier chargé !' })
      } catch (e) {
        if (e instanceof Error) {
          addSnackbar({ type: 'error', text: 'Le chargement a échoué' })
        }
        console.warn(e)
      } finally {
        setIsLoading(false)
      }
    },
    [loadImportedData, addSnackbar]
  )

  const addPicture = useCallback(
    async (fileOrUrl: File | string) => {
      setIsLoading(true)
      try {
        const pictureShape = await addPictureShape(fileOrUrl, canvasWidth, canvasHeight)
        selectShape(pictureShape)
      } catch (e) {
        if (e instanceof Error) {
          addSnackbar({ type: 'error', text: 'Le chargement a échoué' })
        }
        console.warn(e)
      } finally {
        setIsLoading(false)
      }
    },
    [addPictureShape, selectShape, addSnackbar, canvasWidth, canvasHeight]
  )

  const onResized = useCallback(
    (measuredWidth: number) => {
      const scaleRatio = measuredWidth / canvasWidth
      setCanvasSize({ width: measuredWidth, height: canvasHeight * scaleRatio, scaleRatio })
    },
    [canvasWidth, canvasHeight]
  )

  useKeyboard({
    isInsideComponent,
    selectionPadding: canvasSelectionPadding,
    gridFormat,
    isEditingText: selectionMode.mode === 'textedition',
    selectedShape,
    currentScale: canvasSize.scaleRatio,
    setSelectedShape,
    removeShape,
    pasteShape,
    updateShape,
    backwardShape,
    forwardShape,
    setShiftPressed
  })

  useResizeObserver({ element: componentRef, onResized })

  useEffect(() => {
    if (!isInsideComponent) setSelectedShape(undefined)
  }, [isInsideComponent, setSelectedShape])

  useEffect(() => {
    if (shapesFromProps !== undefined) {
      void loadImportedData({ shapes: shapesFromProps } as ExportDataType)
    }
  }, [loadImportedData, shapesFromProps])

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
        return buildDataToExport(shapesRef.current, canvasWidth, canvasHeight)
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
          withUploadPicture={withUploadPicture}
          withUrlPicture={withUrlPicture}
        />
      )}
      <StyledRow
        data-grow={canGrow}
        width={canvasSize.width}
        aspectRatio={`calc(${canvasSize.width} / ${canvasSize.height})`}>
        <Canvas
          canGrow={canGrow}
          gridFormat={gridFormat}
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
          saveShapes={saveShapes}
          ref={canvasRef}
          canvasSize={canvasSize}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
          selectionColor={canvasSelectionColor}
          selectionWidth={canvasSelectionWidth}
          selectionPadding={canvasSelectionPadding}
          isEditMode={isEditMode}
          isShiftPressed={isShiftPressed}
        />
        {isEditMode && layersManipulation && (
          <Layouts
            gridFormat={gridFormat}
            setGridFormat={setGridFormat}
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
            width={canvasSize.width}
            disabled={disabled}
            activeTool={activeTool}
            availableTools={availableTools}
            selectedShape={selectedShape}
            selectionPadding={canvasSelectionPadding}
            removeShape={removeShape}
            updateShape={updateShape}
            canvas={canvasRef.current}
            currentScale={canvasSize.scaleRatio}
            layersManipulation={layersManipulation}
            toggleLayoutPanel={() => {
              setIsLayoutPanelShown(prev => !prev)
            }}
            updateToolSettings={updateToolSettings}
          />
          <Loading isLoading={isLoading} />
          <SnackbarContainer snackbarList={snackbarList} />
        </>
      )}
    </StyledApp>
  )
}

export default App
