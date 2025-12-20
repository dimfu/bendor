import styled from "styled-components"
import { useStore } from "~/hooks/useStore"
import { StoreActionType } from "~/providers/store/reducer"
import { FlexEnd, FlexGap } from "~/styles/global"
import Switch from "./reusables/switch"
import { H5, Text } from "./reusables/typography"

const GlobalConfiguration = () => {
  const { dispatch, state } = useStore()

  const onChangeMode = () => {
    let mode: "edit" | "move" = "move"
    if (state.mode === "edit") {
      mode = "move"
    } else {
      mode = "edit"
    }
    dispatch({ type: StoreActionType.UpdateState, payload: { key: "mode", value: mode } })
  }

  const onHideOverlay = () => {
    dispatch({ type: StoreActionType.UpdateState, payload: { key: "hideSelectionOverlay", value: !state.hideSelectionOverlay } })
  }

  return (
    <Container>
      <H5 style={{ marginBottom: "12px" }}>Global Configurations</H5>
      <FlexGap direction="col">
        <FlexEnd>
          <Text size="small" variant="secondary">
            Enable move mode
          </Text>
          <Switch onClick={onChangeMode} />
        </FlexEnd>
        <FlexEnd>
          <Text size="small" variant="secondary">
            Hide Selection Overlay
          </Text>
          <Switch onClick={onHideOverlay} />
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
