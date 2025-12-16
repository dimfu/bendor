import type { Filter, FilterFunction, LSelection } from "~/types"
import { Color } from "../color"

export const brightnessFilter: FilterFunction = ({ imageCanvas, layer, selectionArea }) => {
  const selection = layer.selection as LSelection<Filter.Brightness>
  const wholeImage = imageCanvas.getImageData(0, 0, imageCanvas.canvas.width, imageCanvas.canvas.height)
  const data = wholeImage.data

  for (let i = 0; i < selectionArea.length; i++) {
    const index = selectionArea[i] * 4
    const { red, blue, green } = new Color(data.slice(index, index + 4))
    data[index] = red * selection.config.intensity
    data[index + 1] = green * selection.config.intensity
    data[index + 2] = blue * selection.config.intensity
  }

  imageCanvas.putImageData(wholeImage, 0, 0)

  return { updatedSelection: layer.selection }
}
