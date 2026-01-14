import type { JSX } from "react"
import {
  BRIGHTNESS_INTENSITY_OPTS,
  FRACTAL_SORT_DISTORTION_OPTS,
  GRAYSCALE_INTENSITY_OPTS,
  OFFSET_PIXEL_OPTS,
  PIXEL_SORT_DIRECTIONS,
  PIXEL_SORT_OPTS,
  RGB_SHIFT_OPTS,
  RGB_SHIFT_TYPES,
  SLICE_INTENSITY_OPTS,
  SOUND_BIT_RATE_BLEND_OPTS
} from "~/constants"
import { useStore } from "~/hooks/useStore"
import { StoreActionType } from "~/providers/store/reducer"
import { Filter, type LSelection } from "~/types"
import Button from "../reusables/buttons"
import DuotoneConfig from "./duotone"
import { ColWithGaps, Container, ListSelection, RangeInput } from "./reusables"

const GrayscaleConfig = () => {
  const { state } = useStore()
  const { min, max } = GRAYSCALE_INTENSITY_OPTS
  const currSelection = state.currentLayer?.selection as LSelection<Filter.Grayscale>
  const conf = currSelection.config

  return <RangeInput label="Intensity" id="grayscaleIntensity" min={min} max={max} configKey="intensity" defaultValue={conf.intensity} />
}

const BrightnessConfig = () => {
  const { state } = useStore()
  const { min, max } = BRIGHTNESS_INTENSITY_OPTS
  const currSelection = state.currentLayer?.selection as LSelection<Filter.Brightness>
  const conf = currSelection.config

  return <RangeInput label="Intensity" id="brightnessIntensity" min={min} max={max} configKey="intensity" defaultValue={conf.intensity} />
}

const AsSoundConfig = () => {
  const { state } = useStore()
  const { min, max } = SOUND_BIT_RATE_BLEND_OPTS
  const currSelection = state.currentLayer?.selection as LSelection<Filter.AsSound>
  const conf = currSelection.config

  return <RangeInput label="Blend Intensity" id="blendIntensity" min={min} max={max} configKey="blend" defaultValue={conf.blend} />
}

const FractalPixelSortConfig = () => {
  const { state, dispatch } = useStore()
  const { min, max } = FRACTAL_SORT_DISTORTION_OPTS
  const currSelection = state.currentLayer?.selection as LSelection<Filter.FractalPixelSort>
  const conf = currSelection.config

  return (
    <ColWithGaps>
      <RangeInput label="Intensity" id="distortionIntensity" min={min} max={max} configKey="intensity" defaultValue={conf.intensity} refresh />
      <Button
        variant="outline"
        type="button"
        onClick={() => {
          dispatch({ type: StoreActionType.ResetImageCanvas })
          dispatch({
            type: StoreActionType.GenerateResult,
            payload: { refreshIdx: state.selectedLayerIdx }
          })
        }}
      >
        Refresh Pattern
      </Button>
    </ColWithGaps>
  )
}

const RGBShiftConfig = () => {
  const { state } = useStore()
  const { min, max } = RGB_SHIFT_OPTS
  const currSelection = state.currentLayer?.selection as LSelection<Filter.RGBShift>
  const conf = currSelection.config
  return (
    <ColWithGaps>
      <ListSelection
        label="RGB Shift Effect"
        id="rgb-shift-effect"
        items={RGB_SHIFT_TYPES}
        configKey="effect"
        defaultValue="Vibrance"
        getItemValue={(item) => item}
      />
      <RangeInput label="Intensity" id="rgbShiftIntensity" min={min} max={max} configKey="intensity" defaultValue={conf.intensity} refresh />
    </ColWithGaps>
  )
}

const PixelSortConfig = () => {
  const { state } = useStore()
  const { min, max } = PIXEL_SORT_OPTS
  const currSelection = state.currentLayer?.selection as LSelection<Filter.PixelSort>
  const conf = currSelection.config
  return (
    <ColWithGaps>
      <ListSelection
        label="Sort Direction"
        id="pixelSortDirection"
        items={PIXEL_SORT_DIRECTIONS}
        configKey="direction"
        defaultValue="Vertical"
        getItemValue={(item) => item}
        refresh
      />
      <RangeInput label="Intensity" id="pixelSortIntensity" min={min} max={max} configKey="intensity" defaultValue={conf.intensity} refresh />
    </ColWithGaps>
  )
}

const SliceConfig = () => {
  const { state } = useStore()
  const { min, max } = SLICE_INTENSITY_OPTS
  const currSelection = state.currentLayer?.selection as LSelection<Filter.Slice>
  const conf = currSelection.config

  return <RangeInput label="Intensity" id="sliceDistortionIntensity" min={min} max={max} configKey="intensity" defaultValue={conf.intensity} />
}

const OffsetPixelSortConfig = () => {
  const { state, dispatch } = useStore()
  const distortion = OFFSET_PIXEL_OPTS
  const currSelection = state.currentLayer?.selection as LSelection<Filter.OffsetPixelSort>
  const conf = currSelection.config
  return (
    <ColWithGaps>
      <RangeInput
        label="Distortion"
        id="sliceDistortionIntensity"
        min={distortion.min}
        max={distortion.max}
        step={distortion.step}
        configKey="intensity"
        defaultValue={conf.intensity}
        refresh
      />
      <Button
        variant="outline"
        type="button"
        onClick={() => {
          dispatch({ type: StoreActionType.ResetImageCanvas })
          dispatch({
            type: StoreActionType.GenerateResult,
            payload: { refreshIdx: state.selectedLayerIdx }
          })
        }}
      >
        Refresh Patterns
      </Button>
    </ColWithGaps>
  )
}

const ConfigElements = (filter?: Filter): JSX.Element => {
  if (!filter) {
    return <div></div>
  }
  switch (filter) {
    case Filter.None:
      return <div></div>
    case Filter.RGBShift:
      return <RGBShiftConfig />
    case Filter.Grayscale:
      return <GrayscaleConfig />
    case Filter.Brightness:
      return <BrightnessConfig />
    case Filter.AsSound:
      return <AsSoundConfig />
    case Filter.FractalPixelSort:
      return <FractalPixelSortConfig />
    case Filter.PixelSort:
      return <PixelSortConfig />
    case Filter.Slice:
      return <SliceConfig />
    case Filter.OffsetPixelSort:
      return <OffsetPixelSortConfig />
    case Filter.Duotone:
      return <DuotoneConfig />
  }
}

function FilterConfigurations() {
  const { state } = useStore()
  const filter = state.currentLayer?.selection.filter
  return <Container>{ConfigElements(filter)}</Container>
}

export default FilterConfigurations
