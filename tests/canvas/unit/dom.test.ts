import { syncChildren } from '@canvas/utils/dom'
import { describe, expect, it, vi } from 'vitest'

/**
 * @vitest-environment jsdom
 */

const createItems = (count: number, prefix = 'item') =>
  Array.from({ length: count }, (_, index) => {
    const item = document.createElement('li')
    item.textContent = `${prefix} ${index}`
    return item
  })

const createList = (items: Element[] = []) => {
  const list = document.createElement('ul')
  list.append(...items)
  return list
}

describe('canvas/utils/dom', () => {
  describe('syncChildren', () => {
    it('fills an empty element with the items, in their order', () => {
      const items = createItems(3)
      const list = createList()
      syncChildren(list, items)
      expect([...list.children]).toEqual(items)
    })

    it('moves nothing when the items are at their place', () => {
      const items = createItems(3)
      const list = createList(items)
      const insertBefore = vi.spyOn(list, 'insertBefore')
      syncChildren(list, items)
      expect(insertBefore).not.toHaveBeenCalled()
      expect([...list.children]).toEqual(items)
    })

    it('moves only the item brought forward', () => {
      const [a, b, c, d] = createItems(4)
      const list = createList([a!, b!, c!, d!])
      const insertBefore = vi.spyOn(list, 'insertBefore')
      syncChildren(list, [d!, a!, b!, c!])
      expect([...list.children]).toEqual([d, a, b, c])
      expect(insertBefore).toHaveBeenCalledOnce()
    })

    it('replaces only the item of a shape whose description changed', () => {
      const [a, b, c] = createItems(3)
      const [changed] = createItems(1, 'changed')
      const list = createList([a!, b!, c!])
      const insertBefore = vi.spyOn(list, 'insertBefore')
      syncChildren(list, [a!, changed!, c!])
      expect([...list.children]).toEqual([a, changed, c])
      expect(insertBefore).toHaveBeenCalledOnce()
    })

    it('removes the children left out and inserts the new items at their place', () => {
      const [a, b, c] = createItems(3)
      const [x, y] = createItems(2, 'new')
      const list = createList([a!, b!, c!])
      syncChildren(list, [x!, c!, y!, a!])
      expect([...list.children]).toEqual([x, c, y, a])
      expect(b!.isConnected).toBe(false)
    })

    it('empties the element without items', () => {
      const list = createList(createItems(3))
      syncChildren(list, [])
      expect(list.children).toHaveLength(0)
    })

    it('gives any order of old and new items', () => {
      // a pseudo-random sequence, the same on each run
      let seed = 1
      const random = () => {
        seed = (seed * 16807) % 2147483647
        return seed / 2147483647
      }
      const pool = createItems(30)
      const list = createList()
      for (let round = 0; round < 200; round++) {
        const items = pool.filter(() => random() < 0.6).sort(() => random() - 0.5)
        syncChildren(list, items)
        expect([...list.children]).toEqual(items)
      }
    })
  })
})
