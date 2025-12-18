import styled from "styled-components"

interface SelectProp {
  $full?: boolean
}

export const Select = styled.select<SelectProp>`
    padding: 8px;
    border: ${({ theme }) => `solid 1px ${theme.colors.primary}`};
    width: ${({ $full }) => ($full ? "100%" : "auto")};
    background-color: white;
`
