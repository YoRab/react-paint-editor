import type { Message, PartialLocale, PluralMessage } from '@canvas/constants/locale'
import { isRecord } from '@canvas/utils/object'

/** Values of the parameters of a message: the numbers are written in the language of the locale */
export type MessageParams = Record<string, string | number>

const FALLBACK_LANG = 'en'

const PARAMETER = /\{(\w+)\}/g

const supportedLangs = new Map<string, string>()

/** The language itself when Intl knows it, else English: a language given by a consumer never breaks the texts */
const getSupportedLang = (lang: string): string => {
  let supported = supportedLangs.get(lang)
  if (supported === undefined) {
    try {
      supported = Intl.getCanonicalLocales(lang)[0] ?? FALLBACK_LANG
    } catch {
      supported = FALLBACK_LANG
    }
    supportedLangs.set(lang, supported)
  }
  return supported
}

// the formats are built once per language: a message is written for each shape of a description
const pluralRules = new Map<string, Intl.PluralRules>()
const numberFormats = new Map<string, Intl.NumberFormat>()

const getPluralRules = (lang: string): Intl.PluralRules => {
  let rules = pluralRules.get(lang)
  if (!rules) {
    rules = new Intl.PluralRules(getSupportedLang(lang))
    pluralRules.set(lang, rules)
  }
  return rules
}

/** A number written in a language, like 1,5 in French. The options are the ones of Intl.NumberFormat */
export const formatNumber = (value: number, lang: string, options?: Intl.NumberFormatOptions): string => {
  const key = options ? `${lang}|${JSON.stringify(options)}` : lang
  let format = numberFormats.get(key)
  if (!format) {
    format = new Intl.NumberFormat(getSupportedLang(lang), options ?? { maximumFractionDigits: 2 })
    numberFormats.set(key, format)
  }
  return format.format(value)
}

const isPluralMessage = (value: unknown): value is PluralMessage => isRecord(value) && typeof value.other === 'string'

/**
 * Text of a message in a language: the form of a plural message for its {count} parameter, with its {name} parameters
 * replaced. A parameter without value is left as it is
 */
export const formatMessage = (message: Message, params: MessageParams = {}, lang = FALLBACK_LANG): string => {
  let text: string
  if (typeof message === 'string') {
    text = message
  } else {
    const { count } = params
    text = (typeof count === 'number' ? message[getPluralRules(lang).select(count)] : undefined) ?? message.other
  }
  return text.replace(PARAMETER, (parameter, name: string) => {
    const value = params[name]
    if (value === undefined) return parameter
    return typeof value === 'number' ? formatNumber(value, lang) : value
  })
}

/**
 * The locale with the texts of another one in place of its own: the groups of texts are merged, a message is replaced
 * whole, the forms of a plural message too. Returns the locale itself when nothing is replaced
 */
export const mergeLocale = <T extends object>(locale: T, texts: PartialLocale<T> | undefined): T => {
  if (!texts) return locale
  let merged: Record<string, unknown> | undefined
  const base = locale as Record<string, unknown>
  for (const [key, value] of Object.entries(texts)) {
    if (value === undefined) continue
    const current = base[key]
    const next = isRecord(current) && !isPluralMessage(current) && isRecord(value) ? mergeLocale(current, value as PartialLocale<object>) : value
    if (next === current) continue
    merged ??= { ...base }
    merged[key] = next
  }
  return (merged as T | undefined) ?? locale
}
