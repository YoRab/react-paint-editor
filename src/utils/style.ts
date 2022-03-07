import { ShapeEnum } from 'types/Shapes'
import {
  brushIcon,
  circleIcon,
  ellipseIcon,
  lineIcon,
  pictureIcon,
  polygonIcon,
  squareIcon,
  textIcon
} from 'constants/icons'

export const getShapePicture = (shape: ShapeEnum) => {
  switch (shape) {
    case ShapeEnum.brush:
      return brushIcon
    case ShapeEnum.line:
      return lineIcon
    case ShapeEnum.polygon:
      return polygonIcon
    case ShapeEnum.rect:
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