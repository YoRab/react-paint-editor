import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Canvas, type CanvasLocale, Editor, type EditorLocale, type PartialLocale, useReactPaint } from '../src/index'
import { TREE_AND_CLOUDS } from './fixture'
import { FR_LOCALE } from './locales/fr'

const LANGUAGES = {
  en: { label: 'English', locale: undefined },
  fr: { label: 'Français', locale: FR_LOCALE }
} satisfies Record<string, { label: string; locale: EditorLocale | undefined }>

type Language = keyof typeof LANGUAGES

/** The editor in English, its default language, or in French with the translation of the stories */
const Languages = ({ language: initialLanguage = 'fr' }: { language?: Language }) => {
  const paint = useReactPaint({ shapes: TREE_AND_CLOUDS })
  const [language, setLanguage] = useState<Language>(initialLanguage)
  return (
    <div>
      <fieldset style={{ marginBottom: 8 }}>
        <legend>Language</legend>
        {(Object.keys(LANGUAGES) as Language[]).map(key => (
          <label key={key} style={{ marginRight: 16 }} lang={key}>
            <input type='radio' name='language' checked={language === key} onChange={() => setLanguage(key)} />
            {LANGUAGES[key].label}
          </label>
        ))}
      </fieldset>
      <Editor paint={paint} options={{ locale: LANGUAGES[language].locale }}>
        <Canvas paint={paint} />
      </Editor>
    </div>
  )
}

// a few texts replaced, the other ones staying in English
const PIRATE_TEXTS: PartialLocale<EditorLocale> = {
  canvas: { shapeTypes: { rect: 'Treasure chest' } },
  editor: {
    tools: { rect: 'Treasure chest', brush: 'Quill' },
    announcements: { addedCount: { one: '{count} treasure buried', other: '{count} treasures buried' } }
  }
}

const PartialTexts = () => {
  const paint = useReactPaint({ shapes: TREE_AND_CLOUDS })
  return (
    <Editor paint={paint} options={{ locale: PIRATE_TEXTS }}>
      <Canvas paint={paint} />
    </Editor>
  )
}

// a canvas without editor takes its own locale
const CANVAS_FR: CanvasLocale = { lang: FR_LOCALE.lang, canvas: FR_LOCALE.canvas }

const CanvasAlone = () => {
  const paint = useReactPaint({ shapes: TREE_AND_CLOUDS })
  return <Canvas paint={paint} options={{ locale: CANVAS_FR }} />
}

const meta = {
  title: 'React Paint/Languages',
  component: Languages,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  argTypes: {
    language: { control: 'radio', options: Object.keys(LANGUAGES) }
  }
} satisfies Meta<typeof Languages>

export default meta
type Story = StoryObj<typeof meta>

export const French: Story = {
  args: { language: 'fr' },
  parameters: {
    docs: {
      source: {
        code: `import { Canvas, Editor, type EditorLocale, useReactPaint } from '@yorab/react-paint'

// a complete translation: TypeScript lists the texts it misses.
// The French one of the stories is in stories/locales/fr.ts
const FR_LOCALE: EditorLocale = {
  lang: 'fr',
  canvas: { canvas: 'Dessin', /* ... */ },
  editor: { tools: { selection: 'Sélection', /* ... */ }, /* ... */ }
}

const App = () => {
  const paint = useReactPaint()
  return (
    // the editor gives the canvas part of its locale to the canvas inside it
    <Editor paint={paint} options={{ locale: FR_LOCALE }}>
      <Canvas paint={paint} />
    </Editor>
  )
}`,
        language: 'tsx'
      }
    }
  }
}

export const Partial: StoryObj<typeof PartialTexts> = {
  render: () => <PartialTexts />,
  parameters: {
    docs: {
      source: {
        code: `import { Canvas, Editor, type EditorLocale, type PartialLocale, useReactPaint } from '@yorab/react-paint'

// some texts replaced, merged into the English ones
const TEXTS: PartialLocale<EditorLocale> = {
  canvas: { shapeTypes: { rect: 'Treasure chest' } },
  editor: {
    tools: { rect: 'Treasure chest', brush: 'Quill' },
    // a plural message gives all its forms
    announcements: { addedCount: { one: '{count} treasure buried', other: '{count} treasures buried' } }
  }
}

const App = () => {
  const paint = useReactPaint()
  return (
    <Editor paint={paint} options={{ locale: TEXTS }}>
      <Canvas paint={paint} />
    </Editor>
  )
}`,
        language: 'tsx'
      }
    }
  }
}

export const CanvasWithoutEditor: StoryObj<typeof CanvasAlone> = {
  render: () => <CanvasAlone />,
  parameters: {
    docs: {
      source: {
        code: `import { Canvas, type CanvasLocale, useReactPaint } from '@yorab/react-paint'

const CANVAS_FR: CanvasLocale = { lang: 'fr', canvas: { canvas: 'Dessin', /* ... */ } }

const App = () => {
  const paint = useReactPaint()
  return <Canvas paint={paint} options={{ locale: CANVAS_FR }} />
}`,
        language: 'tsx'
      }
    }
  }
}
