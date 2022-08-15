# V0.7.0

- rewrite types and get rid of enum
- move utils location for more clarity
- fix optional prop toolId in storage file
- fix opacity settings
- fix toolbar menu not hiding after starting to create shape
- translation attribute has been removed from shapes
- Always round values when creating or transforming shapes
- Improve grid feature
- prevent selection padding to be larger than 0 until shape resize is fixed

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
