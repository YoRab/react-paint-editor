// Bundles of apps importing the built library (run `pnpm build` first), made with Vite as an app would, React left out.
// Shared by the checks of the build: scripts/check-treeshake.mjs and scripts/bundle-size.mjs
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'vite'

/** The built library, with forward slashes, as the bundles import it */
export const DIST_DIR = resolve(import.meta.dirname, '../../dist').replaceAll('\\', '/')

/** The code of the chunks of the bundle of an entry file */
const bundle = async (workDir, entry, minify) => {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    root: workDir,
    build: {
      write: false,
      // minified by Rolldown only: the minify of Vite keeps the whitespace of an ES library, unlike the build of an app
      minify: false,
      lib: { entry, formats: ['es'], fileName: 'bundle' },
      rolldownOptions: { external: ['react', 'react/jsx-runtime', 'react-dom'], output: { minify } }
    }
  })
  return (Array.isArray(result) ? result : [result])
    .flatMap(output => output.output)
    .filter(file => file.type === 'chunk')
    .map(file => file.code)
    .join('\n')
}

/**
 * The code of the bundle of each app, which imports `imports` from the file `from` of the built library, like
 * `{ from: 'react-paint.js', imports: 'Canvas, useReactPaint' }`
 * @param {{ from: string, imports: string }[]} apps
 * @param {{ minify?: boolean }} [options] `minify` minifies the bundles, as an app built for production
 * @returns {Promise<string[]>}
 */
export const bundleApps = async (apps, { minify = false } = {}) => {
  const workDir = mkdtempSync(join(tmpdir(), 'react-paint-bundle-'))
  try {
    return await Promise.all(
      apps.map(({ from, imports }, index) => {
        const entry = join(workDir, `app${index}.js`)
        writeFileSync(entry, `export { ${imports} } from '${DIST_DIR}/${from}'\n`)
        return bundle(workDir, entry, minify)
      })
    )
  } finally {
    rmSync(workDir, { recursive: true, force: true })
  }
}
