const DEFAULT_SAMPLE_RATE = 44100
const DEFAULT_DURATION = 0.0001
const DEFAULT_RGB_FREQUENCY_RANGES = {
  r: { min: 30.0, max: 500.0, offset: 60.0 },
  g: { min: 500.0, max: 2000.0, offset: 250.0 },
  b: { min: 2000.0, max: 10000.0, offset: 1000.0 }
}

type FrequencyMapperOptions = {
  value: number
  range: (typeof DEFAULT_RGB_FREQUENCY_RANGES)["r"]
}

// since audio processing are typically in range of -1 to 1, I had to make this function so that
// the image data value are easier to work on when converting it to audio format
const rgbToUnitRange = (channel: Uint8Array) => {
  const [r, g, b, a] = channel
  return [r / 255, g / 255, b / 255, a]
}

const mapFrequencies = (freqOptions: FrequencyMapperOptions[]) => {
  return freqOptions.map((opt) => {
    const { value, range } = opt
    const { offset, min, max } = range
    return offset + value * (max - min)
  })
}

const generateAsSineWave = (
  freqs: number[],
  amps: number[],
  duration: number,
  sampleRate: number
) => {
  const totalSamples = Math.floor(freqs.length / 3) * Math.floor(sampleRate * duration)
  const audioSamples = new Float32Array(totalSamples)
  let sampleIndex = 0
  for (let i = 0; i < freqs.length; i += 3) {
    const [freqR, freqG, freqB] = [freqs[i], freqs[i + 1], freqs[i + 2]]
    const [ampR, ampG, ampB] = [amps[i], amps[i + 1], amps[i + 2]]
    for (let t = 0; t < sampleRate * duration; t++) {
      const time = t / sampleRate
      const sample =
        (ampR * Math.sin(2 * Math.PI * freqR * time) +
          ampG * Math.sin(2 * Math.PI * freqG * time) +
          ampB * Math.sin(2 * Math.PI * freqB * time)) /
        3
      audioSamples[sampleIndex++] = sample
    }
    return audioSamples
  }
}

export const applyAudioDistortions = (samples: Float32Array): Float32Array => {
  const distorted = new Float32Array(samples.length)

  for (let i = 0; i < samples.length; i++) {
    let sample = samples[i]

    const bitDepth = 4
    const steps = Math.pow(2, bitDepth)
    sample = Math.round(sample * steps) / steps

    if (Math.random() < 0.1) {
      sample = i > 0 ? distorted[i - 1] : sample
    }

    const drive = 2.5
    sample = Math.max(-1, Math.min(1, sample * drive))

    sample += (Math.random() - 0.5) * 0.15

    const muLaw = 255
    const compressed =
      (Math.sign(sample) * Math.log(1 + muLaw * Math.abs(sample))) / Math.log(1 + muLaw)
    sample = compressed

    distorted[i] = sample
  }

  return distorted
}

const audioSamplesToWAV = (samples: Float32Array, sampleRate: number): Uint8Array<ArrayBuffer> => {
  const numChannels = 1
  const bitsPerSample = 8
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = samples.length * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  writeString(view, 0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, "WAVE")
  writeString(view, 12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 7, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(view, 36, "data")
  view.setUint32(40, dataSize, true)

  const offset = 44
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]))
    view.setUint8(offset + i, (sample * 127 + 128) | 0)
  }

  return new Uint8Array(buffer)
}

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

export type { FrequencyMapperOptions }

export {
  DEFAULT_SAMPLE_RATE,
  DEFAULT_DURATION,
  DEFAULT_RGB_FREQUENCY_RANGES,
  rgbToUnitRange,
  audioSamplesToWAV,
  mapFrequencies,
  generateAsSineWave,
  writeString
}
