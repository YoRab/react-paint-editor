import type { ShapeType } from '../types/Shapes'
import {
  brushIcon,
  circleIcon,
  ellipseIcon,
  arrowIcon,
  pictureIcon,
  polygonIcon,
  curveIcon,
  squareIcon,
  recIcon,
  textIcon
} from '../constants/icons'

export const getShapePicture = (shape: ShapeType) => {
  switch (shape) {
    case 'brush':
      return brushIcon
    case 'line':
      return arrowIcon
    case 'polygon':
      return polygonIcon
    case 'curve':
      return curveIcon
    case 'rect':
      return squareIcon // temporary
    case 'square':
      return squareIcon
    case 'circle':
      return circleIcon
    case 'ellipse':
      return circleIcon // temporary
    case 'text':
      return textIcon
    case 'picture':
      return pictureIcon
  }
}
