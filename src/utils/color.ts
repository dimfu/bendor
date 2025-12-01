export class Color {
  channel: Uint8ClampedArray
  constructor(channel: Uint8ClampedArray) {
    if (channel.length !== 4) {
      throw new Error("color channel must have 4 length (R,G,B,A)")
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
}
