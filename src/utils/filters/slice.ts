import type { Filter, FilterFunction, LSelection } from "~/types"
import { Color } from "../color"

export const slice: FilterFunction = ({ layer, imageCanvas, selectionArea }) => {
  const selection = layer.selection as LSelection<Filter.Slice>
  const img = imageCanvas.getImageData(0, 0, imageCanvas.canvas.width, imageCanvas.canvas.height)
  const data = img.data

  const width = imageCanvas.canvas.width
  const height = imageCanvas.canvas.height

  const distortion = selection.config.intensity / 10

  let sliceAmt = -1

  const slicedData = new Uint8ClampedArray(data.length)
  slicedData.set(data)

  for (let x = 0; x < width; x++) {
    if (Math.random() > 0.95) {
      sliceAmt = Math.floor(((1.0 - distortion) * Math.random() + distortion) * height)
    }
    if (Math.random() > 0.95) {
      sliceAmt = 0
    }
    for (let y = 0; y < height; y++) {
      const index = (y * width + x) * 4
      let rowOffsetStart = y + sliceAmt
      if (rowOffsetStart > height - 1) {
        rowOffsetStart = rowOffsetStart - height
      }
      const rowOffsetEnd = (x + rowOffsetStart * width) * 4
      for (let k = 0; k < 4; k++) {
        if (rowOffsetEnd + k < 0 || rowOffsetEnd + k > slicedData.length) {
          continue
        }
        slicedData[rowOffsetEnd + k] = slicedData[index + k]
      }
    }
  }

  for (let i = 0; i < selectionArea.length; i++) {
    const index = selectionArea[i] * 4
    const { red, green, blue } = new Color(slicedData.slice(index, index + 4))
    data[index] = red
    data[index + 1] = green
    data[index + 2] = blue
  }

  imageCanvas.putImageData(img, 0, 0)

  return {
    updatedSelection: layer.selection
  }
}
