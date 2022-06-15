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
