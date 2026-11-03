import useSetupRef from '@editor/hooks/useSetupRef'

type ArrowNavigationOptions = {
  /** A vertical list is gone through with ArrowUp and ArrowDown, a row of buttons with the four arrows */
  orientation?: 'vertical' | 'horizontal'
  /** The items gone through, among the elements of the group which are not inside a nested group */
  items?: string
  /** Rows holding each an item and other buttons: only the buttons of the row of the item taking Tab stay in its order */
  rows?: string
  /** Called first with the keys of the group and the item having the focus: a key it prevents is left by the arrows */
  onKeyDown?: (e: KeyboardEvent, item: HTMLElement | undefined) => void
}

const GROUP_ATTRIBUTE = 'data-arrow-group'
// the tabindex of a button of a row, kept while the group takes it out of the order of Tab
const ROW_HIDDEN_ATTRIBUTE = 'data-arrow-row-tabindex'
// the fields of a row keep their place in the order of Tab
const ROW_FOCUSABLE_SELECTOR = 'button, [tabindex]'

const STEPS: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }

const isEnabled = (element: HTMLElement) => !element.matches(':disabled') && element.getAttribute('aria-disabled') !== 'true'

const isPressed = (element: HTMLElement) => element.getAttribute('aria-pressed') === 'true'

/** Elements of the group matching the selector, without the ones of its nested groups */
const getOwnElements = (group: HTMLElement, selector: string) => {
  const elements = Array.from(group.querySelectorAll<HTMLElement>(selector))
  // most groups hold no other group: their elements are all their own
  return group.querySelector(`[${GROUP_ATTRIBUTE}]`) ? elements.filter(element => element.closest(`[${GROUP_ATTRIBUTE}]`) === group) : elements
}

/** Takes the buttons of a row out of the order of Tab, or gives them back their tabindex */
const setRowInTabOrder = (row: Element | null | undefined, isInTabOrder: boolean, itemSelector: string) => {
  if (!row) return
  for (const element of row.querySelectorAll<HTMLElement>(ROW_FOCUSABLE_SELECTOR)) {
    if (element.matches(itemSelector)) continue
    const kept = element.getAttribute(ROW_HIDDEN_ATTRIBUTE)
    if (isInTabOrder && kept !== null) {
      element.removeAttribute(ROW_HIDDEN_ATTRIBUTE)
      if (kept) element.setAttribute('tabindex', kept)
      else element.removeAttribute('tabindex')
    } else if (!isInTabOrder && kept === null && element.tabIndex >= 0) {
      element.setAttribute(ROW_HIDDEN_ATTRIBUTE, element.getAttribute('tabindex') ?? '')
      element.tabIndex = -1
    }
  }
}

/**
 * Makes the group a single stop of Tab: only one of its items takes Tab, the focused one, else the pressed one, else the
 * one which had the focus last, else the first. The arrows, Home and End move the focus between the items, around their
 * list. The disabled items are left out, the focus of an item which is disabled goes to its neighbour. The tabindex are set
 * on the elements, outside of React, again when the items change. Returns the cleanup
 */
export const setupArrowNavigation = (group: HTMLElement, getOptions: () => ArrowNavigationOptions) => {
  const orientation = getOptions().orientation ?? 'horizontal'
  group.setAttribute(GROUP_ATTRIBUTE, orientation)
  const getItemSelector = () => getOptions().items ?? 'button'
  const getRow = (item: HTMLElement | undefined) => {
    const { rows } = getOptions()
    return rows ? item?.closest(rows) : undefined
  }
  const getItems = () => getOwnElements(group, getItemSelector()).filter(isEnabled)
  const isItem = (element: EventTarget | null): element is HTMLElement =>
    element instanceof HTMLElement && element.matches(getItemSelector()) && element.closest(`[${GROUP_ATTRIBUTE}]`) === group && isEnabled(element)

  let tabStop: HTMLElement | undefined
  // the focus lost to nothing is still counted inside: a focused button which is disabled may lose it this way
  let hasFocus = false

  const moveTabStop = (item: HTMLElement | undefined) => {
    if (item === tabStop) return
    if (tabStop) {
      tabStop.tabIndex = -1
      setRowInTabOrder(getRow(tabStop), false, getItemSelector())
    }
    if (item) {
      item.tabIndex = 0
      setRowInTabOrder(getRow(item), true, getItemSelector())
    }
    tabStop = item
  }

  /** Chooses the item taking Tab again, after a change of the items. The rows are all set again when some are added */
  const sync = (withAllRows: boolean) => {
    // an item disabled by aria-disabled could still take the focus
    const elements = getOwnElements(group, getItemSelector())
    const items = elements.filter(isEnabled)
    const previous = tabStop
    const active = document.activeElement
    const pressed = items.filter(isPressed)
    const next =
      items.find(item => item === active) ??
      (previous && pressed.includes(previous) ? previous : pressed[0]) ??
      (previous && items.includes(previous) ? previous : items[0])
    for (const element of elements) if (element !== next && element.tabIndex !== -1) element.tabIndex = -1
    moveTabStop(next)
    if (next && next.tabIndex !== 0) next.tabIndex = 0
    const { rows } = getOptions()
    if (withAllRows && rows) {
      for (const row of getOwnElements(group, rows)) setRowInTabOrder(row, !!next && row.contains(next), getItemSelector())
    }
    // a focused item which is disabled loses the focus: its neighbour takes it
    const isLost = active === previous || active === document.body || active === null
    const isDisabled = !!previous && group.contains(previous) && !items.includes(previous)
    if (previous && hasFocus && isDisabled && isLost) {
      const neighbour = items.find(item => previous.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING) ?? items.at(-1)
      neighbour?.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return
    const item = isItem(e.target) ? e.target : undefined
    getOptions().onKeyDown?.(e, item)
    if (e.defaultPrevented || !item) return
    const items = getItems()
    const index = items.indexOf(item)
    let nextIndex: number
    if (e.key === 'Home') nextIndex = 0
    else if (e.key === 'End') nextIndex = items.length - 1
    else if (e.key in STEPS) {
      // ArrowLeft and ArrowRight do nothing in a vertical list which does not handle them, and leave the shortcuts too
      const isAcross = orientation === 'vertical' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      nextIndex = isAcross ? index : index + STEPS[e.key]!
    } else return
    e.preventDefault()
    items[(nextIndex + items.length) % items.length]?.focus()
  }

  const handleFocusIn = (e: FocusEvent) => {
    hasFocus = true
    if (isItem(e.target)) moveTabStop(e.target)
  }

  const handleFocusOut = (e: FocusEvent) => {
    if (e.relatedTarget instanceof Node && !group.contains(e.relatedTarget)) hasFocus = false
  }

  /** Chooses the item taking Tab again when items or rows are added or removed, or when an item changes its state */
  const handleMutations = (records: MutationRecord[]) => {
    const { rows } = getOptions()
    const isHolding = (node: Node, selector: string | undefined) =>
      !!selector && node instanceof Element && (node.matches(selector) || node.querySelector(selector) !== null)
    let hasItemChanges = false
    let hasRowChanges = false
    for (const record of records) {
      // the other nodes changed, like the icons or the texts of the items, change nothing
      const nodes = [...record.addedNodes, ...record.removedNodes]
      hasRowChanges ||= nodes.some(node => isHolding(node, rows))
      hasItemChanges ||=
        record.type === 'attributes'
          ? record.target instanceof Element && record.target.matches(getItemSelector())
          : nodes.some(node => isHolding(node, getItemSelector()))
    }
    if (hasItemChanges || hasRowChanges) sync(hasRowChanges)
  }

  sync(true)
  const observer = new MutationObserver(handleMutations)
  observer.observe(group, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'aria-pressed'] })
  group.addEventListener('keydown', handleKeyDown)
  group.addEventListener('focusin', handleFocusIn)
  group.addEventListener('focusout', handleFocusOut)
  return () => {
    observer.disconnect()
    group.removeEventListener('keydown', handleKeyDown)
    group.removeEventListener('focusin', handleFocusIn)
    group.removeEventListener('focusout', handleFocusOut)
  }
}

/**
 * Keyboard of a group of buttons, like the items of a menu or the tools of a panel: it is a single stop of Tab, the arrows
 * moving between its items, see setupArrowNavigation. The keys handled are prevented, so that the shortcuts of the canvas
 * leave them. Returns the ref of the group: it is set up once mounted, before the effects which give it the focus
 */
const useArrowNavigation = (options: ArrowNavigationOptions = {}) => useSetupRef(setupArrowNavigation, options)

export default useArrowNavigation
