import type { DataChanges, ExportedShape, ReactPaint, ShapeEntity, ToolsType } from '@canvas/index'
import { ERASER_TOOL_DISPLAY, LASER_TOOL_DISPLAY, MOVE_TOOL_DISPLAY, SELECTION_TOOL_DISPLAY, TOOL_LABELS } from '@editor/constants/tools'
import { getPaintShapeNames } from '@editor/utils/layers'
import { useEffect, useState } from 'react'

/** The changes are gathered during this delay, then announced together: a zoom of the wheel is announced once */
const ANNOUNCE_DELAY_MS = 200

type AnnouncedChange = 'tool' | 'selection' | 'shapes' | 'zoom'

/** Labels of the action tools shown by the editor */
const ACTION_TOOL_LABELS = new Map(
  [SELECTION_TOOL_DISPLAY, MOVE_TOOL_DISPLAY, ERASER_TOOL_DISPLAY, LASER_TOOL_DISPLAY].map(tool => [tool.id, tool.label])
)

const getToolMessage = (tool: ToolsType) =>
  `Outil ${ACTION_TOOL_LABELS.get(tool.id) ?? tool.label ?? (tool.type in TOOL_LABELS ? TOOL_LABELS[tool.type as keyof typeof TOOL_LABELS] : tool.type)}`

/** The names of the shapes are only read when a single shape is selected */
const getSelectionMessage = (shapes: ShapeEntity[], getNames: () => ReadonlyMap<string, string>) => {
  if (!shapes.length) return 'Aucune forme sélectionnée'
  if (shapes.length > 1) return `Sélection : ${shapes.length} formes`
  const [shape] = shapes as [ShapeEntity]
  return `Sélection : ${getNames().get(shape.id) ?? TOOL_LABELS[shape.type]}`
}

/** The removed shapes are no longer in the drawing: they are named by their own name or by their type */
const getExportedName = (shape: ExportedShape) => shape.name ?? TOOL_LABELS[shape.type]

/** The names of the shapes are only read when a single shape is added */
const getShapesMessage = ({ added, removed }: DataChanges, getNames: () => ReadonlyMap<string, string>) => {
  const messages: string[] = []
  if (added.length === 1) messages.push(`Ajout : ${getNames().get(added[0]!.id) ?? getExportedName(added[0]!)}`)
  else if (added.length > 1) messages.push(`${added.length} formes ajoutées`)
  if (removed.length === 1) messages.push(`Suppression : ${getExportedName(removed[0]!)}`)
  else if (removed.length > 1) messages.push(`${removed.length} formes supprimées`)
  return messages.join('. ')
}

/**
 * Message of the changes made by the user, read by the assistive technologies from a live region: the tool chosen, the
 * selection, the shapes added or removed and the zoom. The changes received from elsewhere are not announced
 */
const useAnnouncements = (paint: ReactPaint) => {
  const [message, setMessage] = useState('')

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
      return getPaintShapeNames(paint, shapes, tools)
    }

    let zoom = paint.getState().view.zoom
    const unsubscribe = paint.subscribe(() => {
      const newZoom = paint.getState().view.zoom
      if (newZoom === zoom) return
      zoom = newZoom
      announce('zoom', `Zoom ${Math.round(newZoom * 100)} %`)
    })
    const unregisterTool = paint.registerEvent('toolChanged', tool => announce('tool', getToolMessage(tool)))
    const unregisterSelection = paint.registerEvent('selectionChanged', shapes => announce('selection', getSelectionMessage(shapes, getNames)))
    const unregisterData = paint.registerEvent('dataChanged', (_data, source, changes) => {
      if (source !== 'remote') announce('shapes', getShapesMessage(changes, getNames))
    })

    return () => {
      clearTimeout(timeout)
      unsubscribe()
      unregisterTool()
      unregisterSelection()
      unregisterData()
    }
  }, [paint])

  return message
}

export default useAnnouncements
