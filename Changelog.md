# Changelog

For more details and links to Pull requests, see [Releases](https://github.com/YoRab/react-paint-editor/releases)

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
