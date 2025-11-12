import { useStore } from "../hooks";
import { ActionType } from "../reducer";
import { Filter } from "../types";

function Selections() {
  const { state, dispatch } = useStore();
  const filterList = Object.keys(Filter);
  return (
    <div>
      <button onClick={() => dispatch({ type: ActionType.CreateNewLayer })}>
        Add new selection
      </button>
      <ul>
        {state.selections.map((point, idx) => (
          <li id={`${idx}`} key={idx}>
            <span
              onClick={() =>
                dispatch({ type: ActionType.SelectLayer, payload: idx })
              }
            >
              Point {idx}
            </span>
            <select
              onChange={(event) =>
                dispatch({
                  type: ActionType.UpdateSelection,
                  payload: {
                    layerIdx: idx,
                    pselection: {
                      filter: event.target.value as Filter
                    }
                  },
                })
              }
              value={point.filter}
            >
              {filterList.map((filter) => (
                <option key={`filter-${idx}-${filter}`}>{filter}</option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Selections;
