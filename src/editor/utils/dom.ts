export const isEventInsideNode = (event: MouseEvent | TouchEvent, node: HTMLElement | null): boolean => {
  return !(event.target instanceof Node) || !node ? false : node.contains(event.target)
}
