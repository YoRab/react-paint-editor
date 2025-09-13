import type { UseReactPaintReturnType } from '@canvas/hooks/useReactPaint'
import { set } from '@common/utils/object'
import Loading from '@editor/components/common/Loading'
import SnackbarContainer from '@editor/components/common/Snackbar'
import Layouts from '@editor/components/settings/Layouts'
import SettingsBar from '@editor/components/settings/SettingsBar'
import Toolbar from '@editor/components/toolbox/Toolbar'
import { type GridLabelType, GridValues } from '@editor/constants/grid'
import { DEFAULT_EDITOR_OPTIONS } from '@editor/constants/options'
import useSnackbar from '@editor/hooks/useSnackbar'
import { type CSSProperties, type ReactNode, useCallback, useState } from 'react'
import './index.css'
import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import { zoomIn, zoomOut } from '@editor/constants/icons'

type EditorProps = {
  editorProps: UseReactPaintReturnType['editorProps']
  className?: string
  style?: CSSProperties
  children: ReactNode
  options?: {
    toolbarBackgroundColor?: string
    dividerColor?: string
    fontRadius?: number
    fontDisabledColor?: string
    fontDisabledBackgroundColor?: string
    fontColor?: string
    fontBackgroundColor?: string
    fontSelectedColor?: string
    fontSelectedBackgroundColor?: string
    fontHoverColor?: string
    fontHoverBackgroundColor?: string
  }
}

const Editor = ({ editorProps, className, style, options, children }: EditorProps) => {
  const {
    shapesRef,
    addPictureShape,
    moveShapes,
    toggleShapeVisibility,
    toggleShapeLock,
    canGoBackward,
    canGoForward,
    canClear,
    selectedShape,
    removeShape,
    updateShape,
    backwardShape,
    forwardShape,
    refs,
    width,
    height,
    selectTool,
    selectShapes,
    activeTool,
    setActiveTool,
    setAvailableTools,
    isEditMode,
    availableTools,
    gridGap,
    setGridGap,
    loadFile,
    exportPicture,
    exportData,
    clearCanvas,
    settings,
    setCanvasZoom,
    canvas: { canGrow, layersManipulation, withExport, withLoadAndSave, withUploadPicture, withUrlPicture }
  } = editorProps

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
    fontHoverBackgroundColor
  } = {
    ...DEFAULT_EDITOR_OPTIONS,
    ...options
  }

  const withZoom = settings.size === 'infinite' || settings.features.zoom

  const [isLoading, setIsLoading] = useState(false)
  const [isLayoutPanelShown, setIsLayoutPanelShown] = useState(false)
  const [isZoomPanelOpen, setIsZoomPanelShown] = useState(withZoom)

  const isZoomPanelShown = withZoom && isZoomPanelOpen
  const gridFormat: GridLabelType =
    gridGap >= GridValues.large ? 'large' : gridGap >= GridValues.medium ? 'medium' : gridGap >= GridValues.small ? 'small' : 'none'

  const setGridFormat = (newValue: GridLabelType) => {
    setGridGap(GridValues[newValue])
  }

  const { snackbarList, addSnackbar } = useSnackbar()

  const updateToolSettings = useCallback(
    (toolId: string, field: string, value: string | number | boolean) => {
      setAvailableTools(availableTools => availableTools.map(tool => (tool.id === toolId ? set(['settings', field, 'default'], value, tool) : tool)))
      setActiveTool(activeTool => (activeTool.id === toolId ? set(['settings', field, 'default'], value, activeTool) : activeTool))
    },
    [setActiveTool, setAvailableTools]
  )

  const exportCanvasInFile = useCallback(
    (view: 'fitToShapes' | 'defaultView' | 'currentZoom') => {
      setIsLoading(true)
      try {
        exportPicture(view)
      } catch (e) {
        if (e instanceof Error) {
          addSnackbar({ type: 'error', text: `L'export a échoué : ${e.message}` })
        }
        console.warn(e)
      } finally {
        setIsLoading(false)
      }
    },
    [exportPicture, addSnackbar]
  )

  const saveFile = useCallback(() => {
    setIsLoading(true)
    try {
      exportData()
      setIsLoading(false)
    } catch (e) {
      if (e instanceof Error) {
        addSnackbar({ type: 'error', text: "L'enregistrement a échoué" })
      }
      console.warn(e)
    } finally {
      setIsLoading(false)
    }
  }, [exportData, addSnackbar])

  const onLoadFile = useCallback(
    async (file: File) => {
      setIsLoading(true)
      try {
        await loadFile(file)
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
    [loadFile, addSnackbar]
  )

  const addPicture = useCallback(
    async (fileOrUrl: File | string) => {
      setIsLoading(true)
      try {
        const pictureShape = await addPictureShape(fileOrUrl, width, height)
        selectShapes([pictureShape])
      } catch (e) {
        if (e instanceof Error) {
          addSnackbar({ type: 'error', text: 'Le chargement a échoué' })
        }
        console.warn(e)
      } finally {
        setIsLoading(false)
      }
    },
    [addPictureShape, selectShapes, addSnackbar, width, height]
  )

  const appClassName = `${className ? `${className} ` : ''}${isLayoutPanelShown ? 'react-paint-editor-layout-opened ' : ''}react-paint-editor-app`

  return (
    <div
      ref={refs.setEditor}
      className={appClassName}
      style={{
        '--react-paint-editor-app-maxWidth': canGrow ? '100%' : `${width}px`,
        '--react-paint-editor-app-toolbar-bg': toolbarBackgroundColor,
        '--react-paint-editor-app-divider-color': dividerColor,
        '--react-paint-editor-app-font-radius': fontRadius,
        '--react-paint-editor-app-font-disabled-color': fontDisabledColor,
        '--react-paint-editor-app-font-disabled-bg': fontDisabledBackgroundColor,
        '--react-paint-editor-app-font-color': fontColor,
        '--react-paint-editor-app-font-bg': fontBackgroundColor,
        '--react-paint-editor-app-font-selected-color': fontSelectedColor,
        '--react-paint-editor-app-font-selected-bg': fontSelectedBackgroundColor,
        '--react-paint-editor-app-font-hover-color': fontHoverColor,
        '--react-paint-editor-app-font-hover-bg': fontHoverBackgroundColor,
        ...style
      }}
    >
      {isEditMode && (
        <Toolbar
          settings={settings}
          width={settings.canvasSize.width}
          activeTool={activeTool}
          clearCanvas={clearCanvas}
          setActiveTool={selectTool}
          exportCanvasInFile={exportCanvasInFile}
          saveFile={saveFile}
          loadFile={onLoadFile}
          addPicture={addPicture}
          hasActionToUndo={canGoBackward}
          hasActionToRedo={canGoForward}
          hasActionToClear={canClear}
          undoAction={backwardShape}
          redoAction={forwardShape}
          availableTools={availableTools}
          withExport={withExport}
          withLoadAndSave={withLoadAndSave}
          withUploadPicture={withUploadPicture}
          withUrlPicture={withUrlPicture}
        />
      )}
      {children}
      {isEditMode && layersManipulation && (
        <Layouts
          gridFormat={gridFormat}
          setGridFormat={setGridFormat}
          shapes={shapesRef.current}
          moveShapes={moveShapes}
          selectedShapes={selectedShape}
          removeShape={removeShape}
          selectShapes={selectShapes}
          toggleShapeVisibility={toggleShapeVisibility}
          toggleShapeLock={toggleShapeLock}
          isLayoutPanelShown={isLayoutPanelShown}
          settings={settings}
        />
      )}
      {isZoomPanelShown && (
        <Panel alignment='left' className='react-paint-editor-layouts-panel' data-edit={+isEditMode}>
          <Button className='react-paint-editor-zoom-button' icon={zoomOut} onClick={() => setCanvasZoom('unzoom')} />
          <Button className='react-paint-editor-zoom-button react-paint-editor-zoom-button-value' onClick={() => setCanvasZoom('default')}>
            {Math.round(settings.canvasZoom * 100)}%
          </Button>
          <Button className='react-paint-editor-zoom-button' icon={zoomIn} onClick={() => setCanvasZoom('zoom')} />
        </Panel>
      )}
      {isEditMode && (
        <>
          <SettingsBar
            setCanvasZoom={setCanvasZoom}
            width={settings.canvasSize.width}
            activeTool={activeTool}
            availableTools={availableTools}
            selectedShape={selectedShape}
            settings={settings}
            removeShape={removeShape}
            updateShape={updateShape}
            canvas={refs.canvas.current}
            layersManipulation={layersManipulation}
            toggleLayoutPanel={() => {
              setIsLayoutPanelShown(prev => !prev)
            }}
            isZoomPanelShown={isZoomPanelShown}
            setIsZoomPanelShown={setIsZoomPanelShown}
            updateToolSettings={updateToolSettings}
          />
          <Loading isLoading={isLoading} />
          <SnackbarContainer snackbarList={snackbarList} />
        </>
      )}
    </div>
  )
}

export default Editor
