import type Commands from "./utils/commands";

export type Point = {
  x: number;
  y: number;
  data?: ColorChannel;
};

export enum Filter {
  Tint = "Tint",
  Grayscale = "Grayscale",
  None = "None",
}

export interface LSelection {
  // The collections of points that define the selected area on the layer
  points: Point[];
  // The area inside the selection point
  area: Point[];
  // The starting point/position of the selection
  start: Point;
  // The visual filter that applied to this layer
  filter: Filter;
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

export type ColorChannel = Uint8Array & { readonly length: 4 };
