To regenerate schema :
typescript-json-schema "src/types/Shapes.ts" DrawableShapeJson --out 'src/schemas/drawableShape.json'

known issues :

- mobile/touch

  - dnd layout on mobile not working CRITIC (fix : use dnd lib, or add touch listener to fake dnd, or provide alt UI)
  - double click not working with touch CRITIC (fix: fake it countinng delay between touch)

- canvas resizing

  - TextEdit position and size not working with canvas resized MINOR (fix : apply current canvas ratio to position and font size)
  - anchors become too small MAJOR (possible fix : increase size with current canvas ratio )

- other
  - TextEdit cursor overflow MINOR (quick fix : edit on modale. possible solution : try to use textarea)
  - scaling MINOR (quick fix : disable it. Then, add support for scale)

- Webpack
  - bundle types ?
  - tsc does not resolve svg imports
  - decrease bundle size (remove source-map in prod mode, get rid of styled component)
  - bundle component without html