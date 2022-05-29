import React, { useEffect, useRef } from 'react'
import Button from 'components/common/Button'
import Modal from 'components/common/Modal'
import { styled } from '@linaria/react'

const StyledInputModal = styled(Modal)`
  form {
    grid-template-columns: 3fr 1fr 1fr;

    input {
      color: var(--text-color);
      border: 2px solid var(--text-color);
      outline: none;
    }
  }
`

type PictureUrlModalType = {
  togglePictureUrlModal: () => void
  addPicture: (url: string) => Promise<void>
}

const PictureUrlModal = ({ togglePictureUrlModal, addPicture }: PictureUrlModalType) => {
  const pictureUrlInputRef = useRef<HTMLInputElement>(null)

  const addPictureFromUrl = async () => {
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
    <StyledInputModal onClose={togglePictureUrlModal}>
      <form onSubmit={addPictureFromUrl}>
        <label>
          URL
          <input type="text" ref={pictureUrlInputRef} />
        </label>
        <Button onClick={togglePictureUrlModal}>Annuler</Button>
        <Button type="submit">Ajouter</Button>
      </form>
    </StyledInputModal>
  )
}

export default PictureUrlModal
