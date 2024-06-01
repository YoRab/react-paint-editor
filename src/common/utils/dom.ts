export const isEventInsideNode = (event: MouseEvent | TouchEvent, node: HTMLElement | null) => {
  return !(event.target instanceof Node) || !node ? false : node.contains(event.target)
}
