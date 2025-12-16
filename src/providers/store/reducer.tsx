import { Filter, type FilterConfigMap, type Layer, type LSelection, type State } from "~/types"
import Commands from "~/utils/commands"
import { filterFnRegistry } from "~/utils/filters/registry"
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
      const idx = state.selectedLayerIdx
      if (!isInBounds(state.layers.length, idx)) return state

      const layers = state.layers.slice()

      const prevLayer = layers[idx]
      const prevSelection = prevLayer.selection

      const nextSelection = {
        ...prevSelection,
        start: action.payload.start,
        points: action.payload.points
      }

      const nextLayer = {
        ...prevLayer,
        selection: nextSelection,
        commands: prevLayer.commands.set(nextSelection)
      }

      layers[idx] = nextLayer

      return {
        ...state,
        layers
      }
    }

    case StoreActionType.SelectLayer: {
      const idx = action.payload
      if (!isInBounds(state.layers.length, idx)) return { ...state }

      // move active status over to the newly selected canvas idx
      for (let i = 0; i < state.layers.length; i++) {
        const ctx = state.layers[i].ctx
        if (!ctx) continue
        const currIdx = Number(ctx.canvas.id.replace("drawing-canvas-", ""))

        if (idx === currIdx) {
          ctx.canvas.classList.add("active")
          ctx.canvas.style.pointerEvents = "auto"
        } else {
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
          ctx.canvas.classList.remove("active")
          ctx.canvas.style.pointerEvents = "none"
        }
      }

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
      const { layerIdx, pselection, withUpdateInitialPresent } = action.payload
      if (!isInBounds(state.layers.length, state.selectedLayerIdx)) return state
      const layers = state.layers.slice()

      const prevLayer = layers[layerIdx]
      const prevSelection = prevLayer.selection

      const nextFilter =
        pselection.filter ?? prevSelection.filter

      const nextConfig =
        pselection.filter && pselection.filter !== prevSelection.filter
          ? defaultConfig(nextFilter)
          : {
            ...prevSelection.config,
            ...(pselection.config || {})
          }

      const nextSelection: LSelection = {
        ...prevSelection,
        ...pselection,
        filter: nextFilter,
        config: nextConfig
      }

      const nextLayer = {
        ...prevLayer,
        selection: nextSelection
      }

      if (withUpdateInitialPresent) {
        nextLayer.commands.present = {
          ...prevLayer.selection
        }
      } else {
        nextLayer.commands = prevLayer.commands.set(nextSelection)
      }

      layers[layerIdx] = nextLayer

      const isCurrent = layerIdx === state.selectedLayerIdx

      return {
        ...state,
        layers,
        currentLayer: isCurrent ? nextLayer : state.currentLayer
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
      const layerToDelete = state.layers[selectedLayerIdx]

      // remove current canvas from the DOM
      if (layerToDelete?.ctx?.canvas) {
        layerToDelete.ctx.canvas.remove()
      }

      const updated = [...state.layers].filter((_, idx) => idx !== selectedLayerIdx)

      // re-index the canvas id
      for (let i = 0; i < updated.length; i++) {
        const ctx = updated[i].ctx
        if (!ctx?.canvas) continue
        ctx.canvas.id = `drawing-canvas-${i}`
      }

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
      if (!imageCanvas) return state

      let layers = state.layers
      let didChange = false

      for (let i = 0; i < state.layers.length; i++) {
        const layer = state.layers[i]
        const { area, filter } = layer.selection
        const filterFn = filterFnRegistry[filter]
        if (!filterFn) continue

        const { updatedSelection } = filterFn({
          imageCanvas,
          layer: {
            ...layer,
            selection: { ...layer.selection }
          },
          area,
          refresh: action.payload?.refresh
        })

        if (updatedSelection !== layer.selection) {
          if (!didChange) {
            layers = state.layers.slice()
            didChange = true
          }

          layers[i] = {
            ...layer,
            selection: updatedSelection
          }
        }
      }

      if (!didChange) return state

      return {
        ...state,
        layers
      }
    }

    // revert back to the original image canvas
    case StoreActionType.ResetImageCanvas: {
      const imageCanvas = state.imgCtx
      if (!imageCanvas) return state

      const original = imageCanvas.getImageData(0, 0, imageCanvas.canvas.width, imageCanvas.canvas.height)
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
