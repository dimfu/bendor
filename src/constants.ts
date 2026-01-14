export const BRIGHTNESS_INTENSITY_OPTS = { min: 0, max: 2.0, default: 1.0 }
export const GRAYSCALE_INTENSITY_OPTS = { min: 0.0, max: 1.0, default: 1.0 }
export const SOUND_BIT_RATE_BLEND_OPTS = { min: 0.0, max: 1.0, default: 0.5 }
export const FRACTAL_SORT_DISTORTION_OPTS = { min: 2.0, max: 12.0, default: 6.0 }

export const RGB_SHIFT_TYPES = ["Vibrance", "Red", "Green", "Blue"] as const
export const RGB_SHIFT_OPTS = {
  min: 1.0,
  max: 100.0,
  default: {
    option: "Vibrance" as (typeof RGB_SHIFT_TYPES)[number],
    intensity: 5.0
  }
}

export const PIXEL_SORT_DIRECTIONS = ["Vertical", "Horizontal"] as const
export const PIXEL_SORT_OPTS = { min: 1.0, max: 100.0, default: { direction: "Vertical" as (typeof PIXEL_SORT_DIRECTIONS)[number], intensity: 1.0 } }

export const SLICE_INTENSITY_OPTS = { min: -100.0, max: 0.0, default: -100.0 }

// had to use an unsigned integer as the step in order to make the rgb shift work
export const OFFSET_PIXEL_OPTS = { min: 1, max: 20, step: 1, default: 1 }

export const DUOTONE_OPTS = {
  BRIGHTNESS_RANGE: { min: 0, max: 2.0, default: 1.0 },
  CONTRAST_RANGE: { min: 0.0, max: 100.0, default: 0.0 }
}
