import type { Filter, FilterFunction, LSelection, Point } from "~/types"
import { Color } from "../color"

export const fractalPixelSortFilter: FilterFunction = ({ imageCanvas, layer, area, refresh }) => {
  const selection = layer.selection as LSelection<Filter.FractalPixelSort>
  let cache: Uint8ClampedArray

  if (selection.config.cache.length === 0 || refresh) {
    cache = generateFractalCache(imageCanvas, selection.config.intensity)
  } else {
    cache = selection.config.cache
  }

  applyFilter(imageCanvas, cache, area)

  return {
    updatedSelection: {
      ...layer.selection,
      config: { ...selection.config, cache }
    } as LSelection<Filter.FractalPixelSort>
  }
}

const generateFractalCache = (
  imageCanvas: CanvasRenderingContext2D,
  intensity: number
): Uint8ClampedArray => {
  const wholeImage = imageCanvas.getImageData(
    0,
    0,
    imageCanvas.canvas.width,
    imageCanvas.canvas.height
  )
  const cache = new Uint8ClampedArray(wholeImage.data)

  // sort by intensity pass
  for (let i = cache.length - 1; i > 0; i--) {
    if (cache[(i * intensity) % cache.length] < cache[i]) {
      cache[i] = cache[(i * intensity) % cache.length]
    }
  }

  // pixel shift pass
  const fullWidth = imageCanvas.canvas.width
  const fullHeight = imageCanvas.canvas.height
  const leftSide = Math.round(Math.random() * (fullWidth - 10) + 10)
  const rightSide = Math.round(Math.random() * (fullWidth - 10) + leftSide)

  for (let i = 0; i < fullHeight; i++) {
    for (let j = 0; j < fullWidth; j++) {
      const index = (j + i * fullWidth) * 4
      const { red, blue, green } = new Color(cache.slice(index, index + 4))
      const shiftDirection = Math.floor(Math.random() * 2)

      applyColorShift(cache, index, leftSide, rightSide, shiftDirection, red, green, blue)
    }
  }

  return cache
}

const applyColorShift = (
  cache: Uint8ClampedArray,
  index: number,
  leftSide: number,
  rightSide: number,
  direction: number,
  r: number,
  g: number,
  b: number
) => {
  if (direction === 0) {
    if (index + leftSide + 1 > cache.length - 1) return

    if (rightSide % 3 === 0) {
      cache[index] = b
      cache[index + leftSide] = r
      cache[index + leftSide + 1] = g
    } else if (rightSide % 3 === 1) {
      cache[index] = r
      cache[index + leftSide] = b
      cache[index + leftSide + 1] = g
    } else {
      cache[index] = r
      cache[index + leftSide] = b
    }
  } else {
    if (index - leftSide < 0) return

    if (rightSide % 3 === 0) {
      cache[index] = b
      cache[index - leftSide] = g
      cache[index - leftSide + 1] = r
    } else if (rightSide % 3 === 1) {
      cache[index + 1] = b
      cache[index - leftSide] = b
    } else {
      cache[index] = g
      cache[index - leftSide] = b
      cache[index - leftSide + 1] = r
    }
  }
}

const applyFilter = (
  imageCanvas: CanvasRenderingContext2D,
  cache: Uint8ClampedArray,
  area: Point[]
) => {
  const wholeImage = imageCanvas.getImageData(
    0,
    0,
    imageCanvas.canvas.width,
    imageCanvas.canvas.height
  )
  const data = wholeImage.data
  const fullWidth = imageCanvas.canvas.width

  for (const { x, y } of area) {
    const index = (y * fullWidth + x) * 4
    const { red, blue, green } = new Color(cache.slice(index, index + 4))
    data[index] = red
    data[index + 1] = blue
    data[index + 2] = green
  }

  imageCanvas.putImageData(wholeImage, 0, 0)
}
