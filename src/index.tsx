import type { OptionalOptions } from '@canvas/constants/app'
import useReactPaint from '@canvas/hooks/useReactPaint'
import Canvas from '@canvas/index'
import type { ExportedDrawableShape, StateData } from '@common/types/Shapes'
import Editor from '@editor/index'

type DrawableShape = ExportedDrawableShape

export { Editor, Canvas, useReactPaint, type DrawableShape, type StateData, type OptionalOptions }
