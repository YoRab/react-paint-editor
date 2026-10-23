import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, spyOn, userEvent, waitFor, within } from 'storybook/test'
import type { DrawableShape } from '../../../src/index'
import { getPaint, getState, ReactPaintWrapper, wait } from './../helpers'

const meta = {
  title: 'Tests/Manipulation',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

// filled 100×100 square, center at canvas (300, 300)
const SQUARE: DrawableShape = {
  type: 'square',
  x: 250,
  y: 250,
  width: 100,
  height: 100,
  rotation: 0,
  style: { strokeColor: '#000000', fillColor: '#4a90d9', opacity: 100, lineWidth: 2 }
}

const JSON_PREFIX = 'data:text/plain;charset=utf-8,'

const getImageSize = (src: string) =>
  new Promise<[number, number]>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve([img.naturalWidth, img.naturalHeight])
    img.onerror = reject
    img.src = src
  })

export const FileActions: Story = {
  args: {
    shapes: [SQUARE]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    await view.findByTestId('draw-canvas')

    // the downloads are recorded instead of being saved
    const downloads: { href: string; download: string }[] = []
    const click = spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ href: this.href, download: this.download })
    })
    // the editor warns about the failures shown in its messages
    const warn = spyOn(console, 'warn').mockImplementation(() => undefined)

    const openMenu = async () => {
      if (!view.queryByTitle('Save project')) await userEvent.click(await view.findByTitle('Menu'))
    }
    const exportView = async (buttonName: string) => {
      await openMenu()
      await userEvent.click(await view.findByTitle('Export PNG'))
      await userEvent.click(await view.findByRole('button', { name: buttonName }))
      await wait()
    }
    const loadProject = async (file: File) => {
      await openMenu()
      await userEvent.upload(await view.findByTitle('Load project'), file)
    }

    try {
      // =====================================================================
      // Export PNG: the whole drawing, the default canvas, or the current view
      // =====================================================================

      await exportView('Exporter le dessin entier')
      await exportView('Exporter le canevas par défaut')
      await exportView('Exporter la vue actuelle')
      expect(downloads).toHaveLength(3)
      for (const { href, download } of downloads) {
        expect(href.startsWith('data:image/png')).toBe(true)
        expect(download.endsWith('.png')).toBe(true)
      }
      const [shapesWidth] = await getImageSize(downloads[0]!.href)
      // the box of the square, with its stroke
      expect(shapesWidth).toBeGreaterThanOrEqual(100)
      expect(shapesWidth).toBeLessThan(110)
      expect(await getImageSize(downloads[1]!.href)).toEqual([1000, 600])

      // the modal closes without exporting
      await openMenu()
      await userEvent.click(await view.findByTitle('Export PNG'))
      await userEvent.click(await view.findByRole('button', { name: 'Annuler' }))
      expect(view.queryByRole('button', { name: 'Exporter le dessin entier' })).toBeNull()
      expect(downloads).toHaveLength(3)

      // =====================================================================
      // Save project: the drawing in a JSON file
      // =====================================================================

      downloads.length = 0
      await openMenu()
      await userEvent.click(await view.findByTitle('Save project'))
      expect(downloads).toHaveLength(1)
      expect(downloads[0]!.download).toBe('drawing.json')
      const saved = JSON.parse(decodeURIComponent(downloads[0]!.href.slice(JSON_PREFIX.length)))
      expect(saved.shapes).toEqual(getPaint().getCurrentData().shapes)

      // a click outside of the menu closes it
      await openMenu()
      await userEvent.click(document.body)
      await waitFor(() => expect(view.queryByTitle('Save project')).toBeNull())

      // the space bar opens the file chooser of a file button
      const chooseFile = spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined)
      await openMenu()
      ;(await view.findByTitle('Load project')).focus()
      await userEvent.keyboard(' ')
      expect(chooseFile).toHaveBeenCalledTimes(1)
      chooseFile.mockRestore()

      // =====================================================================
      // Load project: a JSON file replaces the drawing, any other file fails
      // =====================================================================

      const project = {
        shapes: [
          { ...SQUARE, id: 'first' },
          { ...SQUARE, x: 500, id: 'second' }
        ]
      }
      await loadProject(new File([JSON.stringify(project)], 'drawing.json', { type: 'application/json' }))
      expect(await view.findByText('Fichier chargé !')).toBeInTheDocument()
      expect(getState().shapes.map(shape => shape.id)).toEqual(['first', 'second'])

      await loadProject(new File(['not a project'], 'notes.json', { type: 'application/json' }))
      expect(await view.findByText('Le chargement a échoué')).toBeInTheDocument()
      expect(getState().shapes).toHaveLength(2)

      // a picture which cannot be read fails the same way
      await openMenu()
      await userEvent.upload(await view.findByTitle('Upload picture'), new File(['not an image'], 'broken.png', { type: 'image/png' }))
      await waitFor(() => expect(view.getAllByText('Le chargement a échoué')).toHaveLength(2))
      expect(getState().shapes).toHaveLength(2)

      // =====================================================================
      // The export of an empty drawing fails with a message
      // =====================================================================

      getPaint().actions.clearCanvas()
      downloads.length = 0
      await exportView('Exporter le dessin entier')
      expect(downloads).toHaveLength(0)
      expect(await view.findByText("L'export a échoué : No image found to export")).toBeInTheDocument()
      expect(warn).toHaveBeenCalledTimes(3)

      // the messages go away after a few seconds
      await waitFor(() => expect(view.queryByText('Fichier chargé !')).toBeNull(), { timeout: 5000 })
    } finally {
      click.mockRestore()
      warn.mockRestore()
    }
  }
}
