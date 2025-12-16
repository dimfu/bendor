import type { Filter, FilterFunction, LSelection } from "~/types"
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

export const asSoundFilter: FilterFunction = ({ imageCanvas, layer, selectionArea }) => {
  const selection = layer.selection as LSelection<Filter.AsSound>
  const { width, height } = imageCanvas.canvas
  const img = imageCanvas.getImageData(0, 0, width, height)
  const data = img.data

  // use the whole image data to generate the sound
  const selections = new Uint8Array(width * height)
  selections.fill(1)

  let cache: Uint8ClampedArray

  if (selection.config.cache.length === 0) {
    cache = generateSoundCache(data, selectionArea, width, height)
  } else {
    cache = selection.config.cache
  }

  applyFilter(data, cache, selectionArea, selection.config.blend)
  imageCanvas.putImageData(img, 0, 0)

  return {
    updatedSelection: {
      ...layer.selection,
      config: { ...selection.config, cache }
    } as LSelection<Filter.AsSound>
  }
}

const generateSoundCache = (data: Uint8ClampedArray, selectionArea: Uint32Array, width: number, height: number): Uint8ClampedArray => {
  const freqs: number[] = []
  const amps: number[] = []
  // some shit i dont fucking understand, but from what I understand it takes the
  // normalized RGB value and treat it as an amplitude
  // https://github.com/RecursiveVoid/pixeltonejs/blob/main/src/core/mappers/PixelToFrequencyMapper.ts
  for (let i = 0; i < selectionArea.length; i++) {
    const index = selectionArea[i] * 4
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

  const cache = new Uint8ClampedArray(width * height * 4)
  const chunkSize = wavBytes.length
  for (let i = 0; i < cache.length; i += chunkSize) {
    const remaining = cache.length - i
    if (remaining >= chunkSize) {
      cache.set(wavBytes, i)
    } else {
      cache.set(wavBytes.subarray(0, remaining), i)
    }
  }
  return cache
}

const applyFilter = (data: Uint8ClampedArray, cache: Uint8ClampedArray, selectionArea: Uint32Array, blend: number) => {
  for (let i = 0; i < selectionArea.length; i++) {
    const index = selectionArea[i] * 4
    data[index] = data[index] * (1 - blend) + cache[index] * blend
    data[index + 1] = data[index + 1] * (1 - blend) + cache[index + 1] * blend
    data[index + 2] = data[index + 2] * (1 - blend) + cache[index + 2] * blend
  }
}
