import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, spyOn, userEvent, waitFor, within } from 'storybook/test'
import type { DrawableShape } from '../../../src/index'
import { findFileInput, getPaint, getState, ReactPaintWrapper, wait } from './../helpers'

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
      if (!view.queryByRole('menuitem', { name: 'Save project' })) await userEvent.click(await view.findByTitle('Menu'))
    }
    const exportView = async (buttonName: string) => {
      await openMenu()
      await userEvent.click(await view.findByRole('menuitem', { name: 'Export PNG' }))
      await userEvent.click(await view.findByRole('button', { name: buttonName }))
      await wait()
    }
    const loadProject = async (file: File) => {
      await openMenu()
      await userEvent.upload(await findFileInput(view, 'Load project'), file)
    }

    try {
      // =====================================================================
      // Export PNG: the whole drawing, the default canvas, or the current view
      // =====================================================================

      await exportView('Export the whole drawing')
      await exportView('Export the default canvas')
      await exportView('Export the current view')
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
      await userEvent.click(await view.findByRole('menuitem', { name: 'Export PNG' }))
      await userEvent.click(await view.findByRole('button', { name: 'Cancel' }))
      expect(view.queryByRole('button', { name: 'Export the whole drawing' })).toBeNull()
      expect(downloads).toHaveLength(3)

      // =====================================================================
      // Save project: the drawing in a JSON file
      // =====================================================================

      downloads.length = 0
      await openMenu()
      await userEvent.click(await view.findByRole('menuitem', { name: 'Save project' }))
      expect(downloads).toHaveLength(1)
      expect(downloads[0]!.download).toBe('drawing.json')
      const saved = JSON.parse(decodeURIComponent(downloads[0]!.href.slice(JSON_PREFIX.length)))
      expect(saved.shapes).toEqual(getPaint().getCurrentData().shapes)

      // a click outside of the menu closes it
      await openMenu()
      await userEvent.click(document.body)
      await waitFor(() => expect(view.queryByRole('menuitem', { name: 'Save project' })).toBeNull())

      // the space bar and Enter open the file chooser of a file button
      const chooseFile = spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined)
      await openMenu()
      ;(await view.findByRole('menuitem', { name: 'Load project' })).focus()
      await userEvent.keyboard(' ')
      expect(chooseFile).toHaveBeenCalledTimes(1)
      await userEvent.keyboard('{Enter}')
      expect(chooseFile).toHaveBeenCalledTimes(2)
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
      expect(await view.findByText('File loaded')).toBeInTheDocument()
      expect(getState().shapes.map(shape => shape.id)).toEqual(['first', 'second'])

      await loadProject(new File(['not a project'], 'notes.json', { type: 'application/json' }))
      // the code of the error of the canvas tells what went wrong
      expect(await view.findByText('The file is not a project')).toBeInTheDocument()
      expect(getState().shapes).toHaveLength(2)

      // a picture which cannot be read fails too
      await openMenu()
      await userEvent.upload(await findFileInput(view, 'Upload picture'), new File(['not an image'], 'broken.png', { type: 'image/png' }))
      expect(await view.findByText('The picture could not be loaded')).toBeInTheDocument()
      expect(getState().shapes).toHaveLength(2)

      // the pictures of a project which cannot be loaded are left out, with a single message
      const refusedPicture = (id: string) => ({ type: 'picture', id, x: 0, y: 0, width: 100, height: 100, src: 'javascript:void(0)' })
      const withRefusedPictures = { shapes: [{ ...SQUARE, id: 'kept' }, refusedPicture('first-picture'), refusedPicture('second-picture')] }
      await loadProject(new File([JSON.stringify(withRefusedPictures)], 'drawing.json', { type: 'application/json' }))
      // findByText fails when several messages are shown
      expect(await view.findByText('Some pictures could not be loaded')).toBeInTheDocument()
      expect(getState().shapes.map(shape => shape.id)).toEqual(['kept'])

      // =====================================================================
      // The export of an empty drawing fails with a message
      // =====================================================================

      getPaint().actions.clearCanvas()
      downloads.length = 0
      await exportView('Export the whole drawing')
      expect(downloads).toHaveLength(0)
      expect(await view.findByText('There is no shape to export')).toBeInTheDocument()
      // the 3 failures of the editor, and the canvas about each picture left out
      expect(warn).toHaveBeenCalledTimes(5)

      // the messages go away after a few seconds
      await waitFor(() => expect(view.queryByText('File loaded')).toBeNull(), { timeout: 5000 })
    } finally {
      click.mockRestore()
      warn.mockRestore()
    }
  }
}
