import { Canvas, Editor, type EditorOptions, type UseReactPaintProps, useReactPaint } from '../../src/index'

/** The library Editor around its Canvas, configured by the props of useReactPaint and the options of the editor */
export const EditorExample = ({ editorOptions, ...props }: UseReactPaintProps & { editorOptions?: EditorOptions }) => {
  const paint = useReactPaint(props)

  return (
    <Editor paint={paint} options={editorOptions}>
      <Canvas paint={paint} />
    </Editor>
  )
}
