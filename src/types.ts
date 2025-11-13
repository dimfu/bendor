export type Point = {
  x: number;
  y: number;
};

export enum Filter {
  Tint = "Tint",
  Grayscale = "Grayscale",
  None = "None"
}

export interface Layer {
  // The collections of points that define the selected area on the layer
  points: Point[];
  // The starting point/position of the selection
  start: Point;
  // The visual filter that applied to this layer
  filter: Filter;
  ctx: CanvasRenderingContext2D | null;
  // Color to differentiate current layer with other layers
  color: `#${string}`;
}

export interface State {
  imgBuf: ArrayBuffer
  layers: Layer[];
  currentLayer?: Layer;
  selectedLayerIdx: number;
}

export type ColorChannel = Uint8Array & { readonly length: 4 }
