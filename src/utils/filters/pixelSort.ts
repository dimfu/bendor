import type { Filter, FilterFunction, LSelection } from "~/types"
import { Color } from "../color"

export const pixelSort: FilterFunction = ({ imageCanvas, layer, selectionArea, refresh }) => {
  const img = imageCanvas.getImageData(0, 0, imageCanvas.canvas.width, imageCanvas.canvas.height)
  const data = img.data
  const width = imageCanvas.canvas.width
  const height = imageCanvas.canvas.height
  const selection = layer.selection as LSelection<Filter.PixelSort>
  const intensity = selection.config.intensity
  const direction = selection.config.direction

  let sortedData: Uint8ClampedArray

  if (selection.config.cache.length === 0 || refresh) {
    sortedData = new Uint8ClampedArray(data.length)
    sortedData.set(data)

    if (direction === "Vertical") {
      sortVertically(sortedData, width, height, intensity)
    } else {
      sortHorizontally(sortedData, width, height, intensity)
    }
  } else {
    sortedData = selection.config.cache
  }

  for (let i = 0; i < selectionArea.length; i++) {
    const index = selectionArea[i] * 4
    const { red, green, blue } = new Color(sortedData.slice(index, index + 4))
    data[index] = red
    data[index + 1] = green
    data[index + 2] = blue
  }

  imageCanvas.putImageData(img, 0, 0)

  return {
    updatedSelection: selection
  }
}

const sortVertically = (sortedData: Uint8ClampedArray, width: number, height: number, intensity: number) => {
  for (let x = 0; x < width; x++) {
    let pixelsToSort: { color: Color; y: number }[] = []
    let newVerticalPixelColumn: boolean = true
    let currentPixelPosition: number = -1

    for (let y = 0; y < height; y++) {
      const index = (y * width + x) * 4
      const color = new Color(sortedData.slice(index, index + 4))

      if (color.brightness() > intensity / 100) {
        // pixel too bright, no sort
        if (!newVerticalPixelColumn && pixelsToSort.length > 0) {
          // Sort by brightness
          pixelsToSort.sort((a, b) => {
            const brightA = a.color.brightness()
            const brightB = b.color.brightness()
            return brightA - brightB
          })

          // write sorted pixels back
          for (let j = 0; j < pixelsToSort.length; j++) {
            const writeIndex = ((j + currentPixelPosition) * width + x) * 4
            sortedData[writeIndex] = pixelsToSort[j].color.red
            sortedData[writeIndex + 1] = pixelsToSort[j].color.green
            sortedData[writeIndex + 2] = pixelsToSort[j].color.blue
          }

          // Reset
          pixelsToSort = []
          newVerticalPixelColumn = true
        }
      } else {
        // pixel too dark, add to sort group
        if (newVerticalPixelColumn) {
          currentPixelPosition = y
          newVerticalPixelColumn = false
        }
        pixelsToSort.push({ color, y })
      }
    }

    // handle remaining pixels at end of column
    if (!newVerticalPixelColumn && pixelsToSort.length > 0) {
      pixelsToSort.sort((a, b) => {
        const brightA = a.color.brightness()
        const brightB = b.color.brightness()
        return brightA - brightB
      })

      for (let i = 0; i < pixelsToSort.length; i++) {
        const writeIndex = ((i + currentPixelPosition) * width + x) * 4
        sortedData[writeIndex] = pixelsToSort[i].color.red
        sortedData[writeIndex + 1] = pixelsToSort[i].color.green
        sortedData[writeIndex + 2] = pixelsToSort[i].color.blue
      }
    }
  }
}

const sortHorizontally = (sortedData: Uint8ClampedArray, width: number, height: number, intensity: number) => {
  for (let y = 0; y < height; y++) {
    let pixelsToSort: { color: Color; y: number }[] = []
    let newHorizontalPixelRow: boolean = true
    let currentPixelPosition: number = -1

    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      const color = new Color(sortedData.slice(index, index + 4))

      if (color.brightness() > intensity / 100) {
        // pixel too bright, no sort
        if (!newHorizontalPixelRow && pixelsToSort.length > 0) {
          // sort by brightness
          pixelsToSort.sort((a, b) => {
            const brightA = a.color.brightness()
            const brightB = b.color.brightness()
            return brightA - brightB
          })

          for (let j = 0; j < pixelsToSort.length; j++) {
            const writeIndex = (y * width + (j + currentPixelPosition)) * 4
            sortedData[writeIndex] = pixelsToSort[j].color.red
            sortedData[writeIndex + 1] = pixelsToSort[j].color.green
            sortedData[writeIndex + 2] = pixelsToSort[j].color.blue
          }

          pixelsToSort = []
          newHorizontalPixelRow = true
        }
      } else {
        // pixel too dark, add to sort group
        if (newHorizontalPixelRow) {
          currentPixelPosition = x
          newHorizontalPixelRow = false
        }
        pixelsToSort.push({ color, y })
      }
    }

    // handle remaining pixels at end of row
    if (!newHorizontalPixelRow && pixelsToSort.length > 0) {
      pixelsToSort.sort((a, b) => {
        const brightA = a.color.brightness()
        const brightB = b.color.brightness()
        return brightA - brightB
      })

      for (let i = 0; i < pixelsToSort.length; i++) {
        const writeIndex = (y * width + (i + currentPixelPosition)) * 4
        sortedData[writeIndex] = pixelsToSort[i].color.red
        sortedData[writeIndex + 1] = pixelsToSort[i].color.green
        sortedData[writeIndex + 2] = pixelsToSort[i].color.blue
      }
    }
  }
}
