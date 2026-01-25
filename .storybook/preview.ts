import type { Preview } from '@storybook/react-vite'
import './preview.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    },
    options: {
      storySort: {
        order: ['Welcome', 'Getting Started', 'React Paint', 'Main']
      }
    }
  },

  tags: ['autodocs']
}

export default preview
