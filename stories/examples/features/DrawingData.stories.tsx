import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useState } from 'react'
import { Canvas, type DrawableShape, Editor, type StateData, useReactPaint } from '../../../src/index'
import { HELLO_THERE, TREE_AND_CLOUDS, WITH_PICTURE } from '../../fixture'
import { EditorExample } from '../EditorExample'
import '../buttons.css'

const PRESETS = [
  { name: 'picture', shapes: WITH_PICTURE },
  { name: 'trees', shapes: TREE_AND_CLOUDS },
  { name: 'hello', shapes: HELLO_THERE }
]

const PresetsEditor = () => {
  const [preset, setPreset] = useState(0)
  const [shapes, setShapes] = useState<DrawableShape[] | undefined>(WITH_PICTURE)

  const paint = useReactPaint({
    shapes,
    options: {
      canZoom: 'always',
      clearCallback: () => {
        return PRESETS[preset]!.shapes
      }
    }
  })

  const choosePreset = (preset: number) => {
    setPreset(preset)
    paint.resetCanvas(PRESETS[preset]?.shapes)
  }

  useEffect(() => {
    const onDataChanged = (data: StateData, source: 'user' | 'remote') => {
      console.log(`data changed from ${source}`)
      setShapes(data.shapes)
    }
    // registerEvent returns the function that unregisters the listener
    return paint.registerEvent('dataChanged', onDataChanged)
  }, [paint])

  return (
    <>
      <div>
        <h3 className='example-title'>Choose a preset to reset the canvas</h3>
        <div className='example-buttons'>
          {PRESETS.map(({ name }, index) => (
            <button key={name} type='button' className={`example-button ${preset === index ? 'active' : ''}`} onClick={() => choosePreset(index)}>
              Preset {index + 1}
            </button>
          ))}
        </div>
      </div>
      <Editor paint={paint}>
        <Canvas paint={paint} />
      </Editor>
    </>
  )
}

const meta = {
  title: 'Features/Drawing data',
  component: EditorExample,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'The shapes of the drawing given by the application: when the canvas is created with the `shapes` of `useReactPaint`, later with `resetCanvas`, and read back with the `dataChanged` event. The `viewer` mode shows them without letting the user change them.'
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

export const ResetFromTheApp: Story = {
  render: () => <PresetsEditor />,
  parameters: {
    docs: {
      description: {
        story:
          'The application replaces the drawing with `resetCanvas`, and keeps its shapes up to date with the `dataChanged` event. `clearCallback` can also be a function returning the shapes the Clear button brings back.'
      },
      source: {
        code: ` const [preset, setPreset] = useState(0)
  const [shapes, setShapes] = useState<DrawableShape[] | undefined>(WITH_PICTURE)

  const paint = useReactPaint({
    shapes,
    options: {
      clearCallback: () => {
        return [WITH_PICTURE, TREE_AND_CLOUDS, HELLO_THERE][preset]
      }
    }
  })

  const choosePreset = (preset: number) => {
    setPreset(preset)
    paint.resetCanvas([WITH_PICTURE, TREE_AND_CLOUDS, HELLO_THERE][preset])
  }

  useEffect(() => {
    const onDataChanged = (data: StateData, source: 'user' | 'remote') => {
      console.log(\`data changed from \${source}\`)
      setShapes(data.shapes)
    }
    // registerEvent returns the function that unregisters the listener
    return paint.registerEvent('dataChanged', onDataChanged)
  }, [paint])

  return (
    <>
      <div className="example-buttons">
        <button
          type="button"
          className={\`example-button \${preset === 0 ? 'active' : ''}\`}
          onClick={() => choosePreset(0)}
        >
          Preset 1
        </button>
        <button
          type="button"
          className={\`example-button \${preset === 1 ? 'active' : ''}\`}
          onClick={() => choosePreset(1)}
        >
          Preset 2
        </button>
        <button
          type="button"
          className={\`example-button \${preset === 2 ? 'active' : ''}\`}
          onClick={() => choosePreset(2)}
        >
          Preset 3
        </button>
      </div>
      <Editor paint={paint}>
        <Canvas paint={paint} />
      </Editor>
    </>
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
