import { useRef, useState, type JSX } from "react"
import { useStore } from "~/hooks/useStore"
import { Filter, type LSelection } from "~/types"
import {
  BRIGHTNESS_INTENSITY_RANGE,
  FRACTAL_SORT_DISTORTION_RANGE,
  GRAYSCALE_INTENSITY_RANGE,
  OFFSET_PIXEL_DISTORTION_RANGE,
  PIXEL_SORT_DIRECTIONS,
  PIXEL_SORT_INTENSITY,
  RGB_SHIFT_INTENSITY_RANGE,
  RGB_SHIFT_OPTIONS,
  SLICE_INTENSITY_RANGE,
  SOUND_BIT_RATE_BLEND_RANGE
} from "~/constants"
import { StoreActionType } from "~/providers/store/reducer"
import { useLoading } from "~/hooks/useLoading"
import { flushSync } from "react-dom"
import { Slider } from "./reusables/slider"
import styled from "styled-components"
import { Select } from "./reusables/select"
import { Label } from "./reusables/typography"
import Button from "./reusables/buttons"

interface RangeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  min: number
  max: number
  configKey: "intensity" | "blend" | "brightness" | "distortion"
  defaultValue: number
  refresh?: boolean
}

interface ListSelectionProps<T, V = T> {
  label: string
  id: string
  items: readonly T[] | T[]
  configKey: string
  defaultValue: T
  refresh?: boolean
  renderItem?: (item: T, isSelected: boolean) => React.ReactNode
  getItemValue?: (item: T) => V
}

const RangeInput = ({ label, id, min, max, configKey, defaultValue, refresh = false, ...rest }: RangeInputProps) => {
  const { loading, start, stop } = useLoading()
  const { state, dispatch } = useStore()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const onApply = () => {
    flushSync(() => {
      start()
    })
    dispatch({ type: StoreActionType.ResetImageCanvas })
    const value = parseFloat(inputRef.current?.value ?? defaultValue.toString())
    dispatch({
      type: StoreActionType.UpdateLayerSelection,
      payload: {
        layerIdx: state.selectedLayerIdx,
        // use Math.abs to handle reversed slider value
        pselection: { config: { [configKey]: Math.abs(value) } },
        withUpdateInitialPresent: false
      }
    })
    dispatch({ type: StoreActionType.GenerateResult, payload: { refresh } })
    stop()
  }

  return (
    <Slider
      label={label}
      disabled={loading}
      ref={inputRef}
      onMouseUp={onApply}
      onTouchEnd={onApply}
      id={id}
      type="range"
      min={min}
      max={max}
      step={rest.step ?? 0.01}
      defaultValue={defaultValue}
      {...rest}
    />
  )
}

const ListSelection = <T, V = T>({
  label,
  id,
  items,
  configKey,
  defaultValue,
  refresh = false,
  renderItem,
  getItemValue
}: ListSelectionProps<T, V>) => {
  const { loading, start, stop } = useLoading()
  const { state, dispatch } = useStore()
  const [selectedValue, setSelectedValue] = useState<T>(defaultValue)

  const onSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIndex = parseInt(event.target.value)
    const item = items[selectedIndex]

    flushSync(() => {
      start()
    })
    setSelectedValue(item)
    dispatch({ type: StoreActionType.ResetImageCanvas })
    const value = getItemValue ? getItemValue(item) : item
    dispatch({
      type: StoreActionType.UpdateLayerSelection,
      payload: {
        layerIdx: state.selectedLayerIdx,
        pselection: { config: { [configKey]: value } },
        withUpdateInitialPresent: false
      }
    })
    dispatch({ type: StoreActionType.GenerateResult, payload: { refresh } })
    stop()
  }

  const selectedIndex = items.findIndex((item) => {
    const itemValue = getItemValue ? getItemValue(item) : item
    const currentValue = getItemValue ? getItemValue(selectedValue) : selectedValue
    return itemValue === currentValue
  })

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Select
        $full
        id={id}
        value={selectedIndex}
        onChange={onSelect}
        disabled={loading}
        style={{
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.5 : 1
        }}
      >
        {items.map((item, index) => (
          <option key={`${item}-${index + 1}`} value={index}>
            {renderItem ? renderItem(item, index === selectedIndex) : String(item)}
          </option>
        ))}
      </Select>
    </div>
  )
}

const GrayscaleConfig = () => {
  const { state } = useStore()
  const { min, max } = GRAYSCALE_INTENSITY_RANGE
  const currSelection = state.currentLayer?.selection as LSelection<Filter.Grayscale>
  const conf = currSelection.config

  return <RangeInput label="Intensity" id="grayscaleIntensity" min={min} max={max} configKey="intensity" defaultValue={conf.intensity} />
}

const BrightnessConfig = () => {
  const { state } = useStore()
  const { min, max } = BRIGHTNESS_INTENSITY_RANGE
  const currSelection = state.currentLayer?.selection as LSelection<Filter.Brightness>
  const conf = currSelection.config

  return <RangeInput label="Intensity" id="brightnessIntensity" min={min} max={max} configKey="intensity" defaultValue={conf.intensity} />
}

const AsSoundConfig = () => {
  const { state } = useStore()
  const { min, max } = SOUND_BIT_RATE_BLEND_RANGE
  const currSelection = state.currentLayer?.selection as LSelection<Filter.AsSound>
  const conf = currSelection.config

  return <RangeInput label="Blend Intensity" id="blendIntensity" min={min} max={max} configKey="blend" defaultValue={conf.blend} />
}

const FractalPixelSortConfig = () => {
  const { state, dispatch } = useStore()
  const { min, max } = FRACTAL_SORT_DISTORTION_RANGE
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
            payload: { refresh: true }
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
  const { min, max } = RGB_SHIFT_INTENSITY_RANGE
  const currSelection = state.currentLayer?.selection as LSelection<Filter.RGBShift>
  const conf = currSelection.config
  return (
    <ColWithGaps>
      <ListSelection
        label="RGB Shift Effect"
        id="rgb-shift-effect"
        items={RGB_SHIFT_OPTIONS}
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
  const { min, max } = PIXEL_SORT_INTENSITY
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
  const { min, max } = SLICE_INTENSITY_RANGE
  const currSelection = state.currentLayer?.selection as LSelection<Filter.Slice>
  const conf = currSelection.config

  return <RangeInput label="Intensity" id="sliceDistortionIntensity" min={min} max={max} configKey="intensity" defaultValue={conf.intensity} />
}

const OffsetPixelSortConfig = () => {
  const { state, dispatch } = useStore()
  const distortion = OFFSET_PIXEL_DISTORTION_RANGE
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
            payload: { refresh: true }
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
  }
}

const Container = styled.div`
  margin-top: 24px;
`

const ColWithGaps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

function FilterConfigurations() {
  const { state } = useStore()
  const filter = state.currentLayer?.selection.filter
  return <Container>{ConfigElements(filter)}</Container>
}

export default FilterConfigurations
