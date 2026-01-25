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
        order: [
          'Welcome',
          'Getting Started',
          'API Reference',
          'React Paint',
          ['Playground', 'Canvas', 'Dynamic updates', ['Default', 'LoadedFromJSON', 'ViewerMode'], 'Whiteboard', 'Picture annotation'],
          'Main'
        ]
      }
    }
  },

  tags: ['autodocs']
}

export default preview
