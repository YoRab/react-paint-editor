import { ShapeEnum } from 'types/Shapes'
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
} from 'constants/icons'

export const getShapePicture = (shape: ShapeEnum) => {
  switch (shape) {
    case ShapeEnum.brush:
      return brushIcon
    case ShapeEnum.line:
      return arrowIcon
    case ShapeEnum.polygon:
      return polygonIcon
    case ShapeEnum.curve:
      return curveIcon
    case ShapeEnum.rect:
      return recIcon
    case ShapeEnum.square:
      return squareIcon
    case ShapeEnum.circle:
      return circleIcon
    case ShapeEnum.ellipse:
      return ellipseIcon
    case ShapeEnum.text:
      return textIcon
    case ShapeEnum.picture:
      return pictureIcon
  }
}
