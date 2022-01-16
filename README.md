To regenerate schema :
typescript-json-schema "src/types/Shapes.ts" DrawableShapeJson --out 'src/schemas/drawableShape.json'

known issues :

- mobile/touch

  - dnd layout on mobile not working (fix : use dnd lib, or add touch listener to fake dnd, or provide alt UI)
  - double click not working with touch (fix: fake it countinng delay between touch)

- canvas resizing

  - TextEdit position and size not working with canvas resized (fix : apply current canvas ratio to position and font size)
  - anchors become too small (possible fix : increase size with current canvas ratio )

- other
  - TextEdit cursor overflow (quick fix : edit on modale. possible solution : try to use textarea)
  - scaling (quick fix : disable it. Then, add support for scale)
