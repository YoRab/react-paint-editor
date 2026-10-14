import { exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import util from 'node:util'

const execp = util.promisify(exec)

const getDirectoryFileNames = directory => {
  const fileNames = []
  const filesInDirectory = fs.readdirSync(directory)
  for (const fileName of filesInDirectory) {
    const absolute = path.join(directory, fileName)
    if (fs.statSync(absolute).isDirectory()) {
      fileNames.push(...getDirectoryFileNames(absolute))
    } else {
      fileNames.push(absolute)
    }
  }
  return fileNames
}

// node16 / nodenext resolutions require explicit extensions and do not resolve directories
const addExtension = (fileName, specifier) => {
  if (/\.(js|css)$/.test(specifier)) return specifier
  const target = path.resolve(path.dirname(fileName), specifier)
  if (fs.existsSync(`${target}.d.ts`)) return `${specifier}.js`
  if (fs.existsSync(path.join(target, 'index.d.ts'))) return `${specifier}/index.js`
  return specifier
}

const fileNames = getDirectoryFileNames('./declarationfiles')
for (const fileName of fileNames) {
  await fs.promises
    .readFile(fileName, 'utf8')
    .then(str =>
      str // declarationfiles/index.ts will be resolved to '..' so we always remove the first dot
        .replace(
          /@(editor|common|canvas)/g,
          (_match, group) => `${path.join(path.relative(fileName, 'declarationfiles'), group).slice(1).split(path.sep).join('/')}`
        )
        // css side effect imports are kept by tsc but can not be resolved by type checkers
        .replace(/^import\s+['"][^'"]+\.css['"];?\r?\n/gm, '')
        .replace(
          /(from\s+['"]|import\(\s*['"])(\.{1,2}\/[^'"]*)(['"])/g,
          (_match, before, specifier, after) => `${before}${addExtension(fileName, specifier)}${after}`
        )
    )
    .then(outStr => fs.promises.writeFile(fileName, outStr))
}
await execp('cp -r declarationfiles/. dist')
