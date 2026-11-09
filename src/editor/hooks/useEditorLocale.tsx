import { CanvasLocaleProvider, formatMessage, type Message, type MessageParams, type PartialLocale, useMergedLocale } from '@canvas/index'
import { DEFAULT_EDITOR_LOCALE, type EditorLocale } from '@editor/constants/locale'
import { createContext, type ReactNode, useContext, useMemo } from 'react'

/** The locale of the editor, with its messages written in its language */
export type EditorLocaleValue = EditorLocale & {
  /** Text of a message with its parameters, in the language of the locale */
  format: (message: Message, params?: MessageParams) => string
}

const withFormat = (locale: EditorLocale): EditorLocaleValue => ({
  ...locale,
  format: (message, params) => formatMessage(message, params, locale.lang)
})

const DEFAULT_LOCALE_VALUE = withFormat(DEFAULT_EDITOR_LOCALE)

const EditorLocaleContext = createContext<EditorLocaleValue>(DEFAULT_LOCALE_VALUE)

/** The texts given to the editor merged into the English ones, compared by value: texts written inline give the same locale */
export const useResolvedEditorLocale = (texts: PartialLocale<EditorLocale> | undefined): EditorLocaleValue => {
  const merged = useMergedLocale(DEFAULT_EDITOR_LOCALE, texts)
  return useMemo(() => (merged === DEFAULT_EDITOR_LOCALE ? DEFAULT_LOCALE_VALUE : withFormat(merged)), [merged])
}

/** Gives the texts of the editor to its components, and the canvas part to the canvases inside it */
export const EditorLocaleProvider = ({ locale, children }: { locale: EditorLocaleValue; children?: ReactNode }) => {
  const canvasLocale = useMemo(() => ({ lang: locale.lang, canvas: locale.canvas }), [locale])
  return (
    <EditorLocaleContext.Provider value={locale}>
      <CanvasLocaleProvider locale={canvasLocale}>{children}</CanvasLocaleProvider>
    </EditorLocaleContext.Provider>
  )
}

/** The locale of the closest Editor */
const useEditorLocale = (): EditorLocaleValue => useContext(EditorLocaleContext)

export default useEditorLocale
