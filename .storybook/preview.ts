import type { Preview } from '@storybook/react-vite'
import './preview.css'

const preview: Preview = {
  parameters: {
    a11y: {
      test: 'error'
    },
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
          'Playground',
          'API Reference',
          'Features',
          ['Drawing data', 'Custom tools', 'Resize', 'Languages'],
          'Use cases',
          ['Whiteboard', 'Picture annotation', 'Collaboration'],
          'Custom UI',
          ['Custom editor', 'Programmatic API'],
          'Tests',
          ['Draw', 'Manipulation', 'Layout', 'Accessibility', 'Examples']
        ]
      }
    }
  }
  // no global autodocs: the examples declare it, the tests have no docs page
}

export default preview
