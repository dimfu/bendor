import { createContext, type Dispatch } from "react";
import type { State } from "./types";
import type { Action } from "./reducer";
import { initialState } from "./misc";

export const StoreContext = createContext<{
  state: State;
  dispatch: Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => undefined,
});
