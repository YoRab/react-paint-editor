import { useEffect, useState } from 'react'
import { Canvas, Editor, useReactPaint, type DrawableShape, type StateData } from '../src/index'
import { HELLO_THERE, TREE_AND_CLOUDS } from 'stories/fixture'
import type { Meta, StoryObj } from '@storybook/react/*'

const Preset = () => {
  const [preset, setPreset] = useState(0)
  const [shapes, setShapes] = useState<DrawableShape[] | undefined>(TREE_AND_CLOUDS)

  const { registerEvent, unregisterEvent, resetCanvas, editorProps, canvasProps } = useReactPaint({
    shapes,
    options: {
      clearCallback: () => {
        return [TREE_AND_CLOUDS, HELLO_THERE][preset]
      }
    }
  })

  const choosePreset = (preset: number) => {
    setPreset(preset)
    resetCanvas([TREE_AND_CLOUDS, HELLO_THERE][preset])
  }

  useEffect(() => {
    const onDataChanged = (data: StateData) => {
      console.log('data changed')
      setShapes(data.shapes)
    }
    registerEvent('dataChanged', onDataChanged)
    return () => {
      unregisterEvent('dataChanged', onDataChanged)
    }
  }, [registerEvent, unregisterEvent])

  return (
    <>
      <div>
        <button type='button' onClick={() => choosePreset(0)}>
          preset 1
        </button>
        <button type='button' onClick={() => choosePreset(1)}>
          preset 2
        </button>
      </div>
      <Editor editorProps={editorProps}>
        <Canvas canvasProps={canvasProps} />
      </Editor>
    </>
  )
}

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
  title: 'Main/Preset',
  component: Preset,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/react/configure/story-layout
    layout: 'centered'
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/react/writing-docs/autodocs
  tags: ['autodocs']
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
} satisfies Meta<typeof Preset>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {}
}
