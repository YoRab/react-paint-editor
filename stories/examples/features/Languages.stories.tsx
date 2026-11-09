import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Canvas, type CanvasLocale, Editor, type EditorLocale, type PartialLocale, useReactPaint } from '../../../src/index'
import { TREE_AND_CLOUDS } from '../../fixture'
import { FR_LOCALE } from '../../locales/fr'
import { EditorExample } from '../EditorExample'

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

// a canvas without editor takes its own locale
const CANVAS_FR: CanvasLocale = { lang: FR_LOCALE.lang, canvas: FR_LOCALE.canvas }

const CanvasAlone = () => {
  const paint = useReactPaint({ shapes: TREE_AND_CLOUDS })
  return <Canvas paint={paint} options={{ locale: CANVAS_FR }} />
}

const meta = {
  title: 'Features/Languages',
  component: Languages,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'The canvas and the editor are in English, and every one of their texts can be translated with the `locale` option: a complete translation, some texts to replace, or the texts of a canvas used without the editor.'
      }
    }
  },
  tags: ['autodocs', '!dev'],
  argTypes: {
    language: { control: 'radio', options: Object.keys(LANGUAGES) }
  }
} satisfies Meta<typeof Languages>

export default meta
type Story = StoryObj<typeof meta>

export const CompleteTranslation: Story = {
  args: { language: 'fr' },
  parameters: {
    docs: {
      description: {
        story:
          'A complete translation, here in French: every text of the editor and of the canvas inside it is replaced, from the buttons to the announcements read by the screen readers. Switch between English and French with the radio buttons. TypeScript lists the texts a translation misses when it is typed `EditorLocale`.'
      },
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

export const SomeTextsReplaced: StoryObj<typeof EditorExample> = {
  render: () => <EditorExample shapes={TREE_AND_CLOUDS} editorOptions={{ locale: PIRATE_TEXTS }} />,
  parameters: {
    docs: {
      description: {
        story:
          'No need to translate everything to change a few texts: a partial `locale` is merged into the English ones. Here, the rectangle tool becomes "Treasure chest" and the brush "Quill": hover over them in the toolbar, then draw a rectangle and open the layers panel to see its new name. The announcement read when a shape is added is changed too, with its singular and plural forms.'
      },
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

export const CanvasAloneTranslated: StoryObj<typeof CanvasAlone> = {
  render: () => <CanvasAlone />,
  parameters: {
    docs: {
      description: {
        story:
          'The canvas has texts of its own, apart from the editor: its accessible name and description, the names of the shapes, the hint to move the focus onto it. Used without the `Editor`, it takes them from its own `locale` option, which needs only the `canvas` part of a translation. Press Tab to reach the canvas: its hint appears in French. The rest of the translation is for the assistive technologies, which read the drawing in French.'
      },
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
