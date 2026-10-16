# Performance benchmark

Measures what React and the main thread do during the continuous interactions of the canvas. It runs in Chromium (Vitest browser mode, Playwright) and is only run manually: it is not part of `pnpm test` nor of the CI.

## Run

```bash
pnpm bench
```

| Variable | Default | Use |
| --- | --- | --- |
| `PERF_LABEL` | `latest` | Name of the report, written to `tests/perf/results/<label>.json` |
| `PERF_SHAPES` | `50,500` | Numbers of shapes to measure, separated by commas |

```bash
PERF_LABEL=baseline pnpm bench          # bash
$env:PERF_LABEL='baseline'; pnpm bench  # PowerShell
pnpm bench --browser.headless=false     # to watch the browser
pnpm bench -t "pan with"                # one scenario
```

The results are ignored by git. When `results/baseline.json` exists, the report shows the gap of each metric to it, in %.

A full run takes about 5 minutes: 6 scenarios, 2 sizes, 1 warm-up run and 5 measured runs each, on a new mount every time. The median of the measured runs is kept.

## Scenarios

The scenarios are driven only by DOM events (`scenarios.ts`), sent one per frame like a 60 Hz mouse (`EVENTS_PER_FRAME` in the test simulates faster mice). Each one ends with a functional check (the shape moved, the shapes are selected, the view moved...), so that a gesture broken by a change is never measured.

| id | gesture |
| --- | --- |
| `hover` | 300 moves over the shapes, without button |
| `translate` | drag of a shape, 300 moves |
| `frame` | selection frame from an empty area to a corner, 300 moves, which ends with the auto scroll |
| `pan` | 200 wheel events on an infinite canvas |
| `brush` | brush stroke, 300 moves |
| `undo` | 20 clicks alternating undo and redo in the toolbar |

`fixture.tsx` mounts the measured app: a host calling `useReactPaint`, a heavy sibling standing for the UI of the consumer, the editor, the canvas, and a probe subscribed to `state.history`. It is the only file that depends on the public API.

## Metrics

| Metric | Meaning |
| --- | --- |
| `hostRenders`, `siblingRenders` | Renders of the component calling `useReactPaint`, and of its sibling |
| `rootCommits`, `editorCommits`, `canvasCommits`, `probeCommits` | Commits of each `<Profiler>` |
| `rootMs`, `editorMs`, `canvasMs` | Sum of the `actualDuration` of each `<Profiler>`. `editorUiMs` is the editor without the canvas |
| `frameP50`, `frameP95`, `frameMax`, `slowFrames` | Intervals between two animation frames, and frames over 33 ms |
| `totalMs` | Duration of the gesture |
| `scriptMs`, `taskMs` | JavaScript, and all the work, of the main thread during the gesture (Chrome DevTools Protocol): event handlers, React, drawing of the canvas, style and layout |

The counts are deterministic: they are the acceptance criteria. The times depend on the machine and on the development build of React: compare them only between runs on the same machine. The frame intervals stay at 16.7 ms on a fast machine, whatever the work: `scriptMs` and `taskMs` show it.

## Acceptance criteria

The test fails when a count goes over its criterion:

- no render of the host nor of the sibling during `hover`, `translate`, `frame`, `pan` and `brush`;
- no commit of the probe during `hover`, `frame` and `pan`, and at most 1 (the save of the history on release) during `translate` and `brush`;
- at most 5 commits of the canvas during `hover`, `translate` and `frame`.
