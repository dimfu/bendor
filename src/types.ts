export interface PSelection {
  points: Point[];
  start: Point;
}

export interface State {
  selections: PSelection[];
  currentSelection?: PSelection;
  selectedSelectionIdx: number;
}

export type Point = {
  x: number;
  y: number;
};

export type ColorChannel = Int8Array & { readonly length: 4 }
export type RGBA = [
  ColorChannel,
  ColorChannel,
  ColorChannel,
  ColorChannel
]
