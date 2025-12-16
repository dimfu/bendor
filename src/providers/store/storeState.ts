import type { State } from "~/types"

export const initialStoreState: State = {
  ftype: undefined,
  imgBuf: new ArrayBuffer(),
  imgCtx: null,
  originalImageData: null,
  layers: [],
  currentLayer: undefined,
  selectedLayerIdx: -1,
  mode: "edit"
}
