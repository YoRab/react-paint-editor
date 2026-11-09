import Button from '@editor/components/common/Button'
import Modal from '@editor/components/common/Modal'
import useEditorLocale from '@editor/hooks/useEditorLocale'
import type React from 'react'
import { useEffect, useRef } from 'react'
import './PictureUrlInput.css'

type PictureUrlModalType = {
  togglePictureUrlModal: () => void
  addPicture: (url: string) => Promise<void>
}

const PictureUrlModal = ({ togglePictureUrlModal, addPicture }: PictureUrlModalType) => {
  const pictureUrlInputRef = useRef<HTMLInputElement>(null)
  const { editor: messages } = useEditorLocale()

  const addPictureFromUrl = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const url = pictureUrlInputRef.current?.value
    if (url) {
      await addPicture(url)
      togglePictureUrlModal()
    }
    return
  }

  useEffect(() => {
    if (!pictureUrlInputRef.current) return
    pictureUrlInputRef.current.focus()
  }, [])

  return (
    <Modal className='react-paint-editor-toolbox-pictureinput-modal' onClose={togglePictureUrlModal} title={messages.toolbar.pictureFromUrl}>
      <form onSubmit={addPictureFromUrl}>
        <label>
          {messages.pictureUrl.url}&nbsp;
          <input type='text' ref={pictureUrlInputRef} />
        </label>
        <Button onClick={togglePictureUrlModal}>{messages.common.cancel}</Button>
        <Button type='submit' selected>
          {messages.pictureUrl.add}
        </Button>
      </form>
    </Modal>
  )
}

export default PictureUrlModal
