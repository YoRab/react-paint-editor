import type { Meta, StoryObj } from '@storybook/react-vite'
import { EditorExample } from '../EditorExample'
import './whiteboard.css'

const meta = {
  title: 'Use cases/Whiteboard',
  component: EditorExample,
  // with resize 'extend', the canvas fills the container at a constant scale: its visible area follows the container
  decorators: [
    Story => (
      <div className='whiteboard'>
        <Story />
      </div>
    )
  ],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          "An infinite drawing which fills its container, like a whiteboard: with `size: 'infinite'` it has no bounds, and with `resize: 'extend'` it fills its container at a constant scale. Resize the container by its bottom right corner: the visible area follows it. The container needs a defined width and height. The other modes of `resize` are in the Resize example."
      }
    }
  },
  tags: ['autodocs', '!dev']
} satisfies Meta<typeof EditorExample>

export default meta
type Story = StoryObj<typeof meta>

export const Infinite: Story = {
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
      description: {
        story: 'An infinite board with a grid, zoomed and scrolled in every direction.'
      },
      source: {
        code: `import { Canvas, Editor, useReactPaint } from '@yorab/react-paint'
import './whiteboard.css' // .whiteboard has a width and a height

const Whiteboard = () => {
  const paint = useReactPaint({
    options: {
      size: 'infinite',
      resize: 'extend', // the canvas fills the container, at a constant scale
      canZoom: 'always',
      grid: 20
    }
  })
  return (
    <div className='whiteboard'>
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
