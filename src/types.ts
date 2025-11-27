import type Commands from "./utils/commands";

export type Point = {
  x: number;
  y: number;
  data?: ColorChannel;
};

export enum Filter {
  AsSound = "AsSound",
  Brightness = "Brightness",
  Tint = "Tint",
  Grayscale = "Grayscale",
  None = "None",
}

interface AsSoundConfig {
  blend: number;
}

interface GrayscaleConfig {
  intensity: number
}

interface BrightnessConfig {
  intensity: number;
}

interface TintConfig {
  r: number
  g: number
  b: number
}

interface NoConfig {
  _empty?: true;
}

export type FilterConfigMap = {
  [Filter.AsSound]: AsSoundConfig;
  [Filter.Brightness]: BrightnessConfig;
  [Filter.Tint]: TintConfig;
  [Filter.Grayscale]: GrayscaleConfig;
  [Filter.None]: NoConfig;
}

export interface LSelection<F extends Filter = Filter> {
  // The collections of points that define the selected area on the layer
  points: Point[];
  // The area inside the selection point
  area: Point[];
  // The starting point/position of the selection
  start: Point;
  // The visual filter that applied to this layer
  filter: Filter;
  config: FilterConfigMap[F];
}

export interface Layer {
  selection: LSelection;
  // Color to differentiate current layer with other layers
  color: `#${string}`;
  // To store every user action on the stack so that it can be reverted back or forward
  ctx: CanvasRenderingContext2D | null;
  commands: Commands<LSelection>;
}

export interface State {
  imgBuf: ArrayBuffer;
  imgCtx: CanvasRenderingContext2D | null;
  originalAreaData: Point[];
  layers: Layer[];
  currentLayer?: Layer;
  selectedLayerIdx: number;
}

export interface LoadingState {
  loading: boolean;
  setLoading: unknown;
}

export type ColorChannel = Uint8Array & { readonly length: 4 };
