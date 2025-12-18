import { useLoading } from "~/hooks/useLoading"
import { useStore } from "~/hooks/useStore"
import { StoreActionType } from "~/providers/store/reducer"
import { Filter } from "~/types"
import { filterNameRegistry } from "~/utils/filters/registry"
import { Select } from "./reusables/select"
import { H4, Label } from "./reusables/typography"
import FilterConfigurations from "./filterConfigurations"
import styled from "styled-components"
import Button from "./reusables/buttons"

const LayerSettings = () => {
  const {
    state: { selectedLayerIdx, currentLayer },
    dispatch
  } = useStore()
  const { start, stop } = useLoading()

  const filterList = Object.keys(Filter)

  const onChangeFilter = (idx: number, value: Filter) => {
    start()
    dispatch({
      type: StoreActionType.UpdateLayerSelection,
      payload: {
        layerIdx: idx,
        pselection: {
          filter: value
        },
        withUpdateInitialPresent: false
      }
    })
    stop()
  }

  const onDeleteLayer = () => {
    start()
    dispatch({ type: StoreActionType.DeleteLayer, payload: selectedLayerIdx })
    dispatch({ type: StoreActionType.ResetImageCanvas })
    dispatch({ type: StoreActionType.GenerateResult })
    stop()
  }

  const generateResult = () => {
    dispatch({ type: StoreActionType.ResetImageCanvas })
    dispatch({ type: StoreActionType.GenerateResult })
  }

  const onUndoRedo = (action: "undo" | "redo") => {
    dispatch({ type: StoreActionType.DoLayerAction, payload: action })
    generateResult()
  }

  return (
    <Container>
      <H4 style={{ marginBottom: "12px" }}>Layer Configurations</H4>
      <Label>Filter</Label>
      <Select $full onChange={(event) => onChangeFilter(selectedLayerIdx, event.target.value as Filter)} value={currentLayer?.selection.filter}>
        {filterList.map((filter) => (
          <option value={filter} key={`filter-${filter}`}>
            {filterNameRegistry[filter as Filter]}
          </option>
        ))}
      </Select>
      <FilterConfigurations />
      <Actions>
        <Button $full variant="warning" onClick={onDeleteLayer}>
          Delete Layer
        </Button>
        <Button variant="outline" type="button" onClick={() => onUndoRedo("undo")}>
          Undo
        </Button>
        <Button variant="outline" type="button" onClick={() => onUndoRedo("redo")}>
          Redo
        </Button>
      </Actions>
    </Container>
  )
}

const Container = styled.div`
  padding: 24px;
  @media (max-width: 1280px) {
    border-top: solid black 1px;
    border-top-style: dashed;
  }
`

const Actions = styled.div`
    margin-top: 12px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 4px;

    & > *:first-child {
        grid-column: span 2;
    }
`

export default LayerSettings
