import { useReducer, type ReactNode } from "react";
import reducer from "./reducer";
import { initialStoreState } from "./initialState";
import { StoreContext } from "./context";

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialStoreState);
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};
