// Checks that the editor module is tree-shaken from consumer bundles that do not use it.
// It bundles small entry files importing the built library (run `pnpm build` first) and looks for editor code.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { build } from 'vite'

const DIST_DIR = resolve(import.meta.dirname, '../dist')
  .split(sep)
  .join('/')
const EDITOR_MARKER = 'react-paint-editor-'

const bundle = async (workDir, name, code) => {
  const entry = join(workDir, `${name}.js`)
  writeFileSync(entry, code)
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    root: workDir,
    build: {
      write: false,
      minify: false,
      lib: { entry, formats: ['es'], fileName: 'bundle' },
      rolldownOptions: { external: ['react', 'react/jsx-runtime', 'react-dom'] }
    }
  })
  return (Array.isArray(result) ? result : [result])
    .flatMap(output => output.output)
    .filter(file => file.type === 'chunk')
    .map(file => file.code)
    .join('\n')
}

const scenarios = [
  { name: 'root entry, canvas only', from: 'react-paint.js', imports: 'Canvas, useReactPaint', expectEditor: false },
  { name: 'canvas entry', from: 'canvas/index.js', imports: 'Canvas, useReactPaint', expectEditor: false },
  { name: 'root entry, with editor (control)', from: 'react-paint.js', imports: 'Canvas, Editor, useReactPaint', expectEditor: true }
]

const workDir = mkdtempSync(join(tmpdir(), 'react-paint-treeshake-'))
let failures = 0
try {
  const codes = await Promise.all(
    scenarios.map(({ from, imports }, index) => bundle(workDir, `entry${index}`, `export { ${imports} } from '${DIST_DIR}/${from}'\n`))
  )
  scenarios.forEach(({ name, expectEditor }, index) => {
    const code = codes[index]
    const hasEditor = code.includes(EDITOR_MARKER)
    const ok = hasEditor === expectEditor
    if (!ok) failures++
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: ${(code.length / 1024).toFixed(1)} kB, editor code ${hasEditor ? 'present' : 'absent'}`)
  })
} finally {
  rmSync(workDir, { recursive: true, force: true })
}

if (failures) {
  console.error(`${failures} tree-shaking check(s) failed`)
  process.exit(1)
}
