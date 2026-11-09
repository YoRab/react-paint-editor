import { addons } from 'storybook/manager-api'

// Tests: a top-level group of the sidebar, collapsed by default
addons.setConfig({
  sidebar: {
    collapsedRoots: ['tests']
  }
})
