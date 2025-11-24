import { createContext, type Dispatch } from "react";
import type { State } from "../../types";
import { initialStoreState } from "./initialState";
import type { Action } from "./reducer";

export const StoreContext = createContext<{
  state: State;
  dispatch: Dispatch<Action>;
}>({
  state: initialStoreState,
  dispatch: () => undefined,
});
