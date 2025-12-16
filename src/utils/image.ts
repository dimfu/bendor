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
