import { type ReactNode, useReducer } from "react"
import reducer from "./reducer"
import { StoreContext } from "./storeContext"
import { initialStoreState } from "./storeState"

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialStoreState)
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}
