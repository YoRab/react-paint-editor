import useLatest from '@editor/hooks/useLatest'
import { useEffect } from 'react'

type EscapeEntry = { getElements: () => (HTMLElement | null | undefined)[]; onEscape: () => void }

// the elements listening to Escape, the last opened at the end: a panel opened inside another one closes first
const entries: { readonly current: EscapeEntry }[] = []

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape' || e.defaultPrevented || !(e.target instanceof Node)) return
  const target = e.target
  for (let index = entries.length - 1; index >= 0; index--) {
    const { getElements, onEscape } = entries[index]!.current
    if (!getElements().some(element => element?.contains(target))) continue
    // the shortcuts of the canvas leave a prevented key: its Escape would also change the selection
    e.preventDefault()
    onEscape()
    return
  }
}

/**
 * Calls onEscape when Escape is pressed while the focus is inside one of the elements, while it is enabled. The document
 * is listened in the capture phase, before the shortcuts of the canvas
 */
const useEscape = (getElements: EscapeEntry['getElements'], onEscape: () => void, enabled = true) => {
  const latest = useLatest<EscapeEntry>({ getElements, onEscape })

  useEffect(() => {
    if (!enabled) return
    if (!entries.length) document.addEventListener('keydown', handleKeyDown, true)
    entries.push(latest)
    return () => {
      entries.splice(entries.indexOf(latest), 1)
      if (!entries.length) document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [enabled, latest])
}

export default useEscape
