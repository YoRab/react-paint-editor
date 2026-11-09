import type { Meta, StoryObj } from '@storybook/react-vite'
import { type SyntheticEvent, useState } from 'react'
import { Canvas, Editor, useAnnotationsStyle, useReactPaint } from '../../../src/index'
import '../buttons.css'
import './annotations.css'

const PictureWithAnnotations = ({ src, alt }: { src: string; alt: string }) => {
  const [isEdit, setIsEdit] = useState(false)
  const [dimensions, setDimensions] = useState<[number, number]>()
  const paint = useReactPaint({
    mode: isEdit ? 'editor' : 'viewer',
    width: dimensions?.[0],
    height: dimensions?.[1],
    options: {
      canZoom: isEdit ? 'always' : 'never'
    }
  })
  // keeps the picture aligned with the canvas when it is zoomed or moved
  const annotationsStyle = useAnnotationsStyle(paint)

  const canvasOptions = {
    canvasBackgroundColor: 'transparent'
  }

  const onPictureLoad = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    setDimensions([e.currentTarget.naturalWidth, e.currentTarget.naturalHeight])
  }

  return (
    <div>
      <div>
        <h3>Toggle edit mode</h3>
        <div className='example-buttons'>
          <button type='button' className={`example-button ${isEdit ? 'active' : ''}`} onClick={() => setIsEdit(prev => !prev)}>
            {isEdit ? 'View Mode' : 'Edit Mode'}
          </button>
        </div>
      </div>
      <div className='annotations-container'>
        <div className='pic-container'>
          <img src={src} alt={alt} style={annotationsStyle} className='picture' onLoad={onPictureLoad} />
        </div>
        {dimensions && (
          <Editor paint={paint} className={`annotations ${isEdit ? 'editor' : 'view'}`}>
            <Canvas paint={paint} options={canvasOptions} />
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

const meta = {
  title: 'Use cases/Picture annotation',
  component: PictureAnnotation,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          "Annotations drawn over pictures: each canvas has the size of its picture, a transparent background, and is in the `'viewer'` mode until its Edit Mode button is pressed. `useAnnotationsStyle` keeps the picture aligned with the canvas when it is zoomed or moved."
      }
    }
  },
  tags: ['autodocs', '!dev']
} satisfies Meta<typeof PictureAnnotation>

export default meta
type Story = StoryObj<typeof meta>

export const AnnotatedPictures: Story = {
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
  const paint = useReactPaint({
    mode: isEdit ? 'editor' : 'viewer',
    width: dimensions?.[0],
    height: dimensions?.[1],
    options: {
      canZoom: isEdit ? 'always' : 'never'
    }
  })
  // keeps the picture aligned with the canvas when it is zoomed or moved
  const annotationsStyle = useAnnotationsStyle(paint)

  const canvasOptions = {
    canvasBackgroundColor: 'transparent'
  }

  const onPictureLoad = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    setDimensions([e.currentTarget.naturalWidth, e.currentTarget.naturalHeight])
  }

  return (
    <div>
      <div>
        <h3>Toggle edit mode</h3>
        <div className='example-buttons'>
          <button type='button' className={\`example-button \${isEdit ? 'active' : ''}\`} onClick={() => setIsEdit(prev => !prev)}>
            {isEdit ? 'View Mode' : 'Edit Mode'}
          </button>
        </div>
      </div>
      <div className='pic-container'>
        <img src={src} alt={alt} style={annotationsStyle} className='picture' onLoad={onPictureLoad} />
        {dimensions && (
          <Editor paint={paint} className={\`annotations \${isEdit ? 'editor' : 'view'}\`}>
            <Canvas paint={paint} options={canvasOptions} />
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
