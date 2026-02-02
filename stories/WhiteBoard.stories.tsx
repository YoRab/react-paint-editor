import type { Meta, StoryObj } from '@storybook/react-vite'
import { Canvas, Editor, useReactPaint } from '../src/index'
import './whiteboard.css'
import useDebounce from '@canvas/hooks/useDebounce'
import useResizeObserver from '@canvas/hooks/useResizeObserver'
import { useCallback, useRef, useState } from 'react'

const ReactPaintWrapper = (args: Parameters<typeof useReactPaint>[0]) => {
  const { editorProps, canvasProps } = useReactPaint(args)
  return (
    <Editor editorProps={editorProps}>
      <Canvas canvasProps={canvasProps} />
    </Editor>
  )
}

const WhiteBoard = (args: Parameters<typeof useReactPaint>[0]) => {
  const [canvasSize, setCanvasSize] = useState<[number, number] | undefined>()
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedSetCanvasSize = useDebounce(setCanvasSize)

  const onResized = useCallback(
    (measuredWidth: number, measuredHeight: number) => {
      debouncedSetCanvasSize([measuredWidth, measuredHeight - 72])
    },
    [debouncedSetCanvasSize]
  )

  useResizeObserver({ element: containerRef, onResized })

  return (
    <div className='container' ref={containerRef}>
      {canvasSize && <ReactPaintWrapper {...args} width={canvasSize[0]} height={canvasSize[1]} />}
    </div>
  )
}

const meta = {
  title: 'React Paint/Whiteboard',
  component: WhiteBoard,
  parameters: {
    layout: 'centered'
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/react/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {}
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    options: {
      size: 'infinite',
      canZoom: 'always',
      canShrink: false,
      canGrow: false,
      grid: 20
    }
  },
  parameters: {
    docs: {
      source: {
        code: `import { useCallback, useRef, useState } from 'react'
import { Canvas, Editor, useReactPaint } from '../src/index'
import useResizeObserver from '@canvas/hooks/useResizeObserver'
import './whiteboard.css'

const ReactPaintWrapper = (args: Parameters<typeof useReactPaint>[0]) => {
  const { editorProps, canvasProps } = useReactPaint(args)
  return (
    <Editor editorProps={editorProps}>
      <Canvas canvasProps={canvasProps} />
    </Editor>
  )
}

const WhiteBoard = (args: Parameters<typeof useReactPaint>[0]) => {
  const [canvasSize, setCanvasSize] = useState<[number, number] | undefined>()
  const containerRef = useRef<HTMLDivElement>(null)

  const onResized = useCallback((measuredWidth: number, measuredHeight: number) => {
    setCanvasSize([measuredWidth, measuredHeight - 72])
  }, [])

  useResizeObserver({ element: containerRef, onResized })

  return (
    <div className='container' ref={containerRef}>
      {canvasSize && <ReactPaintWrapper {...args} width={canvasSize[0]} height={canvasSize[1]} />}
    </div>
  )
}`,
        language: 'tsx'
      }
    }
  }
}
