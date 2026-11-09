import { type CanvasLocale, DEFAULT_CANVAS_LOCALE, type PartialLocale } from '@canvas/constants/locale'
import { mergeLocale } from '@canvas/utils/locale'
import { createContext, type ReactNode, useContext, useMemo } from 'react'

const LocaleContext = createContext<CanvasLocale>(DEFAULT_CANVAS_LOCALE)

/**
 * The locale with some texts replaced, kept while they read the same: texts written inline, or loaded again, give the same
 * locale, and the canvas does not describe its shapes again
 */
export const useMergedLocale = <T extends object>(locale: T, texts: PartialLocale<T> | undefined): T => {
  const textsKey = texts ? JSON.stringify(texts) : undefined
  return useMemo(() => (textsKey ? mergeLocale(locale, JSON.parse(textsKey) as PartialLocale<T>) : locale), [locale, textsKey])
}

/**
 * Gives the texts of the canvases below, merged into the ones of the closest provider, in English by default. The Editor
 * component provides the canvas part of its locale
 */
export const CanvasLocaleProvider = ({ locale, children }: { locale: PartialLocale<CanvasLocale> | undefined; children?: ReactNode }) => {
  const merged = useMergedLocale(useContext(LocaleContext), locale)
  return <LocaleContext.Provider value={merged}>{children}</LocaleContext.Provider>
}

/** Returns the locale of the canvas given by the closest CanvasLocaleProvider or Editor, in English without one */
export const useCanvasLocale = (): CanvasLocale => useContext(LocaleContext)
