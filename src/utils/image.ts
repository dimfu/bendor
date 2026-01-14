import { Color } from "./color"

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

export const parseHexToRGB = (hexColor: `#${string}`) => {
  const hex = hexColor.replace("#", "")
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16)
  }
}

export const adjustBrightness = (data: ImageDataArray, selectionArea: Uint32Array<ArrayBufferLike>, intensity: number) => {
  for (let i = 0; i < selectionArea.length; i++) {
    const index = selectionArea[i] * 4
    const { red, blue, green } = new Color(data.slice(index, index + 4))
    data[index] = red * intensity
    data[index + 1] = green * intensity
    data[index + 2] = blue * intensity
  }
}

export const adjustGrayscale = (data: ImageDataArray, selectionArea: Uint32Array<ArrayBufferLike>, intensity: number) => {
  for (let i = 0; i < selectionArea.length; i++) {
    const index = selectionArea[i] * 4
    const { red, blue, green } = new Color(data.slice(index, index + 4))
    const avg = Math.round((0.299 * red + 0.587 * green + 0.114 * blue) * 1)

    data[index] = red * (1 - intensity) + avg * intensity
    data[index + 1] = green * (1 - intensity) + avg * intensity
    data[index + 2] = blue * (1 - intensity) + avg * intensity
  }
}

export const adjustContrast = (data: ImageDataArray, selectionArea: Uint32Array<ArrayBufferLike>, intensity: number) => {
  intensity *= 2.55
  const factor = (255 + intensity) / (255.01 - intensity)
  for (let i = 0; i < selectionArea.length; i++) {
    const index = selectionArea[i] * 4
    const { red, blue, green } = new Color(data.slice(index, index + 4))
    data[index] = factor * (red - 128) + 128
    data[index + 1] = factor * (green - 128) + 128
    data[index + 2] = factor * (blue - 128) + 128
  }
}
