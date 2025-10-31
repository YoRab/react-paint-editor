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
    )
    .then(outStr => fs.promises.writeFile(fileName, outStr))
}
await execp('cp -r declarationfiles/. dist')
