import type { Meta, StoryObj } from '@storybook/react-vite'
import type { OptionalOptions } from '../src/index'
import { Canvas, Editor, useReactPaint } from '../src/index'

type PlaygroundProps = {
  // useReactPaint props
  width?: number
  height?: number
  mode?: 'editor' | 'viewer'
  disabled?: boolean
  // OptionalOptions
  layersManipulation?: boolean
  grid?: number
  canGrow?: boolean
  canShrink?: boolean
  withExport?: boolean
  withLoadAndSave?: boolean
  withUploadPicture?: boolean
  withUrlPicture?: boolean
  withFrameSelection?: boolean
  withSkeleton?: boolean
  brushAlgo?: 'simple' | 'quadratic'
  isBrushShapeDoneOnMouseUp?: boolean
  canvasSelectionPadding?: number
  size?: 'fixed' | 'infinite'
  canZoom?: 'never' | 'always'
  clearCallback?: 'empty' | 'defaultShapes'
  // Editor options
  toolbarBackgroundColor?: string
  dividerColor?: string
  fontRadius?: number
  fontDisabledColor?: string
  fontDisabledBackgroundColor?: string
  fontColor?: string
  fontBackgroundColor?: string
  fontSelectedColor?: string
  fontSelectedBackgroundColor?: string
  fontHoverColor?: string
  fontHoverBackgroundColor?: string
  // Canvas options
  canvasBackgroundColor?: string
  canvasSelectionColor?: string
  canvasSelectionWidth?: number
}

const Playground = (args: PlaygroundProps) => {
  const {
    width,
    height,
    mode,
    disabled,
    layersManipulation,
    grid,
    canGrow,
    canShrink,
    withExport,
    withLoadAndSave,
    withUploadPicture,
    withUrlPicture,
    withFrameSelection,
    withSkeleton,
    brushAlgo,
    isBrushShapeDoneOnMouseUp,
    canvasSelectionPadding,
    size,
    canZoom,
    clearCallback,
    toolbarBackgroundColor,
    dividerColor,
    fontRadius,
    fontDisabledColor,
    fontDisabledBackgroundColor,
    fontColor,
    fontBackgroundColor,
    fontSelectedColor,
    fontSelectedBackgroundColor,
    fontHoverColor,
    fontHoverBackgroundColor,
    canvasBackgroundColor,
    canvasSelectionColor,
    canvasSelectionWidth
  } = args

  const options: OptionalOptions = {
    layersManipulation,
    grid,
    canGrow,
    canShrink,
    withExport,
    withLoadAndSave,
    withUploadPicture,
    withUrlPicture,
    withFrameSelection,
    withSkeleton,
    brushAlgo,
    isBrushShapeDoneOnMouseUp,
    canvasSelectionPadding,
    size,
    canZoom,
    clearCallback
  }

  const editorOptions = {
    toolbarBackgroundColor,
    dividerColor,
    fontRadius,
    fontDisabledColor,
    fontDisabledBackgroundColor,
    fontColor,
    fontBackgroundColor,
    fontSelectedColor,
    fontSelectedBackgroundColor,
    fontHoverColor,
    fontHoverBackgroundColor
  }

  const canvasOptions = {
    canvasBackgroundColor,
    canvasSelectionColor,
    canvasSelectionWidth
  }

  const { editorProps, canvasProps } = useReactPaint({
    width,
    height,
    mode,
    disabled,
    options
  })

  return (
    <Editor editorProps={editorProps} options={editorOptions}>
      <Canvas canvasProps={canvasProps} options={canvasOptions} />
    </Editor>
  )
}

const meta = {
  title: 'React Paint/Playground',
  component: Playground,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  args: {
    // Canvas dimensions
    width: 1000,
    height: 600,
    // Mode and state
    mode: 'editor',
    disabled: false,
    // Canvas options
    size: 'fixed',
    canZoom: 'never',
    grid: 0,
    canGrow: false,
    canShrink: true,
    canvasSelectionPadding: 0,
    // Brush options
    brushAlgo: 'simple',
    isBrushShapeDoneOnMouseUp: true,
    // Feature toggles
    layersManipulation: true,
    withExport: true,
    withLoadAndSave: true,
    withUploadPicture: true,
    withUrlPicture: false,
    withFrameSelection: true,
    withSkeleton: true,
    clearCallback: 'empty',
    // Editor styling
    toolbarBackgroundColor: 'white',
    dividerColor: '#36418129',
    fontRadius: 8,
    fontColor: '#364181',
    fontBackgroundColor: 'transparent',
    fontDisabledColor: '#3641812b',
    fontDisabledBackgroundColor: 'transparent',
    fontSelectedColor: 'white',
    fontSelectedBackgroundColor: '#364181',
    fontHoverColor: '#364181',
    fontHoverBackgroundColor: '#afd8d8',
    // Canvas styling
    canvasBackgroundColor: 'white',
    canvasSelectionColor: 'blue',
    canvasSelectionWidth: 2
  },
  argTypes: {
    // Canvas dimensions
    width: {
      control: { type: 'number', min: 100, max: 2000, step: 50 },
      description: 'Canvas width in pixels',
      table: { category: 'Canvas Dimensions', defaultValue: { summary: '1000' }, type: { summary: 'number' } }
    },
    height: {
      control: { type: 'number', min: 100, max: 2000, step: 50 },
      description: 'Canvas height in pixels',
      table: { category: 'Canvas Dimensions', defaultValue: { summary: '600' }, type: { summary: 'number' } }
    },
    // Mode and state
    mode: {
      control: { type: 'select' },
      options: ['editor', 'viewer'],
      description: 'Editor mode: editor allows interaction, viewer is read-only',
      table: { category: 'Mode & State', defaultValue: { summary: "'editor'" }, type: { summary: "'editor' | 'viewer'" } }
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Disable all interactions with the editor and canvas',
      table: { category: 'Mode & State', defaultValue: { summary: 'false' }, type: { summary: 'boolean' } }
    },
    // Canvas options
    size: {
      control: { type: 'select' },
      options: ['fixed', 'infinite'],
      description: 'Canvas size mode: fixed is bound within width/height, infinite has no bounds',
      table: { category: 'Canvas Options', defaultValue: { summary: "'fixed'" }, type: { summary: "'fixed' | 'infinite'" } }
    },
    canZoom: {
      control: { type: 'select' },
      options: ['never', 'always'],
      description: 'Enable or disable zoom functionality (can not be disabled if size is infinite)',
      table: { category: 'Canvas Options', defaultValue: { summary: "'never'" }, type: { summary: "'never' | 'always'" } }
    },
    grid: {
      control: { type: 'number', min: 0, max: 100, step: 5 },
      description: 'Grid gap in pixels (0 to disable grid)',
      table: { category: 'Canvas Options', defaultValue: { summary: '0' }, type: { summary: 'number' } }
    },
    canGrow: {
      control: { type: 'boolean' },
      description: 'Allow canvas to grow within its container',
      table: { category: 'Canvas Options', defaultValue: { summary: 'false' }, type: { summary: 'boolean' } }
    },
    canShrink: {
      control: { type: 'boolean' },
      description: 'Allow canvas to shrink within its container',
      table: { category: 'Canvas Options', defaultValue: { summary: 'true' }, type: { summary: 'boolean' } }
    },
    canvasSelectionPadding: {
      control: { type: 'number', min: 0, max: 50, step: 1 },
      description: 'Padding between shape and selection frame',
      table: { category: 'Canvas Options', defaultValue: { summary: '0' }, type: { summary: 'number' } }
    },
    // Brush options
    brushAlgo: {
      control: { type: 'select' },
      options: ['simple', 'quadratic'],
      description: 'Brush algorithm: simple displays path as-is, quadratic uses bézier curves',
      table: { category: 'Brush Options', defaultValue: { summary: "'simple'" }, type: { summary: "'simple' | 'quadratic'" } }
    },
    isBrushShapeDoneOnMouseUp: {
      control: { type: 'boolean' },
      description: 'Create a new shape when releasing mouse after drawing brush',
      table: { category: 'Brush Options', defaultValue: { summary: 'true' }, type: { summary: 'boolean' } }
    },
    // Feature toggles
    layersManipulation: {
      control: { type: 'boolean' },
      description: 'Enable layer manipulation features',
      table: { category: 'Feature Toggles', defaultValue: { summary: 'true' }, type: { summary: 'boolean' } }
    },
    withExport: {
      control: { type: 'boolean' },
      description: 'Show export button',
      table: { category: 'Feature Toggles', defaultValue: { summary: 'true' }, type: { summary: 'boolean' } }
    },
    withLoadAndSave: {
      control: { type: 'boolean' },
      description: 'Show load and save buttons',
      table: { category: 'Feature Toggles', defaultValue: { summary: 'true' }, type: { summary: 'boolean' } }
    },
    withUploadPicture: {
      control: { type: 'boolean' },
      description: 'Show button to add picture shape stored in base64',
      table: { category: 'Feature Toggles', defaultValue: { summary: 'true' }, type: { summary: 'boolean' } }
    },
    withUrlPicture: {
      control: { type: 'boolean' },
      description: 'Show button to add picture shape with URL (requires connectivity)',
      table: { category: 'Feature Toggles', defaultValue: { summary: 'false' }, type: { summary: 'boolean' } }
    },
    withFrameSelection: {
      control: { type: 'boolean' },
      description: 'Enable frame selection',
      table: { category: 'Feature Toggles', defaultValue: { summary: 'true' }, type: { summary: 'boolean' } }
    },
    withSkeleton: {
      control: { type: 'boolean' },
      description: 'Display skeleton when hovering over shapes',
      table: { category: 'Feature Toggles', defaultValue: { summary: 'true' }, type: { summary: 'boolean' } }
    },
    clearCallback: {
      control: { type: 'select' },
      options: ['empty', 'defaultShapes'],
      description: 'Clear button behavior: empty clears all shapes, defaultShapes uses shapes from props',
      table: { category: 'Feature Toggles', defaultValue: { summary: "'empty'" }, type: { summary: "'empty' | 'defaultShapes'" } }
    },
    // Editor styling
    toolbarBackgroundColor: {
      control: { type: 'color' },
      description: 'Toolbar background color',
      table: { category: 'Editor Styling', defaultValue: { summary: "'white'" }, type: { summary: 'string' } }
    },
    dividerColor: {
      control: { type: 'color' },
      description: 'Divider color in toolbar',
      table: { category: 'Editor Styling', defaultValue: { summary: "'#36418129'" }, type: { summary: 'string' } }
    },
    fontRadius: {
      control: { type: 'number', min: 0, max: 50, step: 1 },
      description: 'Button border radius',
      table: { category: 'Editor Styling', defaultValue: { summary: '8' }, type: { summary: 'number' } }
    },
    fontColor: {
      control: { type: 'color' },
      description: 'Default font/text color',
      table: { category: 'Editor Styling', defaultValue: { summary: "'#364181'" }, type: { summary: 'string' } }
    },
    fontBackgroundColor: {
      control: { type: 'color' },
      description: 'Default font/text background color',
      table: { category: 'Editor Styling', defaultValue: { summary: "'transparent'" }, type: { summary: 'string' } }
    },
    fontDisabledColor: {
      control: { type: 'color' },
      description: 'Disabled font/text color',
      table: { category: 'Editor Styling', defaultValue: { summary: "'#3641812b'" }, type: { summary: 'string' } }
    },
    fontDisabledBackgroundColor: {
      control: { type: 'color' },
      description: 'Disabled font/text background color',
      table: { category: 'Editor Styling', defaultValue: { summary: "'transparent'" }, type: { summary: 'string' } }
    },
    fontSelectedColor: {
      control: { type: 'color' },
      description: 'Selected font/text color',
      table: { category: 'Editor Styling', defaultValue: { summary: "'white'" }, type: { summary: 'string' } }
    },
    fontSelectedBackgroundColor: {
      control: { type: 'color' },
      description: 'Selected font/text background color',
      table: { category: 'Editor Styling', defaultValue: { summary: "'#364181'" }, type: { summary: 'string' } }
    },
    fontHoverColor: {
      control: { type: 'color' },
      description: 'Hover font/text color',
      table: { category: 'Editor Styling', defaultValue: { summary: "'#364181'" }, type: { summary: 'string' } }
    },
    fontHoverBackgroundColor: {
      control: { type: 'color' },
      description: 'Hover font/text background color',
      table: { category: 'Editor Styling', defaultValue: { summary: "'#afd8d8'" }, type: { summary: 'string' } }
    },
    // Canvas styling
    canvasBackgroundColor: {
      control: { type: 'color' },
      description: 'Canvas background color',
      table: { category: 'Canvas Styling', defaultValue: { summary: "'white'" }, type: { summary: 'string' } }
    },
    canvasSelectionColor: {
      control: { type: 'color' },
      description: 'Selection frame color',
      table: { category: 'Canvas Styling', defaultValue: { summary: "'blue'" }, type: { summary: 'string' } }
    },
    canvasSelectionWidth: {
      control: { type: 'number', min: 1, max: 10, step: 1 },
      description: 'Selection frame width in pixels',
      table: { category: 'Canvas Styling', defaultValue: { summary: '2' }, type: { summary: 'number' } }
    }
  }
} satisfies Meta<typeof Playground>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      source: {
        code: `
    const options: OptionalOptions = {
      layersManipulation,
      grid,
      canGrow,
      canShrink,
      withExport,
      withLoadAndSave,
      withUploadPicture,
      withUrlPicture,
      withFrameSelection,
      withSkeleton,
      brushAlgo,
      isBrushShapeDoneOnMouseUp,
      canvasSelectionPadding,
      size,
      canZoom,
      clearCallback
    }

    const editorOptions = {
      toolbarBackgroundColor,
      dividerColor,
      fontRadius,
      fontDisabledColor,
      fontDisabledBackgroundColor,
      fontColor,
      fontBackgroundColor,
      fontSelectedColor,
      fontSelectedBackgroundColor,
      fontHoverColor,
      fontHoverBackgroundColor
    }

    const canvasOptions = {
      canvasBackgroundColor,
      canvasSelectionColor,
      canvasSelectionWidth
    }

    const { editorProps, canvasProps } = useReactPaint({
      width,
      height,
      mode,
      disabled,
      options
    })

    return (
      <Editor editorProps={editorProps} options={editorOptions}>
        <Canvas canvasProps={canvasProps} options={canvasOptions} />
      </Editor>
    )       
        `
      }
    }
  }
}
