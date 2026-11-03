import { SNACKBAR_DURATION, SNACKBAR_TOGGLE_ANIMATION_DURATION } from '@editor/constants/snackbar'
import { STYLE_ZINDEX } from '@editor/constants/style'
import type { SnackBarType } from '@editor/types/snackbar'
import { useEffect, useState } from 'react'
import './Snackbar.css'

type SnackbarContainerType = {
  snackbarList: SnackBarType[]
  removeSnackbar: (id: string) => void
}

type SnackbarProps = SnackBarType & { removeSnackbar: (id: string) => void }

/**
 * A message shown for its duration, then removed: the pointer or the focus on it keeps it, its duration starting again
 * once they leave it. Its button removes it at once
 */
const Snackbar = ({ id, type, text, duration, removeSnackbar }: SnackbarProps) => {
  const [isShown, setIsShown] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const timeoutShowId = setTimeout(() => setIsShown(true), SNACKBAR_TOGGLE_ANIMATION_DURATION)
    return () => clearTimeout(timeoutShowId)
  }, [])

  useEffect(() => {
    if (isPaused) return
    const timeoutHideId = setTimeout(() => setIsShown(false), duration - SNACKBAR_DURATION - SNACKBAR_TOGGLE_ANIMATION_DURATION)
    const timeoutRemoveId = setTimeout(() => removeSnackbar(id), duration)
    return () => {
      clearTimeout(timeoutHideId)
      clearTimeout(timeoutRemoveId)
    }
  }, [isPaused, duration, id, removeSnackbar])

  const pause = () => {
    setIsPaused(true)
    setIsShown(true)
  }

  const resume = () => setIsPaused(false)

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the hover and the focus only keep the message, they are not an action
    <div
      className='react-paint-editor-snackbar'
      data-is-shown={+isShown}
      data-type={type}
      style={{ '--react-paint-editor-panel-transition-duration': `${SNACKBAR_DURATION}ms` }}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      {text}
      <button type='button' className='react-paint-editor-snackbar-close' title='Fermer' aria-label='Fermer' onClick={() => removeSnackbar(id)}>
        ×
      </button>
    </div>
  )
}

/** The messages of the editor, read by the assistive technologies from this live region */
const SnackbarContainer = ({ snackbarList, removeSnackbar }: SnackbarContainerType) => {
  return (
    <div className='react-paint-editor-snackbar-container' role='status' style={{ '--react-paint-editor-snackbar-zindex': STYLE_ZINDEX.SNACKBAR }}>
      {snackbarList.map(snackbar => (
        <Snackbar key={snackbar.id} {...snackbar} removeSnackbar={removeSnackbar} />
      ))}
    </div>
  )
}

export default SnackbarContainer
