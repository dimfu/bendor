import { useContext } from "react"
import { StoreContext } from "~/providers/store/storeContext"

export const useStore = () => useContext(StoreContext)
