/**
 * Gives its items to an element, in their order, moving only the ones which are not at their place: a change of one
 * shape changes one item of the list describing the shapes
 */
export const syncChildren = (parent: Element, items: readonly Element[]) => {
  const kept = new Set<Element>(items)
  for (const child of [...parent.children]) if (!kept.has(child)) child.remove()
  // the children are walked through from sibling to sibling: each insertion clears the cache of parent.children, and an
  // index in it went through the children again from the first one, which took 2 s to fill a list with 20000 items
  let current = parent.firstElementChild
  for (const item of items) {
    if (item === current) current = current.nextElementSibling
    else parent.insertBefore(item, current)
  }
}
