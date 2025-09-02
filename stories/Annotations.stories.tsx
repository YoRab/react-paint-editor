import type { Meta, StoryObj } from '@storybook/react-vite'
import { type SyntheticEvent, useState } from 'react'
import { Canvas, Editor, useReactPaint } from '../src/index'
import './annotations.css'

const PictureWithAnnotations = ({ src, alt }: { src: string; alt: string }) => {
  const [isEdit, setIsEdit] = useState(false)
  const [dimensions, setDimensions] = useState<[number, number]>()
  const { editorProps, canvasProps, annotationsProps } = useReactPaint({
    mode: isEdit ? 'editor' : 'viewer',
    width: dimensions?.[0],
    height: dimensions?.[1],
    options: {
      canZoom: isEdit ? 'always' : 'never'
    }
  })

  const canvasOptions = {
    canvasBackgroundColor: 'transparent'
  }

  const onPictureLoad = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    setDimensions([e.currentTarget.naturalWidth, e.currentTarget.naturalHeight])
  }

  return (
    <div>
      <div>
        <button type='button' onClick={() => setIsEdit(prev => !prev)}>
          toggle edition
        </button>
      </div>
      <div className='annotations-container'>
        <div className='pic-container'>
          <img src={src} alt={alt} style={annotationsProps.style} className='picture' onLoad={onPictureLoad} />
        </div>
        {dimensions && (
          <Editor editorProps={editorProps} className={`annotations ${isEdit ? 'editor' : 'view'}`}>
            <Canvas canvasProps={canvasProps} options={canvasOptions} />
          </Editor>
        )}
      </div>
    </div>
  )
}

const PictureAnnotation = () => {
  return (
    <div className='grid'>
      <PictureWithAnnotations src='https://picsum.photos/600/300?random=1' alt='First pic' />
      <PictureWithAnnotations src='https://picsum.photos/600/300?random=2' alt='Second pic' />
      <PictureWithAnnotations src='https://picsum.photos/600/300?random=3' alt='Third pic' />
      <PictureWithAnnotations src='https://picsum.photos/600/300?random=4' alt='Fourth pic' />
    </div>
  )
}

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
  title: 'Main/Picture annotation',
  component: PictureAnnotation,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/react/configure/story-layout
    layout: 'centered'
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/react/writing-docs/autodocs
  tags: ['autodocs']
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
} satisfies Meta<typeof PictureAnnotation>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      source: {
        code: `
        
        /* CSS */

.grid {
    display: flex;
    flex-wrap: wrap;
}

.pic-container {
    position: relative;
    padding: 36px 0;
}

.picture {
    max-width: 100%;
}

.annotations {
    position: absolute;
    left: 0;
    right: 0
}

.annotations.editor {
    top: 0;
    bottom: 0;
}

.view {
    top: 36px;
    bottom: 36px;
}

/* TSX */
  const PictureWithAnnotations = ({ src, alt }: { src: string; alt: string }) => {
  const [isEdit, setIsEdit] = useState(false)
  const [dimensions, setDimensions] = useState<[number, number]>()
  const { editorProps, canvasProps } = useReactPaint({
    mode: isEdit ? 'editor' : 'viewer',
    width: dimensions?.[0],
    height: dimensions?.[1]
  })

  const canvasOptions = {
    canvasBackgroundColor: 'transparent'
  }

  const onPictureLoad = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    setDimensions([e.currentTarget.naturalWidth, e.currentTarget.naturalHeight])
  }

  return (
    <div>
      <div>
        <button type='button' onClick={() => setIsEdit(prev => !prev)}>
          toggle edition
        </button>
      </div>
      <div className='pic-container'>
        <img src={src} alt={alt} className='picture' onLoad={onPictureLoad} />
        {dimensions && (
          <Editor editorProps={editorProps} className={\`annotations \${isEdit ? 'editor' : 'view'}\`}>
            <Canvas canvasProps={canvasProps} options={canvasOptions} />
          </Editor>
        )}
      </div>
    </div>
  )
}

const PictureAnnotation = () => {
  return (
    <div className='grid'>
      <PictureWithAnnotations src='https://picsum.photos/600/300?random=1' alt='First pic' />
      <PictureWithAnnotations src='https://picsum.photos/600/300?random=2' alt='Second pic' />
      <PictureWithAnnotations src='https://picsum.photos/600/300?random=3' alt='Third pic' />
      <PictureWithAnnotations src='https://picsum.photos/600/300?random=4' alt='Fourth pic' />
    </div>
  )
}`,
        language: 'tsx'
      }
    }
  }
}
