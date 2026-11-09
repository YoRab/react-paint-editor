import { type EditorState, type ExportView, PaintProvider, type ReactPaint, ReactPaintError, shallowEqual, usePaintState } from '@canvas/index'
import Announcements from '@editor/components/common/Announcements'
import Loading from '@editor/components/common/Loading'
import SnackbarContainer from '@editor/components/common/Snackbar'
import Layouts from '@editor/components/settings/Layouts'
import MiniMap from '@editor/components/settings/MiniMap'
import SettingsBar from '@editor/components/settings/SettingsBar'
import ZoomPanel from '@editor/components/settings/ZoomPanel'
import Toolbar from '@editor/components/toolbox/Toolbar'
import { DEFAULT_EDITOR_OPTIONS, type EditorOptions } from '@editor/constants/options'
import useDebounce from '@editor/hooks/useDebounce'
import useDisclosure from '@editor/hooks/useDisclosure'
import { EditorLocaleProvider, type EditorLocaleValue, useResolvedEditorLocale } from '@editor/hooks/useEditorLocale'
import useRecentColors from '@editor/hooks/useRecentColors'
import useSnackbar from '@editor/hooks/useSnackbar'
import { withDefaults } from '@editor/utils/util'
import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import './index.css'
import ContextMenu from '@editor/components/toolbox/ContextMenu'

/** What went wrong, told by the code of an error of the canvas, or else the message of the action which failed */
const getErrorText = (error: unknown, fallback: string, { editor, format }: EditorLocaleValue): string =>
  error instanceof ReactPaintError ? format(editor.errors[error.code], error.details) : fallback

type EditorComponentProps = {
  /** Handle returned by useReactPaint */
  paint: ReactPaint
  className?: string | undefined
  style?: CSSProperties | undefined
  children: ReactNode
  options?: EditorOptions | undefined
}

// The root only reads what it lays out: each panel reads its own part of the state
const selectRootState = (state: EditorState) => ({
  mode: state.mode,
  features: state.features,
  layout: state.layout,
  width: state.width
})

const Editor = ({ paint, className, style, options, children }: EditorComponentProps) => {
  const { actions, scopeRef } = paint
  const { mode, features, layout, width } = usePaintState(paint, selectRootState, shallowEqual)

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
    withUrlPicture,
    withEraser,
    withLaser,
    withMinimap
  } = withDefaults(DEFAULT_EDITOR_OPTIONS, options)
  const locale = useResolvedEditorLocale(options?.locale)
  const { snackbars, files } = locale.editor

  const isEditMode = mode !== 'viewer'
  const disabled = !features.edition
  const withZoom = layout.size === 'infinite' || features.zoom

  const rootRef = useRef<HTMLDivElement | null>(null)
  const setRootRef = useCallback(
    (element: HTMLDivElement | null) => {
      rootRef.current = element
      scopeRef(element)
    },
    [scopeRef]
  )

  const [isLoading, setIsLoading] = useState(false)
  const [isLayoutPanelShown, setIsLayoutPanelShown] = useState(false)
  const [isZoomPanelOpen, setIsZoomPanelShown] = useState(withZoom)

  const isZoomPanelShown = withZoom && isZoomPanelOpen
  // the panels of the zoom and of the layers stay open while the drawing goes on: Escape gives the focus back to their button
  const zoomPanel = useDisclosure(isZoomPanelShown)
  const layersPanel = useDisclosure(isEditMode && layersManipulation && isLayoutPanelShown)
  // kept when the settings bar is hidden, in the viewer mode
  const { recentColors, addRecentColor } = useRecentColors()

  const { snackbarList, addSnackbar, removeSnackbar } = useSnackbar()

  // the snackbar of an error, told by its code when the canvas gave one
  const reportError = useCallback(
    (error: unknown, fallback: string) => {
      addSnackbar({ type: 'error', text: getErrorText(error, fallback, locale) })
      console.warn(error)
    },
    [addSnackbar, locale]
  )

  const exportCanvasInFile = useCallback(
    (exportView: ExportView) => {
      setIsLoading(true)
      try {
        actions.exportPicture({ view: exportView, fileName: `${files.drawing}.png` })
      } catch (e) {
        reportError(e, snackbars.exportFailed)
      } finally {
        setIsLoading(false)
      }
    },
    [actions, reportError, files, snackbars]
  )

  const saveFile = useCallback(() => {
    setIsLoading(true)
    try {
      actions.exportData({ fileName: `${files.drawing}.json` })
    } catch (e) {
      reportError(e, snackbars.saveFailed)
    } finally {
      setIsLoading(false)
    }
  }, [actions, reportError, files, snackbars])

  const onLoadFile = useCallback(
    async (file: File) => {
      setIsLoading(true)
      try {
        await actions.loadFile(file)
        addSnackbar({ type: 'success', text: snackbars.fileLoaded })
      } catch (e) {
        reportError(e, snackbars.loadFailed)
      } finally {
        setIsLoading(false)
      }
    },
    [actions, addSnackbar, reportError, snackbars]
  )

  const addPicture = useCallback(
    async (fileOrUrl: File | string) => {
      setIsLoading(true)
      try {
        await actions.addPicture(fileOrUrl)
      } catch (e) {
        reportError(e, snackbars.loadFailed)
      } finally {
        setIsLoading(false)
      }
    },
    [actions, reportError, snackbars]
  )

  useEffect(
    () =>
      paint.registerEvent('pictureDropFailed', (_file, error) =>
        addSnackbar({ type: 'error', text: getErrorText(error, snackbars.loadFailed, locale) })
      ),
    [paint, addSnackbar, snackbars, locale]
  )

  const showPictureLoadFailed = useCallback(() => addSnackbar({ type: 'error', text: snackbars.picturesNotLoaded }), [addSnackbar, snackbars])
  // the pictures left out of the same loaded data give a single message
  const reportPictureLoadFailed = useDebounce(showPictureLoadFailed, 0)
  useEffect(() => paint.registerEvent('pictureLoadFailed', reportPictureLoadFailed), [paint, reportPictureLoadFailed])

  const showCustomShapeLoadFailed = useCallback(() => addSnackbar({ type: 'error', text: snackbars.customShapesNotLoaded }), [addSnackbar, snackbars])
  // the custom shapes left out of the same loaded data give a single message
  const reportCustomShapeLoadFailed = useDebounce(showCustomShapeLoadFailed, 0)
  useEffect(() => paint.registerEvent('customShapeLoadFailed', reportCustomShapeLoadFailed), [paint, reportCustomShapeLoadFailed])

  // the upload of a picture also covers the drop of a file on the canvas: the option comes back to the props afterwards
  useEffect(() => {
    if (withUploadPicture) return
    actions.setOptions({ withDropPicture: false })
    return () => actions.setOptions({ withDropPicture: undefined })
  }, [actions, withUploadPicture])

  const appClassName = `${className ? `${className} ` : ''}${isLayoutPanelShown ? 'react-paint-editor-layout-opened ' : ''}react-paint-editor-app`

  return (
    <div
      ref={setRootRef}
      className={appClassName}
      data-resize={layout.resize}
      aria-busy={isLoading}
      style={{
        // bounds the width of the editor according to data-resize, like the canvas, which reads the same variable
        '--react-paint-editor-app-canvasWidth': `calc(var(--react-paint-app-canvaswidth, ${width}) * 1px)`,
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
      <PaintProvider paint={paint}>
        <EditorLocaleProvider locale={locale}>
          {isEditMode && (
            <Toolbar
              scopeRef={rootRef}
              disabled={disabled}
              withMoveTool={withZoom}
              withEraser={withEraser}
              withLaser={withLaser}
              exportCanvasInFile={exportCanvasInFile}
              saveFile={saveFile}
              loadFile={onLoadFile}
              addPicture={addPicture}
              withExport={withExport}
              withLoadAndSave={withLoadAndSave}
              withUploadPicture={withUploadPicture}
              withUrlPicture={withUrlPicture}
            />
          )}
          {children}
          {isEditMode && layersManipulation && <Layouts isLayoutPanelShown={isLayoutPanelShown} disabled={disabled} {...layersPanel.panelProps} />}
          {isZoomPanelShown && (
            <ZoomPanel isEditMode={isEditMode} {...zoomPanel.panelProps}>
              {withMinimap && <MiniMap shapesColor={fontColor} selectionColor={fontSelectedBackgroundColor} />}
            </ZoomPanel>
          )}
          {isEditMode && (
            <>
              <SettingsBar
                disabled={disabled}
                withZoom={withZoom}
                layersManipulation={layersManipulation}
                layersPanel={layersPanel}
                toggleLayoutPanel={() => {
                  setIsLayoutPanelShown(prev => !prev)
                }}
                zoomPanel={zoomPanel}
                isZoomPanelShown={isZoomPanelShown}
                setIsZoomPanelShown={setIsZoomPanelShown}
                recentColors={recentColors}
                addRecentColor={addRecentColor}
              />
              <Loading isLoading={isLoading} />
              <SnackbarContainer snackbarList={snackbarList} removeSnackbar={removeSnackbar} />
            </>
          )}
          <ContextMenu containerRef={rootRef} />
          <Announcements paint={paint} />
        </EditorLocaleProvider>
      </PaintProvider>
    </div>
  )
}

export { DEFAULT_EDITOR_LOCALE, type EditorLocale, type EditorMessages, type SettingFieldName } from '@editor/constants/locale'
export { DEFAULT_EDITOR_OPTIONS, type EditorOptions } from '@editor/constants/options'
export type { EditorComponentProps }
export { Editor }
