import { createContext, type Dispatch } from "react"
import type { State } from "~/types"
import type { Action } from "./reducer"
import { initialStoreState } from "./storeState"

export const StoreContext = createContext<{
  state: State
  dispatch: Dispatch<Action>
}>({
  state: initialStoreState,
  dispatch: () => undefined
})
