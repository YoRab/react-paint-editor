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

const CUSTOM_BRUSH_TOOLS = [
  {
    type: 'brush' as const,
    id: 'fine-pencil',
    label: 'Fine pencil',
    settings: {
      lineWidth: { min: 1, max: 8, step: 1, default: 2 },
      strokeColor: { default: '#212121' }
    }
  },
  {
    type: 'brush' as const,
    id: 'marker',
    label: 'Marker',
    settings: {
      lineWidth: { min: 10, max: 30, step: 2, default: 20 },
      strokeColor: { default: '#e74c3c' },
      opacity: { default: 50 }
    }
  },
  {
    type: 'brush' as const,
    id: 'dashed-brush',
    label: 'Dashed brush',
    settings: {
      lineWidth: { min: 4, max: 16, step: 2, default: 8 },
      strokeColor: { default: '#2980b9' },
      lineDash: { default: 1 }
    }
  }
]

export const CustomTool: Story = {
  args: {
    options: {
      availableTools: CUSTOM_BRUSH_TOOLS,
      withUploadPicture: false,
      withUrlPicture: false
    }
  },
  parameters: {
    docs: {
      description: {
        story:
          'Custom tools — only 3 brush presets with different configurations. Each tool is defined as a partial object merged with the default brush settings.'
      },
      source: {
        code: `const CUSTOM_BRUSH_TOOLS = [
  {
    type: 'brush',
    id: 'fine-pencil',
    label: 'Fine pencil',
    settings: {
      lineWidth: { min: 1, max: 8, step: 1, default: 2 },
      strokeColor: { default: '#212121' }
    }
  },
  {
    type: 'brush',
    id: 'marker',
    label: 'Marker',
    settings: {
      lineWidth: { min: 10, max: 30, step: 2, default: 20 },
      strokeColor: { default: '#e74c3c' },
      opacity: { default: 50 }
    }
  },
  {
    type: 'brush',
    id: 'dashed-brush',
    label: 'Dashed brush',
    settings: {
      lineWidth: { min: 4, max: 16, step: 2, default: 8 },
      strokeColor: { default: '#2980b9' },
      lineDash: { default: 1 }
    }
  }
]

const { editorProps, canvasProps } = useReactPaint({ options: { availableTools: CUSTOM_BRUSH_TOOLS, withUploadPicture: false, withUrlPicture: false } })

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

export const DebugMode: Story = {
  args: {
    shapes: TREE_AND_CLOUDS,
    options: {
      canZoom: 'always',
      debug: true
    }
  },
  parameters: {
    docs: {
      description: {
        story:
          'With `options.debug: true`, shape selection and hit-testing are logged to the browser console. Open DevTools to see debug output when selecting or hovering shapes.'
      },
      source: {
        code: `const { editorProps, canvasProps } = useReactPaint({
  shapes: TREE_AND_CLOUDS,
  options: {
    canZoom: 'always',
    debug: true
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
