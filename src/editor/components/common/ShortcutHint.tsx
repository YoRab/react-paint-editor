import { formatShortcut, getAriaKeyShortcut, type Shortcut } from '@canvas/index'
import { isMacOs } from '@editor/utils/util'

/** Text of a shortcut at the end of an item of a menu: the assistive technologies read aria-keyshortcuts instead */
const ShortcutHint = ({ shortcut }: { shortcut: Shortcut }) => (
  <span className='react-paint-editor-shortcut' aria-hidden='true'>
    {formatShortcut(shortcut, isMacOs())}
  </span>
)

/** The label of an item of a menu, followed by its shortcut if it has one */
export const ShortcutLabel = ({ label, shortcut }: { label: string; shortcut?: Shortcut | undefined }) => (
  <>
    {label}
    {shortcut && <ShortcutHint shortcut={shortcut} />}
  </>
)

/**
 * Props of a button with a shortcut: its name stays its label, its title adds the shortcut, shown by the pointer and by the
 * tooltip of the keyboard
 */
export const getShortcutProps = (label: string, shortcut: Shortcut | undefined) => {
  if (!shortcut) return { title: label }
  const isMac = isMacOs()
  return { title: `${label} (${formatShortcut(shortcut, isMac)})`, 'aria-label': label, 'aria-keyshortcuts': getAriaKeyShortcut(shortcut, isMac) }
}

export default ShortcutHint
