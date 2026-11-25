import type { Meta, StoryObj } from '@storybook/react-vite'
import { TREE_AND_CLOUDS } from '../../fixture'
import { EditorExample } from '../EditorExample'

const meta = {
  title: 'Features/Drawing data',
  component: EditorExample,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'The shapes of the drawing given by the application, with the `shapes` of `useReactPaint` when the canvas is created. The `viewer` mode shows them without letting the user change them.'
      }
    }
  },
  tags: ['autodocs', '!dev']
} satisfies Meta<typeof EditorExample>

export default meta
type Story = StoryObj<typeof meta>

export const InitialShapes: Story = {
  args: {
    shapes: TREE_AND_CLOUDS,
    options: {
      clearCallback: 'defaultShapes',
      canZoom: 'always'
    }
  },
  parameters: {
    docs: {
      description: {
        story:
          "Shapes loaded from JSON when the canvas is created. With `clearCallback: 'defaultShapes'`, the Clear button of the editor brings them back."
      },
      source: {
        code: `const paint = useReactPaint({shapes: TREE_AND_CLOUDS, options : {clearCallback: 'defaultShapes',   canZoom: 'always'}})

return (
  <Editor paint={paint}>
    <Canvas paint={paint} />
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
    options: {}
  },
  parameters: {
    docs: {
      description: {
        story: "In the `'viewer'` mode, the drawing is read only: the editor hides its toolbar, and the shapes cannot be changed."
      },
      source: {
        code: `const paint = useReactPaint({ shapes: TREE_AND_CLOUDS, mode: 'viewer'})

return (
  <Editor paint={paint}>
    <Canvas paint={paint} />
  </Editor>
)`,
        language: 'tsx'
      }
    }
  }
}
