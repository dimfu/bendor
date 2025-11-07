import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { Point } from "./types";
import reducer, { type Action } from "./reducer";

export interface PSelection {
  points: Point[];
  start: Point;
}

export interface State {
  selections: PSelection[];
  currentSelection?: PSelection;
  selectedSelectionIdx: number;
}

export const initialState: State = {
  selections: [],
  currentSelection: undefined,
  selectedSelectionIdx: -1,
};

const StoreContext = createContext<{
  state: State;
  dispatch: Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => undefined,
});

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
