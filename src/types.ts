import type { FileTypeResult } from "file-type"
import type { PIXEL_SORT_DIRECTIONS, RGB_SHIFT_OPTIONS } from "./constants"
import type Commands from "./utils/commands"

export type Point = {
  x: number
  y: number
  data?: Uint8Array
}

export enum Filter {
  None = "None",
  PixelSort = "PixelSort",
  AsSound = "AsSound",
  FractalPixelSort = "FractalPixelSort",
  Brightness = "Brightness",
  RGBShift = "RGBShift",
  Grayscale = "Grayscale",
  Slice = "Slice",
  OffsetPixelSort = "OffsetPixelSort"
}

interface AsSoundConfig {
  cache: Uint8ClampedArray<ArrayBuffer>
  blend: number
}

interface GrayscaleConfig {
  intensity: number
}

interface BrightnessConfig {
  intensity: number
}

interface FractalPixelSortConfig {
  cache: Uint8ClampedArray<ArrayBuffer>
  intensity: number
}

export interface RGBShiftConfig {
  effect: (typeof RGB_SHIFT_OPTIONS)[number]
  intensity: number
}

interface PixelSortConfig {
  cache: Uint8ClampedArray<ArrayBuffer>
  direction: (typeof PIXEL_SORT_DIRECTIONS)[number]
  intensity: number
}

interface OffsetPixelSort {
  cache: ImageDataArray
  intensity: number
}

interface SliceConfig {
  intensity: number
}

interface NoConfig {
  _empty?: true
}

export type FilterConfigMap = {
  [Filter.AsSound]: AsSoundConfig
  [Filter.FractalPixelSort]: FractalPixelSortConfig
  [Filter.Brightness]: BrightnessConfig
  [Filter.RGBShift]: RGBShiftConfig
  [Filter.Grayscale]: GrayscaleConfig
  [Filter.None]: NoConfig
  [Filter.PixelSort]: PixelSortConfig
  [Filter.Slice]: SliceConfig
  [Filter.OffsetPixelSort]: OffsetPixelSort
}

export interface LSelection<F extends Filter = Filter> {
  // The collections of points that define the selected area on the layer
  points: Point[]
  // The area inside the selection point
  selectionArea: Uint32Array | null
  // The starting point/position of the selection
  start: Point
  // The visual filter that applied to this layer
  filter: Filter
  config: FilterConfigMap[F]
}

export interface Layer {
  selection: LSelection
  // Color to differentiate current layer with other layers
  color: `#${string}`
  // To store every user action on the stack so that it can be reverted back or forward
  ctx: CanvasRenderingContext2D | null
  commands: Commands<LSelection>
}

export interface State {
  ftype?: FileTypeResult
  imgBuf: ArrayBuffer
  imgCtx: CanvasRenderingContext2D | null
  originalImageData: ImageData | null
  layers: Layer[]
  currentLayer?: Layer
  selectedLayerIdx: number
  mode: "edit" | "move"
}

export interface LoadingState {
  loading: boolean
  setLoading: unknown
}

export interface FilterContext {
  imageCanvas: CanvasRenderingContext2D
  layer: Layer
  selectionArea: Uint32Array
  refresh?: boolean
}

export interface FilterResult {
  updatedSelection: LSelection
}

export type FilterFunction = (ctx: FilterContext) => FilterResult
