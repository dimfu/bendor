import type { Filter, FilterFunction, LSelection, Point } from "~/types"
import { getAreaData } from "../image"
import {
  applyAudioDistortions,
  audioSamplesToWAV,
  DEFAULT_DURATION,
  DEFAULT_RGB_FREQUENCY_RANGES,
  DEFAULT_SAMPLE_RATE,
  generateAsSineWave,
  mapFrequencies,
  rgbToUnitRange
} from "../sound"

export const asSoundFilter: FilterFunction = ({ imageCanvas, layer, area }) => {
  const selection = layer.selection as LSelection<Filter.AsSound>
  const img = imageCanvas.getImageData(0, 0, imageCanvas.canvas.width, imageCanvas.canvas.height)
  const data = img.data

  let cache: Uint8ClampedArray

  if (selection.config.cache.length === 0) {
    cache = generateSoundCache(imageCanvas, data)
  } else {
    cache = selection.config.cache
  }

  applyFilter(data, cache, area, imageCanvas.canvas.width, selection.config.blend)
  imageCanvas.putImageData(img, 0, 0)

  return {
    updatedSelection: {
      ...layer.selection,
      config: { ...selection.config, cache }
    } as LSelection<Filter.AsSound>
  }
}

const generateSoundCache = (
  imageCanvas: CanvasRenderingContext2D,
  data: Uint8ClampedArray
): Uint8ClampedArray => {
  const freqs: number[] = []
  const amps: number[] = []

  // use the whole image data to generate the sound
  const selections = new Uint8Array(imageCanvas.canvas.width * imageCanvas.canvas.height)
  selections.fill(1)
  const newArea = getAreaData(imageCanvas, selections)

  // some shit i dont fucking understand, but from what I understand it takes the
  // normalized RGB value and treat it as an amplitude
  // https://github.com/RecursiveVoid/pixeltonejs/blob/main/src/core/mappers/PixelToFrequencyMapper.ts
  for (const { x, y } of newArea) {
    const index = (y * imageCanvas.canvas.width + x) * 4
    const rgb = rgbToUnitRange(new Uint8Array([data[index], data[index + 1], data[index + 2]]))

    mapFrequencies([
      { value: rgb[0], range: DEFAULT_RGB_FREQUENCY_RANGES.r },
      { value: rgb[1], range: DEFAULT_RGB_FREQUENCY_RANGES.g },
      { value: rgb[2], range: DEFAULT_RGB_FREQUENCY_RANGES.b }
    ]).forEach((value) => amps.push(value))

    freqs.push(rgb[0], rgb[1], rgb[2])
  }

  const audioSamples = generateAsSineWave(freqs, amps, DEFAULT_DURATION, DEFAULT_SAMPLE_RATE)
  if (!audioSamples) return new Uint8ClampedArray()

  const sampledDistortions = applyAudioDistortions(audioSamples)
  const wavBytes = audioSamplesToWAV(sampledDistortions, DEFAULT_SAMPLE_RATE)

  const cache = new Uint8ClampedArray(imageCanvas.canvas.width * imageCanvas.canvas.height * 4)
  for (let i = 0; i < cache.length; i++) {
    cache[i] = wavBytes[i % wavBytes.length]
  }

  return cache
}

const applyFilter = (
  data: Uint8ClampedArray,
  cache: Uint8ClampedArray,
  area: Point[],
  width: number,
  blend: number
) => {
  for (const { x, y } of area) {
    const index = (y * width + x) * 4
    data[index] = data[index] * (1 - blend) + cache[index] * blend
    data[index + 1] = data[index + 1] * (1 - blend) + cache[index + 1] * blend
    data[index + 2] = data[index + 2] * (1 - blend) + cache[index + 2] * blend
  }
}
