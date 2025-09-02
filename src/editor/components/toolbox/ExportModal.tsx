import Button from '@editor/components/common/Button'
import Modal from '@editor/components/common/Modal'
import './ExportModal.css'

const TITLE = 'Choose export settings'

type ExportModalProps = {
  toggleExportModal: () => void
  exportCanvasInFile: (view: 'fitToShapes' | 'defaultView' | 'currentZoom') => void
}

const ExportModal = ({ toggleExportModal, exportCanvasInFile }: ExportModalProps) => {
  const triggerExport = async (view: 'fitToShapes' | 'defaultView' | 'currentZoom') => {
    exportCanvasInFile(view)
    toggleExportModal()
  }

  return (
    <Modal className='react-paint-editor-toolbox-export-modal' onClose={toggleExportModal} title={TITLE}>
      <h3>{TITLE}</h3>
      <hr />
      <Button onClick={() => triggerExport('currentZoom')}>Exporter la vue actuelle</Button>
      <Button onClick={() => triggerExport('defaultView')}>Exporter le canvas entier</Button>
      <Button onClick={() => triggerExport('fitToShapes')}>Exporter dans les limites du dessin</Button>
      <Button selected onClick={toggleExportModal}>
        Annuler
      </Button>
    </Modal>
  )
}

export default ExportModal
