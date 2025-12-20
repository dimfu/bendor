import { useState, type ReactNode } from "react"
import { LoadingContext } from "./loadingContext"

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(false)
  const start = () => setLoading(true)
  const stop = () => setLoading(false)
  return <LoadingContext value={{ loading, start, stop }}>{children}</LoadingContext>
}
