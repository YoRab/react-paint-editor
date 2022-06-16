# known issues :

## To resolve before beta release

- Text tool broken since 0.2.2
- double click not working with touch (fix: fake it counting delay between touch)
- selected style not saved when changing tool (since presets)

## mobile/touch

- dnd layout on mobile not working (fix : use dnd lib, or add touch listener to fake dnd, or provide alt UI)

## other

- TextEdit cursor overflow MINOR (quick fix : edit on modale ?)
- TextEdit copy/paste containing html breaks display
- circle resizing only goes one direction
- New text component opacity range is dancing
- adding padding to selection result in wrong intersection calculs
