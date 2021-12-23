import Ajv from 'ajv'
import _ from 'lodash/fp'
import schema from 'schemas/drawableShape.json'

export const downloadFile = (content: string, fileName: string) => {
  const a = document.createElement('a')
  a.href = content
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export const encodeJson = (jsonObject: unknown) => {
  return 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(jsonObject))
}

export const decodeJson = async (file: File) => {
  return new Promise<unknown>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = event => {
      const result = event.target?.result
      if (!result) return reject('Impossible de récupérer les données du fichier')
      const json = JSON.parse(result as string)
      resolve(json)
    }
    reader.readAsText(file)
  })
}

export const validateJson = (json: unknown) => {
  const ajv = new Ajv()
  const validate = ajv.compile(schema)
  if (!_.isArray(json)) return false
  for (const shape of json) {
    if (!validate(shape)) return false
  }
  return true
}
