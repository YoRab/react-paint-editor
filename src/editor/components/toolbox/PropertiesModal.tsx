import Modal from '@editor/components/common/Modal'
import GeometryFields from '@editor/components/toolbox/GeometryFields'
import './ToolboxModal.css'

const TITLE = 'Propriétés'

/** Modal of the position, the size and the angle of the selection, opened by the context menu */
const PropertiesModal = ({ onClose }: { onClose: () => void }) => (
  <Modal className='react-paint-editor-toolbox-modal' onClose={onClose} position='bottom' title={TITLE} withCloseButton>
    <h3>{TITLE}</h3>
    <hr />
    <GeometryFields />
  </Modal>
)

export default PropertiesModal
