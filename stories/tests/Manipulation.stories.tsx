import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import type { DrawableShape } from '../../src/index'
import {
  ReactPaintWrapper,
  getCurrentDataRef,
  makeCoordConverters,
  selectTool,
  assertNoInternalFields,
  setColorSetting,
  openContextMenuAndClick
} from './helpers'

const meta = {
  title: 'Tests/Manipulation',
  component: ReactPaintWrapper,
  parameters: {
    layout: 'centered'
  }
} satisfies Meta<typeof ReactPaintWrapper>

export default meta
type Story = StoryObj<typeof meta>

// 100×100 filled square on the left side of the canvas, center at canvas (300, 300).
// A non-transparent fill is required so that clicking anywhere inside the shape selects it
// (otherwise only clicks on the stroke would register via isPointInStroke).
const INITIAL_SQUARE: DrawableShape = {
  type: 'square',
  x: 250,
  y: 250,
  width: 100,
  height: 100,
  rotation: 0,
  style: {
    strokeColor: '#000000',
    fillColor: '#4a90d9',
    opacity: 100,
    lineWidth: 2
  }
}

// Two diagonal brush strokes forming an "X" on the right side of the canvas, spanning (650,250)→(750,350).
// Center at canvas (700, 300). Both diagonals cross there, making it a reliable click target.
const INITIAL_BRUSH: DrawableShape = {
  type: 'brush',
  points: [
    [
      [650, 250],
      [670, 270],
      [690, 290],
      [710, 310],
      [730, 330],
      [750, 350]
    ],
    [
      [750, 250],
      [730, 270],
      [710, 290],
      [690, 310],
      [670, 330],
      [650, 350]
    ]
  ],
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  style: {
    strokeColor: '#000000',
    opacity: 100,
    lineWidth: 4
  }
}

// Diagonal line in the center of the canvas from (420,150) to (580,450).
// Midpoint (500,300) lies between the square (left) and brush (right) — no overlap.
// Used to test point move (anchor drag) + translation.
const INITIAL_LINE: DrawableShape = {
  type: 'line',
  points: [
    [420, 150],
    [580, 450]
  ],
  rotation: 0,
  style: {
    strokeColor: '#e74c3c',
    lineWidth: 3
  }
}

// Upward-pointing triangle in the lower-left area, clear of all other shapes.
// Fill required so that clicking inside (not just on the stroke) triggers selection.
const INITIAL_POLYGON: DrawableShape = {
  type: 'polygon',
  points: [
    [150, 420],
    [250, 420],
    [200, 330]
  ],
  rotation: 0,
  style: {
    strokeColor: '#27ae60',
    fillColor: '#2ecc71',
    opacity: 100,
    lineWidth: 2
  }
}

// Closed curve (3 control points) in the lower-right area, clear of all other shapes.
// closedPoints closes the path so the fill area is well-defined for isPointInPath selection.
const INITIAL_CURVE: DrawableShape = {
  type: 'curve',
  points: [
    [750, 410],
    [850, 440],
    [800, 500]
  ],
  rotation: 0,
  style: {
    strokeColor: '#8e44ad',
    fillColor: '#9b59b6',
    opacity: 100,
    lineWidth: 2,
    closedPoints: 1
  }
}

export const SelectRotateResizeTranslate: Story = {
  args: {
    shapes: [INITIAL_SQUARE, INITIAL_BRUSH, INITIAL_LINE, INITIAL_POLYGON, INITIAL_CURVE]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()

    // Helpers to convert logical canvas coordinates (1000×600) to client pixel coordinates.
    // The canvas element may be scaled by CSS (max-width:100%), so we apply the scale factor.
    const { toClientX, toClientY } = makeCoordConverters(rect)

    const user = userEvent.setup()

    // =====================================================================
    // Square: select → rotate 45° → halve size → translate left
    // Bounding box (250,250,100,100), center (300,300).
    // =====================================================================

    // --- Step 1: Select the square ---
    // Filled square → click anywhere inside, e.g. its center at canvas (300, 300).
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(300), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 2: Rotate 45° (π/4 radians) ---
    // Rotate handle center: (borders.x + w/2, borders.y - 14 - 16 + 7) = (300, 227).
    // Drag to (352, 248): atan2(300-248, 300-352) - atan2(300-227, 300-300) = atan2(52,-52) - π/2 = π/4.
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(300), y: toClientY(227) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(352), y: toClientY(248) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(352), y: toClientY(248) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 3: Halve the size via the bottom-right resize handle ---
    // Local handle (350, 350) visually at canvas (300, 371) after π/4 rotation:
    //   rotatePoint({origin:(300,300), point:(350,350), rotation:-π/4}) → (300, 371).
    // Drag to (300, 300) = center → width=50, height=50.
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(300), y: toClientY(371) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(300), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(300), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 4: Translate ~30px to the left ---
    // After resize: 50×50 at (250,250), center at (275, 275). Drag to (245, 275).
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(275), y: toClientY(275) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(245), y: toClientY(275) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(245), y: toClientY(275) } })
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Brush: select → rotate 45° → halve size → translate left
    // Bounding box (650,250,100,100), center (700,300).
    // =====================================================================

    // --- Step 5: Select the brush ---
    // Both diagonals cross at canvas (700, 300); isPointInStroke with effective lineWidth=19px hits there.
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(700), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 6: Rotate 45° ---
    // Rotate handle center: (700, 227). Drag to (752, 248).
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(700), y: toClientY(227) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(752), y: toClientY(248) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(752), y: toClientY(248) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 7: Halve the size ---
    // rotateShape for brush only updates the rotation field (points stay the same when center == selection center).
    // Bounding box stays (650,250,100,100); local handle (750,350) visually at (700, 371) after π/4.
    // Drag to (700, 300) = center → scaleX=0.5, scaleY=0.5.
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(700), y: toClientY(371) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(700), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(700), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 8: Translate ~30px to the left ---
    // After resize: bounding box (650,250,50,50), center at (675, 275). Drag to (645, 275).
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(675), y: toClientY(275) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(645), y: toClientY(275) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(645), y: toClientY(275) } })
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Line: select → move endpoint → translate
    // From (420,150) to (580,450), midpoint (500,300) — between the two shapes.
    // =====================================================================

    // --- Step 9: Select the line ---
    // The midpoint (500, 300) lies exactly on the stroke; isPointInStroke with effective lineWidth=18px hits it.
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(500), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 10: Move endpoint 0 from (420, 150) to (400, 130) ---
    // Anchor 0 rect is centered at (420, 150) with size 14×14; clicking there enters resize mode for that point.
    // resizeLine sets points[0] = roundForGrid(cursor) = (400, 130) (no grid, no rotation on this shape).
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(420), y: toClientY(150) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(400), y: toClientY(130) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(400), y: toClientY(130) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 11: Translate ~30px to the left ---
    // After point move: points = [(400,130),(580,450)], midpoint = (490,290).
    // (490,290) is on the stroke and clear of both anchors → triggers translate mode.
    // Drag to (460,290): translationX = -30.  Final points: [(370,130),(550,450)].
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(490), y: toClientY(290) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(460), y: toClientY(290) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(460), y: toClientY(290) } })
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Polygon: select → move vertex → translate
    // Triangle (150,420)-(250,420)-(200,330), lower-left area. No overlap with other shapes.
    // =====================================================================

    // --- Step 12: Select the polygon ---
    // Filled triangle → click anywhere inside, e.g. centroid at canvas (200, 390).
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(200), y: toClientY(390) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 13: Move vertex 0 from (150, 420) to (130, 440) ---
    // Anchor 0 rect centered at (150, 420); resizePolygon sets points[0] = roundForGrid(cursor) = (130, 440).
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(150), y: toClientY(420) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(130), y: toClientY(440) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(130), y: toClientY(440) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 14: Translate ~30px to the left ---
    // After vertex move: points = [(130,440),(250,420),(200,330)], bounding box (130,330,120,110), center (190,385).
    // (190,385) is inside the bounding box and clear of all anchors → triggers translate via isPartOfRect.
    // Drag to (160,385): translationX = -30. Final points: [(100,440),(220,420),(170,330)].
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(190), y: toClientY(385) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(160), y: toClientY(385) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(160), y: toClientY(385) } })
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Curve: select → move control point → translate
    // Closed curve at (750,410)-(850,440)-(800,500), lower-right area. No overlap with other shapes.
    // =====================================================================

    // --- Step 15: Select the curve ---
    // Closed filled curve → click at its centroid (800, 450); isPointInPath returns true inside the region.
    await selectTool(view, 'selection')
    await new Promise(res => setTimeout(res, 300))

    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(800), y: toClientY(450) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 16: Move control point 0 from (750, 410) to (730, 390) ---
    // resizeCurve is identical to resizePolygon: sets points[0] = roundForGrid(cursor) = (730, 390).
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(750), y: toClientY(410) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(730), y: toClientY(390) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(730), y: toClientY(390) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 17: Translate ~30px to the left ---
    // After point move: points = [(730,390),(850,440),(800,500)], bounding box (730,390,120,110), center (790,445).
    // (790,445) is inside the bounding box and clear of all anchors → isPartOfRect triggers translate.
    // Drag to (760,445): translationX = -30. Final points: [(700,390),(820,440),(770,500)].
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(790), y: toClientY(445) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(760), y: toClientY(445) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(760), y: toClientY(445) } })
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Assertions
    // =====================================================================
    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(5)

    // --- Square assertions (shapes[0]) ---
    const square = data.shapes![0] as { type: string; x: number; y: number; width: number; height: number; rotation: number }
    assertNoInternalFields(data.shapes![0])
    expect(square.type).toBe('square')
    expect(square.rotation).toBeCloseTo(Math.PI / 4, 1)
    expect(square.width).toBeCloseTo(50, 0)
    expect(square.height).toBeCloseTo(50, 0)
    expect(square.x).toBeCloseTo(245, 0)

    // --- Brush assertions (shapes[1]) ---
    const brush = data.shapes![1] as { type: string; points: number[][][]; rotation: number; scaleX: number; scaleY: number }
    assertNoInternalFields(data.shapes![1])
    expect(brush.type).toBe('brush')
    expect(brush.rotation).toBeCloseTo(Math.PI / 4, 1)
    // Rendered bounding box mirrors getBrushBorder: scale points from minX/minY by scaleX/scaleY.
    const pts = brush.points.flat() as number[][]
    const rawMinX = Math.min(...pts.map(p => p[0]!))
    const rawMinY = Math.min(...pts.map(p => p[1]!))
    const renderedWidth = Math.max(...pts.map(p => rawMinX + (p[0]! - rawMinX) * brush.scaleX)) - rawMinX
    const renderedHeight = Math.max(...pts.map(p => rawMinY + (p[1]! - rawMinY) * brush.scaleY)) - rawMinY
    expect(renderedWidth).toBeCloseTo(50, 0)
    expect(renderedHeight).toBeCloseTo(50, 0)
    expect(rawMinX).toBeCloseTo(645, 0)

    // --- Line assertions (shapes[2]) ---
    // After step 10: points[0] moved to (400,130). After step 11: translated by -30 → [(370,130),(550,450)].
    const line = data.shapes![2] as { type: string; points: number[][] }
    assertNoInternalFields(data.shapes![2])
    expect(line.type).toBe('line')
    expect(line.points[0]![0]).toBeCloseTo(370, 0)
    expect(line.points[0]![1]).toBeCloseTo(130, 0)
    expect(line.points[1]![0]).toBeCloseTo(550, 0)
    expect(line.points[1]![1]).toBeCloseTo(450, 0)

    // --- Polygon assertions (shapes[3]) ---
    // After step 13: points[0] moved to (130,440). After step 14: all points translated by -30 in x.
    const polygon = data.shapes![3] as { type: string; points: number[][] }
    assertNoInternalFields(data.shapes![3])
    expect(polygon.type).toBe('polygon')
    expect(polygon.points[0]![0]).toBeCloseTo(100, 0)
    expect(polygon.points[0]![1]).toBeCloseTo(440, 0)
    expect(polygon.points[1]![0]).toBeCloseTo(100, 0)
    expect(polygon.points[1]![1]).toBeCloseTo(440, 0)
    expect(polygon.points[2]![0]).toBeCloseTo(220, 0)
    expect(polygon.points[2]![1]).toBeCloseTo(420, 0)

    // --- Curve assertions (shapes[4]) ---
    // After step 16: points[0] moved to (730,390). After step 17: all points translated by -30 in x.
    const curve = data.shapes![4] as { type: string; points: number[][] }
    assertNoInternalFields(data.shapes![4])
    expect(curve.type).toBe('curve')
    expect(curve.points[0]![0]).toBeCloseTo(700, 0)
    expect(curve.points[0]![1]).toBeCloseTo(390, 0)
    expect(curve.points[1]![0]).toBeCloseTo(760, 0)
    expect(curve.points[1]![1]).toBeCloseTo(445, 0)
    expect(curve.points[2]![0]).toBeCloseTo(820, 0)
    expect(curve.points[2]![1]).toBeCloseTo(440, 0)

    // =====================================================================
    // Group: selection frame → resize ÷2 → rotate ~45° → translate (+100,+50)
    // =====================================================================

    // --- Step 18: Drag selection frame from (10,10) to (990,590) to select all 5 shapes ---
    // Starting in the empty top-left corner ensures no shape is accidentally clicked.
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(10), y: toClientY(10) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(990), y: toClientY(590) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(990), y: toClientY(590) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 19: Halve the group — drag bottom-right anchor (820,500) to group center (460,315) ---
    // Group bbox: (100,130,720,370), center (460,315). widthMultiplier = heightMultiplier = 0.5.
    // keepRatio=true (group contains a square) but the drag is proportional so no distortion.
    // New group bbox: (100,130,360,185), new center (280,222.5).
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(820), y: toClientY(500) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(460), y: toClientY(315) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(460), y: toClientY(315) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 20: Rotate group ~45° ---
    // After resize: bbox (100,130,360,185), center (280,222.5).
    // Rotate handle: top-center (280,130) minus (ANCHOR_SIZE/2 + ROTATED_ANCHOR_POSITION) = 23 → canvas (280,107).
    // Drag to (362,141): atan2(222.5-141, 280-362) - atan2(222.5-107, 280-280) ≈ π/4.
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(280), y: toClientY(107) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(362), y: toClientY(141) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(362), y: toClientY(141) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Step 21: Translate group (+100, +50) ---
    // After rotate, group center is near (280,222). Drag to (380,272).
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(280), y: toClientY(222) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(380), y: toClientY(272) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(380), y: toClientY(272) } })
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Group assertions
    // =====================================================================
    const groupData = getCurrentDataRef.current!()
    expect(groupData.shapes).toHaveLength(5)

    // Square: halved to 25×25, rotation stepped to ~π/2, translated by (+100,+50).
    const squareGroup = groupData.shapes![0] as { type: string; x: number; y: number; width: number; height: number; rotation: number }
    assertNoInternalFields(groupData.shapes![0])
    expect(squareGroup.type).toBe('square')
    expect(squareGroup.width).toBeCloseTo(25, 0)
    expect(squareGroup.height).toBeCloseTo(25, 0)
    expect(squareGroup.rotation).toBeCloseTo(Math.PI / 2, 1)
    expect(squareGroup.x).toBeCloseTo(318, 0)
    expect(squareGroup.y).toBeCloseTo(175, 0)

    // Line: both endpoints scaled ×0.5 relative to group center, rotated ~π/4, then translated (+100,+50).
    // Pre-group: [(370,130),(550,450)]. After resize→rotate→translate: [(414,175),(364,352)].
    const lineGroup = groupData.shapes![2] as { type: string; points: number[][] }
    assertNoInternalFields(groupData.shapes![2])
    expect(lineGroup.type).toBe('line')
    expect(lineGroup.points[0]![0]).toBeCloseTo(414, 0)
    expect(lineGroup.points[0]![1]).toBeCloseTo(175, 0)
    expect(lineGroup.points[1]![0]).toBeCloseTo(364, 0)
    expect(lineGroup.points[1]![1]).toBeCloseTo(352, 0)

    // Polygon: first vertex after all group operations.
    // Pre-group: points[0]=(100,440). After resize→rotate→translate: ≈(209,189).
    const polygonGroup = groupData.shapes![3] as { type: string; points: number[][] }
    assertNoInternalFields(groupData.shapes![3])
    expect(polygonGroup.type).toBe('polygon')
    expect(polygonGroup.points[0]![0]).toBeCloseTo(209, 0)
    expect(polygonGroup.points[0]![1]).toBeCloseTo(189, 0)

    // Curve: first control point after all group operations.
    // Pre-group: points[0]=(700,390). After resize→rotate→translate: ≈(438,384).
    const curveGroup = groupData.shapes![4] as { type: string; points: number[][] }
    assertNoInternalFields(groupData.shapes![4])
    expect(curveGroup.type).toBe('curve')
    expect(curveGroup.points[0]![0]).toBeCloseTo(438, 0)
    expect(curveGroup.points[0]![1]).toBeCloseTo(384, 0)
  }
}

export const StateManagement: Story = {
  args: {
    shapes: [INITIAL_SQUARE]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()

    const { toClientX, toClientY } = makeCoordConverters(rect)

    const user = userEvent.setup()

    // --- Select the square (filled, center at canvas (300, 300)) ---
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(300), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Delete the shape with the Delete key ---
    // The keyboard listener is registered on document when isInsideComponent is true.
    await userEvent.keyboard('{Delete}')
    await new Promise(res => setTimeout(res, 100))

    // --- Assert shape is deleted ---
    expect(getCurrentDataRef.current).not.toBeNull()
    expect(getCurrentDataRef.current!().shapes).toHaveLength(0)

    // --- Undo ---
    await userEvent.click(await view.findByTestId('tool-undo'))
    await new Promise(res => setTimeout(res, 100))

    // --- Assert shape is restored ---
    expect(getCurrentDataRef.current!().shapes).toHaveLength(1)
    const restored = getCurrentDataRef.current!().shapes![0]
    assertNoInternalFields(restored)
    expect((restored as { type: string }).type).toBe('square')

    // --- Redo ---
    await userEvent.click(await view.findByTestId('tool-redo'))
    await new Promise(res => setTimeout(res, 100))

    // --- Assert shape is deleted again ---
    expect(getCurrentDataRef.current!().shapes).toHaveLength(0)
  }
}

export const Commands: Story = {
  args: {
    shapes: [INITIAL_SQUARE]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()

    const { toClientX, toClientY } = makeCoordConverters(rect)

    const user = userEvent.setup()

    // =====================================================================
    // Cut (CTRL+X) + Paste (CTRL+V)
    // INITIAL_SQUARE center: canvas (300, 300).
    // copyShapes translates by +20 → after paste: center (320, 320).
    // =====================================================================

    // --- Select the square ---
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(300), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))

    // --- Cut (CTRL+X): clipboard event dispatched on document ---
    document.dispatchEvent(new ClipboardEvent('cut'))
    await new Promise(res => setTimeout(res, 100))

    // --- Assert shape is removed ---
    expect(getCurrentDataRef.current).not.toBeNull()
    expect(getCurrentDataRef.current!().shapes).toHaveLength(0)

    // --- Paste (CTRL+V): restored with +20 offset, new shape is selected ---
    document.dispatchEvent(new ClipboardEvent('paste'))
    await new Promise(res => setTimeout(res, 100))

    // --- Assert shape is pasted ---
    expect(getCurrentDataRef.current!().shapes).toHaveLength(1)

    // =====================================================================
    // Change pasted shape color to red, then Copy (CTRL+C) + Paste (CTRL+V)
    // After 2nd paste: center (340, 340).
    // =====================================================================

    // --- Change fill color to red (pasted shape is selected) ---
    await setColorSetting(view, 'Couleur de fond', 'red')

    // --- Copy (CTRL+C) ---
    document.dispatchEvent(new ClipboardEvent('copy'))
    await new Promise(res => setTimeout(res, 100))

    // --- Paste (CTRL+V): new copy at +20 offset, selected ---
    document.dispatchEvent(new ClipboardEvent('paste'))
    await new Promise(res => setTimeout(res, 100))

    // --- Assert 2 shapes ---
    expect(getCurrentDataRef.current!().shapes).toHaveLength(2)

    // =====================================================================
    // Change 2nd pasted shape color to yellow, then Duplicate via context menu
    // =====================================================================

    // --- Change fill color to yellow (2nd pasted shape is selected) ---
    await setColorSetting(view, 'Couleur de fond', 'yellow')

    // --- Right-click on the yellow shape (center at canvas (340, 340)) ---
    await openContextMenuAndClick(user, drawCanvas, view, toClientX(340), toClientY(340), 'Duplicate')

    // =====================================================================
    // Assertions: 3 squares total
    // =====================================================================

    expect(getCurrentDataRef.current).not.toBeNull()
    const data = getCurrentDataRef.current!()

    expect(data.shapes).toHaveLength(3)
    for (const shape of data.shapes!) {
      assertNoInternalFields(shape)
      expect((shape as { type: string }).type).toBe('square')
    }
  }
}

// Blue rectangle, left side of canvas. Fill required so that clicks inside select it.
const INITIAL_RECT_LAYER: DrawableShape = {
  type: 'rect',
  x: 150,
  y: 200,
  width: 200,
  height: 150,
  rotation: 0,
  style: {
    strokeColor: '#000000',
    fillColor: 'blue',
    opacity: 100,
    lineWidth: 2
  }
}

// Yellow circle, right side of canvas. x/y is the center.
const INITIAL_CIRCLE_LAYER: DrawableShape = {
  type: 'circle',
  x: 700,
  y: 300,
  radius: 80,
  rotation: 0,
  style: {
    strokeColor: '#000000',
    fillColor: 'yellow',
    opacity: 100,
    lineWidth: 2
  }
}

export const Layers: Story = {
  args: {
    // shapes[0] = rect (drawn first = below), shapes[1] = circle (drawn last = on top)
    shapes: [INITIAL_RECT_LAYER, INITIAL_CIRCLE_LAYER]
  },
  play: async ({ canvasElement }) => {
    const view = within(canvasElement)
    const drawCanvas = await view.findByTestId('draw-canvas')
    const rect = drawCanvas.getBoundingClientRect()
    const { toClientX, toClientY } = makeCoordConverters(rect)
    const user = userEvent.setup()

    // =====================================================================
    // Step 1: Open the layers panel
    // =====================================================================
    await userEvent.click(await view.findByRole('button', { name: 'Toggle layers panel' }))
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Step 2: Swap layers — drag rect (index 0) onto circle (index 1)
    // moveItemPosition(shapes, 0, 1) → [circle, rect]
    // =====================================================================
    const layerItems = canvasElement.querySelectorAll('.react-paint-editor-layout')
    const rectLayerItem = layerItems[0] as HTMLElement
    const circleLayerItem = layerItems[1] as HTMLElement

    // Simulate HTML5 drag-and-drop.
    // Passing a plain object as dataTransfer in the DragEvent constructor fails browser
    // validation. Instead, create each DragEvent without dataTransfer, then shadow the
    // (prototype getter) property with Object.defineProperty on the instance.
    const dt = {
      data: {} as Record<string, string>,
      effectAllowed: 'move' as string,
      setData(type: string, val: string) {
        this.data[type] = val
      },
      getData(type: string) {
        return this.data[type] ?? ''
      }
    }
    const dispatchDrag = (type: string, target: HTMLElement, withDt = true) => {
      const event = new DragEvent(type, { bubbles: true, cancelable: true })
      if (withDt) Object.defineProperty(event, 'dataTransfer', { value: dt, configurable: true })
      target.dispatchEvent(event)
    }
    dispatchDrag('dragstart', rectLayerItem)
    await new Promise(res => setTimeout(res, 50))
    dispatchDrag('dragover', circleLayerItem)
    dispatchDrag('drop', circleLayerItem)
    dispatchDrag('dragend', rectLayerItem, false)
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Assert order changed: shapes[0]=circle, shapes[1]=rect
    // =====================================================================
    expect(getCurrentDataRef.current).not.toBeNull()
    let data = getCurrentDataRef.current!()
    expect(data.shapes).toHaveLength(2)
    expect((data.shapes![0] as { type: string }).type).toBe('circle')
    expect((data.shapes![1] as { type: string }).type).toBe('rect')

    // =====================================================================
    // Step 3: Toggle circle visibility (hide) and lock the rect
    // Layer items have been re-rendered in new order: [0]=circle, [1]=rect.
    // shape.visible is undefined by default → title='Show'; clicking sets visible=false.
    // shape.locked is undefined by default → title='Unlocked'; clicking sets locked=true.
    // =====================================================================
    const updatedLayerItems = canvasElement.querySelectorAll('.react-paint-editor-layout')
    const circleLayerItemUpdated = updatedLayerItems[0] as HTMLElement
    const rectLayerItemUpdated = updatedLayerItems[1] as HTMLElement

    const circleVisibilityBtn = circleLayerItemUpdated.querySelector('.react-paint-editor-layouts-visible-button') as HTMLElement
    await userEvent.click(circleVisibilityBtn)
    await new Promise(res => setTimeout(res, 100))

    const rectLockBtn = rectLayerItemUpdated.querySelector('.react-paint-editor-layouts-locked-button') as HTMLElement
    await userEvent.click(rectLockBtn)
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Assert visibility and lock state
    // =====================================================================
    data = getCurrentDataRef.current!()
    const circleShape = data.shapes![0] as { type: string; visible?: boolean; x: number; y: number }
    const rectShape = data.shapes![1] as { type: string; locked?: boolean; x: number; y: number }
    assertNoInternalFields(data.shapes![0])
    assertNoInternalFields(data.shapes![1])
    expect(circleShape.type).toBe('circle')
    expect(circleShape.visible).toBe(false)
    expect(rectShape.type).toBe('rect')
    expect(rectShape.locked).toBe(true)

    // =====================================================================
    // Step 4: Try to select and move the circle (hidden but not locked → succeeds)
    // Circle center at canvas (700, 300). Drag 50px left to (650, 300).
    // Hidden shapes are excluded from rendering but NOT from hit-testing.
    // =====================================================================
    await selectTool(view, 'selection')
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(700), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(700), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(650), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(650), y: toClientY(300) } })
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Step 5: Try to select and move the rect (visible but locked → fails)
    // Locked shapes are excluded from hover detection — clicking has no effect.
    // Rect center at canvas (250, 275). Attempted drag 50px right to (300, 275).
    // =====================================================================
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft]', coords: { x: toClientX(250), y: toClientY(275) } })
    await new Promise(res => setTimeout(res, 100))
    await user.pointer({ target: drawCanvas, keys: '[MouseLeft>]', coords: { x: toClientX(250), y: toClientY(275) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, coords: { x: toClientX(300), y: toClientY(275) } })
    await new Promise(res => setTimeout(res, 50))
    await user.pointer({ target: drawCanvas, keys: '[/MouseLeft]', coords: { x: toClientX(300), y: toClientY(275) } })
    await new Promise(res => setTimeout(res, 100))

    // =====================================================================
    // Final assertions: circle moved, rect did not
    // =====================================================================
    data = getCurrentDataRef.current!()
    const finalCircle = data.shapes![0] as { type: string; x: number; y: number }
    const finalRect = data.shapes![1] as { type: string; x: number; y: number }

    expect(finalCircle.type).toBe('circle')
    expect(finalCircle.x).toBeCloseTo(650, 0) // moved 50px left
    expect(finalCircle.y).toBeCloseTo(300, 0)

    expect(finalRect.type).toBe('rect')
    expect(finalRect.x).toBeCloseTo(150, 0) // unchanged (locked)
    expect(finalRect.y).toBeCloseTo(200, 0)
  }
}
