import type { UseReactPaintReturnType } from '@canvas/hooks/useReactPaint'
import { set } from '@common/utils/object'
import Loading from '@editor/components/common/Loading'
import SnackbarContainer from '@editor/components/common/Snackbar'
import Layouts from '@editor/components/settings/Layouts'
import SettingsBar from '@editor/components/settings/SettingsBar'
import Toolbar from '@editor/components/toolbox/Toolbar'
import { type GridLabelType, GridValues } from '@editor/constants/grid'
import { DEFAULT_EDITOR_OPTIONS } from '@editor/constants/options'
import { SELECTION_TOOL } from '@editor/constants/tools'
import useSnackbar from '@editor/hooks/useSnackbar'
import React, { type CSSProperties, type ReactNode, useCallback, useState } from 'react'
import './index.css'

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
    canvasSize,
    selectTool,
    selectShape,
    activeTool,
    setActiveTool,
    setAvailableTools,
    isEditMode,
    isDisabled,
    availableTools,
    gridGap,
    setGridGap,
    loadFile,
    exportPicture,
    exportData,
    clearCanvas,
    settings,
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

  const [isLoading, setIsLoading] = useState(false)
  const [isLayoutPanelShown, setIsLayoutPanelShown] = useState(false)

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

  const undoAction = useCallback(() => {
    selectTool(SELECTION_TOOL)
    backwardShape()
  }, [selectTool, backwardShape])

  const redoAction = useCallback(() => {
    selectTool(SELECTION_TOOL)
    forwardShape()
  }, [selectTool, forwardShape])

  const exportCanvasInFile = useCallback(() => {
    setIsLoading(true)
    try {
      exportPicture()
      setIsLoading(false)
    } catch (e) {
      if (e instanceof Error) {
        addSnackbar({ type: 'error', text: "L'export a échoué" })
      }
      console.warn(e)
    } finally {
      setIsLoading(false)
    }
  }, [exportPicture, addSnackbar])

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
    [addPictureShape, selectShape, addSnackbar, width, height]
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
          width={canvasSize.width}
          disabled={isDisabled}
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
          undoAction={undoAction}
          redoAction={redoAction}
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
          disabled={isDisabled}
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
      {isEditMode && (
        <>
          <SettingsBar
            width={canvasSize.width}
            disabled={isDisabled}
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
