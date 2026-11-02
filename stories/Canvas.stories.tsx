import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Canvas,
  DEFAULT_TOOLS,
  Editor,
  type EditorOptions,
  SETTINGS_DEFAULT_CUSTOM,
  type UseReactPaintProps,
  useReactPaint
} from '../src/index'
import { HEART_PATH, starPath, TREE_AND_CLOUDS } from './fixture'

const ReactPaintWrapper = ({ editorOptions, ...args }: UseReactPaintProps & { editorOptions?: EditorOptions }) => {
  const paint = useReactPaint(args)

  return (
    <Editor paint={paint} options={editorOptions}>
      <Canvas paint={paint} />
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
        code: `const paint = useReactPaint()

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

/** A page of a fixed size in a resizable container: it is shown at the scale 1, centered when the container is larger */
export const FixedPageInResizableContainer: Story = {
  args: {
    shapes: TREE_AND_CLOUDS,
    options: {
      size: 'fixed',
      resize: 'extend',
      canZoom: 'always'
    }
  },
  decorators: [
    Story => (
      <div style={{ width: 700, height: 450, resize: 'both', overflow: 'hidden', border: '1px dashed gray' }}>
        <Story />
      </div>
    )
  ],
  parameters: {
    docs: {
      source: {
        code: `const paint = useReactPaint({ shapes: TREE_AND_CLOUDS, options: { size: 'fixed', resize: 'extend', canZoom: 'always' } })

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
    options: {
      canZoom: 'always'
    }
  },
  parameters: {
    docs: {
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
      availableTools: CUSTOM_BRUSH_TOOLS
    },
    editorOptions: {
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

const paint = useReactPaint({ options: { availableTools: CUSTOM_BRUSH_TOOLS } })

return (
  <Editor paint={paint} options={{ withUploadPicture: false, withUrlPicture: false }}>
    <Canvas paint={paint} />
  </Editor>
)`,
        language: 'tsx'
      }
    }
  }
}

const CUSTOM_SHAPE_TOOLS = [
  ...DEFAULT_TOOLS,
  {
    type: 'custom' as const,
    id: 'star',
    label: 'Star',
    shape: { viewBox: [0, 0, 100, 100] as const, path: starPath },
    settings: {
      ...SETTINGS_DEFAULT_CUSTOM,
      fillColor: { default: '#f1c40f' },
      strokeColor: { default: '#d35400' },
      lineWidth: { min: 1, max: 20, step: 1, default: 3 },
      params: {
        branches: { label: 'Branches', min: 3, max: 12, step: 1, default: 5 },
        depth: { label: 'Depth', min: 10, max: 90, step: 5, default: 50 }
      }
    }
  },
  {
    type: 'custom' as const,
    id: 'heart',
    label: 'Heart',
    shape: { viewBox: [0, 0, 100, 90] as const, path: HEART_PATH, keepRatio: true },
    settings: { ...SETTINGS_DEFAULT_CUSTOM, fillColor: { default: '#e74c3c' } }
  }
]

export const CustomShapes: Story = {
  args: {
    options: {
      availableTools: CUSTOM_SHAPE_TOOLS
    }
  },
  parameters: {
    docs: {
      description: {
        story:
          'Custom shapes — two tools of type custom, whose paths are written by the application: a star, whose path is built from its parameters, and a heart, whose path is fixed and which keeps its proportions. Draw a star, then change its branches with the slider of the settings bar: the shape keeps its box and is drawn again.'
      },
      source: {
        code: `// a star of as many branches, inside the circle of its view box of 100: its notches are depth percent of its radius deep
const starPath = ({ branches = 5, depth = 50 }: CustomShapeParams) => {
  const points = Array.from({ length: branches * 2 }, (_, index) => {
    const radius = index % 2 ? 50 - depth / 2 : 50
    const angle = (index * Math.PI) / branches - Math.PI / 2
    return \`\${50 + radius * Math.cos(angle)} \${50 + radius * Math.sin(angle)}\`
  })
  return \`M\${points.join(' L')} Z\`
}

// a heart drawn by curves, which fills its view box of 100 x 90
const HEART_PATH = 'M50 90 C20 70 0 50 0 28 C0 12 12 0 27 0 C38 0 46 6 50 15 C54 6 62 0 73 0 C88 0 100 12 100 28 C100 50 80 70 50 90 Z'

const CUSTOM_SHAPE_TOOLS: CustomToolInput[] = [
  ...DEFAULT_TOOLS,
  {
    type: 'custom',
    id: 'star',
    label: 'Star',
    shape: { viewBox: [0, 0, 100, 100], path: starPath },
    settings: {
      ...SETTINGS_DEFAULT_CUSTOM,
      fillColor: { default: '#f1c40f' },
      strokeColor: { default: '#d35400' },
      lineWidth: { min: 1, max: 20, step: 1, default: 3 },
      params: {
        branches: { label: 'Branches', min: 3, max: 12, step: 1, default: 5 },
        depth: { label: 'Depth', min: 10, max: 90, step: 5, default: 50 }
      }
    }
  },
  {
    type: 'custom',
    id: 'heart',
    label: 'Heart',
    shape: { viewBox: [0, 0, 100, 90], path: HEART_PATH, keepRatio: true },
    settings: { ...SETTINGS_DEFAULT_CUSTOM, fillColor: { default: '#e74c3c' } }
  }
]

const paint = useReactPaint({ options: { availableTools: CUSTOM_SHAPE_TOOLS } })

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
        code: `const paint = useReactPaint({
  shapes: TREE_AND_CLOUDS,
  options: {
    canZoom: 'always',
    debug: true
  }
})

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
