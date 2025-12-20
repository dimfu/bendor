import { Filter, type FilterFunction } from "~/types"
import { asSoundFilter } from "./asSound"
import { brightnessFilter } from "./brightness"
import { fractalPixelSortFilter } from "./fractalPixelSort"
import { grayscaleFilter } from "./grayscale"
import { offsetPixelSort } from "./offsetPixelSort"
import { pixelSort } from "./pixelSort"
import { rgbShift } from "./rgbShift"
import { slice } from "./slice"

// a placeholder if filter is not yet implemented or just do nothing
const noop: FilterFunction = ({ layer }) => {
  return { updatedSelection: layer.selection }
}

export const filterNameRegistry: Record<Filter, string> = {
  [Filter.AsSound]: "Data-as-Sound",
  [Filter.FractalPixelSort]: "Fractal Pixel Sort",
  [Filter.Brightness]: "Brightness",
  [Filter.Grayscale]: "Grayscale",
  [Filter.RGBShift]: "RGB Shift",
  [Filter.None]: "No Filter",
  [Filter.PixelSort]: "Pixel Sort",
  [Filter.Slice]: "Slice",
  [Filter.OffsetPixelSort]: "Offset Pixel Sort"
}

export const filterFnRegistry: Record<Filter, FilterFunction> = {
  [Filter.AsSound]: asSoundFilter,
  [Filter.FractalPixelSort]: fractalPixelSortFilter,
  [Filter.Brightness]: brightnessFilter,
  [Filter.Grayscale]: grayscaleFilter,
  [Filter.RGBShift]: rgbShift,
  [Filter.None]: noop,
  [Filter.PixelSort]: pixelSort,
  [Filter.Slice]: slice,
  [Filter.OffsetPixelSort]: offsetPixelSort
}
