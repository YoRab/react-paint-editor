import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_DIR = resolve(import.meta.dirname, '../../src')
const STORIES_DIR = resolve(import.meta.dirname, '../../stories')

const MODULES = ['canvas', 'editor'] as const

type Module = (typeof MODULES)[number] | 'root'

// Another module is only reached through its public entry
const PUBLIC_ENTRIES: Record<Module, string> = {
  canvas: join(SRC_DIR, 'canvas', 'index'),
  editor: join(SRC_DIR, 'editor', 'index'),
  root: join(SRC_DIR, 'index')
}

// The canvas stands alone, the editor is built like a custom editor and a story uses the library like an application
const ALLOWED_DEPENDENCIES: Record<Module | 'stories', Module[]> = {
  canvas: [],
  editor: ['canvas'],
  root: ['canvas', 'editor'],
  stories: ['root']
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
  return MODULES.find(module => module === firstSegment) ?? 'root'
}

// Absolute path of an import inside src, from a tsconfig alias (@canvas/*, @editor/*) or a relative path
const resolveImport = (importPath: string, fromFile: string): string | undefined => {
  if (MODULES.some(module => importPath.startsWith(`@${module}/`))) return join(SRC_DIR, importPath.slice(1))
  const target = importPath.startsWith('.') ? resolve(dirname(fromFile), importPath) : undefined
  return target?.startsWith(SRC_DIR) ? target : undefined
}

const getImports = (content: string) => [...content.matchAll(IMPORT_REGEX)].map(match => match[1] ?? match[2] ?? match[3]!)

const getForbiddenImports = (file: string, consumer: Module | 'stories') =>
  getImports(readFileSync(file, 'utf8')).filter(importPath => {
    const target = resolveImport(importPath, file)
    if (target === undefined) return false
    const targetModule = getModule(target)
    if (targetModule === consumer) return false
    return !ALLOWED_DEPENDENCIES[consumer].includes(targetModule) || target !== PUBLIC_ENTRIES[targetModule]
  })

describe('module boundaries', () => {
  const files = listSourceFiles(SRC_DIR)

  it.each(files.map(file => [relative(SRC_DIR, file), file]))('%s only imports allowed modules', (_name, file) => {
    expect(getForbiddenImports(file, getModule(file))).toEqual([])
  })

  it('has no module shared by the canvas and the editor', () => {
    // besides the two modules, src only holds the root entry point and ambient declarations
    const rootFiles = files.filter(file => getModule(file) === 'root').map(file => relative(SRC_DIR, file))
    expect(rootFiles.filter(file => file !== 'index.ts' && !file.endsWith('.d.ts'))).toEqual([])
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

describe('stories', () => {
  const files = listSourceFiles(STORIES_DIR)

  it.each(files.map(file => [relative(STORIES_DIR, file), file]))('%s only imports the root entry point of the library', (_name, file) => {
    expect(getForbiddenImports(file, 'stories')).toEqual([])
  })
})
