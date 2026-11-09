import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import { TREE_AND_CLOUDS } from '../../fixture'
import { EditorExample } from '../EditorExample'
import './resize.css'

/** A container with a dashed border, which the user resizes by its bottom right corner */
const container = (className: string) => (Story: () => ReactNode) => (
  <div className={className}>
    <Story />
  </div>
)

const meta = {
  title: 'Features/Resize',
  component: EditorExample,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'How the canvas follows the size of its container, with the `resize` option. Drag the bottom right corner of each container to resize it: the drawing is 1000 pixels wide, so make the container narrower and wider than that.'
      }
    }
  },
  tags: ['autodocs', '!dev'],
  args: {
    shapes: TREE_AND_CLOUDS
  }
} satisfies Meta<typeof EditorExample>

export default meta
type Story = StoryObj<typeof meta>

export const ScaleDown: Story = {
  decorators: [container('resizable-width')],
  args: { options: { resize: 'scaleDown', canZoom: 'always' } },
  parameters: {
    docs: {
      description: {
        story:
          'The default: the whole drawing is shown, scaled down in a container narrower than it, but never scaled up: in a wider container it stays at its size, at the scale 1.'
      },
      source: {
        code: `const paint = useReactPaint({ shapes, options: { resize: 'scaleDown' } })`,
        language: 'tsx'
      }
    }
  }
}

export const Scale: Story = {
  decorators: [container('resizable-width')],
  args: { options: { resize: 'scale', canZoom: 'always' } },
  parameters: {
    docs: {
      description: {
        story:
          'The whole drawing is shown, scaled down in a narrower container and scaled up in a wider one: it always fills the width of its container.'
      },
      source: {
        code: `const paint = useReactPaint({ shapes, options: { resize: 'scale' } })`,
        language: 'tsx'
      }
    }
  }
}

export const ScaleUp: Story = {
  decorators: [container('resizable-width')],
  args: { options: { resize: 'scaleUp', canZoom: 'always' } },
  parameters: {
    docs: {
      description: {
        story: 'The whole drawing is shown, scaled up in a wider container but never scaled down: in a narrower one, it is cut by the container.'
      },
      source: {
        code: `const paint = useReactPaint({ shapes, options: { resize: 'scaleUp' } })`,
        language: 'tsx'
      }
    }
  }
}

export const NoScale: Story = {
  decorators: [container('resizable-width')],
  args: { options: { resize: 'none', canZoom: 'always' } },
  parameters: {
    docs: {
      description: {
        story: 'The drawing is never scaled: it always has its size, whatever the container.'
      },
      source: {
        code: `const paint = useReactPaint({ shapes, options: { resize: 'none' } })`,
        language: 'tsx'
      }
    }
  }
}

export const FixedPageInExtendedContainer: Story = {
  decorators: [container('resizable-box')],
  args: { options: { size: 'fixed', resize: 'extend', canZoom: 'always' } },
  parameters: {
    docs: {
      description: {
        story:
          "With `resize: 'extend'`, the canvas fills its container, at a constant scale: a page of a fixed size is shown at the scale 1, centered when the container is larger. The container needs a defined width and height. With an infinite size, the same option makes a whiteboard, see the Whiteboard example."
      },
      source: {
        code: `const paint = useReactPaint({ shapes, options: { size: 'fixed', resize: 'extend', canZoom: 'always' } })

return (
  <div style={{ width: 700, height: 450, resize: 'both', overflow: 'hidden' }}>
    <Editor paint={paint}>
      <Canvas paint={paint} />
    </Editor>
  </div>
)`,
        language: 'tsx'
      }
    }
  }
}
