import { initialState } from "./misc";
import { Filter, type PSelection, type State } from "./types";

export enum ActionType {
  SetImageBuf,
  CreateNewLayer,
  SetPointsToLayer,
  SelectLayer,
  GetSelectedLayerPoint,
  ClearSelections,
  UpdateSelection,
}

interface SetImageBuf {
  type: ActionType.SetImageBuf,
  payload: ArrayBuffer,
};

interface CreateNewLayer {
  type: ActionType.CreateNewLayer;
}

interface SetPointsToLayer {
  type: ActionType.SetPointsToLayer;
  payload: Pick<PSelection, "start" | "points">;
}

interface SelectLayer {
  type: ActionType.SelectLayer;
  payload: number;
}

interface ClearSelections {
  type: ActionType.ClearSelections;
}

interface UpdateSelection {
  type: ActionType.UpdateSelection;
  payload: {
    layerIdx: number,
    pselection: Partial<PSelection>,
  }
}

function isInBounds(arrLen: number, idx: number): boolean {
  return idx >= 0 && idx < arrLen;
}

export type Action =
  | SetImageBuf
  | CreateNewLayer
  | SetPointsToLayer
  | SelectLayer
  | ClearSelections
  | UpdateSelection;

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.SetImageBuf: {
      let imgBuf = state.imgBuf;
      imgBuf = action.payload
      return { ...state, imgBuf }
    }

    case ActionType.CreateNewLayer: {
      const newLayer: PSelection = {
        points: [],
        start: { x: 0, y: 0 },
        filter: Filter.None,
        ctx: null,
      };
      const nextSelections = [...state.selections, newLayer];
      const nextIdx = nextSelections.length - 1;
      return {
        ...state,
        selections: nextSelections,
        selectedSelectionIdx: nextIdx,
        currentSelection: nextSelections[nextIdx],
      };
    }

    case ActionType.SetPointsToLayer: {
      if (!isInBounds(state.selections.length, state.selectedSelectionIdx))
        return state;

      const updated = [...state.selections];
      updated[state.selectedSelectionIdx] = {
        ...updated[state.selectedSelectionIdx],
        start: action.payload.start,
        points: action.payload.points,
        filter: updated[state.selectedSelectionIdx].filter
      }

      return {
        ...state,
        selections: updated,
      };
    }

    case ActionType.SelectLayer: {
      const idx = action.payload;
      if (!isInBounds(state.selections.length, idx)) return { ...state };
      return {
        ...state,
        selectedSelectionIdx: idx,
        currentSelection: state.selections[idx],
      };
    }

    case ActionType.UpdateSelection: {
      if (!isInBounds(state.selections.length, state.selectedSelectionIdx))
        return state;

      const updated = [...state.selections];
      updated[action.payload.layerIdx] = {
        ...updated[action.payload.layerIdx],
        ...action.payload.pselection,
      };
      const isCurrent = action.payload.layerIdx === state.selectedSelectionIdx;

      return {
        ...state,
        selections: updated,
        currentSelection: isCurrent
          ? updated[action.payload.layerIdx]
          : state.currentSelection,
      };
    }

    case ActionType.ClearSelections:
      state = initialState;
      return state;

    default:
      return state;
  }
};

export default reducer;
