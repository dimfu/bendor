import type { Point } from "../types"

// retrieve pixel data from area inside the selection points
export const getAreaData = (ctx: CanvasRenderingContext2D, selectionMask: Uint8Array): Point[] => {
  const { width } = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)

  const result: Point[] = []

  for (let index = 0; index < selectionMask.length; index++) {
    if (selectionMask[index] === 0) continue

    const x = index % width
    const y = Math.floor(index / width)

    result.push({
      x,
      y,
    })
  }

  return result
}
export const getMouseCanvasCoordinates = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: Math.round((clientX - rect.left) * scaleX),
    y: Math.round((clientY - rect.top) * scaleY)
  }
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
