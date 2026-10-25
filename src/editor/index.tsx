import { type EditorState, type ExportView, PaintProvider, type ReactPaint, shallowEqual, usePaintState } from '@canvas/index'
import Loading from '@editor/components/common/Loading'
import SnackbarContainer from '@editor/components/common/Snackbar'
import Layouts from '@editor/components/settings/Layouts'
import SettingsBar from '@editor/components/settings/SettingsBar'
import ZoomPanel from '@editor/components/settings/ZoomPanel'
import Toolbar from '@editor/components/toolbox/Toolbar'
import { DEFAULT_EDITOR_OPTIONS, type EditorOptions } from '@editor/constants/options'
import useDebounce from '@editor/hooks/useDebounce'
import useSnackbar from '@editor/hooks/useSnackbar'
import { withDefaults } from '@editor/utils/util'
import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import './index.css'
import ContextMenu from '@editor/components/toolbox/ContextMenu'

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
    withLaser
  } = withDefaults(DEFAULT_EDITOR_OPTIONS, options)

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

  const { snackbarList, addSnackbar } = useSnackbar()

  const exportCanvasInFile = useCallback(
    (exportView: ExportView) => {
      setIsLoading(true)
      try {
        actions.exportPicture({ view: exportView })
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
        await actions.addPicture(fileOrUrl)
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

  useEffect(
    () => paint.registerEvent('pictureDropFailed', () => addSnackbar({ type: 'error', text: 'Le chargement a échoué' })),
    [paint, addSnackbar]
  )

  const showPictureLoadFailed = useCallback(() => addSnackbar({ type: 'error', text: "Certaines images n'ont pas pu être chargées" }), [addSnackbar])
  // the pictures left out of the same loaded data give a single message
  const reportPictureLoadFailed = useDebounce(showPictureLoadFailed, 0)
  useEffect(() => paint.registerEvent('pictureLoadFailed', reportPictureLoadFailed), [paint, reportPictureLoadFailed])

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
        {isEditMode && (
          <Toolbar
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
        {isEditMode && layersManipulation && <Layouts isLayoutPanelShown={isLayoutPanelShown} disabled={disabled} />}
        {isZoomPanelShown && <ZoomPanel isEditMode={isEditMode} />}
        {isEditMode && (
          <>
            <SettingsBar
              disabled={disabled}
              withZoom={withZoom}
              layersManipulation={layersManipulation}
              toggleLayoutPanel={() => {
                setIsLayoutPanelShown(prev => !prev)
              }}
              isZoomPanelShown={isZoomPanelShown}
              setIsZoomPanelShown={setIsZoomPanelShown}
            />
            <Loading isLoading={isLoading} />
            <SnackbarContainer snackbarList={snackbarList} />
          </>
        )}
        <ContextMenu containerRef={rootRef} />
      </PaintProvider>
    </div>
  )
}

export { DEFAULT_EDITOR_OPTIONS, type EditorOptions } from '@editor/constants/options'
export type { EditorComponentProps }
export { Editor }
