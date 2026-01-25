import type { Meta, StoryObj } from '@storybook/react-vite'
import { Canvas, Editor, useReactPaint } from '../src/index'
import { TREE_AND_CLOUDS } from './fixture'

const ReactPaintWrapper = (args: Parameters<typeof useReactPaint>[0]) => {
  const { editorProps, canvasProps } = useReactPaint(args)

  return (
    <Editor editorProps={editorProps}>
      <Canvas canvasProps={canvasProps} />
    </Editor>
  )
}

const meta = {
  title: 'React Paint/Canvas',
  component: ReactPaintWrapper,
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
  args: {},
  parameters: {
    docs: {
      source: {
        code: `const { editorProps, canvasProps } = useReactPaint()

return (
  <Editor editorProps={editorProps}>
    <Canvas canvasProps={canvasProps} />
  </Editor>
)`,
        language: 'tsx'
      }
    }
  }
}

export const LoadedFromJSON: Story = {
  args: {
    shapes: TREE_AND_CLOUDS,
    options: {
      clearCallback: 'defaultShapes',
      canZoom: 'always'
    }
  },
  parameters: {
    docs: {
      source: {
        code: `const { editorProps, canvasProps } = useReactPaint({shapes: TREE_AND_CLOUDS, options : {clearCallback: 'defaultShapes',   canZoom: 'always'}})

return (
  <Editor editorProps={editorProps}>
    <Canvas canvasProps={canvasProps} />
  </Editor>
)`,
        language: 'tsx'
      }
    }
  }
}

export const ViewerMode: Story = {
  args: {
    shapes: TREE_AND_CLOUDS,
    mode: 'viewer',
    options: {
      canZoom: 'always'
    }
  },
  parameters: {
    docs: {
      source: {
        code: `const { editorProps, canvasProps } = useReactPaint({ shapes: TREE_AND_CLOUDS, mode: 'viewer'})

return (
  <Editor editorProps={editorProps}>
    <Canvas canvasProps={canvasProps} />
  </Editor>
)`,
        language: 'tsx'
      }
    }
  }
}
