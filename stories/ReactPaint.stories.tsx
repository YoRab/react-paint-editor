import type { Meta, StoryObj } from '@storybook/react'
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
  title: 'Main/React Paint Editor',
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

export const FromFile: Story = {
  args: {
    shapes: TREE_AND_CLOUDS,
    options: {
      clearCallback: 'defaultShapes'
    }
  },
  parameters: {
    docs: {
      source: {
        code: `const { editorProps, canvasProps } = useReactPaint({shapes: TREE_AND_CLOUDS, options : {clearCallback: 'defaultShapes'}})

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
    mode: 'viewer'
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

export const LimitedTools: Story = {
  args: {
    options: {
      grid: 20,
      layersManipulation: false,
      withLoadAndSave: true,
      withExport: true,
      withUrlPicture: true,
      withUploadPicture: false,
      withSkeleton: false,
      withFrameSelection: false,
      availableTools: [
        //@ts-expect-error wrong tool
        'circle',
        //@ts-expect-error wrong tool
        'brush',
        //@ts-expect-error wrong tool
        undefined,
        //@ts-expect-error wrong tool
        'not existing tool',
        {
          id: 'brush1',
          label: 'test with not existing type; should not appear',
          //@ts-expect-error wrong tool
          type: 'sgg'
        },
        {
          id: 'brush2',
          label: 'test without any type should not appear'
        },
        {
          id: 'brush3',
          label: 'classic brush',
          type: 'brush',
          settings: {
            lineWidth: {
              min: 2,
              max: 20,
              step: 2,
              default: 4,
              hidden: true
            },
            strokeColor: {
              values: [
                'transparent',
                '#FFFFFF',
                '#002E4D',
                '#21BFEF',
                '#FFA800',
                '#135BEB',
                '#FF5C93',
                '#FF6D24',
                '#00C79F',
                '#9580FF',
                '#55779E',
                '#000000'
              ],
              default: '#002E4D',
              hidden: true
            },
            opacity: {
              min: 0,
              max: 100,
              step: 5,
              default: 100,
              hidden: true
            },
            lineDash: {
              hidden: true
            }
          }
        },
        {
          id: 'line',
          label: 'classic line',
          type: 'line',
          settings: {
            lineWidth: {
              min: 2,
              max: 20,
              step: 2,
              default: 4
            },
            lineArrow: {
              values: [0, 1, 2, 3],
              default: 1
            },
            strokeColor: {
              values: [
                'transparent',
                '#FFFFFF',
                '#002E4D',
                '#21BFEF',
                '#FFA800',
                '#135BEB',
                '#FF5C93',
                '#FF6D24',
                '#00C79F',
                '#9580FF',
                '#55779E',
                '#000000'
              ],
              default: '#002E4D'
            },
            opacity: {
              min: 0,
              max: 100,
              step: 5,
              default: 100
            }
          }
        },
        {
          id: 'rectangle',
          label: 'classic rectangle',
          type: 'rect',
          settings: {
            lineWidth: {
              min: 2,
              max: 20,
              step: 2,
              default: 4
            },
            strokeColor: {
              values: [
                'transparent',
                '#FFFFFF',
                '#002E4D',
                '#21BFEF',
                '#FFA800',
                '#135BEB',
                '#FF5C93',
                '#FF6D24',
                '#00C79F',
                '#9580FF',
                '#55779E',
                '#000000'
              ],
              default: '#002E4D'
            },
            fillColor: {
              values: [
                'transparent',
                '#FFFFFF',
                '#002E4D',
                '#21BFEF',
                '#FFA800',
                '#135BEB',
                '#FF5C93',
                '#FF6D24',
                '#00C79F',
                '#9580FF',
                '#55779E',
                '#000000'
              ],
              default: 'transparent'
            },
            opacity: {
              min: 0,
              max: 100,
              step: 5,
              default: 100
            }
          }
        },
        {
          id: 'ellipse',
          label: 'classic ellipse',
          type: 'ellipse',
          settings: {
            lineWidth: {
              min: 2,
              max: 20,
              step: 2,
              default: 4
            },

            strokeColor: {
              values: [
                'transparent',
                '#FFFFFF',
                '#002E4D',
                '#21BFEF',
                '#FFA800',
                '#135BEB',
                '#FF5C93',
                '#FF6D24',
                '#00C79F',
                '#9580FF',
                '#55779E',
                '#000000'
              ],
              default: '#002E4D'
            },
            fillColor: {
              values: [
                'transparent',
                '#FFFFFF',
                '#002E4D',
                '#21BFEF',
                '#FFA800',
                '#135BEB',
                '#FF5C93',
                '#FF6D24',
                '#00C79F',
                '#9580FF',
                '#55779E',
                '#000000'
              ],
              default: 'transparent'
            },
            opacity: {
              min: 0,
              max: 100,
              step: 5,
              default: 100
            }
          }
        },
        {
          id: 'text',
          label: 'classic text',
          type: 'text',
          settings: {
            fontFamily: {
              values: ['ProximaNova', 'Sabon', 'Fira Mono'],
              default: 'ProximaNova'
            },
            strokeColor: {
              values: [
                'transparent',
                '#FFFFFF',
                '#002E4D',
                '#21BFEF',
                '#FFA800',
                '#135BEB',
                '#FF5C93',
                '#FF6D24',
                '#00C79F',
                '#9580FF',
                '#55779E',
                '#000000'
              ],
              default: '#002E4D'
            },

            opacity: {
              min: 0,
              max: 100,
              step: 5,
              default: 100
            },
            fontItalic: {
              default: true,
              hidden: true
            }
          }
        }
      ]
    }
  },
  parameters: {
    docs: {
      source: {
        code: `const { editorProps, canvasProps } = useReactPaint({    options: {
      grid: 20,
      layersManipulation: false,
      withLoadAndSave: true,
      withExport: true,
      withUrlPicture: true,
      withUploadPicture: false,
      withSkeleton: false,
      withFrameSelection: false,
      availableTools: [
        //@ts-expect-error wrong tool
        'circle',
        //@ts-expect-error wrong tool
        'brush',
        //@ts-expect-error wrong tool
        undefined,
        //@ts-expect-error wrong tool
        'not existing tool',
        {
          id: 'brush1',
          label: 'test with not existing type; should not appear',
          //@ts-expect-error wrong tool
          type: 'sgg'
        },
        {
          id: 'brush2',
          label: 'test without any type should not appear'
        },
        {
          id: 'brush3',
          label: 'classic brush',
          type: 'brush',
          settings: {
            lineWidth: {
              min: 2,
              max: 20,
              step: 2,
              default: 4,
              hidden: true
            },
            strokeColor: {
              values: [
                'transparent',
                '#FFFFFF',
                '#002E4D',
                '#21BFEF',
                '#FFA800',
                '#135BEB',
                '#FF5C93',
                '#FF6D24',
                '#00C79F',
                '#9580FF',
                '#55779E',
                '#000000'
              ],
              default: '#002E4D',
              hidden: true
            },
            opacity: {
              min: 0,
              max: 100,
              step: 5,
              default: 100,
              hidden: true
            },
            lineDash: {
              hidden: true
            }
          }
        },
        {
          id: 'line',
          label: 'classic line',
          type: 'line',
          settings: {
            lineWidth: {
              min: 2,
              max: 20,
              step: 2,
              default: 4
            },
            lineArrow: {
              values: [0, 1, 2, 3],
              default: 1
            },
            strokeColor: {
              values: [
                'transparent',
                '#FFFFFF',
                '#002E4D',
                '#21BFEF',
                '#FFA800',
                '#135BEB',
                '#FF5C93',
                '#FF6D24',
                '#00C79F',
                '#9580FF',
                '#55779E',
                '#000000'
              ],
              default: '#002E4D'
            },
            opacity: {
              min: 0,
              max: 100,
              step: 5,
              default: 100
            }
          }
        },
        {
          id: 'rectangle',
          label: 'classic rectangle',
          type: 'rect',
          settings: {
            lineWidth: {
              min: 2,
              max: 20,
              step: 2,
              default: 4
            },
            strokeColor: {
              values: [
                'transparent',
                '#FFFFFF',
                '#002E4D',
                '#21BFEF',
                '#FFA800',
                '#135BEB',
                '#FF5C93',
                '#FF6D24',
                '#00C79F',
                '#9580FF',
                '#55779E',
                '#000000'
              ],
              default: '#002E4D'
            },
            fillColor: {
              values: [
                'transparent',
                '#FFFFFF',
                '#002E4D',
                '#21BFEF',
                '#FFA800',
                '#135BEB',
                '#FF5C93',
                '#FF6D24',
                '#00C79F',
                '#9580FF',
                '#55779E',
                '#000000'
              ],
              default: 'transparent'
            },
            opacity: {
              min: 0,
              max: 100,
              step: 5,
              default: 100
            }
          }
        },
        {
          id: 'ellipse',
          label: 'classic ellipse',
          type: 'ellipse',
          settings: {
            lineWidth: {
              min: 2,
              max: 20,
              step: 2,
              default: 4
            },

            strokeColor: {
              values: [
                'transparent',
                '#FFFFFF',
                '#002E4D',
                '#21BFEF',
                '#FFA800',
                '#135BEB',
                '#FF5C93',
                '#FF6D24',
                '#00C79F',
                '#9580FF',
                '#55779E',
                '#000000'
              ],
              default: '#002E4D'
            },
            fillColor: {
              values: [
                'transparent',
                '#FFFFFF',
                '#002E4D',
                '#21BFEF',
                '#FFA800',
                '#135BEB',
                '#FF5C93',
                '#FF6D24',
                '#00C79F',
                '#9580FF',
                '#55779E',
                '#000000'
              ],
              default: 'transparent'
            },
            opacity: {
              min: 0,
              max: 100,
              step: 5,
              default: 100
            }
          }
        },
        {
          id: 'text',
          label: 'classic text',
          type: 'text',
          settings: {
            fontFamily: {
              values: ['ProximaNova', 'Sabon', 'Fira Mono'],
              default: 'ProximaNova'
            },
            strokeColor: {
              values: [
                'transparent',
                '#FFFFFF',
                '#002E4D',
                '#21BFEF',
                '#FFA800',
                '#135BEB',
                '#FF5C93',
                '#FF6D24',
                '#00C79F',
                '#9580FF',
                '#55779E',
                '#000000'
              ],
              default: '#002E4D'
            },

            opacity: {
              min: 0,
              max: 100,
              step: 5,
              default: 100
            },
            fontItalic: {
              default: true,
              hidden: true
            }
          }
        }
      ]
    }})

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
