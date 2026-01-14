import type { Filter, FilterFunction, LSelection } from "~/types"
import { adjustBrightness, adjustContrast, adjustGrayscale, parseHexToRGB } from "../image"

export const duotoneFilter: FilterFunction = ({ imageCanvas, layer, selectionArea }) => {
  const selection = layer.selection as LSelection<Filter.Duotone>
  const { width, height } = imageCanvas.canvas
  const image = imageCanvas.getImageData(0, 0, width, height)
  const data = image.data

  adjustBrightness(data, selectionArea, selection.config.brightness)
  adjustGrayscale(data, selectionArea, 1)
  adjustContrast(data, selectionArea, selection.config.contrast)

  // apply highlights tone with multiply blend
  const highlightColor = parseHexToRGB(selection.config.highlightsColor)
  for (let i = 0; i < selectionArea.length; i++) {
    const index = selectionArea[i] * 4
    data[index] = (data[index] * highlightColor.r) / 255
    data[index + 1] = (data[index + 1] * highlightColor.g) / 255
    data[index + 2] = (data[index + 2] * highlightColor.b) / 255
  }

  // apply shadows tone with lighten blend
  const shadowsColor = parseHexToRGB(selection.config.shadowsColor)
  for (let i = 0; i < selectionArea.length; i++) {
    const index = selectionArea[i] * 4
    data[index] = Math.max(data[index], shadowsColor.r)
    data[index + 1] = Math.max(data[index + 1], shadowsColor.g)
    data[index + 2] = Math.max(data[index + 2], shadowsColor.b)
  }

  imageCanvas.putImageData(image, 0, 0)

  return { updatedSelection: layer.selection }
}
