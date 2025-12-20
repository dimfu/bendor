export class Color {
  channel: Uint8ClampedArray
  startingIdx: number
  constructor(channel: Uint8ClampedArray, startingIdx: number = 0) {
    // fill with zeroes to empty array indexes
    if (channel.length !== 4) {
      for (let i = channel.length; i < 4; i++) {
        channel[i] = 0
      }
    }
    channel.forEach((ch) => {
      if (!Number.isInteger(ch)) {
        throw new Error("value must be an integer")
      }
      if (ch < 0 || ch > 255) {
        throw new Error("value range must be within 0..255")
      }
    })
    this.channel = channel
    this.startingIdx = startingIdx
  }

  get red() {
    return this.channel[0]
  }

  get green() {
    return this.channel[1]
  }

  get blue() {
    return this.channel[2]
  }

  get alpha() {
    return this.channel[3]
  }

  normalizeRGBValue = (n: number) => {
    return Math.min(255, Math.max(0, n))
  }

  brightness() {
    const r = this.red / 255.0
    const g = this.green / 255.0
    const b = this.blue / 255.0

    let max: number, min: number
    max = r
    min = r
    if (g > max) {
      max = g
    }
    if (b > max) {
      max = b
    }
    if (g < min) {
      min = g
    }
    if (b < min) {
      min = b
    }

    return (max + min) / 2
  }
}
