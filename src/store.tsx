import {
  useReducer,
  type ReactNode,
} from "react";
import reducer from "./reducer";
import { initialState } from "./misc";
import { StoreContext } from "./context";

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};


