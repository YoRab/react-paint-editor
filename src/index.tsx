import type { DrawableShape, OptionalOptions, StateData } from '@canvas/index'
import Canvas, { DEFAULT_OPTIONS, useReactPaint as useCanvasReactPaint } from '@canvas/index'
import type { CustomTool, CustomToolInput } from '@common/types/tools'
import type { RecursivePartial } from '@common/types/utils'
import { compact } from '@common/utils/array'
import { mergeWith } from '@common/utils/object'
import Editor, { DEFAULT_SHAPE_TOOLS } from '@editor/index'
import { useMemo } from 'react'

const arrayOverrideCustomizer = (objValue: unknown, srcValue: unknown) => {
  if (Array.isArray(objValue)) return srcValue
}

const sanitizeEditorTools = (tools: RecursivePartial<CustomToolInput>[]): CustomTool[] => {
  return compact(
    tools.map(tool => {
      if (typeof tool !== 'object' || !tool.type) return null
      const defaultTool = DEFAULT_SHAPE_TOOLS.find(d => d.type === tool.type)
      return defaultTool ? (mergeWith(arrayOverrideCustomizer, defaultTool, tool) as CustomTool) : (tool as CustomTool)
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

export { Canvas, type DrawableShape, Editor, type OptionalOptions, type StateData, useReactPaint }
