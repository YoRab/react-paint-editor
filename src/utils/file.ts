import Ajv from 'ajv'
import _ from 'lodash/fp'
import schema from 'schemas/drawableShape.json'
import { DrawableShape, DrawableShapeJson, ShapeEnum } from 'types/Shapes'

export const fetchAndStringify = (url: string) => {
  return fetch(url)
    .then(response => response.blob())
    .then(myBlob => URL.createObjectURL(myBlob))
}

export const downloadFile = (content: string, fileName: string) => {
  const a = document.createElement('a')
  a.href = content
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

const getBase64Image = (img: HTMLImageElement) => {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(img, 0, 0)
  const dataURL = canvas.toDataURL('image/png')
  return dataURL
}

const encodeObjectToString = (objectToEncode: unknown) => {
  return 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(objectToEncode))
}

export const getCanvasImage = (canvas: HTMLCanvasElement) => {
  return canvas.toDataURL('image/png')
}

export const encodePicturesInShapes = (shapes: DrawableShape[]) => {
  return shapes.map(shape => {
    if (shape.type === ShapeEnum.picture) {
      if (shape.src.startsWith('http')) {
        return _.omit('img', shape)
      } else {
        return {
          ...shape,
          src: getBase64Image(shape.img),
          img: undefined
        }
      }
    }
    return shape
  })
}
export const encodeShapesInString = (shapes: DrawableShape[]) => {
  const shapesWithStringifyPictures = encodePicturesInShapes(shapes)
  return encodeObjectToString(shapesWithStringifyPictures)
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

export const decodePicturesInShapes = async (shapesForJson: DrawableShapeJson[]) => {
  const promisesArray: Promise<void>[] = []

  const shapes: DrawableShape[] = shapesForJson.map(shape => {
    if (shape.type === ShapeEnum.picture) {
      const img = new Image()
      const newPromise = new Promise<void>((resolve, reject) => {
        img.onload = () => {
          resolve()
        }

        img.onerror = () => {
          reject(new Error('Some images could not be loaded'))
        }
      })
      promisesArray.push(newPromise)

      if (shape.src.startsWith('http')) {
        fetchAndStringify(shape.src)
          .then(picData => {
            img.src = picData
          })
          .catch(() => {
            img.src = '' // to trigger onerror
          })
      } else {
        img.src = shape.src
      }

      return {
        ...shape,
        img
      }
    }
    return shape
  })

  await Promise.all(promisesArray)
  return shapes
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
