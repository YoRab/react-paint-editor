import React, { useEffect, useState } from 'react'
import { LOADING_TRANSITION_DURATION } from '../../constants/loading'
import { STYLE_ZINDEX } from '../../constants/style'
import './Loading.css'

export type LoadingType = {
	isLoading: boolean
}

const Loading = ({ isLoading = false }: LoadingType) => {
	const [loadingState, setLoadingState] = useState<'hidden' | 'visible' | 'fadeOut'>('hidden')
	useEffect(() => {
		if (isLoading) {
			setLoadingState('visible')
		} else {
			setLoadingState('fadeOut')
			const fadeOutTimeout = setTimeout(() => setLoadingState('hidden'), LOADING_TRANSITION_DURATION)
			return () => {
				clearTimeout(fadeOutTimeout)
			}
		}
	}, [isLoading])

	return loadingState === 'hidden' ? null : (
		<div
			className='react-paint-editor-loading'
			data-loading={loadingState}
			style={{
				'--react-paint-editor-loading-zindex': STYLE_ZINDEX.LOADING,
				'--react-paint-editor-loading-transition-duration': `${LOADING_TRANSITION_DURATION}ms`
			}}
		>
			<div className='react-paint-editor-loader'>
				<div />
				<div />
				<div />
				<div />
			</div>
		</div>
	)
}

export default Loading
