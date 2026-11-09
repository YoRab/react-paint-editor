import { type DataChanges, type ExportedShape, formatNumber, type ReactPaint, type ShapeEntity, type ToolsType } from '@canvas/index'
import { ZOOM_FORMAT } from '@editor/constants/locale'
import type { EditorLocaleValue } from '@editor/hooks/useEditorLocale'
import useLatest from '@editor/hooks/useLatest'
import { getPaintShapeNames } from '@editor/utils/layers'
import { getToolLabel } from '@editor/utils/style'
import { useEffect, useState } from 'react'

/** The changes are gathered during this delay, then announced together: a zoom of the wheel is announced once */
const ANNOUNCE_DELAY_MS = 200

type AnnouncedChange = 'tool' | 'selection' | 'shapes' | 'zoom'

/** The tool chosen, by its name: the label it is given, or else the one of its type */
const getToolMessage = (tool: ToolsType, { editor, format }: EditorLocaleValue) =>
  format(editor.announcements.tool, { name: getToolLabel(tool, editor) })

/** The names of the shapes are only read when a single shape is selected */
const getSelectionMessage = (shapes: ShapeEntity[], getNames: () => ReadonlyMap<string, string>, { canvas, editor, format }: EditorLocaleValue) => {
  const { announcements } = editor
  if (!shapes.length) return format(announcements.noSelection)
  if (shapes.length > 1) return format(announcements.selectionCount, { count: shapes.length })
  const [shape] = shapes as [ShapeEntity]
  return format(announcements.selection, { name: getNames().get(shape.id) ?? canvas.shapeTypes[shape.type] })
}

/** The removed shapes are no longer in the drawing: they are named by their own name or by their type */
const getExportedName = (shape: ExportedShape, { canvas }: EditorLocaleValue) => shape.name ?? canvas.shapeTypes[shape.type]

/** The names of the shapes are only read when a single shape is added */
const getShapesMessage = ({ added, removed }: DataChanges, getNames: () => ReadonlyMap<string, string>, locale: EditorLocaleValue) => {
  const { announcements } = locale.editor
  const messages: string[] = []
  if (added.length === 1)
    messages.push(locale.format(announcements.added, { name: getNames().get(added[0]!.id) ?? getExportedName(added[0]!, locale) }))
  else if (added.length > 1) messages.push(locale.format(announcements.addedCount, { count: added.length }))
  if (removed.length === 1) messages.push(locale.format(announcements.removed, { name: getExportedName(removed[0]!, locale) }))
  else if (removed.length > 1) messages.push(locale.format(announcements.removedCount, { count: removed.length }))
  return messages.join('. ')
}

/**
 * Message of the changes made by the user, read by the assistive technologies from a live region: the tool chosen, the
 * selection, the shapes added or removed and the zoom, in the language of the locale. The changes received from elsewhere
 * are not announced
 */
const useAnnouncements = (paint: ReactPaint, locale: EditorLocaleValue) => {
  const [message, setMessage] = useState('')
  // the listeners are set once: they read the locale of the last render
  const localeRef = useLatest(locale)

  useEffect(() => {
    const pending = new Map<AnnouncedChange, string>()
    let timeout: ReturnType<typeof setTimeout> | undefined
    // the same message is announced again: the region is changed by a space which is not read
    let isAlternate = false

    const announce = (change: AnnouncedChange, text: string) => {
      if (!text) return
      // a change replaces the previous one of its kind
      pending.delete(change)
      pending.set(change, text)
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        isAlternate = !isAlternate
        setMessage(`${[...pending.values()].join('. ')}${isAlternate ? ' ' : ''}`)
        pending.clear()
      }, ANNOUNCE_DELAY_MS)
    }

    const getNames = () => {
      const { shapes, tools } = paint.getState()
      return getPaintShapeNames(paint, shapes, tools, localeRef.current)
    }

    // the view also changes when it is moved or resized
    let zoom = paint.getState().view.zoom
    const unregisterView = paint.registerEvent('viewChanged', ({ zoom: newZoom }) => {
      if (newZoom === zoom) return
      zoom = newZoom
      const { lang, editor, format } = localeRef.current
      announce('zoom', format(editor.announcements.zoom, { value: formatNumber(newZoom, lang, ZOOM_FORMAT) }))
    })
    const unregisterTool = paint.registerEvent('toolChanged', tool => announce('tool', getToolMessage(tool, localeRef.current)))
    const unregisterSelection = paint.registerEvent('selectionChanged', shapes =>
      announce('selection', getSelectionMessage(shapes, getNames, localeRef.current))
    )
    const unregisterData = paint.registerEvent('dataChanged', (_data, source, changes) => {
      if (source !== 'remote') announce('shapes', getShapesMessage(changes, getNames, localeRef.current))
    })

    return () => {
      clearTimeout(timeout)
      unregisterView()
      unregisterTool()
      unregisterSelection()
      unregisterData()
    }
  }, [paint, localeRef])

  return message
}

export default useAnnouncements
