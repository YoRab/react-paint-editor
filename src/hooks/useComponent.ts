import { RefObject, useEffect, useState } from 'react'
import { isEventInsideNode } from '../utils/dom'

type UseComponentType = {
	disabled: boolean
	componentRef: RefObject<HTMLElement>
}

const useComponent = ({ disabled, componentRef }: UseComponentType) => {
	const [isInsideComponent, setIsInsideComponent] = useState(false)

	useEffect(() => {
		if (disabled) {
			setIsInsideComponent(false)
		} else {
			const onDetectClick = (event: MouseEvent | TouchEvent) => {
				setIsInsideComponent(isEventInsideNode(event, componentRef.current))
			}

			document.addEventListener('mousedown', onDetectClick, { passive: true })
			document.addEventListener('touchstart', onDetectClick, { passive: true })

			return () => {
				document.removeEventListener('mousedown', onDetectClick)
				document.removeEventListener('touchstart', onDetectClick)
			}
		}
	}, [disabled, componentRef])

	return { isInsideComponent }
}

export default useComponent
