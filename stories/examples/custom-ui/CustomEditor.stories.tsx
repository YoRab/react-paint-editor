import type { Meta, StoryObj } from '@storybook/react-vite'
import { CustomEditor } from './CustomEditor'

const meta = {
  title: 'Custom UI/Custom editor',
  component: CustomEditor,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'An editor of your own instead of the library `Editor`: a toolbar, stroke colors, layers and a context menu, written with the canvas handle and the state hooks only.'
      }
    }
  },
  // the same component is tested in Tests/Examples/CustomEditor
  tags: ['autodocs', '!dev', '!test']
} satisfies Meta<typeof CustomEditor>

export default meta
type Story = StoryObj<typeof meta>

export const EditorFromScratch: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'An editor built from scratch with the canvas handle only: `actions` to act on the canvas, `scopeRef` to set on the root element so that the keyboard shortcuts also work from the toolbar, and `usePaintState` to read the state. Each part reads only what it shows with a selector, and renders again only when it changes: the toolbar does not render while a shape is dragged. The parts get the handle with `usePaint`, under a `PaintProvider`. The editor reacts to the hovered shape (`state.interaction.hoveredShape`) and handles its own context menu (`state.contextMenu`).'
      },
      source: {
        code: `const MyToolbar = () => {
  const paint = usePaint()
  // an object built by the selector needs shallowEqual
  const { activeTool, tools, history } = usePaintState(
    paint,
    state => ({ activeTool: state.activeTool, tools: state.tools, history: state.history }),
    shallowEqual
  )

  return (
    <div>
      {tools.map(tool => (
        <button key={tool.id} aria-pressed={activeTool.id === tool.id} onClick={() => paint.actions.selectTool(tool.id)}>
          {tool.label ?? tool.type}
        </button>
      ))}
      <button disabled={!history.canUndo} onClick={paint.actions.undo}>undo</button>
    </div>
  )
}

const MyLayers = () => {
  const paint = usePaint()
  const shapes = usePaintState(paint, state => state.shapes)
  const hoveredId = usePaintState(paint, state => state.interaction.hoveredShape?.id)

  return (
    <ul>
      {shapes.map(shape => (
        <li key={shape.id} data-hovered={hoveredId === shape.id}>
          <button onClick={() => paint.actions.selectShapes([shape.id])}>{shape.type}</button>
        </li>
      ))}
    </ul>
  )
}

const MyEditor = ({ paint, children }) => (
  <PaintProvider paint={paint}>
    <div ref={paint.scopeRef}>
      <MyToolbar />
      {children}
      <MyLayers />
    </div>
  </PaintProvider>
)

const App = () => {
  const paint = useReactPaint()
  return (
    <MyEditor paint={paint}>
      <Canvas paint={paint} />
    </MyEditor>
  )
}`,
        language: 'tsx'
      }
    }
  }
}
