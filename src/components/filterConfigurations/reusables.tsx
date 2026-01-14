import { useRef, useState } from "react"
import { flushSync } from "react-dom"
import styled from "styled-components"
import { useLoading } from "~/hooks/useLoading"
import { useStore } from "~/hooks/useStore"
import { StoreActionType } from "~/providers/store/reducer"
import { Select } from "../reusables/select"
import { Slider } from "../reusables/slider"
import { Label } from "../reusables/typography"

interface RangeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  min: number
  max: number
  configKey: "intensity" | "blend" | "brightness" | "distortion" | "contrast"
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

const RangeInput = ({ label, id, min, max, configKey, defaultValue, ...rest }: RangeInputProps) => {
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
    dispatch({ type: StoreActionType.GenerateResult, payload: { refreshIdx: state.selectedLayerIdx } })
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

const ListSelection = <T, V = T>({ label, id, items, configKey, defaultValue, renderItem, getItemValue }: ListSelectionProps<T, V>) => {
  const { loading, start, stop } = useLoading()
  const { state, dispatch } = useStore()
  const [selectedValue, setSelectedValue] = useState<T>(defaultValue)

  const onSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIndex = parseInt(event.target.value, 10)
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
    dispatch({ type: StoreActionType.GenerateResult, payload: { refreshIdx: state.selectedLayerIdx } })
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

const Container = styled.div`
  margin-top: 24px;
`

const ColWithGaps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export { RangeInput, ListSelection, Container, ColWithGaps }
