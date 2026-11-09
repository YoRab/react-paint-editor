import { CANVAS_SHORTCUTS, formatShortcut, type Shortcut, type ToolsType } from '@canvas/index'
import Modal from '@editor/components/common/Modal'
import { ACTION_SHORTCUTS, HELP_SHORTCUT, TOOL_SHORTCUTS } from '@editor/constants/shortcuts'
import useEditorLocale, { type EditorLocaleValue } from '@editor/hooks/useEditorLocale'
import { getToolLabel } from '@editor/utils/style'
import { isMacOs } from '@editor/utils/util'
import './ShortcutsModal.css'

/** A line of the list: its keys, or a gesture told by a text */
type Row = { label: string; keys: (Shortcut | string)[] }

type Section = { title: string; rows: Row[] }

const S = CANVAS_SHORTCUTS

const getSections = (
  tools: readonly ToolsType[],
  { canvas, editor, format }: EditorLocaleValue,
  isMac: boolean,
  withLoadAndSave: boolean,
  withExport: boolean,
  withZoom: boolean
): Section[] => {
  const { rows, gestures, sections } = editor.shortcuts
  const { keys } = canvas
  const toolRows = tools.flatMap(tool => {
    const shortcut = TOOL_SHORTCUTS[tool.id]
    return shortcut ? [{ label: getToolLabel(tool, editor), keys: [shortcut] }] : []
  })
  const fileRows: Row[] = [
    ...(withLoadAndSave
      ? [
          { label: rows.openProject, keys: [ACTION_SHORTCUTS.loadfile!] },
          { label: rows.saveProject, keys: [ACTION_SHORTCUTS.savefile!] }
        ]
      : []),
    ...(withExport ? [{ label: rows.exportPicture, keys: [ACTION_SHORTCUTS.export!] }] : [])
  ]
  return [
    ...(toolRows.length ? [{ title: sections.tools, rows: toolRows }] : []),
    {
      title: sections.edition,
      rows: [
        { label: rows.undo, keys: [S.undo] },
        { label: rows.redo, keys: isMac ? [S.redo] : [S.redo, S.redoAlt] },
        { label: rows.cutCopyPaste, keys: [S.cut, S.copy, S.paste] },
        { label: rows.duplicate, keys: [S.duplicate, format(gestures.altDrag, keys)] },
        { label: rows.remove, keys: [S.remove, S.removeAlt] },
        { label: rows.selectAll, keys: [S.selectAll] },
        { label: rows.addToSelection, keys: [format(gestures.shiftClick, keys)] },
        { label: rows.groupUngroup, keys: [S.group, S.ungroup] },
        { label: rows.forwardBackward, keys: [S.forward, S.backward] },
        { label: rows.frontBack, keys: [S.first, S.last] },
        { label: rows.flip, keys: [S.flipHorizontally, S.flipVertically] },
        { label: rows.lockHide, keys: [S.lock, S.hide] },
        { label: rows.moveSelection, keys: [keys.arrows, format(gestures.shiftArrows, keys)] },
        { label: rows.escape, keys: [S.escape] },
        { label: rows.contextMenu, keys: [S.contextMenu] }
      ]
    },
    {
      title: sections.drawing,
      rows: [
        { label: rows.keepRatio, keys: [keys.shift] },
        { label: rows.resizeFromCenter, keys: [keys.alt] },
        { label: rows.endShape, keys: [S.enter, S.removeAlt] },
        { label: rows.addShape, keys: [S.enter] }
      ]
    },
    ...(withZoom
      ? [
          {
            title: sections.view,
            rows: [
              { label: rows.zoom, keys: [S.zoomIn, S.zoomOut, S.resetZoom] },
              { label: rows.fit, keys: [S.zoomToFit, S.zoomToSelection] },
              { label: rows.pan, keys: [format(gestures.spaceDrag, keys), format(gestures.arrowsWithoutSelection, keys)] }
            ]
          }
        ]
      : []),
    {
      title: sections.keyboard,
      rows: [{ label: rows.browse, keys: [S.enter, S.nextShape, S.previousShape] }, ...fileRows, { label: rows.help, keys: [HELP_SHORTCUT] }]
    }
  ]
}

type ShortcutsModalProps = {
  onClose: () => void
  /** The tools shown, in the order of the toolbar */
  tools: readonly ToolsType[]
  withLoadAndSave: boolean
  withExport: boolean
  withZoom: boolean
}

/** List of the shortcuts of the editor and of the canvas, opened by ? and by the menu */
const ShortcutsModal = ({ onClose, tools, withLoadAndSave, withExport, withZoom }: ShortcutsModalProps) => {
  const isMac = isMacOs()
  const locale = useEditorLocale()
  const { title } = locale.editor.shortcuts
  return (
    <Modal className='react-paint-editor-toolbox-modal react-paint-editor-shortcuts' onClose={onClose} title={title} withCloseButton>
      <h3>{title}</h3>
      {/* the list scrolls, and takes the focus of the keyboard to do so */}
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolled region is reached by the keyboard */}
      <section className='react-paint-editor-shortcuts-list' tabIndex={0} aria-label={title}>
        {getSections(tools, locale, isMac, withLoadAndSave, withExport, withZoom).map(section => (
          <section key={section.title}>
            <h4>{section.title}</h4>
            <dl>
              {section.rows.map(row => (
                <div key={row.label} className='react-paint-editor-shortcuts-row'>
                  <dt>{row.label}</dt>
                  <dd>
                    {row.keys.map(key => {
                      const text = typeof key === 'string' ? key : formatShortcut(key, isMac, locale.canvas.keys)
                      return <kbd key={text}>{text}</kbd>
                    })}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </section>
    </Modal>
  )
}

export default ShortcutsModal
