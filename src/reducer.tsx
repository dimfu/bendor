import { initialState } from "./misc";
import { Filter, type Layer, type State } from "./types";

export enum ActionType {
  SetImageBuf,
  CreateNewLayer,
  SetPointsToLayer,
  SelectLayer,
  GetSelectedLayerPoint,
  ClearLayers,
  UpdateLayer,
  DeleteLayer,
  MoveLayer,
}

interface SetImageBuf {
  type: ActionType.SetImageBuf;
  payload: ArrayBuffer;
}

interface CreateNewLayer {
  type: ActionType.CreateNewLayer;
}

interface SetPointsToLayer {
  type: ActionType.SetPointsToLayer;
  payload: Pick<Layer, "start" | "points">;
}

interface SelectLayer {
  type: ActionType.SelectLayer;
  payload: number;
}

interface ClearLayers {
  type: ActionType.ClearLayers;
}

interface UpdateLayer {
  type: ActionType.UpdateLayer;
  payload: {
    layerIdx: number;
    pselection: Partial<Layer>;
  };
}

interface DeleteLayer {
  type: ActionType.DeleteLayer;
  payload: number;
}

interface MoveLayer {
  type: ActionType.MoveLayer;
  payload: {
    direction: "up" | "down";
    layerIdx: number;
  };
}

function isInBounds(arrLen: number, idx: number): boolean {
  return idx >= 0 && idx < arrLen;
}

export type Action =
  | SetImageBuf
  | CreateNewLayer
  | SetPointsToLayer
  | SelectLayer
  | ClearLayers
  | UpdateLayer
  | DeleteLayer
  | MoveLayer;

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.SetImageBuf: {
      let imgBuf = state.imgBuf;
      imgBuf = action.payload;
      return { ...state, imgBuf };
    }

    case ActionType.CreateNewLayer: {
      const newLayer: Layer = {
        points: [],
        start: { x: 0, y: 0 },
        filter: Filter.None,
        ctx: null,
        color: `# ${(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0')}`
      };
      const nextLayers = [...state.layers, newLayer];
      const nextIdx = nextLayers.length - 1;
      return {
        ...state,
        layers: nextLayers,
        selectedLayerIdx: nextIdx,
        currentLayer: nextLayers[nextIdx],
      };
    }

    case ActionType.SetPointsToLayer: {
      if (!isInBounds(state.layers.length, state.selectedLayerIdx))
        return state;

      const updated = [...state.layers];
      updated[state.selectedLayerIdx] = {
        ...updated[state.selectedLayerIdx],
        start: action.payload.start,
        points: action.payload.points,
        filter: updated[state.selectedLayerIdx].filter,
      };

      return {
        ...state,
        layers: updated,
      };
    }

    case ActionType.SelectLayer: {
      const idx = action.payload;
      if (!isInBounds(state.layers.length, idx)) return { ...state };
      return {
        ...state,
        selectedLayerIdx: idx,
        currentLayer: state.layers[idx],
      };
    }

    case ActionType.UpdateLayer: {
      if (!isInBounds(state.layers.length, state.selectedLayerIdx))
        return state;

      const updated = [...state.layers];
      updated[action.payload.layerIdx] = {
        ...updated[action.payload.layerIdx],
        ...action.payload.pselection,
      };
      const isCurrent = action.payload.layerIdx === state.selectedLayerIdx;

      return {
        ...state,
        layers: updated,
        currentLayer: isCurrent
          ? updated[action.payload.layerIdx]
          : state.currentLayer,
      };
    }

    case ActionType.ClearLayers:
      state = initialState;
      return state;

    case ActionType.DeleteLayer: {
      let selectedLayerIdx = action.payload;
      const updated = [...state.layers].filter(
        (_, idx) => idx != selectedLayerIdx
      );

      // adjust selectedLayerIdx if updated layers are empty or overflowing the array length
      if (updated.length === 0) {
        selectedLayerIdx = -1;
      } else if (selectedLayerIdx >= updated.length) {
        selectedLayerIdx = updated.length - 1;
      }

      return {
        ...state,
        layers: updated,
        selectedLayerIdx: selectedLayerIdx,
        currentLayer: updated[selectedLayerIdx],
      };
    }

    case ActionType.MoveLayer: {
      const fromIdx = action.payload.layerIdx;
      const toIdx =
        action.payload.direction === "up" ? fromIdx - 1 : fromIdx + 1;

      // prevent moving out of bounds
      if (toIdx < 0 || toIdx >= state.layers.length) return state;

      const updated = state.layers.map((layer) => ({ ...layer }));
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);

      // swap the html canvas context
      const ctxA = updated[toIdx].ctx;
      const ctxB = updated[fromIdx].ctx;

      updated[toIdx] = { ...updated[toIdx], ctx: ctxB };
      updated[fromIdx] = { ...updated[fromIdx], ctx: ctxA };

      const isCurrent = action.payload.layerIdx === state.selectedLayerIdx;
      return {
        ...state,
        layers: updated,
        selectedLayerIdx: isCurrent ? toIdx : state.selectedLayerIdx,
        currentLayer: isCurrent ? updated[toIdx] : state.currentLayer,
      };
    }

    default:
      return state;
  }
};

export default reducer;
