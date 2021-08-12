import _ from 'lodash/fp'
import { ReactNode } from 'react'

interface LodashMap extends _.LodashMap {
  convert: (params: { cap: false }) => (a: unknown, b: unknown) => ReactNode
}

const map = _.map as LodashMap

export default map
