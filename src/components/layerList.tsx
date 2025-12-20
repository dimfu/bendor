import { useLoading } from "~/hooks/useLoading"
import { useStore } from "~/hooks/useStore"
import { StoreActionType } from "~/providers/store/reducer"
import Button from "./reusables/buttons"
import { Label, Text } from "./reusables/typography"
import styled from "styled-components"
import { filterNameRegistry } from "~/utils/filters/registry"
import { FlexEnd } from "~/styles/global"

function LayerList() {
  const { loading, start, stop } = useLoading()
  const {
    state: { selectedLayerIdx, imgCtx, layers },
    dispatch
  } = useStore()

  const onAddLayer = () => {
    if (!loading && imgCtx) {
      dispatch({ type: StoreActionType.CreateNewLayer })
    }
  }

  const onSelectLayer = (idx: number) => {
    dispatch({ type: StoreActionType.SelectLayer, payload: idx })
  }

  const onMoveSelection = (direction: "up" | "down", idx: number) => {
    start()
    dispatch({
      type: StoreActionType.MoveLayer,
      payload: { direction, layerIdx: idx }
    })
    dispatch({ type: StoreActionType.ResetImageCanvas })
    dispatch({ type: StoreActionType.GenerateResult })
    stop()
  }

  const onRefresh = () => {
    dispatch({ type: StoreActionType.ResetImageCanvas })
    dispatch({ type: StoreActionType.GenerateResult, payload: { refreshIdx: 0 } })
  }

  return (
    <Container>
      <FlexEnd>
        <Label>Layers</Label>
        {layers.length > 0 && (
          <Text onClick={onRefresh} variant="secondary" style={{ cursor: "pointer" }}>
            Refresh
          </Text>
        )}
      </FlexEnd>
      <List>
        {layers.length > 0 ? (
          layers.map((point, idx) => (
            <Item id={`${idx}`} key={`layers-${point.color}`}>
              <Text variant="secondary" onClick={() => onSelectLayer(idx)} style={{ cursor: "pointer" }}>
                <span>{selectedLayerIdx === idx ? "<*> " : "< > "}</span>
                {filterNameRegistry[point.selection.filter]}
              </Text>
              <MoveDirections>
                <Direction onClick={() => onMoveSelection("up", idx)}>↑</Direction>
                <Direction onClick={() => onMoveSelection("down", idx)}>↓</Direction>
              </MoveDirections>
            </Item>
          ))
        ) : (
          <EmptyList>{"<empty>"}</EmptyList>
        )}
      </List>
      <Button variant="outline" type="button" $full onClick={onAddLayer}>
        + Add new layer
      </Button>
    </Container>
  )
}
const Container = styled.div`
  border-bottom: solid black 1px;
  border-bottom-style: dashed;
  padding: 24px;
  flex: 1; // stretch the height until the next element
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  @media (max-width: 1280px) {
    flex: none;
    min-height: fit-content;
    overflow-y: hidden;
  }
`

const List = styled.ul`
  margin-bottom: 8px;
  overflow-y: auto;
  flex: 1; 
  min-height: 0;

  @media (max-width: 1280px) {
    flex: none;
    min-height: auto;
  }
`

const Item = styled.li`
  display: flex;
  justify-content: space-between;
  margin-left: 12px;
`

const MoveDirections = styled.div`
  display: flex;
  align-items: center;
  justify-items: center;
  gap: 4px;
`

const Direction = styled.span`
  cursor: pointer;
`

const EmptyList = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
`

export default LayerList
