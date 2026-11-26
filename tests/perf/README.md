# Performance benchmark

Measures what React and the main thread do during the continuous interactions of the canvas. It runs in Chromium (Vitest browser mode, Playwright) with its own config, `vitest.perf.config.ts`. The benchmark is only run manually: it is not part of `pnpm test`. Its counts, which do not depend on the speed of the machine, are checked by the CI on each pull request with `pnpm bench:counts`. The stress test, `pnpm bench:stress`, measures the main gestures, the load and the exports on drawings of up to 20000 shapes. The micro-benchmarks, `pnpm bench:micro`, measure hot functions of the library in Node. `pnpm size` measures the size of the build, and checks it against a budget.

It measures the production build of React, the one the users of the library run, with the profiling build of react-dom, whose `<Profiler>` still reports the commits. The run stops at once when another build runs, or when the `<Profiler>` reports nothing.

## Run

```bash
pnpm bench
```

| Variable         | Default      | Use                                                                                                                                                          |
| ---------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PERF_LABEL`     | `latest`     | Name of the report, written to `tests/perf/results/<label>.json`, `stress-<label>.json` for the stress test, `micro-<label>.json` for the micro-benchmarks   |
| `PERF_SHAPES`    | `50,500`     | Numbers of shapes to measure, separated by commas. The stress test goes from 100 to 20000 by default                                                         |
| `PERF_SCENARIOS` | all          | Ids of the scenarios to measure, separated by commas                                                                                                         |
| `PERF_CPU`       | `1`          | Slows the CPU down by this rate (Chrome DevTools Protocol), like a slower machine: `4` stands for a mid-range phone                                          |
| `PERF_EVENTS`    | `1`          | Pointer and wheel events sent in each frame: `1` stands for a 60 Hz mouse, `4` for a faster mouse in a browser which does not align the events on the frames |
| `PERF_DPR`       | `1`          | Pixels of the screen in a CSS pixel (`devicePixelRatio`): `2` stands for a HiDPI screen, like a Retina display, whose canvases have 4 times more pixels      |
| `PERF_REACT`     | `production` | `development` measures the development build of React instead, slower, like the reports made before 2026-11-25                                               |
| `PERF_BASELINE`  | `baseline`   | Report the results are compared to, `tests/perf/results/<name>.json`, `micro-<name>.json` for the micro-benchmarks. Empty for none                           |

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

A full run takes about 22 minutes: 24 scenarios, 2 sizes, 1 warm-up run and 5 measured runs each, on a new mount every time. The report, ignored by git, holds the median of the measured runs (`results`) and each measured run (`samples`).

When the report of `PERF_BASELINE` exists, each cell shows the gap to it: a count which changed is marked with its own gap, `(+300 ▲)` for more and `(-300 ▼)` for fewer, and the output ends with the list of these counts. The gaps of time are only shown in %, never marked: two benches made at different times differ by the drift of the machine, which a test on the runs of each one cannot see. The same code measured twice in a row once came out 34 % faster on `undo@50 taskMs`, with a Mann-Whitney U test at p < 0.05. To compare the times of two versions, use `pnpm bench:compare`, which alternates them. Compare only reports made with the same `PERF_CPU`, `PERF_EVENTS`, `PERF_DPR` and `PERF_REACT`. Each report records them. The reports made before 2026-11-25 only hold medians.

## Check the counts

```bash
pnpm bench:counts                           # checks the counts against counts-baseline.json
pnpm bench:counts -u                        # writes the counts measured to counts-baseline.json
PERF_SCENARIOS=hover,pan pnpm bench:counts  # two scenarios
PERF_CPU=4 pnpm bench:counts                # checks that the counts do not depend on the speed of the machine
```

`counts.perf.test.tsx` runs each scenario once, without warm-up, at 50 and 500 shapes with one event per frame, in about 4 minutes. It checks the acceptance criteria of the scenario, then its counts, from `hostRenders` to `offscreenDrawCalls` (see the metrics), against `tests/perf/counts-baseline.json`. This baseline is versioned and reviewed with the code, like the one of the benchmark of react-konva. `PERF_SHAPES` and `PERF_EVENTS` do not apply, and the run stops at once with `PERF_REACT=development` or `PERF_DPR`: the baseline holds the counts of the production build of React at a pixel ratio of 1.

- A count higher than the baseline, or missing from it, fails its scenario. Fix the regression, or update the baseline when the count is expected to rise, and explain why in the pull request.
- A count lower than the baseline does not fail: the output lists it at the end. Update the baseline, so that it catches the count if it rises again.
- `-u`, the flag of Vitest which updates the snapshots, writes the counts measured to the baseline. The results of the scenarios not run are kept, and the ones of the removed scenarios are dropped. The diff of the baseline shows each count which changed.
- The counts measured are also written to `tests/perf/results/counts.json`, in the format of the baseline.
- A count which changes with `PERF_CPU=4` depends on the speed of the machine: the CI, slower, would not measure the baseline. Such a count is left out of the comparison by the `variableCounts` of its scenario, with the reason. Only `rootCommits` and `editorCommits` of `add-picture` and `add-picture-autosave` are: the steps of the loading of a photo fall into one task of the browser or several, and React commits them together or apart.
- A scenario with `sameCountsAs` must have the counts of another scenario, compared in the same run, also with `-u`: `translate-profiled`, measured by `frameDrawn` and `gestureMeasured`, has the counts of `translate`, so the profiling adds no render and no draw.

## Compare two versions

```bash
pnpm bench:compare HEAD                                       # the working tree against the last commit
PERF_SCENARIOS=translate,pan PERF_SHAPES=500 pnpm bench:compare dev
PERF_ROUNDS=4 pnpm bench:compare v1.0.0-beta.4 -t "zoom with"  # arguments after the ref go to Vitest
```

`scripts/bench-compare.mjs` measures the library at a git ref (`base`) and the one of the working tree (`current`), like the benchmark of react-konva:

- it copies the library of both, `src` and the tsconfig files which give the paths of its imports, into `.bench-variants/`, ignored by git. A change made during the comparison does not reach it;
- the code of the benchmark is the one of the working tree for both: the plugin of `scripts/lib/measured-library.mjs` serves the modules of `src/` from the copy given by `PERF_SOURCE`, whatever the path which imports them. The imports of the copy itself are resolved with its own tsconfig files. Each copy keeps its own cache of the modules of Vitest, which keeps the files run in Node with their imports resolved: with a single cache, the micro-benchmarks of a variant imported the copy of the variant before;
- it runs the benchmark `PERF_ROUNDS` times on each (2 by default), alternating which one runs first, so that the drift of the machine during the comparison falls on both. An even number gives both the same positions;
- it compares the samples of all the rounds, 10 per variant by default, and prints for each metric the median and the quartiles of both, the gap, and the p-value of a Mann-Whitney U test, adjusted by the Benjamini-Hochberg procedure for the number of times compared over all the scenarios: among hundreds of times, 5 % would pass p < 0.05 by chance. `▲` marks a gap significantly worse (adjusted p < 0.05), `▼` a gap significantly better, and the other gaps may be noise. A gap of time under 2 % is never marked: it does not matter, and the duration of a gesture, which hardly varies, would show its few milliseconds of drift. A count which changed is marked with its own gap, like `(+300 ▲)`. With 5 samples per variant (1 round), the test cannot mark a time among more than 6: keep 2 rounds at least;
- the report, with all the samples and a hash of each library, is written to `results/compare-<ref>.json` (or `<PERF_LABEL>.json`).

The other variables apply to both variants. Each round takes as long as a `pnpm bench` with the same variables: restrict the scenarios and the sizes. A scenario which fails for one variant, like one that the older version does not know, is left out of the comparison. When the library is the same at the ref, the comparison is an A/A control: it should show no significant gap, else the machine was too unstable during it.

`pnpm bench:compare --micro <ref>` compares the micro-benchmarks the same way. A run of the micro-benchmarks gives a single sample of each benchmark, its mean: the comparison runs 10 rounds by default, 20 runs of about 20 seconds, for 10 samples per variant. Its table has a row per benchmark, and its report is written to `results/micro-compare-<ref>.json`.

```bash
pnpm bench:compare --micro HEAD
PERF_ROUNDS=6 pnpm bench:compare --micro dev -t getDataChanges
```

## Stress test

```bash
pnpm bench:stress                                 # 8 gestures, from 100 to 20000 shapes
PERF_SCENARIOS=translate,pan pnpm bench:stress    # two gestures
PERF_SHAPES=1000,5000 pnpm bench:stress           # two sizes
PERF_LABEL=slow-cpu PERF_CPU=4 pnpm bench:stress
PERF_LABEL=hidpi PERF_DPR=2 pnpm bench:stress
```

`stress.perf.test.tsx` measures the main gestures, `hover`, `translate`, `translate-all`, `pan`, `zoom`, `brush`, `mixed` and `opacity`, on larger and larger drawings: 100, 500, 1000, 2000, 5000, 10000 and 20000 shapes, 3 runs each, after a warm-up run on the first size. `PERF_SCENARIOS` takes any scenario of the benchmark, and the operations below. The acceptance criteria of the scenarios are checked at each size.

- It measures the work of the frames, `frameWorkP95` and `frameWorkMean` (see the metrics). Unlike the frame intervals, they show the margin left in a frame on a fast machine.
- A gesture whose frames take over 50 ms (p95) is not measured on the larger drawings: they would take minutes, and the gesture no longer keeps 30 fps. Neither is a gesture which fails, like a scenario whose check no longer passes: it would fail again on each of them.
- The capacity of a gesture is the largest drawing measured whose frames take at most 16.7 ms (60 fps), or 33.3 ms (30 fps), at p95, the smaller drawings too. The real capacity lies between it and the next size. It counts the work of the main thread only, not the raster and the composite of the GPU.
- The output gives the work of a frame by gesture and by size, then the capacities, and the duration of the operations. The report, ignored by git, is written to `tests/perf/results/stress-<label>.json`, with each run.
- The figures of the documentation are measured with `PERF_CPU=1` and `4`, and with `PERF_DPR=1` and `2`. Each report records them.

It also measures three operations, single calls of the API outside of the gestures, at every size: their duration (`totalMs`), and the work of the main thread (`taskMs`). The duration of `load` includes the wait for the frame which draws the shapes, up to 16.7 ms, which the small drawings mostly show. The benchmark and its counts do not run them.

| id             | operation                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `load`         | `loadData` of the JSON string of the drawing, as an automatic save keeps it, in the emptied canvas, until the frame which draws the shapes |
| `export-data`  | a change of the style of a shape: `dataChanged` gives the data of the whole drawing, serialized with `JSON.stringify` as a save does       |
| `export-image` | `getCurrentImage`: the PNG image of the drawing                                                                                            |

A full run takes about 20 minutes.

## Micro-benchmarks

```bash
pnpm bench:micro                    # all the micro-benchmarks, in about 20 seconds
pnpm bench:micro -t getDataChanges  # the benchmarks of a test
PERF_LABEL=before pnpm bench:micro  # written to results/micro-before.json
```

`tests/perf/micro/*.bench.ts` measure hot functions of the library in Node, with the `bench` of the test context of Vitest 5, experimental, run by tinybench. Their config is `vitest.micro.config.ts`. They are only run manually: neither `pnpm test` nor the CI runs them.

- The drawings are the ones of the `mixed` scenario, shapes of all the types, with 500 and 5000 shapes, loaded by a store. Path2D only exists in a browser: the paths are built with methods which do nothing, so the micro-benchmarks measure the JavaScript of the library, not the drawing.
- Each benchmark runs for 500 ms after its warm-up, and 64 calls at least. Vitest prints a table per test (calls per second, mean, percentiles, error margin), then the mean of each benchmark, with its gap to the report of `PERF_BASELINE`, `results/micro-baseline.json` by default. Like the times of the benchmark, these gaps are never marked.
- The report, ignored by git, is written to `tests/perf/results/micro-<label>.json`: the mean and the percentiles of each benchmark, and its number of calls.
- A run of the same code differs from the next by up to 12 %, much more than the error margin of its calls, which only covers the calls of a run. To compare two versions, use `pnpm bench:compare --micro`, which alternates 10 runs of each one.
- Vitest runs the code through its module runner, which turns the exports of the modules into getters: they cost about 3 % on `getDataChanges`, against a bundle of its module. The tracker of Vitest which counts their calls, to warn about them, is disabled (`suppressExportGetterWarnings`): it made the calls 6 to 10 % slower.
- The micro-benchmarks call internal functions of the library: a version whose functions differ cannot be compared on them.
- To compare two implementations during an optimization, like the micro-benchmarks of Fabric.js, keep the old one next to the new one in the same `bench.compare`, then remove it once done: Vitest ranks them in its table.

| test                                   | benchmarks                                                                                                                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getDataChanges`                       | the changes given by `shapesChanged` and `dataChanged`, after a move of the last shape, and of all the shapes: the shapes moved are new objects at each call, like the ones of each step |
| `buildDataToExport`                    | the data given by `dataChanged`, after the same moves: the exports of the shapes which did not move are cached                                                                           |
| `applyDataChanges`                     | the changes of the same moves, received by `applyChanges` through JSON                                                                                                                   |
| `shapesReducer`                        | a step saved by `SET_SHAPES`, after a move of the last shape, and after all the shapes rebuilt without change, which are compared one by one with the ones of the previous step          |
| `migrateData` and `decodeImportedData` | the shapes of `loadData`, from the data of the drawing                                                                                                                                   |
| a brush of 4 strokes of 1000 points    | its bounds, its move, and a point added to its last stroke: the brush of `long-brush` and `translate-long-brush`                                                                         |

## Bundle size

```bash
pnpm build
pnpm size
```

`scripts/bundle-size.mjs` measures the build in about 2 seconds, raw and compressed with gzip (level 9) and brotli (quality 11), in kB of 1000 bytes. The gzip sizes printed by Vite at the build are about 1 % larger: it compresses another way.

- the files of the package, in `dist`, the chunks named without their hash;
- the bundles of three apps, which import `Canvas` and `useReactPaint` from the root entry, then also `Editor`, then also `connectPerformanceTimeline`. Vite bundles them like the build of an app, minified, React left out (`scripts/lib/bundle.mjs`, shared with `pnpm check-treeshake`): they hold the code their imports need, and nothing else. That is what an app pays for the library.

The sizes with gzip of the bundles of the apps, of the UMD build and of the stylesheets are checked against the budgets of `scripts/bundle-size-budget.json`, in kB. They were set on 2026-11-26 at the sizes measured plus 5 %. The CI checks them on each pull request, after the build, and writes the tables to the summary of the job.

- A size over its budget fails the script. Reduce it, or raise the budget and explain why in the pull request, as for the counts.
- A budget whose size no longer exists fails too.
- When a size falls, lower its budget to keep the margin of 5 %, so that the budget catches the size if it rises again.

## Scenarios

The scenarios are driven only by DOM events (`scenarios.ts`), sent one per frame like a 60 Hz mouse (`PERF_EVENTS` simulates faster mice). Each one ends with a functional check (the shape moved, the shapes are selected, the view moved...), so that a gesture broken by a change is never measured. Between the setup of a scenario (selecting the brush tool, opening a panel...) and its gesture, the run waits 400 ms. That is longer than the timers the editor starts on a change, like the fade-out of the loader once a picture is loaded and the announcements of the live region. Without the wait, they fired during the gesture at a time which depended on the duration of the setup, and changed the number of commits from one run to the next.
The drawing is a grid of opaque rectangles, unless another one is given (`shapes.ts`).

| id                     | drawing                                                                                                | gesture                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `hover`                | rectangles                                                                                             | 300 moves over the shapes, without button                                                                    |
| `translate`            | rectangles                                                                                             | drag of a shape, 300 moves                                                                                   |
| `translate-profiled`   | rectangles                                                                                             | drag of `translate` with listeners of `frameDrawn` and `gestureMeasured`: same counts, cost in time          |
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

`fixture.tsx` mounts the measured app: a host calling `useReactPaint`, a heavy sibling standing for the UI of the consumer, the editor, the canvas, and a probe subscribed to `state.history`. It is the only file that mounts the library: the scenarios read its state with `getState`, and the operations of the stress test call its handle, `paint`.

## Metrics

| Metric                                                          | Meaning                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hostRenders`, `siblingRenders`                                 | Renders of the component calling `useReactPaint`, and of its sibling                                                                                                                                                                                                                               |
| `rootCommits`, `editorCommits`, `canvasCommits`, `probeCommits` | Commits of each `<Profiler>`                                                                                                                                                                                                                                                                       |
| `rootMs`, `editorMs`, `canvasMs`                                | Sum of the `actualDuration` of each `<Profiler>`. `editorUiMs` is the editor without the canvas                                                                                                                                                                                                    |
| `shapesLayerDraws`, `selectionLayerDraws`                       | Draws of the layer of the shapes, and of the layer of the selection: each one starts with `ctx.reset()`                                                                                                                                                                                            |
| `shapesDrawCalls`, `selectionDrawCalls`, `offscreenDrawCalls`   | Calls drawing pixels (`fill`, `stroke`, `drawImage`, `fillText`, `strokeText`) in each layer, and in the canvases out of the page, like the layers of the semi-transparent shapes and the copies of the pictures. A shape drawn for nothing, or a culling which no longer works, shows in them     |
| `frameP50`, `frameP95`, `frameMax`, `slowFrames`                | Intervals between two animation frames, and frames over 33 ms                                                                                                                                                                                                                                      |
| `frameWorkMean`, `frameWorkP95`                                 | Work of the main thread in a frame, like the benchmark of Excalidraw: from the animation frame callback of the frame to a message posted from it, which runs once the frame is rendered (the draws of the canvas, the events, the style, the layout and the paint). Their sum is close to `taskMs` |
| `totalMs`                                                       | Duration of the gesture                                                                                                                                                                                                                                                                            |
| `scriptMs`, `taskMs`                                            | JavaScript, and all the work, of the main thread during the gesture (Chrome DevTools Protocol): event handlers, React, drawing of the canvas, style and layout                                                                                                                                     |

The calls of the 2D context are counted by wrapping the methods of `CanvasRenderingContext2D.prototype` during the gesture, like the benchmark of Excalidraw. The layers are told apart by their canvas element, not by the code which draws them, so that the library of an older version is counted the same way by `pnpm bench:compare`.

The counts are deterministic: they are the acceptance criteria. The ones checked are the same with both builds of React; `rootCommits` and `editorCommits` are one more with the development build during a brush stroke. The times depend on the machine and on the build of React: compare them only between runs on the same machine, with the same build. The frame intervals stay at 16.7 ms on a fast machine, whatever the work: `scriptMs`, `taskMs` and the work of the frames show it.

## Acceptance criteria

Each scenario gives its own maximums (`criteria` in `scenarios.ts`), checked by `pnpm bench` and `pnpm bench:counts`. The test fails when a count goes over one:

- no render of the host nor of the sibling during all the gestures but `undo`, `undo-autosave` and `undo-groups-autosave`;
- no commit of the probe during `hover`, `hover-groups`, `frame`, `frame-inside`, `pan`, `zoom` and `zoom-mixed`, and at most 1 (the save of the history on release) during `translate`, `translate-profiled`, `translate-all`, `translate-group`, `translate-long-brush`, `opacity`, `mixed`, `pictures` and `brush`, at most 1 per stroke during `long-brush`, at most 1 (the first step to undo) during `layers`, `layers-autosave`, `add-picture` and `add-picture-autosave`;
- no commit of the canvas during all the scenarios but `pan`, `undo`, `undo-autosave`, `undo-groups-autosave`, `zoom` and `zoom-mixed`;
- each layer drawn at most once per event, the events being sent at most one per frame: once per move, plus the press and the release, during the drags, once per wheel event during `pan`, `zoom` and `zoom-mixed`, once per click during `undo`, `layers` and their variants, once per picture added during `add-picture` and `add-picture-autosave`;
- no draw of the layer of the shapes during `hover`, `hover-groups`, `frame` and `frame-inside`: only the outline of the hovered shape and the selection frame are drawn, in the layer of the selection.
