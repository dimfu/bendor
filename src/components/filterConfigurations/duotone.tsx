import { Fragment, useEffect, useRef, useState } from "react"
import { HexColorInput, HexColorPicker } from "react-colorful"
import styled from "styled-components"
import { DUOTONE_OPTS } from "~/constants"
import { useStore } from "~/hooks/useStore"
import { StoreActionType } from "~/providers/store/reducer"
import { FlexEnd } from "~/styles/global"
import type { Duotone, Filter, LSelection } from "~/types"
import { generateRandomHex } from "~/utils/etc"
import { Label, Text } from "../reusables/typography"
import { RangeInput } from "./reusables"

type Preset = Pick<Duotone, "highlightsColor" | "shadowsColor">
type ColorPresets = Array<Preset>

// CC: https://medialoot.com/duotones/
const presets: ColorPresets = [
  { highlightsColor: "#6aff7f", shadowsColor: "#00007e" },
  { highlightsColor: "#f8be3d", shadowsColor: "#682218" },
  { highlightsColor: "#01dbfe", shadowsColor: "#7f01d3" },
  { highlightsColor: "#fbf019", shadowsColor: "#01ab6d" },
  { highlightsColor: "#fbcd20", shadowsColor: "#ff5d77" },
  { highlightsColor: "#dc4379", shadowsColor: "#11245e" },
  { highlightsColor: "#ffffff", shadowsColor: "#91cff8" },
  { highlightsColor: "#ffefb3", shadowsColor: "#290900" },
  { highlightsColor: "#acd49d", shadowsColor: "#602457" },
  { highlightsColor: "#f00e2e", shadowsColor: "#0a0505" },
  { highlightsColor: "#defcfe", shadowsColor: "#8682d9" },
  { highlightsColor: "#fdd9e2", shadowsColor: "#65b7d6" },
  { highlightsColor: "#01ab6d", shadowsColor: "#241a5f" },
  { highlightsColor: "#ff9738", shadowsColor: "#36200c" },
  { highlightsColor: "#dfb233", shadowsColor: "#2f0781" }
]

const DuotoneConfig = () => {
  const { state, dispatch } = useStore()
  const [color, setColor] = useState<string>("#ffffff") // color picker value state
  const [usingCustom, setUsingCustom] = useState<boolean>(false)
  const [customType, setCustomType] = useState<keyof Preset>("highlightsColor") // color picker type state
  const [selectedPreset, setSelectedPreset] = useState<number>(0)

  // to persist custom preset
  const customColor = useRef<Preset>(null)

  const { BRIGHTNESS_RANGE, CONTRAST_RANGE } = DUOTONE_OPTS
  const currSelection = state.currentLayer?.selection as LSelection<Filter.Duotone>
  const conf = currSelection.config

  const updateCanvas = (preset: Preset) => {
    dispatch({
      type: StoreActionType.UpdateLayerSelection,
      payload: {
        layerIdx: state.selectedLayerIdx,
        pselection: { config: { highlightsColor: preset.highlightsColor, shadowsColor: preset.shadowsColor } as Duotone },
        withUpdateInitialPresent: false
      }
    })
    dispatch({ type: StoreActionType.ResetImageCanvas })
    dispatch({ type: StoreActionType.GenerateResult, payload: { refreshIdx: state.selectedLayerIdx } })
  }

  const onClickPreset = (idx: number) => {
    // reset custom preset state values
    setUsingCustom(false)
    setCustomType("highlightsColor")

    setSelectedPreset(idx)
    updateCanvas(presets[idx])
  }

  const onClickUsingCustom = () => {
    if (!customColor.current) {
      customColor.current = randomizePreset()
    }
    // load latest custom color iteration
    const { highlightsColor, shadowsColor } = customColor.current
    updateCanvas({ highlightsColor, shadowsColor })
    setUsingCustom(true)
    // since the default custom type selection was highlightsColor we set the color picker to highlights's color
    setColor(highlightsColor)
  }

  const onChangeColor = (color: string) => {
    setColor(color)
  }

  const onMouseUpColor = () => {
    const hexColor = color as `#${string}`
    const preset: Preset = {
      highlightsColor: customType === "highlightsColor" ? hexColor : conf.highlightsColor,
      shadowsColor: customType === "shadowsColor" ? hexColor : conf.shadowsColor
    }
    customColor.current = preset
    updateCanvas(preset)
  }

  const onChangeCustomType = (type: keyof Preset) => {
    setCustomType(type)
    let changeColor: string
    if (type === "highlightsColor") {
      changeColor = conf.highlightsColor
    } else {
      changeColor = conf.shadowsColor
    }
    setColor(changeColor)
  }

  const randomizePreset = () => {
    const highlightsColor = generateRandomHex()
    const shadowsColor = generateRandomHex()
    return { highlightsColor, shadowsColor }
  }

  const onRandomizePreset = () => {
    customColor.current = randomizePreset()
    let changeColor: string
    if (customType === "highlightsColor") {
      changeColor = customColor.current.highlightsColor
    } else {
      changeColor = customColor.current.shadowsColor
    }
    setColor(changeColor)
    updateCanvas(customColor.current)
  }

  useEffect(() => {
    customColor.current = { highlightsColor: conf.highlightsColor, shadowsColor: conf.shadowsColor }

    let isAPreset = false
    for (const [index, preset] of presets.entries()) {
      if (preset.highlightsColor === conf.highlightsColor && preset.shadowsColor === conf.shadowsColor) {
        isAPreset = true
        setSelectedPreset(index)
        break
      }
    }

    if (!isAPreset) {
      if (customType === "highlightsColor") {
        setColor(conf.highlightsColor)
      } else {
        setColor(conf.shadowsColor)
      }
      setUsingCustom(true)
    }
  }, [customType, conf.highlightsColor, conf.shadowsColor])

  return (
    <Container>
      <RangeInput
        label="Brightness"
        id="brightnessIntensity"
        min={BRIGHTNESS_RANGE.min}
        max={BRIGHTNESS_RANGE.max}
        configKey="brightness"
        defaultValue={conf.brightness}
        refresh
      />
      <RangeInput
        label="Contrast"
        id="contrastIntensity"
        min={CONTRAST_RANGE.min}
        max={CONTRAST_RANGE.max}
        configKey="contrast"
        defaultValue={conf.contrast}
        refresh
      />
      <Label>Color Presets</Label>
      <ColorPresetContainer>
        {presets.map((preset, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: dont care, dont give a shit
          <PresetItem preset={preset} key={idx} onClick={() => onClickPreset(idx)} selected={selectedPreset === idx}></PresetItem>
        ))}
        <PresetItem onClick={onClickUsingCustom} selected={usingCustom}>
          Custom
        </PresetItem>
      </ColorPresetContainer>
      {usingCustom && (
        <Fragment>
          <FlexEnd>
            <Label variant="primary">Custom Tone</Label>
            <Text onClick={onRandomizePreset} variant="secondary" size="small" style={{ cursor: "pointer" }}>
              Randomize
            </Text>
          </FlexEnd>
          <FlexEnd>
            <Text
              onClick={() => onChangeCustomType("highlightsColor")}
              style={{ cursor: "pointer" }}
              size="small"
              variant={customType === "highlightsColor" ? "primary" : "secondary"}
            >
              Highlights
            </Text>
            <Text
              onClick={() => onChangeCustomType("shadowsColor")}
              style={{ cursor: "pointer" }}
              size="small"
              variant={customType === "shadowsColor" ? "primary" : "secondary"}
            >
              Shadows
            </Text>
          </FlexEnd>
          <HexColorPicker color={color} onChange={(t) => onChangeColor(t)} onMouseUp={onMouseUpColor} onTouchEnd={onMouseUpColor} />
          <HexColorInput color={color} onChange={(t) => onChangeColor(t)} />
        </Fragment>
      )}
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  overflow-y: hidden;
  flex-direction: column;
  gap: 12px;
`

const ColorPresetContainer = styled.div`
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 12px;
`

interface PresetProp {
  preset?: Preset
  selected?: boolean
}

const PresetItem = styled.div<PresetProp>`
  height: 90px;
  cursor: pointer;
  text-align: center;
  align-items: center;
  justify-content: center;
  display: flex;
  border: 1px solid ${({ theme, selected }) => (selected ? theme.colors.primary : "black")};
  ${(props) =>
    props.preset
      ? `
    background: linear-gradient(
      to right,
      ${props.preset.shadowsColor} 0%,
      ${props.preset.shadowsColor} 50%,
      ${props.preset.highlightsColor} 50%,
      ${props.preset.highlightsColor} 100%
    );
  `
      : "background: transparent;"}
  position: relative;
  
  ${({ theme, selected }) =>
    selected &&
    `
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: ${theme.colors.primary};
      opacity: 0.4;
      pointer-events: none;
    }
  `}
`

export default DuotoneConfig
