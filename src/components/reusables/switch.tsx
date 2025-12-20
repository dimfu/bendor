import { type MouseEvent, useRef } from "react"
import styled from "styled-components"

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Switch = ({ ...rest }: SwitchProps) => {
  const checkboxRef = useRef<HTMLInputElement>(null)

  const onClick = (e: MouseEvent<HTMLInputElement>) => {
    if (rest.onClick) {
      rest?.onClick(e)
    }
    const ref = checkboxRef.current
    if (!ref) return
    ref.checked = !ref.checked
  }

  return (
    <Container onClick={onClick}>
      <Checkbox ref={checkboxRef} type="checkbox" />
      <Label />
    </Container>
  )
}

const Container = styled.div`
  position: relative;
  display: inline-block;
  width: 60px;
  height: 24px;
`

const Checkbox = styled.input`
  display: none;
  
  &:checked + label {
    background-color: ${({ theme }) => theme.colors.primary};
  }
  
  &:checked + label::before {
    transform: translateX(26px);
  }
`

const Label = styled.label`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .3s;
  
  &::before {
    position: absolute;
    content: "";
    height: 20px;
    width: 30px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: .3s;
  }
`

export default Switch
