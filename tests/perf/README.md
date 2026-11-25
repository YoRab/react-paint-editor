# Performance benchmark

Measures what React and the main thread do during the continuous interactions of the canvas. It runs in Chromium (Vitest browser mode, Playwright) with its own config, `vitest.perf.config.ts`, and is only run manually: it is not part of `pnpm test` nor of the CI.

It measures the production build of React, the one the users of the library run, with the profiling build of react-dom, whose `<Profiler>` still reports the commits. The run stops at once when another build runs, or when the `<Profiler>` reports nothing.

## Run

```bash
pnpm bench
```

| Variable         | Default      | Use                                                                                                                                                          |
| ---------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PERF_LABEL`     | `latest`     | Name of the report, written to `tests/perf/results/<label>.json`                                                                                             |
| `PERF_SHAPES`    | `50,500`     | Numbers of shapes to measure, separated by commas                                                                                                            |
| `PERF_SCENARIOS` | all          | Ids of the scenarios to measure, separated by commas                                                                                                         |
| `PERF_CPU`       | `1`          | Slows the CPU down by this rate (Chrome DevTools Protocol), like a slower machine: `4` stands for a mid-range phone                                          |
| `PERF_EVENTS`    | `1`          | Pointer and wheel events sent in each frame: `1` stands for a 60 Hz mouse, `4` for a faster mouse in a browser which does not align the events on the frames |
| `PERF_DPR`       | `1`          | Pixels of the screen in a CSS pixel (`devicePixelRatio`): `2` stands for a HiDPI screen, like a Retina display, whose canvases have 4 times more pixels      |
| `PERF_REACT`     | `production` | `development` measures the development build of React instead, slower, like the reports made before 2026-11-25                                               |
| `PERF_BASELINE`  | `baseline`   | Report the results are compared to, `tests/perf/results/<name>.json`. Empty for none                                                                         |

```bash
PERF_LABEL=baseline pnpm bench          # bash
$env:PERF_LABEL='baseline'; pnpm bench  # PowerShell
pnpm bench --browser.headless=false     # to watch the browser
pnpm bench -t "pan with"                # one scenario
PERF_SCENARIOS=pan,zoom pnpm bench      # two scenarios
PERF_LABEL=slow-cpu PERF_CPU=4 pnpm bench
PERF_LABEL=hidpi PERF_DPR=2 pnpm bench
PERF_BASELINE=before pnpm bench         # compared to results/before.json
```

A full run takes about 20 minutes: 24 scenarios, 2 sizes, 1 warm-up run and 5 measured runs each, on a new mount every time. The report, ignored by git, holds the median of the measured runs (`results`) and each measured run (`samples`).

When the report of `PERF_BASELINE` exists, each cell shows the gap to it: a count which changed is marked with its own gap, `(+300 ▲)` for more and `(-300 ▼)` for fewer, and the output ends with the list of these counts. The gaps of time are only shown in %, never marked: two benches made at different times differ by the drift of the machine, which a test on the runs of each one cannot see. The same code measured twice in a row once came out 34 % faster on `undo@50 taskMs`, with a Mann-Whitney U test at p < 0.05. To compare the times of two versions, use `pnpm bench:compare`, which alternates them. Compare only reports made with the same `PERF_CPU`, `PERF_EVENTS`, `PERF_DPR` and `PERF_REACT`. Each report records them. The reports made before 2026-11-25 only hold medians.

## Compare two versions

```bash
pnpm bench:compare HEAD                                       # the working tree against the last commit
PERF_SCENARIOS=translate,pan PERF_SHAPES=500 pnpm bench:compare dev
PERF_ROUNDS=4 pnpm bench:compare v1.0.0-beta.4 -t "zoom with"  # arguments after the ref go to Vitest
```

`scripts/bench-compare.mjs` measures the library at a git ref (`base`) and the one of the working tree (`current`), like the benchmark of react-konva:

- it copies the library of both, `src` and the tsconfig files which give the paths of its imports, into `.bench-variants/`, ignored by git. A change made during the comparison does not reach it;
- the code of the benchmark is the one of the working tree for both: `vitest.perf.config.ts` serves the modules of `src/` from the copy given by `PERF_SOURCE`, whatever the path which imports them. The imports of the copy itself are resolved with its own tsconfig files;
- it runs the benchmark `PERF_ROUNDS` times on each (2 by default), alternating which one runs first, so that the drift of the machine during the comparison falls on both. An even number gives both the same positions;
- it compares the samples of all the rounds, 10 per variant by default, and prints for each metric the median and the quartiles of both, the gap, and the p-value of a Mann-Whitney U test, adjusted by the Benjamini-Hochberg procedure for the number of times compared over all the scenarios: among hundreds of times, 5 % would pass p < 0.05 by chance. `▲` marks a gap significantly worse (adjusted p < 0.05), `▼` a gap significantly better, and the other gaps may be noise. A gap of time under 2 % is never marked: it does not matter, and the duration of a gesture, which hardly varies, would show its few milliseconds of drift. A count which changed is marked with its own gap, like `(+300 ▲)`. With 5 samples per variant (1 round), the test cannot mark a time among more than 6: keep 2 rounds at least;
- the report, with all the samples and a hash of each library, is written to `results/compare-<ref>.json` (or `<PERF_LABEL>.json`).

The other variables apply to both variants. Each round takes as long as a `pnpm bench` with the same variables: restrict the scenarios and the sizes. A scenario which fails for one variant, like one that the older version does not know, is left out of the comparison. When the library is the same at the ref, the comparison is an A/A control: it should show no significant gap, else the machine was too unstable during it.

## Scenarios

The scenarios are driven only by DOM events (`scenarios.ts`), sent one per frame like a 60 Hz mouse (`PERF_EVENTS` simulates faster mice). Each one ends with a functional check (the shape moved, the shapes are selected, the view moved...), so that a gesture broken by a change is never measured.

The drawing is a grid of opaque rectangles, unless another one is given (`shapes.ts`).

| id                     | drawing                                                                                                | gesture                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `hover`                | rectangles                                                                                             | 300 moves over the shapes, without button                                                                    |
| `translate`            | rectangles                                                                                             | drag of a shape, 300 moves                                                                                   |
| `frame`                | rectangles                                                                                             | selection frame from an empty area to a corner, 300 moves, which ends with the auto scroll                   |
| `pan`                  | rectangles                                                                                             | 200 wheel events on an infinite canvas                                                                       |
| `brush`                | rectangles                                                                                             | brush stroke, 300 moves                                                                                      |
| `undo`                 | rectangles                                                                                             | 20 clicks alternating undo and redo in the toolbar                                                           |
| `zoom`                 | rectangles                                                                                             | 200 ctrl + wheel events, each one changing the zoom                                                          |
| `zoom-mixed`           | as `mixed`                                                                                             | as `zoom`                                                                                                    |
| `opacity`              | rectangles filled and stroked at half opacity                                                          | drag of a shape, 300 moves                                                                                   |
| `mixed`                | shapes of all the types (lines with arrows, curves, texts, brushes...), one out of two at half opacity | drag of a rectangle, 300 moves                                                                               |
| `pictures`             | rectangles under 3 photos of 3000×2000 pixels, loaded from blob URLs                                   | drag of a photo, 300 moves                                                                                   |
| `long-brush`           | rectangles, `isBrushShapeDoneOnMouseUp: false`                                                         | 4 brush strokes of 300 moves, added to the same shape                                                        |
| `frame-inside`         | rectangles under a large rectangle which is only stroked                                               | selection frame inside the large rectangle, 150 moves: each point of the frame is checked against its stroke |
| `undo-autosave`        | rectangles, with a listener of `dataChanged`                                                           | as `undo`: each click exports the data                                                                       |
| `layers`               | rectangles, with the panel of the layers open                                                          | 20 clicks alternating hiding and showing a shape in the panel: each click saves the shapes again             |
| `layers-autosave`      | as `layers`, with a listener of `dataChanged`                                                          | as `layers`: each click exports the data                                                                     |
| `translate-all`        | rectangles, all selected with ctrl + A                                                                 | drag of all the shapes, 300 moves                                                                            |
| `translate-long-brush` | rectangles under a brush of 4 strokes of 1000 points                                                   | drag of the brush, 300 moves                                                                                 |
| `add-picture`          | rectangles                                                                                             | 3 photos of 3000×2000 pixels added from the menu of the toolbar, as files chosen by the user                 |
| `add-picture-autosave` | as `add-picture`, with a listener of `dataChanged`                                                     | as `add-picture`: each photo is exported once added                                                          |
| `hover-groups`         | rectangles in groups of 5, themselves in groups of 5                                                   | as `hover`: a move over a rectangle hovers its outer group                                                   |
| `translate-group`      | the groups of `hover-groups` in a single group                                                         | drag of the group, 300 moves: compare it to `translate-all`, which moves the same rectangles                 |
| `undo-groups-autosave` | as `hover-groups`, with a listener of `dataChanged`                                                    | as `undo`, after the removal of a group of 25 rectangles: each click exports the groups                      |
| `translate-custom`     | the grid as stars of a custom tool, their path built from their parameters                             | drag of a star, 300 moves: its path is built again on each move, compare it to `translate`                   |

`fixture.tsx` mounts the measured app: a host calling `useReactPaint`, a heavy sibling standing for the UI of the consumer, the editor, the canvas, and a probe subscribed to `state.history`. It is the only file that depends on the public API.

## Metrics

| Metric                                                          | Meaning                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hostRenders`, `siblingRenders`                                 | Renders of the component calling `useReactPaint`, and of its sibling                                                                                                                                                                                                                           |
| `rootCommits`, `editorCommits`, `canvasCommits`, `probeCommits` | Commits of each `<Profiler>`                                                                                                                                                                                                                                                                   |
| `rootMs`, `editorMs`, `canvasMs`                                | Sum of the `actualDuration` of each `<Profiler>`. `editorUiMs` is the editor without the canvas                                                                                                                                                                                                |
| `shapesLayerDraws`, `selectionLayerDraws`                       | Draws of the layer of the shapes, and of the layer of the selection: each one starts with `ctx.reset()`                                                                                                                                                                                        |
| `shapesDrawCalls`, `selectionDrawCalls`, `offscreenDrawCalls`   | Calls drawing pixels (`fill`, `stroke`, `drawImage`, `fillText`, `strokeText`) in each layer, and in the canvases out of the page, like the layers of the semi-transparent shapes and the copies of the pictures. A shape drawn for nothing, or a culling which no longer works, shows in them |
| `frameP50`, `frameP95`, `frameMax`, `slowFrames`                | Intervals between two animation frames, and frames over 33 ms                                                                                                                                                                                                                                  |
| `totalMs`                                                       | Duration of the gesture                                                                                                                                                                                                                                                                        |
| `scriptMs`, `taskMs`                                            | JavaScript, and all the work, of the main thread during the gesture (Chrome DevTools Protocol): event handlers, React, drawing of the canvas, style and layout                                                                                                                                 |

The calls of the 2D context are counted by wrapping the methods of `CanvasRenderingContext2D.prototype` during the gesture, like the benchmark of Excalidraw. The layers are told apart by their canvas element, not by the code which draws them, so that the library of an older version is counted the same way by `pnpm bench:compare`.

The counts are deterministic: they are the acceptance criteria. The ones checked are the same with both builds of React; `rootCommits` and `editorCommits` are one more with the development build during a brush stroke. The times depend on the machine and on the build of React: compare them only between runs on the same machine, with the same build. The frame intervals stay at 16.7 ms on a fast machine, whatever the work: `scriptMs` and `taskMs` show it.

## Acceptance criteria

Each scenario gives its own maximums (`criteria` in `scenarios.ts`). The test fails when a count goes over one:

- no render of the host nor of the sibling during all the gestures but `undo`, `undo-autosave` and `undo-groups-autosave`;
- no commit of the probe during `hover`, `hover-groups`, `frame`, `frame-inside`, `pan`, `zoom` and `zoom-mixed`, and at most 1 (the save of the history on release) during `translate`, `translate-all`, `translate-group`, `translate-long-brush`, `opacity`, `mixed`, `pictures` and `brush`, at most 1 per stroke during `long-brush`, at most 1 (the first step to undo) during `layers`, `layers-autosave`, `add-picture` and `add-picture-autosave`;
- no commit of the canvas during all the scenarios but `pan`, `undo`, `undo-autosave`, `undo-groups-autosave`, `zoom` and `zoom-mixed`;
- each layer drawn at most once per event, the events being sent at most one per frame: once per move, plus the press and the release, during the drags, once per wheel event during `pan`, `zoom` and `zoom-mixed`, once per click during `undo`, `layers` and their variants, once per picture added during `add-picture` and `add-picture-autosave`;
- no draw of the layer of the shapes during `hover`, `hover-groups`, `frame` and `frame-inside`: only the outline of the hovered shape and the selection frame are drawn, in the layer of the selection.
