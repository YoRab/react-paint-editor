import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_DIR = resolve(import.meta.dirname, '../../src')

type Module = 'canvas' | 'editor' | 'common' | 'root'

const FORBIDDEN_DEPENDENCIES: Record<Module, Module[]> = {
  common: ['canvas', 'editor'],
  canvas: ['editor'],
  editor: ['canvas'],
  root: []
}

const ALIASES: Record<string, Module> = {
  '@canvas/': 'canvas',
  '@editor/': 'editor',
  '@common/': 'common'
}

const IMPORT_REGEX = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g

const listSourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap(fileName => {
    const absolutePath = join(directory, fileName)
    if (statSync(absolutePath).isDirectory()) return listSourceFiles(absolutePath)
    return /\.tsx?$/.test(fileName) ? [absolutePath] : []
  })

const getModule = (absolutePath: string): Module => {
  const [firstSegment] = relative(SRC_DIR, absolutePath).split(sep)
  return firstSegment === 'canvas' || firstSegment === 'editor' || firstSegment === 'common' ? firstSegment : 'root'
}

const getImportedModule = (importPath: string, fromFile: string): Module | undefined => {
  const alias = Object.keys(ALIASES).find(prefix => importPath.startsWith(prefix))
  if (alias) return ALIASES[alias]
  if (importPath.startsWith('.')) {
    const target = resolve(dirname(fromFile), importPath)
    return target.startsWith(SRC_DIR) ? getModule(target) : undefined
  }
  return undefined
}

const getImports = (content: string) => [...content.matchAll(IMPORT_REGEX)].map(match => match[1] ?? match[2] ?? match[3]!)

describe('module boundaries', () => {
  const files = listSourceFiles(SRC_DIR)

  it.each(files.map(file => [relative(SRC_DIR, file), file]))('%s only imports allowed modules', (_name, file) => {
    const fileModule = getModule(file)
    const violations = getImports(readFileSync(file, 'utf8')).filter(importPath => {
      const importedModule = getImportedModule(importPath, file)
      return importedModule !== undefined && FORBIDDEN_DEPENDENCIES[fileModule].includes(importedModule)
    })
    expect(violations).toEqual([])
  })

  it('root entry point only contains re-exports', () => {
    const content = readFileSync(join(SRC_DIR, 'index.ts'), 'utf8')
    const statements = content
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split(/(?<=['"])\s*\n/)
      .map(statement => statement.trim())
      .filter(Boolean)

    expect(statements.length).toBeGreaterThan(0)
    for (const statement of statements) {
      expect(statement).toMatch(/^export\s(type\s)?(\{[\s\S]*\}|\*)\sfrom\s['"]\.\/(canvas|editor)\/index['"]$/)
    }
  })
})
