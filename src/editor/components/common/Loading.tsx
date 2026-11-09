import { LOADING_TRANSITION_DURATION } from '@editor/constants/loading'
import { STYLE_ZINDEX } from '@editor/constants/style'
import useEditorLocale from '@editor/hooks/useEditorLocale'
import { useEffect, useState } from 'react'
import './Loading.css'

export type LoadingType = {
  isLoading: boolean
}

const Loading = ({ isLoading = false }: LoadingType) => {
  const [loadingState, setLoadingState] = useState<'hidden' | 'visible' | 'fadeOut'>('hidden')
  const { lang, editor } = useEditorLocale()
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
      role='status'
      aria-label={editor.common.loading}
      lang={lang}
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
