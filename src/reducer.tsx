import { initialState } from "./misc";
import type { PSelection, State } from "./types";

export enum ActionType {
  CreateNewLayer,
  SetPointsToLayer,
  SelectLayer,
  GetSelectedLayerPoint,
  ClearSelections,
}

interface CreateNewLayer {
  type: ActionType.CreateNewLayer;
}

interface SetPointsToLayer {
  type: ActionType.SetPointsToLayer;
  payload: PSelection;
}

interface SelectLayer {
  type: ActionType.SelectLayer;
  payload: number;
}

interface ClearSelections {
  type: ActionType.ClearSelections;
}

function isInBounds(arrLen: number, idx: number): boolean {
  return idx >= 0 && idx < arrLen;
}

export type Action =
  | CreateNewLayer
  | SetPointsToLayer
  | SelectLayer
  | ClearSelections;

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.CreateNewLayer: {
      const newLayer: PSelection = {
        points: [],
        start: { x: 0, y: 0 },
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
      updated[state.selectedSelectionIdx] = action.payload;

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

    case ActionType.ClearSelections:
      state = initialState;
      return state;

    default:
      return state;
  }
};

export default reducer;
