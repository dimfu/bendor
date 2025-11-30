import {
  Filter,
  type ColorChannel,
  type FilterConfigMap,
  type Layer,
  type LSelection,
  type Point,
  type State,
} from "../../types";
import Commands from "../../utils/commands";
import { getAreaData } from "../../utils/image";
import {
  applyAudioDistortions,
  audioSamplesToWAV,
  DEFAULT_DURATION,
  DEFAULT_RGB_FREQUENCY_RANGES,
  DEFAULT_SAMPLE_RATE,
  generateAsSineWave,
  mapFrequencies,
  normalizeRGB,
} from "../../utils/sound";
import { initialStoreState } from "./storeState";

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
  UpdateState,
}

interface CreateNewLayer {
  type: StoreActionType.CreateNewLayer;
}

interface SetPointsToLayer {
  type: StoreActionType.SetPointsToLayer;
  payload: Pick<LSelection, "start" | "points">;
}

interface SelectLayer {
  type: StoreActionType.SelectLayer;
  payload: number;
}

interface ClearLayers {
  type: StoreActionType.ClearLayers;
}

interface DoLayerAction {
  type: StoreActionType.DoLayerAction;
  payload: "undo" | "redo";
}

interface UpdateLayer {
  type: StoreActionType.UpdateLayer;
  payload: {
    layerIdx: number;
    pselection: Partial<Layer>;
  };
}

interface UpdateLayerSelection {
  type: StoreActionType.UpdateLayerSelection;
  payload: {
    layerIdx: number;
    pselection: Partial<LSelection>;
    withUpdateInitialPresent: boolean;
  };
}

interface DeleteLayer {
  type: StoreActionType.DeleteLayer;
  payload: number;
}

interface MoveLayer {
  type: StoreActionType.MoveLayer;
  payload: {
    direction: "up" | "down";
    layerIdx: number;
  };
}

interface GenerateResult {
  type: StoreActionType.GenerateResult;
  payload?: {
    refresh: boolean;
  }
}

interface ResetImageCanvas {
  type: StoreActionType.ResetImageCanvas;
}

interface UpdateState<K extends keyof State> {
  type: StoreActionType.UpdateState;
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

const defaultConfig = <F extends Filter>(filter: F): FilterConfigMap[F] => {
  switch (filter) {
    case Filter.None:
      return { _empty: true } as FilterConfigMap[F];
    case Filter.AsSound:
      return { blend: 0.50 } as FilterConfigMap[F];
    case Filter.FractalPixelSort:
      return { intensity: 6.0, distortedData: new Uint8ClampedArray() } as FilterConfigMap[F];
    case Filter.Brightness:
      return { intensity: 1.0 } as FilterConfigMap[F];
    case Filter.Tint:
      return { r: 255, g: 255, b: 255 } as FilterConfigMap[F];
    case Filter.Grayscale:
      return { intensity: 1.0 } as FilterConfigMap[F];
  }
}

const storeReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case StoreActionType.CreateNewLayer: {
      const selection: LSelection<Filter.None> = {
        points: [],
        area: [],
        start: { x: 0, y: 0 },
        filter: Filter.None,
        config: defaultConfig(Filter.None),
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

    case StoreActionType.SetPointsToLayer: {
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

    case StoreActionType.SelectLayer: {
      const idx = action.payload;
      if (!isInBounds(state.layers.length, idx)) return { ...state };
      return {
        ...state,
        selectedLayerIdx: idx,
        currentLayer: state.layers[idx],
      };
    }

    case StoreActionType.UpdateLayer: {
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

    case StoreActionType.UpdateLayerSelection: {
      if (!isInBounds(state.layers.length, state.selectedLayerIdx))
        return state;
      const updated = state.layers.map((layer) => ({ ...layer }));

      const selection = {
        ...updated[action.payload.layerIdx].selection,
        ...action.payload.pselection,
        config: {
          ...updated[action.payload.layerIdx].selection.config,
          ...(action.payload.pselection.config || {})
        }
      } satisfies LSelection;

      // update filter config to it's default value whenever we change filter
      if (action.payload.pselection.filter
        && action.payload.pselection.filter != updated[action.payload.layerIdx].selection.filter) {
        selection.config = defaultConfig(selection.filter)
      }

      updated[action.payload.layerIdx] = {
        ...updated[action.payload.layerIdx], selection,
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

    case StoreActionType.ClearLayers:
      return {
        ...initialStoreState,
        imgCtx: null,
        originalAreaData: [],
      };

    case StoreActionType.DoLayerAction: {
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

    case StoreActionType.DeleteLayer: {
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

    case StoreActionType.MoveLayer: {
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

    case StoreActionType.GenerateResult: {
      const imageCanvas = state.imgCtx;
      if (!imageCanvas) {
        return state;
      }

      const updatedLayers = state.layers.map((layer) => {
        const { area, filter } = layer.selection;
        let updatedSelection = layer.selection;

        // had to do this, because when user clicked on the image itself, it will counts as drawing
        // but it dont provide the image area, so fallback to using whole image data (again)
        if (area.length === 0) {
          const selections = new Uint8Array(imageCanvas.canvas.width * imageCanvas.canvas.height);
          selections.fill(1);
          const newArea = getAreaData(imageCanvas, selections);
          updatedSelection = {
            ...layer.selection,
            area: newArea,
          };
        }

        const [width, minX, minY] = getDimension(updatedSelection.area);

        switch (filter) {
          case Filter.AsSound: {
            const img = imageCanvas.getImageData(0, 0, imageCanvas.canvas.width, imageCanvas.canvas.height);
            const data = img.data;

            const freqs: number[] = [];
            const amps: number[] = [];
            // some shit i dont fucking understand, but from what I understand it takes the
            // normalized RGB value and treat it as an amplitude
            // https://github.com/RecursiveVoid/pixeltonejs/blob/main/src/core/mappers/PixelToFrequencyMapper.ts
            for (const { x, y } of updatedSelection.area) {
              const index = (y * imageCanvas.canvas.width + x) * 4;
              const rgb = normalizeRGB(
                new Uint8Array([
                  data[index],
                  data[index + 1],
                  data[index + 2],
                ]) as ColorChannel
              );
              mapFrequencies([
                {
                  value: rgb[0],
                  range: DEFAULT_RGB_FREQUENCY_RANGES.r,
                },
                {
                  value: rgb[1],
                  range: DEFAULT_RGB_FREQUENCY_RANGES.g,
                },
                {
                  value: rgb[2],
                  range: DEFAULT_RGB_FREQUENCY_RANGES.b,
                },
              ]).forEach((value) => amps.push(value));
              freqs.push(rgb[0], rgb[1], rgb[2]);
            }

            const audioSamples = generateAsSineWave(
              freqs,
              amps,
              DEFAULT_DURATION,
              DEFAULT_SAMPLE_RATE
            );
            if (!audioSamples) break;

            const distortedSamples = applyAudioDistortions(audioSamples);
            const wavBytes = audioSamplesToWAV(
              distortedSamples,
              DEFAULT_SAMPLE_RATE
            );

            const selection = layer.selection as LSelection<Filter.AsSound>;
            const bitRateBlend = selection.config.blend;
            for (const { x, y } of updatedSelection.area) {
              const index = (y * imageCanvas.canvas.width + x) * 4;
              const localX = x - minX;
              const localY = y - minY;
              const localIndex = (localY * width + localX) * 4;
              const glitchedValue = wavBytes[localIndex % wavBytes.length];
              data[index] =
                data[index] * (1 - bitRateBlend) +
                glitchedValue * bitRateBlend; // R
              data[index + 1] =
                data[index + 1] * (1 - bitRateBlend) +
                glitchedValue * bitRateBlend; // G
              data[index + 2] =
                data[index + 2] * (1 - bitRateBlend) +
                glitchedValue * bitRateBlend; // B
            }

            imageCanvas.putImageData(img, 0, 0);
            break;
          }

          case Filter.FractalPixelSort: {
            const selection = layer.selection as LSelection<Filter.FractalPixelSort>;
            const distortionAmount = selection.config.intensity;
            let tempData: Uint8ClampedArray<ArrayBuffer>;

            if (selection.config.distortedData.length === 0 || action.payload?.refresh) {
              const wholeImage = imageCanvas.getImageData(0, 0, imageCanvas.canvas.width, imageCanvas.canvas.height);
              tempData = new Uint8ClampedArray(wholeImage.data);

              for (let i = tempData.length - 1; i > 0; i--) {
                if (tempData[(i * distortionAmount) % tempData.length] < tempData[i]) {
                  tempData[i] = tempData[(i * distortionAmount) % tempData.length];
                }
              }

              const fullWidth = imageCanvas.canvas.width;
              const fullHeight = imageCanvas.canvas.height;
              const leftSide = Math.round(Math.random() * (fullWidth - 10) + 10);
              const rightSide = Math.round(Math.random() * (fullWidth - 10) + leftSide);

              for (let i = 0; i < fullHeight; i++) {
                for (let j = 0; j < fullWidth; j++) {
                  const pixelCanvasPosition = (j + i * fullWidth) * 4;
                  const currentR = tempData[pixelCanvasPosition];
                  const currentG = tempData[pixelCanvasPosition + 1];
                  const currentB = tempData[pixelCanvasPosition + 2];
                  const shiftDirection = Math.floor(Math.random() * 2);

                  if (shiftDirection === 0) {
                    if (pixelCanvasPosition + leftSide + 1 > tempData.length - 1) {
                      continue;
                    }
                    if (rightSide % 3 === 0) {
                      tempData[pixelCanvasPosition] = currentB;
                      tempData[pixelCanvasPosition + leftSide] = currentR;
                      tempData[pixelCanvasPosition + leftSide + 1] = currentG;
                    } else if (rightSide % 3 === 1) {
                      tempData[pixelCanvasPosition] = currentR;
                      tempData[pixelCanvasPosition + leftSide] = currentB;
                      tempData[pixelCanvasPosition + leftSide + 1] = currentG;
                    } else {
                      tempData[pixelCanvasPosition] = currentR;
                      tempData[pixelCanvasPosition + leftSide] = currentB;
                    }
                  } else {
                    if (pixelCanvasPosition - leftSide < 0) {
                      continue;
                    }
                    if (rightSide % 3 === 0) {
                      tempData[pixelCanvasPosition] = currentB;
                      tempData[pixelCanvasPosition - leftSide] = currentG;
                      tempData[pixelCanvasPosition - leftSide + 1] = currentR;
                    } else if (rightSide % 3 === 1) {
                      tempData[pixelCanvasPosition + 1] = currentB;
                      tempData[pixelCanvasPosition - leftSide] = currentB;
                    } else {
                      tempData[pixelCanvasPosition] = currentG;
                      tempData[pixelCanvasPosition - leftSide] = currentB;
                      tempData[pixelCanvasPosition - leftSide + 1] = currentR;
                    }
                  }
                }
              }

              updatedSelection = {
                ...updatedSelection,
                config: {
                  ...selection.config,
                  distortedData: tempData
                }
              } as LSelection<Filter.FractalPixelSort>;
            } else {
              tempData = selection.config.distortedData;
            }

            const wholeImage = imageCanvas.getImageData(0, 0, imageCanvas.canvas.width, imageCanvas.canvas.height);
            const data = wholeImage.data;
            const fullWidth = imageCanvas.canvas.width;

            for (const { x, y } of updatedSelection.area) {
              const absIdx = (y * fullWidth + x) * 4;
              data[absIdx] = tempData[absIdx];
              data[absIdx + 1] = tempData[absIdx + 1];
              data[absIdx + 2] = tempData[absIdx + 2];
            }

            imageCanvas.putImageData(wholeImage, 0, 0);
            break;
          }

          case Filter.Brightness: {
            const wholeImage = imageCanvas.getImageData(0, 0, imageCanvas.canvas.width, imageCanvas.canvas.height);
            const data = wholeImage.data;
            const fullWidth = imageCanvas.canvas.width;

            const selection = layer.selection as LSelection<Filter.Brightness>;
            const intensity = selection.config.intensity;

            for (const { x, y } of updatedSelection.area) {
              const index = (y * fullWidth + x) * 4;
              const currentR = data[index + 0];
              const currentG = data[index + 1];
              const currentB = data[index + 2];

              data[index + 0] = currentR * intensity;
              data[index + 1] = currentG * intensity;
              data[index + 2] = currentB * intensity;
            }

            imageCanvas.putImageData(wholeImage, 0, 0);
            break;
          }

          case Filter.Tint:
            break;

          case Filter.Grayscale: {
            const wholeImage = imageCanvas.getImageData(0, 0, imageCanvas.canvas.width, imageCanvas.canvas.height);
            const data = wholeImage.data;
            const fullWidth = imageCanvas.canvas.width;

            const selection = layer.selection as LSelection<Filter.Grayscale>;
            const intensity = selection.config.intensity;


            for (const { x, y } of updatedSelection.area) {
              const index = (y * fullWidth + x) * 4;

              const currentR = data[index + 0];
              const currentG = data[index + 1];
              const currentB = data[index + 2];
              const alpha = data[index + 3];

              const avg = (currentR + currentG + currentB) / 3;

              const rOut = currentR * (1 - intensity) + avg * intensity;
              const gOut = currentG * (1 - intensity) + avg * intensity;
              const bOut = currentB * (1 - intensity) + avg * intensity;

              data[index + 0] = rOut;
              data[index + 1] = gOut;
              data[index + 2] = bOut;
              data[index + 3] = alpha;
            }

            imageCanvas.putImageData(wholeImage, 0, 0);
            break;
          }

          default:
            break;
        }

        return {
          ...layer,
          selection: updatedSelection
        };
      });

      return { ...state, layers: updatedLayers };
    }

    case StoreActionType.ResetImageCanvas: {
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

    case StoreActionType.UpdateState: {
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

export default storeReducer;
