import type { Point } from "../types"

// retrieve pixel data from area inside the selection points
export const getAreaData = (ctx: CanvasRenderingContext2D, selectionMask: Uint8Array): Point[] => {
  const { data, width } = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)

  const result: Point[] = []

  for (let index = 0; index < selectionMask.length; index++) {
    if (selectionMask[index] === 0) continue

    const x = index % width
    const y = Math.floor(index / width)

    const pixelOffset = index * 4
    const channel = new Uint8Array([
      data[pixelOffset],
      data[pixelOffset + 1],
      data[pixelOffset + 2],
      data[pixelOffset + 3]
    ])

    result.push({
      x,
      y,
      data: channel
    })
  }

  return result
}
export const getMouseCanvasCoordinates = (
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
) => {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: Math.round((clientX - rect.left) * scaleX),
    y: Math.round((clientY - rect.top) * scaleY)
  }
}

export const getPointsBoundingBox = (points: Point[]) => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const { x, y } of points) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }

  const width = maxX - minX + 1
  const height = maxY - minY + 1
  return [width, height, minX, minY]
}

interface ICursorInBoundingBox {
  drawing: {
    minX: number
    minY: number
    width: number
    height: number
  }
  mouse: {
    x: number
    y: number
  }
}

export const cursorInBoundingBox = (opts: ICursorInBoundingBox) => {
  const {
    drawing: { width, height, minX, minY },
    mouse
  } = opts
  return mouse.x >= minX && mouse.x <= minX + width && mouse.y >= minY && mouse.y <= minY + height
}
