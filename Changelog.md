# V0.11.1
 - in text edition mode, fetch dom node value instead of parsing innerHtml to prevent stripping tags
 - move selection props (BREAKING CHANGE)
 - do not reset canvas when defaultShapes changes from undefined to other
 - add source information in dataChange callback
 - enable withSkeleton by default
 - add new prop isBrushShapeDoneOnMouseUp to choose whether drawing brush shape after releasing mouse should create a new shape or not (enabled by default so BREAKING CHANGE)
 - fix window scrolling when translating shape with keyboard
 - add stories and documentation

# V0.11.0
- up tooling : vite, biome, storybook, typescript, etc. 
- start logic separation between canvas and editor
- init new useReactPaint hook
- fix shapes prop triggering dataChanged callback resulting in potential loop
- fix clearCallback with custom fn breaking history stack
- export types who might be used by client
- init documentation in README
- BREAKING CHANGE :new API !

# V0.10.1
- fix story
- factorize options bc too much prop drilling
- add option to use quadratic brush

# V0.10.0
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


# V0.9.3
 - Remove lodash from dependencies
 - minify esm build
 - fix settings targetting bad tools
 - fix curve tool points count not being updatable
 - BREAKING CHANGE : rename globalAlpha shape prop to opacity to fix confusion between them

# V0.9.2

 - fix mix-up between cjs and esm build

# V0.9.1

 - fix toolbar menu creating inner scrollbar
 - fix canvas state resetting when updating its size and having shapes from props
 - fix toolbars size not updating correctly in mobile

# V0.9.0

 - Refacto transformation and draw utils
 - Store Path2d for precalculation
 - optimize data export format
 - improve keep ratio behavior
 - globally round values
 - fix brush tool losing precision with transformation
 - fix circle resizing only going one direction
 - fix padding selection with grid on
 - target es2020

# V0.8.0

- migrate from linaria to vanilla css
- remove use of babel
- migrate from webpack to vite
- init storybook

# V0.7.6

- fix : prevent big svg failing to load using blob instead of base64

# V0.7.5

- fix : store url for url picture instead of base64 version of the file

# V0.7.4

- fix : shortcut with caps fixed
- fix : add support for svg in firefox

# V0.7.3

- fix : strip all tags with text editing

# V0.7.2

- fix : text bad position when editing
- fix : call saveShape after text edit

# V0.7.1

- downgrade linara to 3.X.X to fix broken build
- move back babel/runtime to devdep

# V0.7.0

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

# V0.6.5

- add babel/runtime to dep to fix build

# V0.6.4

- fix TextEdit copy/paste containing html
- add clearCallback in opts to override clear button behavior

# V0.6.3

- Rename 'lib' prop in 'label'
- update dash settings
- update clear icon
- update color settings UI

# V0.6.2

- Lock : can't select shape by click on it (only via layers panel)
- Clear : reset state to shapes prop by default if not undefined
- update icons
- Add responsive to settings UI

# V0.6.1

- Fix shapes prop not refreshing component (introduced by 0.6.0)

# V0.6.0

- Fix text opacity range dancing in edit mode
- Fix opacity not visually shown in edit mode
- add delete button in layouts panel and update style
- update shape selection priority : use layers order, unless an anchor is
- stored data format updated

# V0.5.1

- add possibility to update default settings for a tool
- fix png export not working with url pic
- fix pictures missing id
- fix text tool
- double click for editing text is now working on mobile
- add bold and italic for text

# V0.5.0

- Add tool presets feature

# V.0.4.2

- fix toolgroup not displayed
- add passive prop to event listener

# V.0.4.1

- prevent mounting selection canvas when viewer mode
- prevent drawing selection when not needed
- Click on toolbar tool group always enable a tool
- fix input and select options not being impacted by
- new reponsive for toolbar

# V.0.4.0

- Add possibility to customize UI from props

# V.0.3.1

- Add prop to change canvas background color
- Move some props to options
- fix Picture shape not being saved and not triggering onDataChanged
- small picture are upscaled to fit container when imported
- Add prop to choose to display save/load/export

# V.0.3.0 :

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

# V.0.2.2 :

- Migrate to react 18
- fix Picture type
- change pen join and cap to round
- replace loading snackbar with proper loader
- support for canGrow and canShrink prop
- rename project
- release on npm

# V.0.2.1 :

- better ui for input modal
- lock functionnality
- toggle grid
- layouts panel UI

# V.0.2.0 :

- fix for scaling brush
- fix snackbar
- refonte UI toolbar
- update examples
- button with icons
- mini toolbar to fix
- provide tool for url only
