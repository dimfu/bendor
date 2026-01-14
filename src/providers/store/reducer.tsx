import {
  BRIGHTNESS_INTENSITY_OPTS,
  DUOTONE_OPTS,
  FRACTAL_SORT_DISTORTION_OPTS,
  GRAYSCALE_INTENSITY_OPTS,
  OFFSET_PIXEL_OPTS,
  PIXEL_SORT_OPTS,
  RGB_SHIFT_OPTS,
  SLICE_INTENSITY_OPTS,
  SOUND_BIT_RATE_BLEND_OPTS
} from "~/constants"
import { Filter, type FilterConfigMap, type Layer, type LSelection, type State } from "~/types"
import Commands from "~/utils/commands"
import { generateRandomHex } from "~/utils/etc"
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
  DuplicateLayer,
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

interface DuplicateLayer {
  type: StoreActionType.DuplicateLayer
  payload: number
}

interface GenerateResult {
  type: StoreActionType.GenerateResult
  payload?: {
    // layer idx
    refreshIdx: number
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
  | DuplicateLayer
  | GenerateResult
  | ResetImageCanvas
  | UpdateState<keyof State>

// TODO: should i use values from consts or just set it up right here?
const defaultConfig = <F extends Filter>(filter: F): FilterConfigMap[F] => {
  const configs = {
    [Filter.None]: { _empty: true },
    [Filter.AsSound]: { blend: SOUND_BIT_RATE_BLEND_OPTS.default, cache: new Uint8ClampedArray() },
    [Filter.FractalPixelSort]: { intensity: FRACTAL_SORT_DISTORTION_OPTS.default, cache: new Uint8ClampedArray() },
    [Filter.Brightness]: { intensity: BRIGHTNESS_INTENSITY_OPTS.default },
    [Filter.RGBShift]: { intensity: RGB_SHIFT_OPTS.default.intensity, effect: RGB_SHIFT_OPTS.default.option },
    [Filter.Grayscale]: { intensity: GRAYSCALE_INTENSITY_OPTS.default },
    [Filter.PixelSort]: {
      cache: new Uint8ClampedArray(),
      intensity: PIXEL_SORT_OPTS.default.intensity,
      direction: PIXEL_SORT_OPTS.default.direction
    },
    [Filter.Slice]: { intensity: SLICE_INTENSITY_OPTS.default },
    [Filter.OffsetPixelSort]: { intensity: OFFSET_PIXEL_OPTS.default, cache: new Uint8ClampedArray() },
    [Filter.Duotone]: {
      brightness: DUOTONE_OPTS.BRIGHTNESS_RANGE.default,
      contrast: DUOTONE_OPTS.CONTRAST_RANGE.default,
      highlightsColor: "#ffefb3",
      shadowsColor: "#290900"
    }
  } satisfies FilterConfigMap

  return configs[filter]
}

const storeReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case StoreActionType.CreateNewLayer: {
      const selection: LSelection<Filter.None> = {
        points: [],
        start: { x: 0, y: 0 },
        filter: Filter.None,
        config: defaultConfig(Filter.None),
        selectionArea: new Uint32Array()
      }
      const newLayer: Layer = {
        selection,
        ctx: null,
        color: generateRandomHex(),
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

      const nextFilter = pselection.filter ?? prevSelection.filter

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
        originalImageData: null
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

    case StoreActionType.DuplicateLayer: {
      const canvasContainer = document.getElementById("canvasContainer")
      if (!canvasContainer) {
        throw new Error("could not find #canvasContainer")
      }

      const currDuplicatedLayer = state.layers[action.payload]
      const newCanvas = document.createElement("canvas")

      if (!currDuplicatedLayer.ctx) {
        throw new Error("currDuplicatedLayer has no canvas context")
      }
      // make new context for the duplicated layer. we cant add the existing one because it will
      // just read as if the canvas were already there
      newCanvas.width = currDuplicatedLayer.ctx.canvas.width
      newCanvas.height = currDuplicatedLayer.ctx.canvas.height
      const newCtx = newCanvas.getContext("2d")
      newCtx!.drawImage(currDuplicatedLayer.ctx!.canvas, 0, 0)

      const duplicatedLayer = {
        ...currDuplicatedLayer,
        color: generateRandomHex(), // had to change the color since we are using color as react element key
        ctx: newCtx
      }

      const updated = [...state.layers]
      updated.splice(action.payload + 1, 0, duplicatedLayer)

      if (!duplicatedLayer.ctx) {
        throw new Error("duplicatedLayer has no canvas context")
      }

      // add the drawing canvas node to the dom
      const nextLayerIndex = action.payload + 2
      const nextCanvas = updated[nextLayerIndex]?.ctx?.canvas

      Object.assign(duplicatedLayer.ctx.canvas.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        cursor: "crosshair"
      })

      if (nextCanvas) {
        // append behind the next layer after the duplicated one
        canvasContainer.insertBefore(duplicatedLayer.ctx.canvas, nextCanvas)
      } else {
        canvasContainer.appendChild(duplicatedLayer.ctx.canvas)
      }

      let selectedLayerIdx = state.selectedLayerIdx
      if (action.payload < selectedLayerIdx) {
        selectedLayerIdx++ // keep selectedLayer position as before
      }

      // re index since we are adding new canvas to the dom
      for (let i = action.payload + 1; i < updated.length; i++) {
        const layer = updated[i]
        if (!layer.ctx?.canvas) continue

        const canvas = layer.ctx.canvas
        const ctx = layer.ctx
        canvas.id = `drawing-canvas-${i}`

        // reapply the "active" class to the original layer, since it's index being moved once
        if (i === selectedLayerIdx) {
          canvas.classList.add("active")
          canvas.style.pointerEvents = "auto"
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          canvas.classList.remove("active")
          canvas.style.pointerEvents = "none"
        }
      }

      return { ...state, layers: updated, selectedLayerIdx, currentLayer: updated[selectedLayerIdx] }
    }

    case StoreActionType.GenerateResult: {
      const imageCanvas = state.imgCtx
      if (!imageCanvas) return state

      let layers = state.layers
      let didChange = false
      let refreshNext = false

      // when generating a gif it should refresh all layer to get different results
      if (action.payload?.refreshIdx === -1) {
        refreshNext = true
      }

      for (let i = 0; i < state.layers.length; i++) {
        const layer = state.layers[i]
        const { filter, selectionArea } = layer.selection
        if (!selectionArea) {
          continue
        }
        const filterFn = filterFnRegistry[filter]
        if (!filterFn) continue

        // should refresh all layer next onwards
        if (action.payload?.refreshIdx === i) refreshNext = true

        const { updatedSelection } = filterFn({
          imageCanvas,
          layer: {
            ...layer,
            selection: { ...layer.selection }
          },
          selectionArea,
          refresh: refreshNext ?? action.payload?.refreshIdx === i
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
      if (!state.originalImageData) {
        throw new Error("Original image data is not defined")
      }
      imageCanvas.putImageData(state.originalImageData, 0, 0)
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
