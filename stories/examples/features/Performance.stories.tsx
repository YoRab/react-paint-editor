import type { Meta, StoryObj } from '@storybook/react-vite'
import { Performance } from './Performance'
import panelSource from './PerformancePanel.tsx?raw'

/**
 * The code of the panel, importing the library like an application. Unlike the code of the other examples, written in
 * their stories, it is read from its module: the code shown is always the one which runs
 */
const PANEL_CODE = panelSource.replace(/'(\.\.\/)+src\/index'/, "'@yorab/react-paint'")

const meta = {
  title: 'Features/Performance',
  component: Performance,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A lab which measures the editor with up to 20,000 shapes. Choose their number and their mix (all the types, rectangles, brushes, texts, or all the types with photos), draw them at half opacity or in groups, bound the density of the canvas, then replay a drag, a pan, a zoom or a stroke of the brush, or select, move, zoom and undo yourself. A replay sends an event in each of 120 frames, 2 seconds at 60 frames per second, from the same view: its figures compare from one replay, or one machine, to another. The panel above the editor reads the events `frameDrawn` and `gestureMeasured`: the frames per second of the browser, which drop when it is busy, the time of each draw of the two layers of the canvas, the shapes drawn, left out of the view or painted on a layer for their opacity, the size of the canvas in pixels, and the summary of the last gesture.'
      }
    }
  },
  // the same component is tested in Tests/Examples/Performance
  tags: ['autodocs', '!dev', '!test']
} satisfies Meta<typeof Performance>

export default meta
type Story = StoryObj<typeof meta>

export const ThousandsOfShapes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The shapes are laid out on a grid in an infinite drawing, and replaced with `actions.loadData` when a choice changes. Zoom in to see the smallest ones. The code of the panel follows the one of the application: it uses the public API only, copy it to measure your own application.'
      },
      source: {
        code: `import { Canvas, Editor, type ShapeInput, useReactPaint } from '@yorab/react-paint'
import { PerformancePanel } from './PerformancePanel'

// the shapes of the application: here, thousands of shapes laid out on a grid
const SHAPES: ShapeInput[] = generateShapes(2000)

const App = () => {
  const paint = useReactPaint({ shapes: SHAPES, options: { size: 'infinite' } })

  // replaces the drawing, with its history
  const chooseCount = (count: number) => paint.actions.loadData({ shapes: generateShapes(count) })

  return (
    <>
      <PerformancePanel paint={paint} />
      <Editor paint={paint}>
        <Canvas paint={paint} />
      </Editor>
    </>
  )
}

// PerformancePanel.tsx
${PANEL_CODE}`,
        language: 'tsx'
      }
    }
  }
}
