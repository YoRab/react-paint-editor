// The Vite plugin which serves the library measured by the benchmark and by the micro-benchmarks, shared by their configs
import { join, resolve } from 'node:path'

const toModulePath = path => `${resolve(path, 'src').replaceAll('\\', '/')}/`

/**
 * Serves the library measured: the copy of a version made by `pnpm bench:compare` in the folder `source`, in place of the
 * library of the working tree, whatever the path which imports it. The imports of the copy itself are resolved with its
 * own tsconfig files, the nearest ones
 * @param {string} source
 * @returns {import('vite').Plugin}
 */
export const measuredLibrary = source => {
  const workingTree = toModulePath('.').toLowerCase()
  const copy = toModulePath(source)
  return {
    name: 'perf-measured-library',
    enforce: 'pre',
    // the cache of the modules of Vitest on disk keeps the files run in Node with their imports resolved, whatever this
    // plugin serves: each copy keeps its own cache, else a run would import the copy of the run before
    config: () => ({ test: { fsModuleCachePath: join(resolve(source), '.vitest-cache') } }),
    async resolveId(id, importer, options) {
      const resolved = await this.resolve(id, importer, { ...options, skipSelf: true })
      const path = resolved?.id.replaceAll('\\', '/')
      return path?.toLowerCase().startsWith(workingTree) ? copy + path.slice(workingTree.length) : null
    }
  }
}
