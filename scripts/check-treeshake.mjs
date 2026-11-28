// Checks that the editor module is tree-shaken from consumer bundles that do not use it.
// It bundles small entry files importing the built library (run `pnpm build` first) and looks for editor code.
import { bundleApps } from './lib/bundle.mjs'

const EDITOR_MARKER = 'react-paint-editor-'

const scenarios = [
  { name: 'root entry, canvas only', from: 'react-paint.js', imports: 'Canvas, useReactPaint', expectEditor: false },
  { name: 'canvas entry', from: 'canvas/index.js', imports: 'Canvas, useReactPaint', expectEditor: false },
  { name: 'root entry, with editor (control)', from: 'react-paint.js', imports: 'Canvas, Editor, useReactPaint', expectEditor: true }
]

let failures = 0
const codes = await bundleApps(scenarios)
scenarios.forEach(({ name, expectEditor }, index) => {
  const code = codes[index]
  const hasEditor = code.includes(EDITOR_MARKER)
  const ok = hasEditor === expectEditor
  if (!ok) failures++
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: ${(code.length / 1024).toFixed(1)} kB, editor code ${hasEditor ? 'present' : 'absent'}`)
})

if (failures) {
  console.error(`${failures} tree-shaking check(s) failed`)
  process.exit(1)
}
