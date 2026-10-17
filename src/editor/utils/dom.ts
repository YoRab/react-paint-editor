export const isEventInsideNode = (event: Event, node: HTMLElement | null): boolean => {
  return !(event.target instanceof Node) || !node ? false : node.contains(event.target)
}
