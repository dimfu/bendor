import { useRef } from "react"
import "./App.css"
import Selections from "./components/selections"
import { useStore } from "./hooks/useStore"
import { StoreActionType } from "./providers/store/reducer"
import Canvas from "./components/canvas"
import { LoadingProvider } from "./providers/loading/loadingProvider"
import FilterConfigurations from "./components/filterConfigurations"
import Exports from "./components/exports"
import { fileTypeFromBuffer } from "file-type"

function App() {
  const { dispatch } = useStore()
  const imageRef = useRef<HTMLInputElement>(null)

  const onImageChange = async () => {
    dispatch({ type: StoreActionType.ClearLayers })
    const files = imageRef.current?.files
    if (!files || files?.length == 0) {
      return
    }
    const file = files[0]
    const arrayBuf = await file.arrayBuffer()
    const blob = new Uint8Array(arrayBuf)
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target && event.target.result instanceof ArrayBuffer) {
        dispatch({
          type: StoreActionType.UpdateState,
          payload: { key: "imgBuf", value: event.target.result }
        })
      }
    }
    const ftresult = await fileTypeFromBuffer(blob)
    if (!ftresult) return
    dispatch({
      type: StoreActionType.UpdateState,
      payload: { key: "ftype", value: ftresult }
    })
    reader.readAsArrayBuffer(file)
  }

  const generateResult = () => {
    dispatch({ type: StoreActionType.ResetImageCanvas })
    dispatch({ type: StoreActionType.GenerateResult })
  }

  return (
    <LoadingProvider>
      <input onChange={onImageChange} ref={imageRef} name="image" type="file" accept="image/*" />
      <Selections />
      <Canvas />
      <div>
        <button
          onClick={() => {
            dispatch({ type: StoreActionType.DoLayerAction, payload: "undo" })
            generateResult()
          }}
        >
          Undo
        </button>
        <button
          onClick={() => {
            dispatch({ type: StoreActionType.DoLayerAction, payload: "redo" })
            generateResult()
          }}
        >
          Redo
        </button>
        <button onClick={generateResult}>Generate</button>
      </div>
      <FilterConfigurations />
      <Exports />
    </LoadingProvider>
  )
}

export default App
