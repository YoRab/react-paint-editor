import Modal from '@editor/components/common/Modal'
import GeometryFields from '@editor/components/toolbox/GeometryFields'
import useEditorLocale from '@editor/hooks/useEditorLocale'
import './ToolboxModal.css'

/** Modal of the position, the size and the angle of the selection, opened by the context menu */
const PropertiesModal = ({ onClose }: { onClose: () => void }) => {
  const { editor: messages } = useEditorLocale()
  return (
    <Modal className='react-paint-editor-toolbox-modal' onClose={onClose} position='bottom' title={messages.properties.title} withCloseButton>
      <h3>{messages.properties.title}</h3>
      <hr />
      <GeometryFields />
    </Modal>
  )
}

export default PropertiesModal
