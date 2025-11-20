import { initialState } from "./misc";
import {
  Filter,
  type Layer,
  type LSelection,
  type Point,
  type State,
} from "./types";
import Commands from "./utils/commands";

export enum ActionType {
  SetOriginalAreaData,
  CreateNewLayer,
  SetPointsToLayer,
  SelectLayer,
  GetSelectedLayerPoint,
  ClearLayers,
  DoLayerAction,
  UndoLayer,
  RedoLayer,
  UpdateLayer,
  UpdateLayerSelection,
  DeleteLayer,
  MoveLayer,
  ResetImageCanvas,
  GenerateResult,
  UpdateState,
}

interface CreateNewLayer {
  type: ActionType.CreateNewLayer;
}

interface SetPointsToLayer {
  type: ActionType.SetPointsToLayer;
  payload: Pick<LSelection, "start" | "points">;
}

interface SelectLayer {
  type: ActionType.SelectLayer;
  payload: number;
}

interface ClearLayers {
  type: ActionType.ClearLayers;
}

interface DoLayerAction {
  type: ActionType.DoLayerAction;
  payload: "undo" | "redo";
}

interface UpdateLayer {
  type: ActionType.UpdateLayer;
  payload: {
    layerIdx: number;
    pselection: Partial<Layer>;
  };
}

interface UpdateLayerSelection {
  type: ActionType.UpdateLayerSelection;
  payload: {
    layerIdx: number;
    pselection: Partial<LSelection>;
    withUpdateInitialPresent: boolean;
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

interface GenerateResult {
  type: ActionType.GenerateResult;
}

interface ResetImageCanvas {
  type: ActionType.ResetImageCanvas;
}

interface UpdateState<K extends keyof State> {
  type: ActionType.UpdateState;
  payload: {
    key: K;
    value: State[K];
  };
}

function isInBounds(arrLen: number, idx: number): boolean {
  return idx >= 0 && idx < arrLen;
}

export type Action =
  | CreateNewLayer
  | SetPointsToLayer
  | SelectLayer
  | ClearLayers
  | DoLayerAction
  | UpdateLayer
  | UpdateLayerSelection
  | DeleteLayer
  | MoveLayer
  | GenerateResult
  | ResetImageCanvas
  | UpdateState<keyof State>;

// to find the bounding dimension for the selected area since we odnt know the dimension
// for the selected area/points
const getDimension = (points: Point[]) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const { x, y } of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  return [width, height, minX, minY];
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.CreateNewLayer: {
      const selection: LSelection = {
        points: [],
        area: [],
        start: { x: 0, y: 0 },
        filter: Filter.None,
      };
      const newLayer: Layer = {
        selection,
        ctx: null,
        color: `# ${((Math.random() * 0xffffff) << 0)
          .toString(16)
          .padStart(6, "0")}`,
        commands: new Commands(selection),
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

      const updated = state.layers.map((layer) => ({ ...layer }));
      updated[state.selectedLayerIdx] = {
        ...updated[state.selectedLayerIdx],
        selection: {
          ...updated[state.selectedLayerIdx].selection,
          start: action.payload.start,
          points: action.payload.points,
          filter: updated[state.selectedLayerIdx].selection.filter,
        },
      };

      const curr = updated[state.selectedLayerIdx];
      curr.commands = curr.commands.set(curr.selection);

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

      const updated = state.layers.map((layer) => ({ ...layer }));
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

    case ActionType.UpdateLayerSelection: {
      if (!isInBounds(state.layers.length, state.selectedLayerIdx))
        return state;

      const updated = state.layers.map((layer) => ({ ...layer }));
      updated[action.payload.layerIdx] = {
        ...updated[action.payload.layerIdx],
        selection: {
          ...updated[action.payload.layerIdx].selection,
          ...action.payload.pselection,
        },
      };
      const isCurrent = action.payload.layerIdx === state.selectedLayerIdx;

      const curr = updated[state.selectedLayerIdx];
      // update the area array on initial `present` value of layer's commands
      // since the initial value was an empty array
      if (action.payload.withUpdateInitialPresent) {
        curr.commands.present = {
          ...updated[action.payload.layerIdx].selection,
        };
      } else {
        curr.commands = curr.commands.set(curr.selection);
      }

      return {
        ...state,
        layers: updated,
        currentLayer: isCurrent
          ? updated[action.payload.layerIdx]
          : state.currentLayer,
      };
    }

    case ActionType.ClearLayers:
      return {
        ...initialState,
        imgCtx: null,
        originalAreaData: [],
      };

    case ActionType.DoLayerAction: {
      const updated = state.layers.map((layer) => ({ ...layer }));
      const curr = updated[state.selectedLayerIdx];
      if (action.payload === "undo") {
        if (!curr.commands.canUndo()) {
          return state;
        }
        curr.commands = curr.commands.undo();
      } else {
        if (!curr.commands.canRedo()) {
          console.log("cant redo");
          return state;
        }
        curr.commands = curr.commands.redo();
      }

      curr.selection = curr.commands.present;

      return {
        ...state,
        layers: updated,
        currentLayer: curr,
      };
    }

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

    case ActionType.GenerateResult: {
      // get all canvas from top to bottom
      const canvases = state.layers.map(({ selection: { area, filter } }) => {
        return {
          area,
          filter,
        };
      });

      const imageCanvas = state.imgCtx;
      if (!imageCanvas) {
        return state;
      }

      canvases.forEach(({ area, filter }) => {
        let points = area.filter((p) => p.data);
        if (points.length === 0) {
          points = state.originalAreaData;
        }

        const [width, height, minX, minY] = getDimension(points);
        const original = imageCanvas.getImageData(minX, minY, width, height);
        const data = original.data;

        switch (filter) {
          case Filter.Tint:
            break;
          case Filter.Grayscale: {
            for (const { x, y, data: src } of points) {
              if (!src) continue;
              const avg = (src[0] + src[1] + src[2]) / 3;
              const alpha = src[3];

              const localX = x - minX;
              const localY = y - minY;
              const index = (localY * width + localX) * 4;

              data[index + 0] = avg;
              data[index + 1] = avg;
              data[index + 2] = avg;
              data[index + 3] = alpha;
            }
            break;
          }
          default:
            break;
        }
        imageCanvas.putImageData(original, minX, minY);
      });

      return { ...state };
    }

    case ActionType.ResetImageCanvas: {
      const imageCanvas = state.imgCtx;
      if (!imageCanvas) return state;

      // revert back to the original image canvas
      const [width, height, minX, minY] = getDimension(state.originalAreaData);
      const original = imageCanvas.getImageData(minX, minY, width, height);
      const data = original.data;

      for (const { x, y, data: src } of state.originalAreaData) {
        if (!src) continue;
        const localX = x - minX;
        const localY = y - minY;
        const index = (localY * width + localX) * 4;
        data[index + 0] = src[0];
        data[index + 1] = src[1];
        data[index + 2] = src[2];
        data[index + 3] = src[3];
      }
      imageCanvas.putImageData(original, minX, minY);
      return state;
    }

    case ActionType.UpdateState: {
      const { key, value } = action.payload;
      return {
        ...state,
        [key]: value,
      };
    }

    default:
      return state;
  }
};

export default reducer;
