import React, { useEffect, useState } from 'react'
import { STYLE_ZINDEX } from '../../constants/style'
import { SNACKBAR_DURATION, SNACKBAR_TOGGLE_ANIMATION_DURATION } from '../../constants/snackbar'
import type { SnackBarType } from '../../types/snackbar'
import './Snackbar.css'

type SnackbarContainerType = {
	snackbarList: SnackBarType[]
}

const Snackbar = ({ type, text, duration }: SnackBarType) => {
	const [isShown, setIsShown] = useState(false)
	useEffect(() => {
		const timeoutShowId = setTimeout(() => {
			setIsShown(true)
		}, SNACKBAR_TOGGLE_ANIMATION_DURATION)
		const timeoutHideId = setTimeout(
			() => {
				setIsShown(false)
			},
			duration - SNACKBAR_DURATION - SNACKBAR_TOGGLE_ANIMATION_DURATION
		)
		return () => {
			clearTimeout(timeoutShowId)
			clearTimeout(timeoutHideId)
		}
	}, [duration])

	return (
		<div
			className='react-paint-editor-snackbar'
			data-is-shown={+isShown}
			data-type={type}
			style={{ '--react-paint-editor-panel-transition-duration': `${SNACKBAR_DURATION}ms` }}
		>
			{text}
		</div>
	)
}

const SnackbarContainer = ({ snackbarList }: SnackbarContainerType) => {
	return (
		<div className='react-paint-editor-snackbar-container' style={{ '--react-paint-editor-snackbar-zindex': STYLE_ZINDEX.PANEL }}>
			{snackbarList.map(snackbar => (
				<Snackbar key={snackbar.id} {...snackbar} />
			))}
		</div>
	)
}

export default SnackbarContainer
