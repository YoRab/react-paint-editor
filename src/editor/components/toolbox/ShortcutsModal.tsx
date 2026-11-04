import { CANVAS_SHORTCUTS, formatShortcut, type Shortcut, type ToolsType } from '@canvas/index'
import Modal from '@editor/components/common/Modal'
import { ACTION_SHORTCUTS, HELP_LABEL, HELP_SHORTCUT, TOOL_SHORTCUTS } from '@editor/constants/shortcuts'
import { isMacOs } from '@editor/utils/util'
import './ShortcutsModal.css'

/** A line of the list: its keys, or a gesture told by a text */
type Row = { label: string; keys: (Shortcut | string)[] }

type Section = { title: string; rows: Row[] }

const S = CANVAS_SHORTCUTS

const getSections = (tools: readonly ToolsType[], isMac: boolean, withLoadAndSave: boolean, withExport: boolean, withZoom: boolean): Section[] => {
  const toolRows = tools.flatMap(tool => {
    const shortcut = TOOL_SHORTCUTS[tool.id]
    return shortcut ? [{ label: tool.label ?? tool.type, keys: [shortcut] }] : []
  })
  const fileRows: Row[] = [
    ...(withLoadAndSave
      ? [
          { label: 'Ouvrir un projet', keys: [ACTION_SHORTCUTS.loadfile!] },
          { label: 'Enregistrer le projet', keys: [ACTION_SHORTCUTS.savefile!] }
        ]
      : []),
    ...(withExport ? [{ label: 'Exporter une image', keys: [ACTION_SHORTCUTS.export!] }] : [])
  ]
  return [
    ...(toolRows.length ? [{ title: 'Outils', rows: toolRows }] : []),
    {
      title: 'Édition',
      rows: [
        { label: 'Annuler', keys: [S.undo] },
        { label: 'Rétablir', keys: isMac ? [S.redo] : [S.redo, S.redoAlt] },
        { label: 'Couper, copier, coller', keys: [S.cut, S.copy, S.paste] },
        { label: 'Dupliquer', keys: [S.duplicate, 'Alt + glisser'] },
        { label: 'Supprimer', keys: [S.remove, S.removeAlt] },
        { label: 'Tout sélectionner', keys: [S.selectAll] },
        { label: 'Ajouter à la sélection', keys: ['Maj + clic'] },
        { label: 'Grouper, dégrouper', keys: [S.group, S.ungroup] },
        { label: 'Avancer, reculer', keys: [S.forward, S.backward] },
        { label: 'Premier plan, arrière-plan', keys: [S.first, S.last] },
        { label: 'Retourner horizontalement, verticalement', keys: [S.flipHorizontally, S.flipVertically] },
        { label: 'Verrouiller, masquer', keys: [S.lock, S.hide] },
        { label: 'Déplacer la sélection, plus loin', keys: ['Flèches', 'Maj + flèches'] },
        { label: 'Annuler un geste, remonter au groupe, désélectionner', keys: [S.escape] },
        { label: 'Menu contextuel', keys: [S.contextMenu] }
      ]
    },
    {
      title: 'Dessin',
      rows: [
        { label: 'Garder les proportions, aligner les angles par 15°', keys: ['Maj'] },
        { label: 'Redimensionner depuis le centre', keys: ['Alt'] },
        { label: 'Terminer un polygone ou une courbe, retirer son dernier point', keys: [S.enter, S.removeAlt] },
        { label: 'Ajouter une forme au centre de la vue', keys: [S.enter] }
      ]
    },
    ...(withZoom
      ? [
          {
            title: 'Vue',
            rows: [
              { label: 'Zoomer, dézoomer, 100 %', keys: [S.zoomIn, S.zoomOut, S.resetZoom] },
              { label: 'Afficher tout le dessin, la sélection', keys: [S.zoomToFit, S.zoomToSelection] },
              { label: 'Déplacer la vue', keys: ['Espace + glisser', 'Flèches sans sélection'] }
            ]
          }
        ]
      : []),
    {
      title: 'Clavier',
      rows: [
        { label: 'Parcourir les formes, ouvrir un groupe, éditer un texte', keys: [S.enter, S.nextShape, S.previousShape] },
        ...fileRows,
        { label: 'Cette liste', keys: [HELP_SHORTCUT] }
      ]
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
  return (
    <Modal className='react-paint-editor-toolbox-modal react-paint-editor-shortcuts' onClose={onClose} title={HELP_LABEL} withCloseButton>
      <h3>{HELP_LABEL}</h3>
      {/* the list scrolls, and takes the focus of the keyboard to do so */}
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolled region is reached by the keyboard */}
      <section className='react-paint-editor-shortcuts-list' tabIndex={0} aria-label={HELP_LABEL}>
        {getSections(tools, isMac, withLoadAndSave, withExport, withZoom).map(section => (
          <section key={section.title}>
            <h4>{section.title}</h4>
            <dl>
              {section.rows.map(row => (
                <div key={row.label} className='react-paint-editor-shortcuts-row'>
                  <dt>{row.label}</dt>
                  <dd>
                    {row.keys.map(key => {
                      const text = typeof key === 'string' ? key : formatShortcut(key, isMac)
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
