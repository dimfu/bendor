import { useRef, useState, type JSX } from "react"
import { useStore } from "~/hooks/useStore"
import { Filter, type LSelection } from "~/types"
import {
  BRIGHTNESS_INTENSITY_RANGE,
  FRACTAL_SORT_DISTORTION_RANGE,
  GRAYSCALE_INTENSITY_RANGE,
  PIXEL_SORT_DIRECTIONS,
  PIXEL_SORT_INTENSITY,
  RGB_SHIFT_INTENSITY_RANGE,
  RGB_SHIFT_OPTIONS,
  SOUND_BIT_RATE_BLEND_RANGE
} from "~/constants"
import { StoreActionType } from "~/providers/store/reducer"
import { useLoading } from "~/hooks/useLoading"
import { flushSync } from "react-dom"

interface RangeInputProps {
  label: string
  id: string
  min: number
  max: number
  configKey: "intensity" | "blend"
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

const RangeInput = ({
  label,
  id,
  min,
  max,
  configKey,
  defaultValue,
  refresh = false
}: RangeInputProps) => {
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
        pselection: { config: { [configKey]: value } },
        withUpdateInitialPresent: false
      }
    })
    dispatch({ type: StoreActionType.GenerateResult, payload: { refresh } })
    stop()
  }

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        disabled={loading}
        ref={inputRef}
        onMouseUp={onApply}
        onTouchEnd={onApply}
        id={id}
        type="range"
        min={min}
        max={max}
        step={0.01}
        defaultValue={defaultValue}
      />
    </div>
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
      <label htmlFor={id}>{label}</label>
      <select
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
          <option key={index} value={index}>
            {renderItem ? renderItem(item, index === selectedIndex) : String(item)}
          </option>
        ))}
      </select>
    </div>
  )
}

const GrayscaleConfig = () => {
  const { state } = useStore()
  const { min, max } = GRAYSCALE_INTENSITY_RANGE
  const currSelection = state.currentLayer?.selection as LSelection<Filter.Grayscale>
  const conf = currSelection.config

  return (
    <RangeInput
      label="Intensity"
      id="grayscaleIntensity"
      min={min}
      max={max}
      configKey="intensity"
      defaultValue={conf.intensity}
    />
  )
}

const BrightnessConfig = () => {
  const { state } = useStore()
  const { min, max } = BRIGHTNESS_INTENSITY_RANGE
  const currSelection = state.currentLayer?.selection as LSelection<Filter.Brightness>
  const conf = currSelection.config

  return (
    <RangeInput
      label="Intensity"
      id="brightnessIntensity"
      min={min}
      max={max}
      configKey="intensity"
      defaultValue={conf.intensity}
    />
  )
}

const AsSoundConfig = () => {
  const { state } = useStore()
  const { min, max } = SOUND_BIT_RATE_BLEND_RANGE
  const currSelection = state.currentLayer?.selection as LSelection<Filter.AsSound>
  const conf = currSelection.config

  return (
    <div>
      <RangeInput
        label="Blend Intensity"
        id="blendIntensity"
        min={min}
        max={max}
        configKey="blend"
        defaultValue={conf.blend}
      />
    </div>
  )
}

const FractalPixelSortConfig = () => {
  const { state, dispatch } = useStore()
  const { min, max } = FRACTAL_SORT_DISTORTION_RANGE
  const currSelection = state.currentLayer?.selection as LSelection<Filter.FractalPixelSort>
  const conf = currSelection.config

  return (
    <div>
      <RangeInput
        label="Distortion Intensity"
        id="distortionIntensity"
        min={min}
        max={max}
        configKey="intensity"
        defaultValue={conf.intensity}
        refresh
      />
      <button
        onClick={() => {
          dispatch({ type: StoreActionType.ResetImageCanvas })
          dispatch({
            type: StoreActionType.GenerateResult,
            payload: { refresh: true }
          })
        }}
      >
        Refresh Distortions
      </button>
    </div>
  )
}

const RGBShiftConfig = () => {
  const { state } = useStore()
  const { min, max } = RGB_SHIFT_INTENSITY_RANGE
  const currSelection = state.currentLayer?.selection as LSelection<Filter.RGBShift>
  const conf = currSelection.config
  return (
    <div>
      <ListSelection
        label="RGB Shift Effect"
        id="rgb-shift-effect"
        items={RGB_SHIFT_OPTIONS}
        configKey="effect"
        defaultValue="Vibrance"
        getItemValue={(item) => item}
      />
      <RangeInput
        label="Intensity"
        id="rgbShiftIntensity"
        min={min}
        max={max}
        configKey="intensity"
        defaultValue={conf.intensity}
        refresh
      />
    </div>
  )
}

const PixelSortConfig = () => {
  const { state } = useStore()
  const { min, max } = PIXEL_SORT_INTENSITY
  const currSelection = state.currentLayer?.selection as LSelection<Filter.PixelSort>
  const conf = currSelection.config
  return (
    <div>
      <ListSelection
        label="Sort Direction"
        id="pixelSortDirection"
        items={PIXEL_SORT_DIRECTIONS}
        configKey="direction"
        defaultValue="Vertical"
        getItemValue={(item) => item}
        refresh
      />
      <RangeInput
        label="Intensity"
        id="pixelSortIntensity"
        min={min}
        max={max}
        configKey="intensity"
        defaultValue={conf.intensity}
        refresh
      />
    </div>
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
  }
}

function FilterConfigurations() {
  const { state } = useStore()
  const filter = state.currentLayer?.selection.filter
  return <div>{ConfigElements(filter)}</div>
}

export default FilterConfigurations
