import { useContext } from "react"
import { LoadingContext } from "~/providers/loading/loadingContext"

export const useLoading = () => useContext(LoadingContext)
