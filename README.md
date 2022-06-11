# known issues :

## critical

- anchors become too small MAJOR (possible fix : increase size with current canvas ratio )

- Text tool broken since 0.2.2
- double click not working with touch (fix: fake it countinng delay between touch)

## mobile/touch

- dnd layout on mobile not working (fix : use dnd lib, or add touch listener to fake dnd, or provide alt UI)

## other

- TextEdit cursor overflow MINOR (quick fix : edit on modale)
- TextEdit copy/paste contains html and breaks display
- circle resizing only goes one direction
