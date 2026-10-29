# Changelog

For more details and links to Pull requests, see [Releases](https://github.com/YoRab/react-paint-editor/releases)

## V1.0.0-beta.2 (unreleased)
- target es2022 instead of es2020. The supported browsers are Chrome and Edge 99+, Firefox 113+ and Safari 17.2+, see the README
- fix the pictures added by actions.addPicture, a drop or the Editor: they get the id and the default style of the picture tool, whose default opacity was ignored and whose id was replaced with the id of the default picture tool
- the settings bar of the Editor goes into its menu according to the settings it shows: the hidden settings of a tool no longer count
- add the joins of the strokes (style.lineJoin: 'round', 'bevel' or 'miter', with a miter limit of 4) to the rectangles, the squares, the polygons and the brushes, and their caps (style.lineCap: 'round', 'butt' or 'square') to the lines, the brushes, the polygons and the curves. Their default tools have both settings, 'round' by default, which the Editor shows in a new "Plus d'options" panel. setShapesStyle leaves them out for the other shapes
- add the long dashes (lineDash 3) and the dashes and dots (lineDash 4) to the line styles, and to the default tools
- the caps of a line are no longer replaced: they were 'butt' with arrows, and 'round' without. A line with arrows and without lineCap now has round caps, under its arrows
- a closed polygon is joined at its first point like at its other corners, instead of having two caps there
- add the rounded corners (style.cornerRadius, in the units of the drawing, 0 by default) to the rectangles, the squares, the pictures and the polygons. A corner is drawn as large as its sides allow (at most half of the smallest side of a rectangle), and keeps its radius when the shape is resized. The ends of an open polygon stay sharp. Their default tools have the setting, which the Editor shows in the "Plus d'options" panel
- fix the shapes given with negative sizes to addShapes, updateShapes or loadData: a box with a negative width or height was never drawn, and a circle or an ellipse with a negative radius made the action fail. Their sizes are made positive, keeping the area the canvas draws: a rect of width -100 at x 300 goes from x 200 to 300
- add a border to the pictures (style.strokeColor and style.lineWidth), drawn over the image. The default picture tool has both settings, without border by default: a picture without strokeColor has no border
- add the alignment of the lines of a text (style.textAlign: 'left', 'center' or 'right', 'left' by default). When the content of a text changes, its box keeps the side of its alignment, or its middle when centered. The default text tool has the setting, shown by the Editor
- add the fontSize setting to the text tool: a new text is drawn at this font size, as wide as its content, instead of 150 wide. It is 36 in the default text tool, from 1 and without upper limit (its max is optional). A text added by addShapes without its size (no width, height or fontSize) takes it too, instead of 36. The Editor shows it in a number field, and changes the font size of the selected texts with updateShapes, their tools keeping it like the style
- add a background to the texts (style.fillColor, transparent by default), which fills their selection frame, their box with the selection padding: they are selected on it, and the fill color of a selection of texts and other shapes changes it. The default text tool has the setting, shown by the Editor like the fill of the other shapes
- add the outline of the letters of a text (style.outlineColor, none by default, and style.outlineWidth, its thickness around the letters, 2 by default, counted in the bounds of the text, like for an export fitted to the shapes), and the lines under and through its lines (style.fontUnderline and style.fontStrikethrough), of the color of the text. The default text tool has these settings: the Editor shows the underline in its settings bar, and the strikethrough and the outline in the "Plus d'options" panel. Its edition box shows them too, the outline needing Chrome 123+ (paint-order) to look the same as on the canvas, the lines under and through the letters keeping their color
- add the line height of the texts (style.lineHeight, in font sizes, 1 by default): like in CSS, the letters are in the middle of their line, and the box of a text is as high as its lines. A new line height keeps the font size, the width and the top of the text. The default text tool has the setting, from 0.5 to 3, which the Editor shows in the "Plus d'options" panel, with the decimals of its step
- add the heads of the ends of the lines and of the open polygons and curves (style.arrowStart and style.arrowEnd: 'none', 'triangle', 'triangleOutline', 'open', 'circle', 'circleOutline', 'diamond', 'diamondOutline' or 'bar', of the color of the stroke, without its dashes, and style.arrowSize, a multiplier of their size, which grows with the width of the stroke). They replace style.lineArrow, which is no longer read (see the migration guide), and the 'triangle' shape type. The stroke stops under a head, and a head is counted in the bounds of its shape, like for an export fitted to the shapes. A head of a curve points from the curve at its length, which is cut under the head. The default line, polygon and curve tools have these settings: the Editor shows the heads in its settings bar, and their size in the "Plus d'options" panel
- add the patterns and the gradients of the fills of the rectangles, the squares, the circles, the ellipses, the polygons and the curves. style.fillPattern ('solid', 'hatch', 'crossHatch' or 'dots') draws lines at 45°, lines across them, or dots, of the fill color, instead of filling the shape: their thickness and their gap grow with the width of the stroke, and they are clicked like a fill. style.fillGradient ('none', 'linear', 'radial' or 'conic') fills the shape, or colors its pattern, from the fill color to style.fillColor2 (white by default, a transparent color fading out the other one), in the box of the shape: along style.fillGradientAngle (in degrees, clockwise, 0 from the left to the right), from the center to the farthest side, or around the center from this angle. The default tools of these shapes have these settings: the Editor shows the pattern in its settings bar, and the gradient, its second color and its angle in the "Plus d'options" panel, the two last ones only when they apply
- add the eraser (ERASER_TOOL) and the laser pointer (LASER_TOOL), selected with actions.selectTool. The stroke of the eraser fades the shapes it crosses, and removes them when it is released, in a single step of the history: the locked and the hidden shapes are kept, and Escape, a pinch or a cancel of the pointer removes nothing. The laser draws a trail over the drawing, smoothed like a 'quadratic' brush, which narrows and fades out in a second (its color and its width are the new canvasLaserColor and canvasLaserWidth options of the Canvas component, '#ff2d2d' and 6 pixels of the screen by default), outside of the drawing, of its history and of its exports. ActionsType gets 'eraser' and 'laser', and the interaction mode of the state their strokes. The Editor shows them in its toolbar with its new withEraser and withLaser options, off by default
- add the eyedropper: actions.pickColor() picks a color of the drawing with the next press on the canvas, which does nothing else, and gives it as '#rrggbb', as it is drawn there (the mix of the shapes seen through each other, without the grid nor the transparency), or 'transparent' where no shape is drawn: the shapes over the point are drawn again on a canvas of one pixel. Escape, a right click, a change of tool, another interaction or another pick cancel it, and the promise gives undefined. The interaction mode of the state is 'eyedropper' meanwhile. The color fields of the Editor have an eyedropper, and share the last 8 custom colors chosen or picked
- the bounds of a curve hold its stroke, like the ones of the other shapes: an export fitted to the shapes no longer cuts it
- a line drawn with the line tool goes from the point where it is pressed to the point where it is released: its first point was the one where it was released
- fix the types of the tools given to useReactPaint: their optional settings, like lineJoin, cornerRadius or fontSize, can be given partially, like the other settings
- the strokeColor of a text is the color of its letters: a text with a transparent strokeColor still draws its background and its outline
- add the updateTool option to updateShapes, like the one of setShapesStyle: the tools of the shapes keep the new values of their settings, like the font size of a text, for the next shapes
- fix the keyboard shortcuts in the fields of a form inside their area, like the URL of a picture in the Editor: the keys, like the backspace, the arrows or Ctrl+A, and the clipboard go to the field instead of removing, moving or selecting the shapes
- the development warning of usePaintState (a selector returning a new value on each call) is tested with import.meta.env.DEV instead of process.env.NODE_ENV: the check is removed from the built bundles, which no longer read the environment variables. It stays active when the sources run (Storybook, tests), but no longer in the bundles of the published package
- fix the flip of shapes turned the same way, which are framed by a turned frame: they jumped instead of being mirrored around the center of their frame.
- the frame of several shapes selected together is a MultiSelection, of type 'multiSelection' instead of 'group' (see the migration guide)
- add the groups of shapes. A shape of type 'group' holds its shapes (shapes, from the foreground), which keep their own positions and rotations in the drawing, and are moved, turned, resized and flipped with it. A group has its own rotation, the one of its frame, its own opacity (style.opacity: its shapes are drawn together, then faded like a single picture), a name, and its own visible, locked and data fields: hidden or locked, its shapes are hidden or locked with it. A group can hold groups. A group left with a single shape, by a removal, the eraser or a new group, is dissolved: the shape takes its place, hidden, locked and faded with it
- add actions.groupShapes(ids), which groups the shapes in a new group, in the place of the shape in front, and returns its id: undefined for less than 2 shapes, or for all the shapes of a group. actions.ungroupShapes(ids) puts the shapes of the groups in their places, losing their names, rotations and data, and returns their ids. The selection of the shapes grouped becomes their group, the one of a group its shapes. canGroup and canUngroup of the state of the context menu tell whether they act on its shapes, and canGroupShapes(shapes, nodes) on any shapes
- on the canvas, a click on a shape of a group selects the group. A double click on a selected group selects its shape under the pointer, one level down: a click then selects among the shapes of this group, until a click outside of it. Escape selects the group holding the selected shapes, one level up, or clears the selection. A locked group is selected as a whole, without anchors. Ctrl+G (Cmd+G on Mac) groups the selected shapes, and Ctrl+Shift+G ungroups them. The frame of a group is drawn when the pointer is over it
- the groups are exported and loaded with their shapes (ExportedGroup). addShapes and loadData accept them (GroupShapeInput: without rotation, a group is turned like its shapes when they are all turned the same way), and updateShapes changes their flags, their data, their name and their opacity (GroupPatch: a name set to undefined is removed). loadData dissolves a group left with a single shape, for instance by a picture which cannot be loaded
- the actions and getShape find the shapes of the groups by their ids. The transformations take the shapes as they are selected: a shape of a group given with the group is left out, and the shapes of a locked group do not change. setShapesStyle sets the opacity of a group, and its other fields on the shapes of the group. duplicateShapes, copy and paste copy a group with its shapes, a copy being inserted in front of its shape, in its group. The order actions move a shape among the shapes of its group, which it never leaves: swapShapes only swaps shapes of the same group. getShapesAt, shapeClicked and shapeHovered give the shapes of the groups, state.interaction.hoveredShape the shape a click selects. dataChanged lists the shapes of the groups too: a group is updated when its own fields or the ids of its shapes change, and the shapes are reordered when one of them changes its group
- add the helpers flattenShapes (all the shapes, each group before its shapes), getShapeLeaves (the shapes drawn, the shapes of the groups in place of the groups), getParentGroup, getSelectedLeaves and getSelectionStyle (the style of a selection as an editor shows it: the fields shared by the shapes it draws, and the opacity of the selected shapes themselves)
- the layers panel of the Editor shows the groups with their shapes indented below, and an arrow to collapse them: a new selection expands the groups holding it. A double click on a group renames it (Enter or a click elsewhere keeps the name, Escape cancels, an empty name removes it), Shift, Ctrl or Cmd + click adds a layer to the selection or removes it, and a layer is only dragged among the shapes of its group. The panel has Group and Ungroup buttons, and the context menu Group and Ungroup entries. The settings bar shows the settings of the shapes of a selected group: their colors and their font size go to its shapes, and its opacity to the group
- removeShapes keeps the other shapes of the selection selected: removing one of them cleared the selection
- getSelectedShapesTools reads the shapes drawn by the selection, the shapes of its groups, and gives their tool itself when they all have the same one: two rectangles selected together give the rectangle tool, instead of a tool of type 'group' with their settings
- fix the context menu of the Editor opened near the bottom of the window, which went 3 pixels beyond it

## V1.0.0-beta.1
Breaking changes, see the [migration guide](./MIGRATION.md).
- split the library into two independent modules, canvas and editor, which only communicate through useReactPaint. The editor is now tree-shaken when unused, even when importing from the package root
- useReactPaint returns a single handle, `paint`, given to Canvas and Editor instead of editorProps and canvasProps. Its identity never changes, and it is a public contract allowing to build a custom editor: actions take shape ids and replace raw setters and internal helpers
- the state lives in an external store: the component calling useReactPaint no longer renders when the drawing changes. Read the state with usePaintState(paint, selector?, isEqual?) and shallowEqual during a render, or paint.getState() in a handler
- add PaintProvider and usePaint to give the handle to deep components, Editor provides it to its children
- the Canvas is the default area of the keyboard shortcuts: paint.scopeRef, formerly refs.setEditor, is only needed to widen it to a custom editor. The shortcuts are listened on this area instead of the document
- the canvas handles the mouse, touch and pen with pointer events listened on the canvas only, instead of the document: the hover works without clicking the canvas first, and a page with many canvases only notifies the one under the pointer
- expose interaction state (hovered shape, selection frame, modifier keys, panning, context menu) in the state
- add canRemoveAnchor to the context menu state, and setShapesVisibility / setShapesLocked actions
- add the drop of image files from the file explorer on the canvas: they are added as pictures, centered on the cursor. It is controlled by the withDropPicture option (true by default, needs the picture tool), and disabled by the withUploadPicture option of the Editor. Add the pictureDropFailed event, and the position option of actions.addPicture
- replace annotationsProps with the useAnnotationsStyle hook
- move resetZoom, setCanvasZoom and setCanvasOffset to actions.resetZoom, actions.setZoom and the new actions.setOffset
- move editor UI options (layersManipulation, withExport, withLoadAndSave, withUploadPicture, withUrlPicture) from useReactPaint to Editor options
- replace DEFAULT_SHAPE_TOOLS (editor) with DEFAULT_TOOLS (canvas), without icons nor labels. useReactPaint from the canvas entry now provides default tools
- define SELECTION_TOOL and MOVE_TOOL once for both modules, without icon nor label: icon and label of ActionsTool become optional
- reduce ActionsType to the tools handled by the canvas, selection and move: the buttons of the editor (undo, redo, clear, export, loadfile, savefile, uploadpicture, addurlpicture) are not part of the API anymore
- named exports for Canvas and Editor in all entry points
- add selectionChanged and toolChanged events, registerEvent and unregisterEvent are typed by event. registerEvent returns the function that unregisters the listener, and events are emitted right after the change of the state
- export getSelectedShapes, getSelectedShapesTools, SELECTION_TOOL and MOVE_TOOL
- add the canvasClicked and canvasDoubleClicked events, emitted for any click on the drawing with the shape under the pointer or undefined, also in viewer mode
- fix the double clicks of the canvas, which edit a text and add a point to a polygon or a curve: the end of a drag or a long press is no longer taken for a click, so a drag soon after a click no longer adds a point, a third click starts a new double click, and the two clicks must be at the same place (a finger may move by 20 pixels). canvasDoubleClicked follows the same rule
- add the pictureLoaded and pictureLoadFailed events: a picture added by addShapes or updateShapes is drawn, or the image of a picture cannot be loaded. A picture of loaded data which cannot be loaded is left out, and the Editor shows an error message
- add paint.toCanvasPosition and paint.toClientPosition, to convert positions between the viewport and the drawing
- expose the options in effect (state.options), whether dropped images are added (state.withDropPicture) and the part of the drawing displayed (state.view.visibleArea) in the state
- export ZOOM_LEVELS, the levels of setZoom between which the zoom stays: the zoom buttons of the Editor are disabled at the first and the last one
- add state.interaction.selectionHover, the part of the selection under the pointer: its inside, the anchor of the rotation, or an anchor of the resize
- fix the hovered shape kept after its removal: its outline stayed drawn, and state.interaction.hoveredShape gave it, until the next move of the mouse. It also follows the changes of its shape
- fix the drag of a selected shape behind a shape covering it: a press in its selection frame selected the shape in front and moved it, it now moves the selection. A click without moving still selects the shape in front, or toggles it in group mode
- the canvas needs no stylesheet anymore: its styles are inline, and react-paint.css only contains the styles of the editor. Its CSS variables can be set on any parent element to override its styles. Add the editor/editor.css stylesheet
- rename react-paint-editor-toolbox-edittextbox class to react-paint-canvas-edittextbox
- fix stale declaration files being published, and css imports in declaration files
- fix declaration files for node16 / nodenext module resolutions
- fix unregisterEvent removing another listener when the given one is not registered
- fix context menu not opening on the first right click after choosing the selection tool in the toolbar
- fix the wheel and the pinch ignored by an infinite canvas without canZoom: an infinite size always enables the zoom
- fix the strokes of the quadratic brush, which ignored their third to last point: each inner point now controls the curve
- fix the resize with Shift and Alt, which grew the shape by twice the selection padding as soon as the anchor was pressed
- fix the resize with Alt and a selection padding: the shape moved while its width or height was 0, jumped when the cursor went past its opposite side, and a brush or a group was mirrored only from there instead of from its center
- fix the moves made with the arrows, which were not saved in the history nor emitted by dataChanged: like a drag of the mouse, a move is saved once, when the last held arrow is released or the focus leaves the canvas
- fix the rotation by steps, with Shift or the grid, which turned a counterclockwise rotation one step late: a negative angle now goes to its closest step
- fix the infinite font size of a text without characters, given with a width or resized: it gets the default font size, and an emptied text keeps the height of a line
- fix availableTools throwing on a null entry: the entries which are not tools are left out
- fix active tool not following the tools given in props: it is now derived from them by id, and only known tools can be selected
- options of useReactPaint are compared by value: inline options, like availableTools, no longer reset the tool settings nor render in a loop
- performance: the editor panels only render when their part of the state changes, and the canvas draws the gestures (hover, drag, selection frame, pan, brush) without rendering React components
- performance: shapes are no longer recomputed when the view is moved or the grid changes, and the auto scroll of the selection frame follows the animation frames
- add Custom editor, Canvas only and External toolbar stories
- add a performance benchmark, run manually with pnpm bench
- everything the editor and the canvas gestures do can be done from the code, without the Editor and even without a mounted Canvas:
  - shapes keep their id in the exported data and when they are loaded again. New ids are random, so that they do not collide with saved ones
  - add actions.addShapes and actions.updateShapes, to create shapes and to update any of their fields (geometry, points, text, style, data). The style of a new shape is completed with its tool, and the size of a text can be left out
  - add actions.translateShapes, rotateShapes (any angle) and resizeShapes (to a box), and paint.getShape, getBounds and getShapesAt
  - add dedicated actions: setShapesStyle (several fields, and the defaults of the tools), setToolStyle, setShapeIndex, reorderShapes, insertShapePoint, moveShapePoint, editText, zoomTo, panBy, openContextMenu, loadData, and selectShapes with an add or remove mode
  - add paint.batch, which gives a single step of the history and a single dataChanged event for several actions
  - the actions changing shapes take save and source options: changes received from elsewhere can be applied as remote changes
  - add actions.setOptions, resetOptions and resetSettings: options overridden from the code are kept over the props until they are reset
  - add a data field to the shapes, kept in the history, the copies and the exported data
  - add shapeClicked and shapeHovered events, also emitted in viewer mode
  - dataChanged gives the changes since the previous state as a third argument: the shapes added, updated (with their previous version) and removed, and whether their order changed
  - add actions.zoomToShapes, which zooms and scrolls so that shapes fill the view
  - getCurrentImage and exportPicture take options: format (png, jpeg, webp), quality, background color, and a background image like the annotated picture. Breaking: getCurrentImage(view) becomes getCurrentImage({ view })
  - export GRID_PRESETS, the gaps of the grid offered by the editor
- the grid follows a change of the grid option after the creation
- updateToolSettings ignores a field the tool has not. Changing the style of a selection of several types of shapes in the editor now updates the tool of each shape
- transformShapes no longer selects the transformed shapes
- performance: the data given to dataChanged are only built while it is listened, and the pictures are encoded once
- performance: zooming and resizing the canvas no longer recompute the shapes: the outline and the anchors of the selection are drawn at the scale of the view. Breaking: ShapeEntity has no selection field anymore
- performance: each point of a brush stroke extends its path instead of building it again from all the points, and the quadratic brush no longer slows down more and more along a stroke
- performance: a picture drawn much smaller than its image is drawn from a reduced copy of the image, made once: faster and less grainy in Firefox and Safari
- performance: a picture added from a file keeps the content of the file as its source, a data URL instead of a revoked blob URL: it is exported as it is, instead of being encoded in PNG on its first export, which froze the page for a large photo, and the exported data are lighter for a photo
- the exported data round the positions and the sizes to 3 decimals, and the angles and the factors to 6: about half the size, without visible change. The shapes keep their full precision while drawing
- add the Programmatic API story
- replace the canGrow and canShrink options with the resize option: 'scaleDown' (default), 'scale', 'scaleUp' or 'none', see the migration guide. The editor has the bounds of the canvas: it does not shrink anymore with its container when the canvas cannot be scaled down
- add resize: 'extend': the canvas fills its container at the scale 1 and its visible area follows the container, without a ResizeObserver in the application. A page of a fixed size is centered in a larger container, with a mask around it, and the view is kept inside it in a smaller one. The Whiteboard story uses it
- fix a blank frame each time the canvas is resized: it is drawn again before the frame showing its new size is painted
- security: add the resolvePictureSrc option, to filter or proxy the URLs of the remote pictures, which may come from data drawn by someone else
- security: remote pictures are fetched without the cookies nor the address of the page, protocol-relative and relative URLs included. Sources other than image data URLs, blob URLs, SVG markup and URLs of the web are refused. The sources are exported as they are: only blob URLs, which do not outlive the page, are encoded from their image
- security: a picture which cannot be loaded is left out of the loaded data with a warning, instead of failing the whole load, and its loading times out after 4 seconds. An image which cannot be encoded no longer breaks the export of the data
- security: pictures larger than 16384 pixels and data files larger than 100 MB are refused
- fix the title of a group of tools being rendered as HTML when its tools have no icon
- support React 19

## V0.18.1
- fix opacity problems with line and arrows
- fix picture style not set at shape creation
- update colors and button title to fix accessibility problems
- add interaction and accessibility tests in storybook and CI (about 80% coverage)
- add meta description in storybook and badges in Readme

## V0.18.0
- Separate current logic and create new entrypoints for ESM build (dist/canvas & dist/editor), allowing treeshaking in the future
- use vite 8 + rolldown to build, decreasing ESM build size by 15-20%
- use clipboard API to handle copy/paste feature
- add Custom Tool story
- fix context menu not triggered on long press
- fix performance issue when transforming multiple shapes
- fix : locked shape should not be selectionable with ctrl + click
- fix : disable transform entry in context menu if shape is locked
- fix : select all shapes now filters locked ones
- various other fixes and improvements

## V0.17.1
- fix shape inverting while resizing with keepRatio and resizeFromCenter
- add flip feature in context menu
- improve locked shape selection 
- add lock/unlock feature in context menu

## V0.17.0
- add "cut" feature usable with CTRL+X
- add "select all" feature, usable with CTRL+A
- add context menu into editor showing up with right click or long press and including : select all, organize (move forward, backward, on first, on last), transform (rotate clockwise, counterclockwise), cut, copy, paste, duplicate, show/hide, delete
- add possibility to remove selected point on curve or polygon with context menu
- fix fontRadius editor option not being applied
- fix wrong state for selected shape being saved and restored when using undo/redo

## V0.16.3
- fix shape selection now less depending of what is currently selected
- fix shift command conflict between grouping and translating
- add more information about react paint in package json

## V0.16.2
- fix oversized built types, removing 140KB of types

## V0.16.1
- fix text render when flipped
- add ratio prop to text and picture shape preventing it to lose its ratio when reacihng size of 0
- fix sized 0 brush not resizing correctly in group selection
- fix selection frame wrong collisions with rotated shapes
- better collision management for text and picture shapes

## V0.16.0
- enable selection group rotation
- enable selection group resize
- enable shape flip, with or without group selection
- fix selection group translation not following grid
- fix translation in grid not considering shape selection padding
- fix shape flip position when resizing


## V0.15.1
- use alt when dragging shape to duplicate it
- fix : wrongly hovered shapes when another is selected
- fix Rangefield causing data discrepancy with timeout : do not overwrite shape data after debounce, just force save it

## V0.15.0
- allow label inputs to be focusable and pressable with keyboard
- make Canvas focusable under conditions
- use focus events to check if component is active
- add ctrl commands for zooming in canvas with keyboard
- add space + drag shortcut to move inside canvas when it is focused
- add debug mode to easily visualize outer bounding box
- store shapeInfos in computed props instead of multiple calculation during render
- add boundingBox in shapes
- better border calculation with bezier curve and shape rotation : fix fitToShape export
- improve documentation

## V0.14.0
- add shadow to hovered anchors
- add function to be able to reset canvas zoom
- add multi selection feature

## V0.13.1
- only create one point when first clicking with curve or polygon tool
* fix : render shape with alpha in a separate canvas to apply opacity on all the shape at once
* better double clic detection on curves and more accurate new point position
* improvement : check curve path for selection detection

## V0.13.0
- Improve curve and polygon tool with new interactions
- Improve curve renderer to move from control points to real curve points
- Use right click in edit mode to unselect shapes
- Adapt CMD + Opt + Z shortcut for macos
- add alt shortcut to resize shapes from center
- add rotation steps when pressing shift
- translate along one single axis when shift is pressed
- accept webp format for picture shape

## V0.12.0
 - up dependancies
 - add zoom feature with canZoom option and zoom panel
 - add size option to create infinite whiteboard
 - add export panel with multiple more options to export current canvas
 - export annotationProps for background picture to be transformed along the canvas
 - only draw shapes visible in current view
 - fix white flash when resizing canvas

## V0.11.21
- up dependancies
- use Biome to lint CSS
- expose specific drawable shape to fix picture shape who sould not have img property outside of react paint
- update text shape initialization for a bigger shape
- move logic to utils
- init unit tests
- add github action to CI

## V0.11.7
- fix redering loop

## V0.11.6
- fix getting node value for editbox

## V0.11.5
- add test for Image api before using it to prevent Server Side Rendering to break

## V0.11.4
- fix callback immutability
- fix datachanged callback providing wrong canvas size

## V0.11.3
- fix dataChanged callback triggering 'user' source at init if defaultShape contains picture

## V0.11.2
- store svg file as svg content instead of base64 to keep format
- fix types path in package json
- Add 'hide'' settings prop

## V0.11.1
 - in text edition mode, fetch dom node value instead of parsing innerHtml to prevent stripping tags
 - move selection props (BREAKING CHANGE)
 - do not reset canvas when defaultShapes changes from undefined to other
 - add source information in dataChange callback
 - enable withSkeleton by default
 - add new prop isBrushShapeDoneOnMouseUp to choose whether drawing brush shape after releasing mouse should create a new shape or not (enabled by default so BREAKING CHANGE)
 - fix window scrolling when translating shape with keyboard
 - add stories and documentation

## V0.11.0
- up tooling : vite, biome, storybook, typescript, etc. 
- start logic separation between canvas and editor
- init new useReactPaint hook
- fix shapes prop triggering dataChanged callback resulting in potential loop
- fix clearCallback with custom fn breaking history stack
- export types who might be used by client
- init documentation in README
- BREAKING CHANGE :new API !

## V0.10.1
- fix story
- factorize options bc too much prop drilling
- add option to use quadratic brush

## V0.10.0
- fix anchor position and selection with grown canvas
- improve shape selection for tiny shapes
- improve shape selection with touch gesture
- add selection insight when hovering curosr
- fix hovering calculation
- fix polygon translation with grid
- improve line with arrows now stopping at the correct position
- fix : arrow shapes now omitted from data export
- fix performance issue with line dash
- add selection frame (disabled bc does not support multi shapes right now)
- BREAKING CHANGE : drop support of 0.6.5 (translation prop no more supported)


## V0.9.3
 - Remove lodash from dependencies
 - minify esm build
 - fix settings targetting bad tools
 - fix curve tool points count not being updatable
 - BREAKING CHANGE : rename globalAlpha shape prop to opacity to fix confusion between them

## V0.9.2

 - fix mix-up between cjs and esm build

## V0.9.1

 - fix toolbar menu creating inner scrollbar
 - fix canvas state resetting when updating its size and having shapes from props
 - fix toolbars size not updating correctly in mobile

## V0.9.0

 - Refacto transformation and draw utils
 - Store Path2d for precalculation
 - optimize data export format
 - improve keep ratio behavior
 - globally round values
 - fix brush tool losing precision with transformation
 - fix circle resizing only going one direction
 - fix padding selection with grid on
 - target es2020

## V0.8.0

- migrate from linaria to vanilla css
- remove use of babel
- migrate from webpack to vite
- init storybook

## V0.7.6

- fix : prevent big svg failing to load using blob instead of base64

## V0.7.5

- fix : store url for url picture instead of base64 version of the file

## V0.7.4

- fix : shortcut with caps fixed
- fix : add support for svg in firefox

## V0.7.3

- fix : strip all tags with text editing

## V0.7.2

- fix : text bad position when editing
- fix : call saveShape after text edit

## V0.7.1

- downgrade linara to 3.X.X to fix broken build
- move back babel/runtime to devdep

## V0.7.0

- rewrite types and get rid of enum
- move utils location for more clarity
- fix optional prop toolId in storage file
- fix opacity settings
- fix toolbar menu not hiding after starting to create shape
- translation attribute has been removed from shapes
- Always round values when creating or transforming shapes
- Improve grid feature
- Add "keep ratio" feature when pressing shift key
- prevent selection padding to be larger than 0 until shape resize is fixed
- target browser with babel to minimize build size

## V0.6.5

- add babel/runtime to dep to fix build

## V0.6.4

- fix TextEdit copy/paste containing html
- add clearCallback in opts to override clear button behavior

## V0.6.3

- Rename 'lib' prop in 'label'
- update dash settings
- update clear icon
- update color settings UI

## V0.6.2

- Lock : can't select shape by click on it (only via layers panel)
- Clear : reset state to shapes prop by default if not undefined
- update icons
- Add responsive to settings UI

## V0.6.1

- Fix shapes prop not refreshing component (introduced by 0.6.0)

## V0.6.0

- Fix text opacity range dancing in edit mode
- Fix opacity not visually shown in edit mode
- add delete button in layouts panel and update style
- update shape selection priority : use layers order, unless an anchor is
- stored data format updated

## V0.5.1

- add possibility to update default settings for a tool
- fix png export not working with url pic
- fix pictures missing id
- fix text tool
- double click for editing text is now working on mobile
- add bold and italic for text

## V0.5.0

- Add tool presets feature

## V.0.4.2

- fix toolgroup not displayed
- add passive prop to event listener

## V.0.4.1

- prevent mounting selection canvas when viewer mode
- prevent drawing selection when not needed
- Click on toolbar tool group always enable a tool
- fix input and select options not being impacted by
- new reponsive for toolbar

## V.0.4.0

- Add possibility to customize UI from props

## V.0.3.1

- Add prop to change canvas background color
- Move some props to options
- fix Picture shape not being saved and not triggering onDataChanged
- small picture are upscaled to fit container when imported
- Add prop to choose to display save/load/export

## V.0.3.0 :

- prevent picture from url submit to reload page
- add gridVisible prop and default to false
- rename withLayouts to layersManipulation and reduce possible values
- move every options inside options prop
- remove ajv and any kind of json validation
- limit snackbar use on success and always log errors
- fit size and center uploaded picture
- Add new viewer mode
- add borders on bars
- display shape id in layer panel
- Export : round values to 2 decimal points
- Export and import : remove temporary values (id) from stored file
- Clean unknown shape format from imported data
- Use ref for onDataChanged prop to avoid rerender if callback changes
- Calculate container size to resize canvas instead of CSS
- use requestAnimationFrame to improve perf
- fix TextEdit position and size not working with canvas resized
- fix anchors area becoming too small after rezsize
- add MIT license to project
- other minor fixes
- minor design improvements

## V.0.2.2 :

- Migrate to react 18
- fix Picture type
- change pen join and cap to round
- replace loading snackbar with proper loader
- support for canGrow and canShrink prop
- rename project
- release on npm

## V.0.2.1 :

- better ui for input modal
- lock functionnality
- toggle grid
- layouts panel UI

## V.0.2.0 :

- fix for scaling brush
- fix snackbar
- refonte UI toolbar
- update examples
- button with icons
- mini toolbar to fix
- provide tool for url only
