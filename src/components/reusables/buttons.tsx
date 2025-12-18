import styled from "styled-components"

interface ButtonProp {
  variant?: "primary" | "outline" | "warning" | "disabled"
  $full?: boolean
}

const Button = styled.button<ButtonProp>`
  text-align: center;
  padding: 8px;
  cursor: ${({ variant }) => (variant === "disabled" ? "not-allowed" : "pointer")};
  border: none;
  font-size: 16px;

  width: ${({ $full }) => ($full ? "100%" : "auto")};
  box-sizing: border-box;

  border: ${({ theme, variant }) => {
    switch (variant) {
      case "outline":
        return `1px solid ${theme.colors.primary}`
    }
  }};
  
  color: ${({ theme, variant = "primary" }) => {
    switch (variant) {
      case "warning":
        return theme.colors.white
      case "disabled":
        return theme.colors.white
      case "outline":
        return theme.colors.primaryText
      default:
        return theme.colors.white
    }
  }};
  
  background-color: ${({ theme, variant = "primary" }) => {
    switch (variant) {
      case "warning":
        return theme.colors.warning
      case "disabled":
        return theme.colors.disabled
      case "outline":
        return theme.colors.white
      default:
        return theme.colors.primary
    }
  }};
  
  opacity: ${({ variant }) => (variant === "disabled" ? 0.6 : 1)};
  pointer-events: ${({ variant }) => (variant === "disabled" ? "none" : "auto")};
  
  @media (max-width: 768px) {
    margin-top: 0;
  }
  
  &:hover {
    opacity: ${({ variant }) => (variant === "disabled" ? 0.6 : 0.9)};
    background-color: ${({ theme, variant }) => {
      switch (variant) {
        case "outline":
          return theme.colors.primary
      }
    }};

  color: ${({ theme, variant = "primary" }) => {
    switch (variant) {
      case "outline":
        return theme.colors.white
    }
  }};
  }
`

export default Button
