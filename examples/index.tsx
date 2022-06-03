import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Examples from './Examples'

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const container = document.getElementById('root')!
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
const root = createRoot(container)

root.render(
  <React.StrictMode>
    <Examples />
  </React.StrictMode>
)
