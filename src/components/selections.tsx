import { useLoading } from "~/hooks/useLoading"
import { useStore } from "~/hooks/useStore"
import { StoreActionType } from "~/providers/store/reducer"
import { Filter } from "~/types"
import { filterNameRegistry } from "~/utils/filters/registry"

function Selections() {
  const { loading } = useLoading()
  const { state, dispatch } = useStore()
  const filterList = Object.keys(Filter)

  const onAddLayer = () => {
    if (!loading) {
      dispatch({ type: StoreActionType.CreateNewLayer })
    }
  }

  const onDeleteLayer = (idx: number) => {
    dispatch({ type: StoreActionType.DeleteLayer, payload: idx })
    dispatch({ type: StoreActionType.ResetImageCanvas })
    dispatch({ type: StoreActionType.GenerateResult })
  }

  const onChangeFilter = (idx: number, value: Filter) => {
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
  }

  // clear selection by reverting back to selecting whole image as the area data
  const onClearSelection = () => {
    dispatch({
      type: StoreActionType.SetPointsToLayer,
      payload: { points: [], start: { x: 0, y: 0 } }
    })
    dispatch({
      type: StoreActionType.UpdateLayerSelection,
      payload: {
        layerIdx: state.selectedLayerIdx,
        pselection: { area: state.originalAreaData },
        withUpdateInitialPresent: false
      }
    })
    dispatch({ type: StoreActionType.ResetImageCanvas })
    dispatch({ type: StoreActionType.GenerateResult })
  }

  return (
    <div>
      <button onClick={onAddLayer}>Add new selection</button>
      <ul>
        {state.layers.map((point, idx) => (
          <li id={`${idx}`} key={idx}>
            <select
              onChange={(event) => onChangeFilter(idx, event.target.value as Filter)}
              value={point.selection.filter}
            >
              {filterList.map((filter) => (
                <option value={filter} key={`filter-${idx}-${filter}`}>
                  {filterNameRegistry[filter as Filter]}
                </option>
              ))}
            </select>
            <button onClick={() => dispatch({ type: StoreActionType.SelectLayer, payload: idx })}>
              {state.selectedLayerIdx == idx ? "(Active)" : "Select"}
            </button>
            <button onClick={onClearSelection}>Clear Selection</button>
            <button onClick={() => onDeleteLayer(idx)}>Delete</button>
            <button
              onClick={() =>
                dispatch({
                  type: StoreActionType.MoveLayer,
                  payload: { direction: "up", layerIdx: idx }
                })
              }
            >
              Up
            </button>
            <button
              onClick={() =>
                dispatch({
                  type: StoreActionType.MoveLayer,
                  payload: { direction: "down", layerIdx: idx }
                })
              }
            >
              Down
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Selections
