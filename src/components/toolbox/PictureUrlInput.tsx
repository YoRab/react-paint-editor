import React, { useEffect, useRef } from 'react'
import Button from 'components/common/Button'
import Modal from 'components/common/Modal'
import { styled } from '@linaria/react'

const StyledInputModal = styled(Modal)`
  form {
    grid-template-columns: 3fr 1fr 1fr;

    input {
      color: var(--font-color);
      border: 1px solid var(--font-color);
      background: var(--toolbar-bg);
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
    <StyledInputModal onClose={togglePictureUrlModal}>
      <form onSubmit={addPictureFromUrl}>
        <label>
          URL&nbsp;
          <input type="text" ref={pictureUrlInputRef} />
        </label>
        <Button onClick={togglePictureUrlModal}>Annuler</Button>
        <Button type="submit" selected>
          Ajouter
        </Button>
      </form>
    </StyledInputModal>
  )
}

export default PictureUrlModal
