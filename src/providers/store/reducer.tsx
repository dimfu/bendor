import { Filter, type FilterConfigMap, type Layer, type LSelection, type State } from "~/types"
import Commands from "~/utils/commands"
import { filterFnRegistry } from "~/utils/filters/registry"
import { getAreaData } from "~/utils/image"
import { initialStoreState } from "./storeState"

export enum StoreActionType {
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
  UpdateState
}

interface CreateNewLayer {
  type: StoreActionType.CreateNewLayer
}

interface SetPointsToLayer {
  type: StoreActionType.SetPointsToLayer
  payload: Pick<LSelection, "start" | "points">
}

interface SelectLayer {
  type: StoreActionType.SelectLayer
  payload: number
}

interface ClearLayers {
  type: StoreActionType.ClearLayers
}

interface DoLayerAction {
  type: StoreActionType.DoLayerAction
  payload: "undo" | "redo"
}

interface UpdateLayer {
  type: StoreActionType.UpdateLayer
  payload: {
    layerIdx: number
    pselection: Partial<Layer>
  }
}

interface UpdateLayerSelection {
  type: StoreActionType.UpdateLayerSelection
  payload: {
    layerIdx: number
    pselection: Partial<LSelection>
    withUpdateInitialPresent: boolean
  }
}

interface DeleteLayer {
  type: StoreActionType.DeleteLayer
  payload: number
}

interface MoveLayer {
  type: StoreActionType.MoveLayer
  payload: {
    direction: "up" | "down"
    layerIdx: number
  }
}

interface GenerateResult {
  type: StoreActionType.GenerateResult
  payload?: {
    refresh: boolean
  }
}

interface ResetImageCanvas {
  type: StoreActionType.ResetImageCanvas
}

interface UpdateState<K extends keyof State> {
  type: StoreActionType.UpdateState
  payload: {
    key: K
    value: State[K]
  }
}

function isInBounds(arrLen: number, idx: number): boolean {
  return idx >= 0 && idx < arrLen
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
  | UpdateState<keyof State>

const defaultConfig = <F extends Filter>(filter: F): FilterConfigMap[F] => {
  const configs = {
    [Filter.None]: { _empty: true },
    [Filter.AsSound]: { blend: 0.5, cache: new Uint8ClampedArray() },
    [Filter.FractalPixelSort]: { intensity: 6.0, cache: new Uint8ClampedArray() },
    [Filter.Brightness]: { intensity: 1.0 },
    [Filter.RGBShift]: { intensity: 5.0, effect: "Vibrance" },
    [Filter.Grayscale]: { intensity: 1.0 },
    [Filter.PixelSort]: { cache: new Uint8ClampedArray(), intensity: 1.0, direction: "Vertical" },
    [Filter.Slice]: { intensity: -100.0 },
    [Filter.OffsetPixelSort]: { intensity: 1, cache: new Uint8ClampedArray() }
  } satisfies FilterConfigMap

  return configs[filter]
}

const storeReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case StoreActionType.CreateNewLayer: {
      const selection: LSelection<Filter.None> = {
        points: [],
        area: [],
        start: { x: 0, y: 0 },
        filter: Filter.None,
        config: defaultConfig(Filter.None)
      }
      const newLayer: Layer = {
        selection,
        ctx: null,
        color: `# ${((Math.random() * 0xffffff) << 0).toString(16).padStart(6, "0")}`,
        commands: new Commands(selection)
      }
      const nextLayers = [...state.layers, newLayer]
      const nextIdx = nextLayers.length - 1
      return {
        ...state,
        layers: nextLayers,
        selectedLayerIdx: nextIdx,
        currentLayer: nextLayers[nextIdx]
      }
    }

    case StoreActionType.SetPointsToLayer: {
      if (!isInBounds(state.layers.length, state.selectedLayerIdx)) return state

      const updated = state.layers.map((layer) => ({ ...layer }))
      updated[state.selectedLayerIdx] = {
        ...updated[state.selectedLayerIdx],
        selection: {
          ...updated[state.selectedLayerIdx].selection,
          start: action.payload.start,
          points: action.payload.points,
          filter: updated[state.selectedLayerIdx].selection.filter
        }
      }

      const curr = updated[state.selectedLayerIdx]
      curr.commands = curr.commands.set(curr.selection)

      return {
        ...state,
        layers: updated
      }
    }

    case StoreActionType.SelectLayer: {
      const idx = action.payload
      if (!isInBounds(state.layers.length, idx)) return { ...state }
      return {
        ...state,
        selectedLayerIdx: idx,
        currentLayer: state.layers[idx]
      }
    }

    case StoreActionType.UpdateLayer: {
      if (!isInBounds(state.layers.length, state.selectedLayerIdx)) return state

      const updated = state.layers.map((layer) => ({ ...layer }))
      updated[action.payload.layerIdx] = {
        ...updated[action.payload.layerIdx],
        ...action.payload.pselection
      }
      const isCurrent = action.payload.layerIdx === state.selectedLayerIdx

      return {
        ...state,
        layers: updated,
        currentLayer: isCurrent ? updated[action.payload.layerIdx] : state.currentLayer
      }
    }

    case StoreActionType.UpdateLayerSelection: {
      if (!isInBounds(state.layers.length, state.selectedLayerIdx)) return state
      const updated = state.layers.map((layer) => ({ ...layer }))

      const selection = {
        ...updated[action.payload.layerIdx].selection,
        ...action.payload.pselection,
        config: {
          ...updated[action.payload.layerIdx].selection.config,
          ...(action.payload.pselection.config || {})
        }
      } satisfies LSelection

      // update filter config to it's default value whenever we change filter
      if (
        action.payload.pselection.filter &&
        action.payload.pselection.filter != updated[action.payload.layerIdx].selection.filter
      ) {
        selection.config = defaultConfig(selection.filter)
      }

      updated[action.payload.layerIdx] = {
        ...updated[action.payload.layerIdx],
        selection
      }

      const isCurrent = action.payload.layerIdx === state.selectedLayerIdx
      const curr = updated[state.selectedLayerIdx]
      // update the area array on initial `present` value of layer's commands
      // since the initial value was an empty array
      if (action.payload.withUpdateInitialPresent) {
        curr.commands.present = {
          ...updated[action.payload.layerIdx].selection
        }
      } else {
        curr.commands = curr.commands.set(curr.selection)
      }

      return {
        ...state,
        layers: updated,
        currentLayer: isCurrent ? updated[action.payload.layerIdx] : state.currentLayer
      }
    }

    case StoreActionType.ClearLayers:
      return {
        ...initialStoreState,
        imgCtx: null,
        originalAreaData: []
      }

    case StoreActionType.DoLayerAction: {
      const updated = state.layers.map((layer) => ({ ...layer }))
      const curr = updated[state.selectedLayerIdx]
      if (action.payload === "undo") {
        if (!curr.commands.canUndo()) {
          return state
        }
        curr.commands = curr.commands.undo()
      } else {
        if (!curr.commands.canRedo()) {
          console.log("cant redo")
          return state
        }
        curr.commands = curr.commands.redo()
      }

      curr.selection = curr.commands.present

      return {
        ...state,
        layers: updated,
        currentLayer: curr
      }
    }

    case StoreActionType.DeleteLayer: {
      let selectedLayerIdx = action.payload
      const updated = [...state.layers].filter((_, idx) => idx != selectedLayerIdx)

      // adjust selectedLayerIdx if updated layers are empty or overflowing the array length
      if (updated.length === 0) {
        selectedLayerIdx = -1
      } else if (selectedLayerIdx >= updated.length) {
        selectedLayerIdx = updated.length - 1
      }

      return {
        ...state,
        layers: updated,
        selectedLayerIdx: selectedLayerIdx,
        currentLayer: updated[selectedLayerIdx]
      }
    }

    case StoreActionType.MoveLayer: {
      const fromIdx = action.payload.layerIdx
      const toIdx = action.payload.direction === "up" ? fromIdx - 1 : fromIdx + 1

      // prevent moving out of bounds
      if (toIdx < 0 || toIdx >= state.layers.length) return state

      const updated = state.layers.map((layer) => ({ ...layer }))
      const [moved] = updated.splice(fromIdx, 1)
      updated.splice(toIdx, 0, moved)

      // swap the html canvas context
      const ctxA = updated[toIdx].ctx
      const ctxB = updated[fromIdx].ctx

      updated[toIdx] = { ...updated[toIdx], ctx: ctxB }
      updated[fromIdx] = { ...updated[fromIdx], ctx: ctxA }

      const isCurrent = action.payload.layerIdx === state.selectedLayerIdx
      return {
        ...state,
        layers: updated,
        selectedLayerIdx: isCurrent ? toIdx : state.selectedLayerIdx,
        currentLayer: isCurrent ? updated[toIdx] : state.currentLayer
      }
    }

    case StoreActionType.GenerateResult: {
      const imageCanvas = state.imgCtx
      if (!imageCanvas) {
        return state
      }

      const updatedLayers = state.layers.map((layer) => {
        const { area, filter } = layer.selection
        let updatedArea = area
        // had to do this, because when user clicked on the image itself, it will counts as drawing
        // but it dont provide the image area, so fallback to using whole image data (again)
        if (area.length === 0) {
          const selections = new Uint8Array(imageCanvas.canvas.width * imageCanvas.canvas.height)
          selections.fill(1)
          updatedArea = getAreaData(imageCanvas, selections)
        }

        const filterFn = filterFnRegistry[filter]
        if (!filterFn) return layer

        const { updatedSelection } = filterFn({
          imageCanvas,
          layer: { ...layer, selection: { ...layer.selection, area: updatedArea } },
          area: updatedArea,
          refresh: action.payload?.refresh
        })

        return {
          ...layer,
          selection: updatedSelection
        }
      })

      return { ...state, layers: updatedLayers }
    }

    // revert back to the original image canvas
    case StoreActionType.ResetImageCanvas: {
      const imageCanvas = state.imgCtx
      if (!imageCanvas) return state

      const original = imageCanvas.getImageData(
        0,
        0,
        imageCanvas.canvas.width,
        imageCanvas.canvas.height
      )
      const data = original.data

      for (const { x, y, data: src } of state.originalAreaData) {
        if (!src) continue
        const index = (y * imageCanvas.canvas.width + x) * 4
        data[index + 0] = src[0]
        data[index + 1] = src[1]
        data[index + 2] = src[2]
        data[index + 3] = src[3]
      }
      imageCanvas.putImageData(original, 0, 0)
      return state
    }

    case StoreActionType.UpdateState: {
      const { key, value } = action.payload
      return {
        ...state,
        [key]: value
      }
    }

    default:
      return state
  }
}

export default storeReducer
