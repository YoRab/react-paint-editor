import { DEFAULT_OPTIONS, type OptionalOptions } from '@canvas/constants/app'
import useCanvasReactPaint from '@canvas/hooks/useReactPaint'
import Canvas from '@canvas/index'
import type { CustomTool, CustomToolInput } from '@common/types/tools'
import type { ExportedDrawableShape, StateData } from '@common/types/Shapes'
import type { RecursivePartial } from '@common/types/utils'
import { compact } from '@common/utils/array'
import { mergeWith } from '@common/utils/object'
import Editor from '@editor/index'
import { DEFAULT_SHAPE_TOOLS } from '@editor/constants/tools'
import { useMemo } from 'react'

type DrawableShape = ExportedDrawableShape

const arrayOverrideCustomizer = (objValue: unknown, srcValue: unknown) => {
  if (Array.isArray(objValue)) return srcValue
}

const sanitizeEditorTools = (tools: RecursivePartial<CustomToolInput>[]): CustomTool[] => {
  return compact(
    tools.map(tool => {
      if (typeof tool !== 'object' || !tool.type) return null
      const defaultTool = DEFAULT_SHAPE_TOOLS.find(d => d.type === tool.type)
      return defaultTool
        ? (mergeWith(arrayOverrideCustomizer, defaultTool, tool) as CustomTool)
        : (tool as CustomTool)
    })
  )
}

const useReactPaint = ({ options, ...rest }: Parameters<typeof useCanvasReactPaint>[0] = {}) => {
  const rawTools = options?.availableTools
  const withPicture = (options?.withUploadPicture ?? DEFAULT_OPTIONS.withUploadPicture) || (options?.withUrlPicture ?? DEFAULT_OPTIONS.withUrlPicture)
  const availableTools = useMemo(() => {
    const tools = rawTools ? sanitizeEditorTools(rawTools) : DEFAULT_SHAPE_TOOLS
    return withPicture ? tools : tools.filter(t => t.type !== 'picture')
  }, [rawTools, withPicture])
  return useCanvasReactPaint({
    ...rest,
    options: { ...options, availableTools: availableTools as CustomToolInput[] }
  })
}

export { Editor, Canvas, useReactPaint, type DrawableShape, type StateData, type OptionalOptions }
