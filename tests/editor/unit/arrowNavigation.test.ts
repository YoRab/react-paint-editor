import { setupArrowNavigation } from '@editor/hooks/useArrowNavigation'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * @vitest-environment jsdom
 */

const mutations = () => new Promise(resolve => setTimeout(resolve))

const createGroup = (html: string) => {
  const group = document.createElement('div')
  group.innerHTML = html
  document.body.appendChild(group)
  return group
}

const press = (target: Element, key: string) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

const getTabIndexes = (elements: Iterable<HTMLElement>) => [...elements].map(element => element.tabIndex)

describe('setupArrowNavigation', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('gives Tab to the pressed item, else to the first one', async () => {
    const group = createGroup('<button>a</button><button>b</button><button>c</button>')
    const buttons = group.querySelectorAll('button')
    setupArrowNavigation(group, () => ({}))
    expect(getTabIndexes(buttons)).toEqual([0, -1, -1])

    buttons[1]!.setAttribute('aria-pressed', 'true')
    await mutations()
    expect(getTabIndexes(buttons)).toEqual([-1, 0, -1])
  })

  it('moves the focus around the items of a row with the arrows, Home and End', () => {
    const group = createGroup('<button>a</button><button disabled>b</button><button>c</button><button>d</button>')
    const [a, , c, d] = group.querySelectorAll('button')
    setupArrowNavigation(group, () => ({}))
    a!.focus()

    expect(press(a!, 'ArrowRight').defaultPrevented).toBe(true)
    // the disabled item is left out
    expect(document.activeElement).toBe(c)
    press(c!, 'ArrowDown')
    expect(document.activeElement).toBe(d)
    press(d!, 'ArrowRight')
    expect(document.activeElement).toBe(a)
    press(a!, 'ArrowLeft')
    expect(document.activeElement).toBe(d)
    press(d!, 'Home')
    expect(document.activeElement).toBe(a)
    press(a!, 'End')
    expect(document.activeElement).toBe(d)
    // the item focused takes Tab
    expect(getTabIndexes(group.querySelectorAll('button'))).toEqual([-1, -1, -1, 0])
    expect(press(d!, 'Enter').defaultPrevented).toBe(false)
  })

  it('leaves ArrowLeft and ArrowRight to a vertical list, without moving', () => {
    const group = createGroup('<button>a</button><button>b</button>')
    const [a, b] = group.querySelectorAll('button')
    const onKeyDown = vi.fn()
    setupArrowNavigation(group, () => ({ orientation: 'vertical', onKeyDown }))
    a!.focus()

    expect(press(a!, 'ArrowRight').defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(a)
    expect(onKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: 'ArrowRight' }), a)
    press(a!, 'ArrowDown')
    expect(document.activeElement).toBe(b)
  })

  it('lets its keys handler prevent a key', () => {
    const group = createGroup('<button>a</button><button>b</button>')
    const [a] = group.querySelectorAll('button')
    setupArrowNavigation(group, () => ({ onKeyDown: e => e.preventDefault() }))
    a!.focus()

    press(a!, 'ArrowRight')
    expect(document.activeElement).toBe(a)
  })

  it('leaves the items of a nested group to it', () => {
    const group = createGroup('<button>a</button><div><button>b</button><button>c</button></div><button>d</button>')
    const nested = group.querySelector('div')!
    const [a, b, c, d] = group.querySelectorAll('button')
    setupArrowNavigation(group, () => ({}))
    setupArrowNavigation(nested, () => ({}))
    a!.focus()

    press(a!, 'ArrowRight')
    expect(document.activeElement).toBe(d)
    b!.focus()
    press(b!, 'ArrowRight')
    expect(document.activeElement).toBe(c)
    // each group has its own stop of Tab
    expect(getTabIndexes([a!, b!, c!, d!])).toEqual([-1, -1, 0, 0])
  })

  it('keeps in the order of Tab only the buttons of the row of the item taking it', async () => {
    const row = '<li><button tabindex="-1">chevron</button><span class="name" tabindex="-1">name</span><button>hide</button></li>'
    const group = createGroup(`<ul>${row}${row}</ul>`)
    const list = group.querySelector('ul')!
    setupArrowNavigation(list, () => ({ orientation: 'vertical', items: '.name', rows: 'li' }))
    const getRows = () => [...list.querySelectorAll('li')].map(item => getTabIndexes(item.querySelectorAll<HTMLElement>('button, .name')))
    // the chevron stays out of the order of Tab
    expect(getRows()).toEqual([
      [-1, 0, 0],
      [-1, -1, -1]
    ])

    const names = list.querySelectorAll<HTMLElement>('.name')
    names[1]!.focus()
    expect(getRows()).toEqual([
      [-1, -1, -1],
      [-1, 0, 0]
    ])

    // a row added takes its buttons out of the order of Tab
    list.insertAdjacentHTML('beforeend', row)
    await mutations()
    expect(getRows()[2]).toEqual([-1, -1, -1])
    names[0]!.focus()
    expect(getRows()).toEqual([
      [-1, 0, 0],
      [-1, -1, -1],
      [-1, -1, -1]
    ])
  })

  it('gives the focus of an item which is disabled to its neighbour', async () => {
    const group = createGroup('<button>a</button><button>b</button><button>c</button>')
    const [a, b] = group.querySelectorAll('button')
    setupArrowNavigation(group, () => ({}))
    a!.focus()

    a!.disabled = true
    a!.blur()
    await mutations()
    expect(document.activeElement).toBe(b)
    expect(b!.tabIndex).toBe(0)
  })

  it('stops listening once cleaned up', () => {
    const group = createGroup('<button>a</button><button>b</button>')
    const [a] = group.querySelectorAll('button')
    const cleanup = setupArrowNavigation(group, () => ({}))
    cleanup()
    a!.focus()

    expect(press(a!, 'ArrowRight').defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(a)
  })
})
