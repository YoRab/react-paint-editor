import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { Canvas, type EditorLocale, type PartialLocale, type ShapeInput, useReactPaint } from '../../../src/index'
import { FR_LOCALE } from '../../locales/fr'
import { findFileInput, getPaint, ReactPaintWrapper, square, wait } from './../helpers'

/** Two rectangles, and a circle in the background: its type has another name in French */
const SHAPES: ShapeInput[] = [square('a', 100, 100), square('b', 400, 100), { type: 'circle', id: 'c', x: 700, y: 400, radius: 50 }]

/** The editor, with a button outside of it switching its locale */
const LocaleSwitch = ({ locales }: { locales: (PartialLocale<EditorLocale> | undefined)[] }) => {
  const [index, setIndex] = useState(0)
  return (
    <div>
      <button type='button' onClick={() => setIndex(previous => (previous + 1) % locales.length)}>
        Next language
      </button>
      <ReactPaintWrapper shapes={SHAPES} editorOptions={{ locale: locales[index] }} />
    </div>
  )
}

const meta = {
  title: 'Tests/Accessibility',
  component: LocaleSwitch,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof LocaleSwitch>

export default meta
type Story = StoryObj<typeof meta>

/** The live region of the editor, which the assistive technologies read: the layers panel has its own */
const getAnnouncement = (canvasElement: HTMLElement) =>
  canvasElement.querySelector('.react-paint-editor-app > .react-paint-editor-sr-only')?.textContent?.trim()

/** The names of the layers, from the foreground */
const getLayerNames = (canvasElement: HTMLElement) =>
  [...canvasElement.querySelectorAll('.react-paint-editor-layout-label')].map(label => label.textContent)

/**
 * A translation given to the editor reaches the canvas inside it, the texts read outside of React and the messages of the
 * errors of the canvas. The language can change at any time: the shapes keep their numbers
 */
export const Languages: Story = {
  args: { locales: [FR_LOCALE, undefined] },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const user = userEvent.setup()
    const drawCanvas = await view.findByTestId('draw-canvas')
    await wait(100)

    // =====================================================================
    // The editor and its canvas speak French, the lang attribute telling it on their own elements only
    // =====================================================================

    expect(drawCanvas).toHaveAttribute('lang', 'fr')
    expect(drawCanvas).toHaveAttribute('aria-roledescription', 'zone de dessin')
    expect(drawCanvas).toHaveAccessibleDescription(/Tab et Maj\+Tab/)
    expect(canvasElement.querySelector('.react-paint-editor-toolbar-toolbox')).toHaveAttribute('lang', 'fr')
    expect(canvasElement.querySelector('.react-paint-editor-app')).not.toHaveAttribute('lang')
    expect(view.getByTestId('tool-selection')).toHaveAttribute('title', 'Sélection (V)')
    expect(view.getByTestId('tool-undo')).toHaveAttribute('title', 'Annuler (Ctrl+Z)')

    getPaint().actions.selectShapes(['a'])
    await waitFor(() => expect(getAnnouncement(canvasElement)).toBe('Sélection : Rectangle 2'))
    expect(within(drawCanvas).getByText('Rectangle, dans la sélection')).toBeInTheDocument()
    getPaint().actions.selectShapes(['a', 'b'])
    await waitFor(() => expect(getAnnouncement(canvasElement)).toBe('Sélection : 2 formes'))
    getPaint().actions.zoomTo(1.5)
    await waitFor(() => expect(getAnnouncement(canvasElement)).toMatch(/^Zoom 150[  ]%$/))
    getPaint().actions.zoomTo(1)

    await user.click(view.getByRole('button', { name: 'Afficher les calques' }))
    // the list is in the panel, which tells the language
    expect(view.getByRole('list', { name: 'Calques' }).closest('[lang]')).toHaveAttribute('lang', 'fr')
    expect(getLayerNames(canvasElement)).toEqual(['Rectangle 2', 'Rectangle 1', 'Cercle 1'])

    // a new text takes the text of the language
    const textTool = getPaint()
      .getState()
      .tools.find(tool => tool.type === 'text')!
    getPaint().actions.selectTool(textTool.id)
    drawCanvas.focus()
    // the first Enter moves the focus onto the shapes, the second one draws
    await user.keyboard('{Enter}{Enter}')
    const getText = () =>
      getPaint()
        .getState()
        .shapes.find(shape => shape.type === 'text')
    await waitFor(() => expect(getText()).toMatchObject({ value: ['Texte'] }))
    await user.keyboard('{Escape}')
    getPaint().actions.removeShapes([getText()!.id])
    await waitFor(() => expect(getAnnouncement(canvasElement)).toContain('Suppression : Texte'))

    // the error of the canvas is told by its code
    await user.click(view.getByRole('button', { name: 'Menu' }))
    await user.upload(await findFileInput(view, 'Ouvrir un projet'), new File(['not a project'], 'notes.json', { type: 'application/json' }))
    expect(await view.findByText("Le fichier n'est pas un projet")).toBeInTheDocument()

    // =====================================================================
    // Back in English: the shapes keep their numbers, the canvas describes them again
    // =====================================================================

    await user.click(view.getByRole('button', { name: 'Next language' }))
    await waitFor(() => expect(drawCanvas).toHaveAttribute('lang', 'en'))
    expect(drawCanvas).toHaveAttribute('aria-roledescription', 'drawing area')
    expect(getLayerNames(canvasElement)).toEqual(['Rectangle 2', 'Rectangle 1', 'Circle 1'])
    getPaint().actions.selectShapes(['b'])
    await waitFor(() => expect(getAnnouncement(canvasElement)).toBe('Rectangle 1 selected'))
    expect(within(drawCanvas).getByText('Rectangle, selected')).toBeInTheDocument()
    expect(view.getByTestId('tool-undo')).toHaveAttribute('title', 'Undo (Ctrl+Z)')
  }
}

/** Some texts replaced: the other ones stay in English, a canvas alone takes its own locale */
export const PartialLocales: Story = {
  args: { locales: [{ editor: { tools: { selection: 'Pick' } }, canvas: { keys: { ctrl: 'Control' } } }] },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await view.findByTestId('draw-canvas')
    await wait(100)
    expect(view.getByTestId('tool-selection')).toHaveAttribute('title', 'Pick (V)')
    expect(view.getByTestId('tool-undo')).toHaveAttribute('title', 'Undo (Control+Z)')
    expect(view.getByTestId('draw-canvas')).toHaveAttribute('lang', 'en')
  }
}

const CanvasAlone = () => {
  const paint = useReactPaint({ shapes: [square('a', 100, 100)] })
  return <Canvas paint={paint} options={{ locale: { lang: 'fr', canvas: { canvas: 'Dessin', shapeTypes: { rect: 'Rectangle' } } } }} />
}

export const CanvasLocale: StoryObj<typeof CanvasAlone> = {
  render: () => <CanvasAlone />,
  play: async ({ canvasElement }) => {
    const drawCanvas = await within(canvasElement).findByTestId('draw-canvas')
    expect(drawCanvas).toHaveAttribute('lang', 'fr')
    expect(drawCanvas).toHaveAccessibleName('Dessin')
    // the other texts stay in English
    expect(drawCanvas).toHaveAttribute('aria-roledescription', 'drawing area')
  }
}
