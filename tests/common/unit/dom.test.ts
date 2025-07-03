import { isEventInsideNode } from '@common/utils/dom'
import { describe, expect, it } from 'vitest'

/**
 * @vitest-environment jsdom
 */

describe('isEventInsideNode', () => {
  it('should return false if event target is not a Node', () => {
    const event = { target: null } as MouseEvent
    const node = document.createElement('div')

    const result = isEventInsideNode(event, node)
    expect(result).toBe(false)
  })

  it('should return false if node is null', () => {
    const event = new MouseEvent('click', { bubbles: true })

    const result = isEventInsideNode(event, null)
    expect(result).toBe(false)
  })

  it('should return true if event target is inside the node', () => {
    const node = document.createElement('div')
    const child = document.createElement('div')
    node.appendChild(child)

    const event = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(event, 'target', { value: child })

    const result = isEventInsideNode(event, node)
    expect(result).toBe(true)
  })

  it('should return false if event target is outside the node', () => {
    const node = document.createElement('div')
    const externalNode = document.createElement('div')

    const event = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(event, 'target', { value: externalNode })

    const result = isEventInsideNode(event, node)
    expect(result).toBe(false)
  })

  it('should return false if event target is null or undefined', () => {
    const node = document.createElement('div')

    const event = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(event, 'target', { value: null })

    const result = isEventInsideNode(event, node)
    expect(result).toBe(false)
  })
})
