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
