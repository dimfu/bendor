import type { State } from "./types";

export const initialState: State = {
  imgBuf: new ArrayBuffer(),
  selections: [],
  currentSelection: undefined,
  selectedSelectionIdx: -1,
};
