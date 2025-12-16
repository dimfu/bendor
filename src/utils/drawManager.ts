import type { Layer, Point } from "~/types"

class DrawManager {
  // ordered list of selection points from the user mouse movement
  points: Point[] = []
  // the first point of the current draw operation
  startPoint: Point | null = null
  // to keep track of the mouse starting coordinate relative to the drawing on
  // first drawing movement
  mouseStartPos = { x: 0, y: 0 }
  // the area inside the selection points, length must be equal cwidth * cheight
  selectionArea: Uint8Array | null = null
  isDrawing = false
  // canvas dimension, must be set after loading an image
  cwidth = 0
  cheight = 0

  begin(startPoint: Point) {
    this.isDrawing = true
    this.startPoint = startPoint
    this.points = [startPoint]
    // initialize selectionArea if the drawing canvas is a clean slate
    if (!this.selectionArea) {
      this.selectionArea = new Uint8Array(this.cwidth * this.cheight)
    }
  }

  update(point: Point) {
    if (!this.isDrawing) return
    this.points.push(point)
  }

  finish() {
    if (!this.isDrawing) return
    if (this.points.length <= 1) {
      this.selectAllArea()
    }
    this.isDrawing = false
  }

  reset() {
    this.points = []
    this.startPoint = null
    this.selectionArea = null
    this.isDrawing = false
  }

  loadSelection(points: Point[], startPoint: Point) {
    this.points = points
    this.startPoint = startPoint
  }

  selectAllArea() {
    // use the canvas edges as the selection points
    this.points = [
      { x: 0, y: 0 },
      { x: this.cwidth - 1, y: 0 },
      { x: this.cwidth - 1, y: this.cheight - 1 },
      { x: 0, y: this.cheight - 1 }
    ]
    this.startPoint = this.points[0]
  }

  fillSelectionArea(area: Point[]) {
    this.selectionArea = new Uint8Array(this.cwidth * this.cheight)
    for (const a of area) {
      const index = a.y * this.cwidth + a.x
      this.selectionArea[index] = 1
    }
  }

  // get selection area that are inside the drawing points
  getSelectArea() {
    if (this.points.length <= 1) return
    // reset the selection area so we get fresh new result on the drawing canvas
    this.selectionArea = new Uint8Array(this.cwidth * this.cheight)
    for (let x = 0; x < this.cwidth; x++) {
      for (let y = 0; y < this.cheight; y++) {
        if (this.pointInPolygon({ x, y }, this.points)) {
          const index = y * this.cwidth + x
          this.selectionArea[index] = 1
        }
      }
    }
  }

  getSelectedAreaCoords(): Uint32Array | null {
    if (!this.selectionArea) return null

    const mask = this.selectionArea
    let count = 0

    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === 1) count++
    }

    const result = new Uint32Array(count)
    let ptr = 0
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === 1) {
        result[ptr++] = i
      }
    }

    return result
  }

  moveSelection(dx: number, dy: number) {
    this.points = this.points.map((point) => {
      return {
        x: point.x + dx,
        y: point.y + dy,
        data: point.data
      }
    })
    this.startPoint = {
      x: this.startPoint!.x + dx,
      y: this.startPoint!.y + dy
    }
  }

  getPointsBoundingBox() {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const { x, y } of this.points) {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }

    const width = maxX - minX + 1
    const height = maxY - minY + 1
    return [width, height, minX, minY]
  }

  pointInPolygon(point: Point, polygon: Point[]) {
    let inside = false
    let j = polygon.length - 1

    for (let i = 0; i < polygon.length; i++) {
      const xi = polygon[i].x
      const yi = polygon[i].y
      const xj = polygon[j].x
      const yj = polygon[j].y

      const intersects = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi

      if (intersects) inside = !inside
      j = i
    }

    return inside
  }

  renderSelection(ctx: CanvasRenderingContext2D, element: HTMLCanvasElement, color: Layer["color"]) {
    if (!this.startPoint) {
      return
    }
    ctx.clearRect(0, 0, element.width, element.height)
    ctx.setLineDash([5, 3])
    ctx.strokeStyle = color
    const toRgb = color
      .replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (_, r, g, b) => `#${r}${r}${g}${g}${b}${b}`)
      .substring(1)
      .match(/.{2}/g)
      ?.map((x) => parseInt(x, 16)) ?? [0, 0, 0]
    ctx.fillStyle = `rgb(${toRgb[0]}, ${toRgb[1]}, ${toRgb[2]}, 0.3)`
    ctx.lineWidth = 2
    ctx.beginPath()

    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i]
      if (i === 0) {
        ctx.moveTo(point.x, point.y)
      } else {
        ctx.lineTo(point.x, point.y)
      }
    }

    ctx.lineTo(this.startPoint.x, this.startPoint.y)
    ctx.fill()
    ctx.stroke()
    ctx.closePath()
    ctx.setLineDash([])
  }
}

export default DrawManager
