import type { Meta, StoryObj } from '@storybook/react-vite'
import { Canvas, Editor, useReactPaint } from '../src/index'

const ReactPaintWrapper = (args: Parameters<typeof useReactPaint>[0]) => {
  const { editorProps, canvasProps } = useReactPaint(args)

  return (
    <Editor editorProps={editorProps}>
      <Canvas canvasProps={canvasProps} />
    </Editor>
  )
}

const meta = {
  title: 'React Paint/Whiteboard',
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
  args: {
    options: {
      size: 'infinite',
      canZoom: 'always',
      grid: 20
    }
  },
  parameters: {
    docs: {
      source: {
        code: `const { editorProps, canvasProps } = useReactPaint( {
    options: {
      size: 'infinite',
      canZoom: 'always'
    }
      })

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
