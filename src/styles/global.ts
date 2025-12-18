import styled, { createGlobalStyle } from "styled-components"

export const GlobalStyles = createGlobalStyle`
  @font-face {
    font-family: "Modeseven"; 
    src: local("Modeseven"), url("./fonts/Modeseven.ttf") format("truetype");
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  * {
    box-sizing: border-box;
    font-family: "Modeseven"; 
    src: local("Modeseven"), url("./fonts/Modeseven.ttf") format("truetype");
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -o-user-select: none;
    user-select: none;
  }
  
  /* html reset */
  html,
  body,
  div,
  span,
  applet,
  object,
  iframe,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  p,
  blockquote,
  pre,
  a,
  abbr,
  acronym,
  address,
  big,
  cite,
  code,
  del,
  dfn,
  em,
  img,
  ins,
  kbd,
  q,
  s,
  samp,
  small,
  strike,
  strong,
  sub,
  sup,
  tt,
  var,
  b,
  u,
  i,
  center,
  dl,
  dt,
  dd,
  ol,
  ul,
  li,
  fieldset,
  form,
  label,
  legend,
  table,
  caption,
  tbody,
  tfoot,
  thead,
  tr,
  th,
  td,
  article,
  aside,
  canvas,
  details,
  embed,
  figure,
  figcaption,
  footer,
  header,
  hgroup,
  menu,
  nav,
  output,
  ruby,
  section,
  summary,
  time,
  mark,
  audio,
  video {
    margin: 0;
    padding: 0;
    border: 0;
    font-size: 100%;
    vertical-align: baseline;
  }
  
  /* HTML5 display-role reset for older browsers */
  article,
  aside,
  details,
  figcaption,
  figure,
  footer,
  header,
  hgroup,
  menu,
  nav,
  section {
    display: block;
  }
  
  body {
    line-height: 1;
    background-repeat: repeat;
    background-image: url("./grid_patterns.png");
  }
  
  ol,
  ul {
    list-style: none;
  }
  
  blockquote,
  q {
    quotes: none;
  }
  
  blockquote:before,
  blockquote:after,
  q:before,
  q:after {
    content: "";
    content: none;
  }
  
  table {
    border-collapse: collapse;
    border-spacing: 0;
  }

  button {
    all: unset;
  }

  select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
  }

  select::-ms-expand {
    display: none;
  }
`

export const PushTop = styled.div`
  margin-top: auto;
`

export const FlexEnd = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  align-items: center;
`

export const FlexGap = styled.div<{ direction: "col" | "row" }>`
  display: flex;
  flex-direction: ${({ direction }) => (direction === "col" ? "column" : "row")};
  gap: 8px;
`
