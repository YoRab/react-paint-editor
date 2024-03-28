import React, { useEffect, useRef } from 'react'
import Button from '@editor/components/common/Button'
import Modal from '@editor/components/common/Modal'
import './PictureUrlInput.css'

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
		<Modal className='react-paint-editor-toolbox-pictureinput-modal' onClose={togglePictureUrlModal}>
			<form onSubmit={addPictureFromUrl}>
				<label>
					URL&nbsp;
					<input type='text' ref={pictureUrlInputRef} />
				</label>
				<Button onClick={togglePictureUrlModal}>Annuler</Button>
				<Button type='submit' selected>
					Ajouter
				</Button>
			</form>
		</Modal>
	)
}

export default PictureUrlModal
