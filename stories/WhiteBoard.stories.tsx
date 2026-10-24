import type { Meta, StoryObj } from '@storybook/react-vite'
import { Canvas, Editor, useReactPaint } from '../src/index'
import './whiteboard.css'

// With resize 'extend', the canvas fills the container at a constant scale: its visible area follows the container
const WhiteBoard = (args: Parameters<typeof useReactPaint>[0]) => {
  const paint = useReactPaint(args)
  return (
    <div className='container'>
      <Editor paint={paint}>
        <Canvas paint={paint} />
      </Editor>
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
} satisfies Meta<typeof WhiteBoard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    options: {
      size: 'infinite',
      resize: 'extend',
      canZoom: 'always',
      grid: 20
    }
  },
  parameters: {
    docs: {
      source: {
        code: `import { Canvas, Editor, useReactPaint } from '@yorab/react-paint'
import './whiteboard.css' // .container fills the page

const WhiteBoard = () => {
  const paint = useReactPaint({
    options: {
      size: 'infinite',
      resize: 'extend', // the canvas fills the container, at a constant scale
      canZoom: 'always',
      grid: 20
    }
  })
  return (
    <div className='container'>
      <Editor paint={paint}>
        <Canvas paint={paint} />
      </Editor>
    </div>
  )
}`,
        language: 'tsx'
      }
    }
  }
}
