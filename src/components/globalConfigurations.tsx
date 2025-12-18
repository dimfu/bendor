import styled from "styled-components"
import { H5, Text } from "./reusables/typography"
import Switch from "./reusables/switch"
import { FlexEnd, FlexGap } from "~/styles/global"

// TODO: make this whole thing work
const GlobalConfiguration = () => {
  return (
    <Container>
      <H5 style={{ marginBottom: "12px" }}>Global Configurations</H5>
      <FlexGap direction="col">
        <FlexEnd>
          <Text size="small" variant="secondary">
            Enable move mode
          </Text>
          <Switch defaultChecked />
        </FlexEnd>
        <FlexEnd>
          <Text size="small" variant="secondary">
            Hide Selection Overlay
          </Text>
          <Switch />
        </FlexEnd>
      </FlexGap>
    </Container>
  )
}

const Container = styled.div`
  padding: 24px;
  border-bottom: solid black 1px;
  border-bottom-style: dashed;
`

export default GlobalConfiguration
