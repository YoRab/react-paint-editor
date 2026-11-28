import type { Meta, StoryObj } from '@storybook/react-vite'
import { Performance } from './Performance'
import panelSource from './PerformancePanel.tsx?raw'

/**
 * The code of the panel, importing the library like an application. Unlike the code of the other examples, written in
 * their stories, it is read from its module: the code shown is always the one which runs
 */
const PANEL_CODE = panelSource.replace(/'(\.\.\/)+src\/index'/, "'@yorab/react-paint'")

// the docs page is Performance.mdx, with the figures measured
const meta = {
  title: 'Features/Performance',
  component: Performance,
  parameters: {
    layout: 'centered'
  },
  // the same component is tested in Tests/Examples/Performance
  tags: ['!dev', '!test']
} satisfies Meta<typeof Performance>

export default meta
type Story = StoryObj<typeof meta>

export const ThousandsOfShapes: Story = {
  parameters: {
    docs: {
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
