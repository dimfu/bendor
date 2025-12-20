import { forwardRef, useEffect, useState } from "react"
import styled from "styled-components"
import { useLoading } from "~/hooks/useLoading"
import { Label } from "./typography"

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  refresh?: boolean
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(({ id, label, min, max, refresh, defaultValue, ...rest }, ref) => {
  const { loading } = useLoading()
  const [displayValue, setDisplayValue] = useState(defaultValue ?? rest.value ?? min ?? 0)

  useEffect(() => {
    if (rest.value !== undefined) {
      setDisplayValue(rest.value)
    }
  }, [rest.value])

  return (
    <Container>
      <FlexEnd>
        <Label htmlFor={id}>{label}</Label>
        <Value>{displayValue}</Value>
      </FlexEnd>
      <Range
        onChange={(e) => {
          setDisplayValue(parseFloat(e.target.value))
          rest.onChange?.(e)
        }}
        disabled={loading}
        ref={ref}
        id={id}
        type="range"
        min={min}
        max={max}
        defaultValue={defaultValue}
        {...rest}
      />
    </Container>
  )
})

Slider.displayName = "Slider"

const FlexEnd = styled.div`
    display: flex;
    justify-content: space-between;
    width: 100%;
    align-items: center;
`

const Container = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  color: #333;
  flex-wrap: wrap;
  height: 56px;
  align-content: end;
`

const Value = styled.span`
  padding: 0;
  border: none;
  height: 16px;
  max-width: 48px;
  color: #333;
  text-align: end;
  background-color: transparent;
  -moz-appearance: textfield;
  -webkit-appearance: textfield;
  appearance: textfield;

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &:focus {
    border-radius: 0;
    outline: none;
    font-weight: 700;
    border-bottom: 1px solid #333;
    margin-bottom: -1px;
  }
`

const Range = styled.input`
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  height: 24px;
  background: transparent;
  outline: none;
  margin: 2px 0 0;
  flex-basis: 100%;
  position: relative;
  cursor: pointer;

  &:before {
    content: "";
    position: absolute;
    top: 14px;
    left: 0;
    right: 0;
    height: 1px;
    background: #333;
    opacity: 0.5;
    transition: height 0.2s ease, opacity 0.2s ease;
    pointer-events: none;
  }

  &:focus:before,
  &:hover:before {
    height: 1px;
    opacity: 1;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    border-left: 1px solid #333;
    height: 10px;
    width: 1px;
    border-radius: 0;
    background: #f9f8f5;
    margin-top: -4px;
    position: relative;
    opacity: 0.5;
    transition: opacity 0.2s ease;
  }

  &:focus::-webkit-slider-thumb,
  &:hover::-webkit-slider-thumb {
    opacity: 1;
  }

  &::-moz-range-track {
    width: 100%;
    height: 1px;
    background: #333;
    opacity: 0.5;
    transition: opacity 0.2s ease;
  }

  &:focus::-moz-range-track,
  &:hover::-moz-range-track {
    opacity: 1;
  }

  &::-moz-range-thumb {
    border: none;
    height: 10px;
    width: 1px;
    border-radius: 0;
    background: ${({ theme }) => theme.colors.primary};
    opacity: 0.5;
    transition: opacity 0.2s ease;
  }

  &:focus::-moz-range-thumb,
  &:hover::-moz-range-thumb {
    opacity: 1;
  }
`
