import Button from '@editor/components/common/Button'
import Modal from '@editor/components/common/Modal'
import useEditorLocale from '@editor/hooks/useEditorLocale'
import './ToolboxModal.css'

type ExportModalProps = {
  toggleExportModal: () => void
  exportCanvasInFile: (view: 'fitToShapes' | 'defaultView' | 'currentZoom') => void
}

const ExportModal = ({ toggleExportModal, exportCanvasInFile }: ExportModalProps) => {
  const { editor: messages } = useEditorLocale()
  const triggerExport = async (view: 'fitToShapes' | 'defaultView' | 'currentZoom') => {
    exportCanvasInFile(view)
    toggleExportModal()
  }

  return (
    <Modal className='react-paint-editor-toolbox-modal' onClose={toggleExportModal} title={messages.export.title}>
      <h3>{messages.export.title}</h3>
      <hr />
      <Button onClick={() => triggerExport('currentZoom')}>{messages.export.currentZoom}</Button>
      <Button onClick={() => triggerExport('defaultView')}>{messages.export.defaultView}</Button>
      <Button onClick={() => triggerExport('fitToShapes')}>{messages.export.fitToShapes}</Button>
      <Button selected onClick={toggleExportModal}>
        {messages.common.cancel}
      </Button>
    </Modal>
  )
}

export default ExportModal
