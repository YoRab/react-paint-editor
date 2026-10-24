# Changelog

For more details and links to Pull requests, see [Releases](https://github.com/YoRab/react-paint-editor/releases)

## V1.0.0-beta.1 (unreleased)
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
