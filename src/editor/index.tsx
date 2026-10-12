import type { ExportView, EditorProps as ReactPaintEditorProps } from '@common/types/editor'
import { withDefaults } from '@common/utils/object'
import Loading from '@editor/components/common/Loading'
import SnackbarContainer from '@editor/components/common/Snackbar'
import Layouts from '@editor/components/settings/Layouts'
import SettingsBar from '@editor/components/settings/SettingsBar'
import Toolbar from '@editor/components/toolbox/Toolbar'
import { type GridLabelType, GridValues } from '@editor/constants/grid'
import { DEFAULT_EDITOR_OPTIONS, type EditorOptions } from '@editor/constants/options'
import useSnackbar from '@editor/hooks/useSnackbar'
import { getDisplayTool } from '@editor/utils/style'
import { type CSSProperties, type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import './index.css'
import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import ContextMenu from '@editor/components/toolbox/ContextMenu'
import { zoomIn, zoomOut } from '@editor/constants/icons'

type EditorComponentProps = {
  editorProps: ReactPaintEditorProps
  className?: string | undefined
  style?: CSSProperties | undefined
  children: ReactNode
  options?: EditorOptions | undefined
}

const Editor = ({ editorProps, className, style, options, children }: EditorComponentProps) => {
  const { state, actions, editorRef } = editorProps
  const {
    mode,
    features,
    layout,
    view,
    width,
    height,
    gridGap,
    shapes,
    selection,
    selectedShapes,
    activeTool,
    tools,
    history,
    clipboard,
    contextMenu
  } = state

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
    layersManipulation,
    withExport,
    withLoadAndSave,
    withUploadPicture,
    withUrlPicture
  } = withDefaults(DEFAULT_EDITOR_OPTIONS, options)

  const isEditMode = mode !== 'viewer'
  const disabled = !features.edition
  const withZoom = layout.size === 'infinite' || features.zoom
  const displayTools = useMemo(() => tools.map(getDisplayTool), [tools])
  const selectedShapeIds = useMemo(() => selectedShapes.map(shape => shape.id), [selectedShapes])

  const rootRef = useRef<HTMLDivElement | null>(null)
  const setRootRef = useCallback(
    (element: HTMLDivElement | null) => {
      rootRef.current = element
      editorRef(element)
    },
    [editorRef]
  )

  const [isLoading, setIsLoading] = useState(false)
  const [isLayoutPanelShown, setIsLayoutPanelShown] = useState(false)
  const [isZoomPanelOpen, setIsZoomPanelShown] = useState(withZoom)

  const isZoomPanelShown = withZoom && isZoomPanelOpen
  const gridFormat: GridLabelType =
    gridGap >= GridValues.large ? 'large' : gridGap >= GridValues.medium ? 'medium' : gridGap >= GridValues.small ? 'small' : 'none'

  const setGridFormat = (newValue: GridLabelType) => {
    actions.setGridGap(GridValues[newValue])
  }

  const { snackbarList, addSnackbar } = useSnackbar()

  const exportCanvasInFile = useCallback(
    (exportView: ExportView) => {
      setIsLoading(true)
      try {
        actions.exportPicture(exportView)
      } catch (e) {
        if (e instanceof Error) {
          addSnackbar({ type: 'error', text: `L'export a échoué : ${e.message}` })
        }
        console.warn(e)
      } finally {
        setIsLoading(false)
      }
    },
    [actions, addSnackbar]
  )

  const saveFile = useCallback(() => {
    setIsLoading(true)
    try {
      actions.exportData()
      setIsLoading(false)
    } catch (e) {
      if (e instanceof Error) {
        addSnackbar({ type: 'error', text: "L'enregistrement a échoué" })
      }
      console.warn(e)
    } finally {
      setIsLoading(false)
    }
  }, [actions, addSnackbar])

  const onLoadFile = useCallback(
    async (file: File) => {
      setIsLoading(true)
      try {
        await actions.loadFile(file)
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
    [actions, addSnackbar]
  )

  const addPicture = useCallback(
    async (fileOrUrl: File | string) => {
      setIsLoading(true)
      try {
        await actions.addPicture(fileOrUrl, { maxWidth: width, maxHeight: height, select: true })
      } catch (e) {
        if (e instanceof Error) {
          addSnackbar({ type: 'error', text: 'Le chargement a échoué' })
        }
        console.warn(e)
      } finally {
        setIsLoading(false)
      }
    },
    [actions, addSnackbar, width, height]
  )

  const appClassName = `${className ? `${className} ` : ''}${isLayoutPanelShown ? 'react-paint-editor-layout-opened ' : ''}react-paint-editor-app`

  return (
    <div
      ref={setRootRef}
      className={appClassName}
      style={{
        '--react-paint-editor-app-maxWidth': layout.canGrow ? '100%' : `${width}px`,
        '--react-paint-editor-app-toolbar-bg': toolbarBackgroundColor,
        '--react-paint-editor-app-divider-color': dividerColor,
        '--react-paint-editor-app-font-radius': `${fontRadius}px`,
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
          disabled={disabled}
          withMoveTool={withZoom}
          width={view.displayWidth}
          activeTool={activeTool}
          clearCanvas={actions.clearCanvas}
          setActiveTool={actions.selectTool}
          exportCanvasInFile={exportCanvasInFile}
          saveFile={saveFile}
          loadFile={onLoadFile}
          addPicture={addPicture}
          hasActionToUndo={history.canUndo}
          hasActionToRedo={history.canRedo}
          hasActionToClear={history.canClear}
          undoAction={actions.undo}
          redoAction={actions.redo}
          availableTools={displayTools}
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
          shapes={shapes}
          swapShapes={actions.swapShapes}
          selectedShapeIds={selectedShapeIds}
          removeShapes={actions.removeShapes}
          selectShapes={actions.selectShapes}
          toggleShapeVisibility={actions.toggleShapesVisibility}
          toggleShapeLock={actions.toggleShapesLock}
          isLayoutPanelShown={isLayoutPanelShown}
          disabled={disabled}
        />
      )}
      {isZoomPanelShown && (
        <Panel alignment='left' position='bottom' className='react-paint-editor-layouts-panel' data-edit={+isEditMode}>
          <Button aria-label='Zoom out' className='react-paint-editor-zoom-button' icon={zoomOut} onClick={() => actions.setZoom('unzoom')} />
          <Button className='react-paint-editor-zoom-button react-paint-editor-zoom-button-value' onClick={() => actions.setZoom('default')}>
            {Math.round(view.zoom * 100)}%
          </Button>
          <Button aria-label='Zoom in' className='react-paint-editor-zoom-button' icon={zoomIn} onClick={() => actions.setZoom('zoom')} />
        </Panel>
      )}
      {isEditMode && (
        <>
          <SettingsBar
            disabled={disabled}
            withZoom={withZoom}
            saveShapes={actions.saveShapes}
            width={view.displayWidth}
            activeTool={activeTool}
            availableTools={displayTools}
            selectedShape={selection}
            selectedShapeIds={selectedShapeIds}
            removeShapes={actions.removeShapes}
            updateShapesStyle={actions.updateShapesStyle}
            layersManipulation={layersManipulation}
            toggleLayoutPanel={() => {
              setIsLayoutPanelShown(prev => !prev)
            }}
            isZoomPanelShown={isZoomPanelShown}
            setIsZoomPanelShown={setIsZoomPanelShown}
            updateToolSettings={actions.updateToolSettings}
          />
          <Loading isLoading={isLoading} />
          <SnackbarContainer snackbarList={snackbarList} />
        </>
      )}
      {contextMenu && <ContextMenu contextMenu={contextMenu} containerRef={rootRef} hasCopiedShapes={clipboard.hasContent} actions={actions} />}
    </div>
  )
}

export { DEFAULT_EDITOR_OPTIONS, type EditorOptions } from '@editor/constants/options'
export type { EditorComponentProps }
export { Editor }
