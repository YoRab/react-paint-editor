import { type EditorState, type ReactPaint, type ShapeEntity, type ShapesBounds, usePaint, usePaintState } from '@canvas/index'
import NumberInput from '@editor/components/common/NumberInput'
import '@editor/components/settings/NumberField.css'
import useDebounce from '@editor/hooks/useDebounce'
import { useState } from 'react'
import './GeometryFields.css'

type GeometryKey = 'x' | 'y' | 'width' | 'height' | 'rotation'

const GEOMETRY_FIELDS: { key: GeometryKey; label: string; unity?: string; min?: number }[] = [
  { key: 'x', label: 'X' },
  { key: 'y', label: 'Y' },
  { key: 'width', label: 'Largeur', min: 1 },
  { key: 'height', label: 'Hauteur', min: 1 },
  { key: 'rotation', label: 'Rotation', unity: '°' }
]

/** An angle in radians, in whole degrees between 0 and 359 */
const toDegrees = (radians: number) => ((Math.round((radians * 180) / Math.PI) % 360) + 360) % 360

/** The box of the selection, read again only when the shapes or the selection change */
const createBoundsSelector = (paint: ReactPaint) => {
  let last: { shapes: ShapeEntity[]; ids: string[]; bounds: ShapesBounds | undefined } | undefined
  return ({ shapes, selectedShapeIds }: EditorState) => {
    if (last?.shapes !== shapes || last.ids !== selectedShapeIds) last = { shapes, ids: selectedShapeIds, bounds: paint.getBounds(selectedShapeIds) }
    return last.bounds
  }
}

/** The box of the selection is read again when a shape moves: it is compared by value */
const isSameBounds = (a: ShapesBounds | undefined, b: ShapesBounds | undefined) =>
  a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height && a.rotation === b.rotation)

/**
 * The position, the size and the angle of the selection, typed in fields: what a drag of the selection, of its anchors or
 * of its rotation does, from the keyboard or with a single pointer. Shown by the modal of the properties
 */
const GeometryFields = () => {
  const paint = usePaint()
  const { actions } = paint
  const [selectBounds] = useState(() => createBoundsSelector(paint))
  const bounds = usePaintState(paint, selectBounds, isSameBounds)
  // like a slider, the fields only save their last change in the history
  const debouncedSave = useDebounce(actions.saveShapes, 500, true)

  if (!bounds) return null
  const values: Record<GeometryKey, number> = { ...bounds, rotation: toDegrees(bounds.rotation) }

  const apply = (key: GeometryKey, value: number) => {
    const options = { save: false }
    const ids = paint.getState().selectedShapeIds
    const { x, y, width, height } = bounds
    switch (key) {
      case 'x':
        actions.translateShapes(ids, [value - x, 0], options)
        break
      case 'y':
        actions.translateShapes(ids, [0, value - y], options)
        break
      case 'width':
        actions.resizeShapes(ids, { x, y, width: value, height }, options)
        break
      case 'height':
        actions.resizeShapes(ids, { x, y, width, height: value }, options)
        break
      case 'rotation':
        actions.rotateShapes(ids, ((value - values.rotation) * Math.PI) / 180, options)
        break
    }
    debouncedSave()
  }

  return (
    <div className='react-paint-editor-geometryfield'>
      {GEOMETRY_FIELDS.map(({ key, label, unity, min }) => (
        <label key={key} className='react-paint-editor-numberfield'>
          <span className='react-paint-editor-geometryfield-label'>{label}</span>
          <NumberInput step={1} min={min} value={values[key]} onValueChange={value => apply(key, value)} />
          {unity && <span aria-hidden='true'>{unity}</span>}
        </label>
      ))}
    </div>
  )
}

export default GeometryFields
