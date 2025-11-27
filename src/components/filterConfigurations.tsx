import { useRef, type JSX } from "react";
import { useStore } from "../hooks/useStore";
import { Filter, type LSelection } from "../types";
import { BRIGHTNESS_INTENSITY_RANGE, GRAYSCALE_INTENSITY_RANGE, SOUND_BIT_RATE_BLEND_RANGE } from "../constants";
import { StoreActionType } from "../providers/store/reducer";

interface RangeInputProps {
  label: string;
  id: string;
  min: number;
  max: number;
  configKey: 'intensity' | 'blend';
  defaultValue: number;
}

const RangeInput = ({ label, id, min, max, configKey, defaultValue }: RangeInputProps) => {
  const { state, dispatch } = useStore();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onApply = () => {
    console.log(state.currentLayer?.selection.filter, configKey);
    const value = parseFloat(inputRef.current?.value ?? defaultValue.toString());
    dispatch({
      type: StoreActionType.UpdateLayerSelection,
      payload: {
        layerIdx: state.selectedLayerIdx,
        pselection: { config: { [configKey]: value } },
        withUpdateInitialPresent: false,
      },
    });
    dispatch({ type: StoreActionType.ResetImageCanvas });
    dispatch({ type: StoreActionType.GenerateResult });
  };

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
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
  );
};

const GrayscaleConfig = () => {
  const { state } = useStore();
  const { min, max } = GRAYSCALE_INTENSITY_RANGE;
  const currSelection = state.currentLayer?.selection as LSelection<Filter.Grayscale>;
  const conf = currSelection.config;

  return (
    <RangeInput
      label="Intensity"
      id="grayscaleIntensity"
      min={min}
      max={max}
      configKey="intensity"
      defaultValue={conf.intensity}
    />
  );
};

const BrightnessConfig = () => {
  const { state } = useStore();
  const { min, max } = BRIGHTNESS_INTENSITY_RANGE;
  const currSelection = state.currentLayer?.selection as LSelection<Filter.Brightness>;
  const conf = currSelection.config;

  return (
    <RangeInput
      label="Intensity"
      id="brightnessIntensity"
      min={min}
      max={max}
      configKey="intensity"
      defaultValue={conf.intensity}
    />
  );
};

const AsSoundConfig = () => {
  const { state } = useStore();
  const { min, max } = SOUND_BIT_RATE_BLEND_RANGE;
  const currSelection = state.currentLayer?.selection as LSelection<Filter.AsSound>;
  const conf = currSelection.config;

  return (
    <RangeInput
      label="Blend Intensity"
      id="blendIntensity"
      min={min}
      max={max}
      configKey="blend"
      defaultValue={conf.blend}
    />
  );
};

const ConfigElements = (filter?: Filter): JSX.Element => {
  if (!filter) {
    return <div></div>;
  }
  switch (filter) {
    case Filter.None:
    case Filter.Tint:
      return <div></div>;
    case Filter.Grayscale:
      return <GrayscaleConfig />;
    case Filter.Brightness:
      return <BrightnessConfig />;
    case Filter.AsSound:
      return <AsSoundConfig />;
  }
};

function FilterConfigurations() {
  const { state } = useStore();
  const filter = state.currentLayer?.selection.filter;
  return (
    <div>
      {ConfigElements(filter)}
    </div>
  );
}

export default FilterConfigurations;
