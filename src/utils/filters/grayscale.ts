import type { Filter, FilterFunction, LSelection } from "~/types"
import { Color } from "../color"

export const grayscaleFilter: FilterFunction = ({ imageCanvas, layer, selectionArea }) => {
  const selection = layer.selection as LSelection<Filter.Grayscale>
  const wholeImage = imageCanvas.getImageData(0, 0, imageCanvas.canvas.width, imageCanvas.canvas.height)
  const data = wholeImage.data

  for (let i = 0; i < selectionArea.length; i++) {
    const index = selectionArea[i] * 4
    const { red, blue, green } = new Color(data.slice(index, index + 4))
    const avg = (red + green + blue) / 3

    data[index] = red * (1 - selection.config.intensity) + avg * selection.config.intensity
    data[index + 1] = green * (1 - selection.config.intensity) + avg * selection.config.intensity
    data[index + 2] = blue * (1 - selection.config.intensity) + avg * selection.config.intensity
  }

  imageCanvas.putImageData(wholeImage, 0, 0)

  return { updatedSelection: layer.selection }
}
