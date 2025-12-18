import styled from "styled-components"

export const H1 = styled.h1<{ variant?: "primary" | "secondary" }>`
  font-size: 36px;
  font-weight: 700;
  color: ${({ theme, variant = "primary" }) => (variant === "secondary" ? theme.colors.secondaryText : theme.colors.primaryText)};
  margin: 0;
`

export const H2 = styled.h2<{ variant?: "primary" | "secondary" }>`
  font-size: 30px;
  font-weight: 700;
  color: ${({ theme, variant = "primary" }) => (variant === "secondary" ? theme.colors.secondaryText : theme.colors.primaryText)};
  margin: 0;
`

export const H3 = styled.h3<{ variant?: "primary" | "secondary" }>`
  font-size: 24px;
  font-weight: 600;
  color: ${({ theme, variant = "primary" }) => (variant === "secondary" ? theme.colors.secondaryText : theme.colors.primaryText)};
  margin: 0;
`

export const H4 = styled.h4<{ variant?: "primary" | "secondary" }>`
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme, variant = "primary" }) => (variant === "secondary" ? theme.colors.secondaryText : theme.colors.primaryText)};
  margin: 0;
  margin-bottom: 12px;
`

export const H5 = styled.h5<{ variant?: "primary" | "secondary" }>`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme, variant = "primary" }) => (variant === "secondary" ? theme.colors.secondaryText : theme.colors.primaryText)};
  margin: 0;
`

export const Text = styled.p<{ variant?: "primary" | "secondary"; size?: "small" | "medium" | "large" }>`
  font-size: ${({ size = "medium" }) => {
    switch (size) {
      case "small":
        return "14px"
      case "large":
        return "18px"
      default:
        return "16px"
    }
  }};
  font-weight: 400;
  line-height: 1.5;
  color: ${({ theme, variant = "primary" }) => (variant === "secondary" ? theme.colors.secondaryText : theme.colors.primaryText)};
  margin: 0;
`

export const Paragraph = styled(Text).attrs({ as: "p" })`
  font-size: 12px;
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
`

export const Label = styled(Text).attrs({ as: "label" })`
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
  color: ${({ theme }) => theme.colors.white};
  background-color: ${({ theme }) => theme.colors.primary};
  width: fit-content;
  margin-bottom: 4px;
`

export const Caption = styled(Text).attrs({ as: "span" })`
  font-size: 12px;
  opacity: 0.7;
`

export const Link = styled.a`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`
