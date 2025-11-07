import { ActionType } from "../reducer";
import { useStore } from "../store";

function Selections() {
  const { state, dispatch } = useStore();
  return (
    <div>
      <button onClick={() => dispatch({ type: ActionType.CreateNewLayer })}>
        Add new selection
      </button>
      <ul>
        {state.selections.map((_point, idx) => (
          <li
            id={`${idx}`}
            onClick={() =>
              dispatch({ type: ActionType.SelectLayer, payload: idx })
            }
            key={idx}
          >
            Point {idx}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Selections;
