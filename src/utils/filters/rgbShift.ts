import type { Filter, FilterFunction, LSelection } from "~/types"
import { Color } from "../color"

export const rgbShift: FilterFunction = ({ imageCanvas, layer, area }) => {
  const selection = layer.selection as LSelection<Filter.RGBShift>
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
    const { red, blue, green, normalizeRGBValue } = new Color(data.slice(index, index + 4), index)
    const intensity = selection.config.intensity

    // vibrannce used to boost colors that are less saturated and boost already
    // saturated colors less
    if (selection.config.effect === "Vibrance") {
      const max = Math.max(red, green, blue)
      const avg = (red + green + blue) / 3
      const amt = (((Math.abs(max - avg) * 2) / 255) * -intensity) / 100
      if (red !== max) {
        data[index] = red + (max - red) * amt
      }
      if (green !== max) {
        data[index + 1] = green + (max - green) * amt
      }
      if (blue !== max) {
        data[index + 2] = blue + (max - blue) * amt
      }
    } else {
      // and we have separated shift option for red, green and blue, as you expected
      // this condition is only used to boost single color
      if (selection.config.effect === "Red") {
        data[index] = normalizeRGBValue(red + intensity)
        data[index + 1] = normalizeRGBValue(green - intensity)
        data[index + 2] = normalizeRGBValue(blue - intensity)
      } else if (selection.config.effect === "Green") {
        data[index] = normalizeRGBValue(red - intensity)
        data[index + 1] = normalizeRGBValue(green + intensity)
        data[index + 2] = normalizeRGBValue(blue - intensity)
      } else if (selection.config.effect === "Blue") {
        data[index] = normalizeRGBValue(red - intensity)
        data[index + 1] = normalizeRGBValue(green - intensity)
        data[index + 2] = normalizeRGBValue(blue + intensity)
      }
    }
  }

  imageCanvas.putImageData(wholeImage, 0, 0)

  return {
    updatedSelection: layer.selection
  }
}
