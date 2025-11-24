import type { State } from "../../types";

export const initialStoreState: State = {
	imgBuf: new ArrayBuffer(),
	imgCtx: null,
	originalAreaData: [],
	layers: [],
	currentLayer: undefined,
	selectedLayerIdx: -1,
};
