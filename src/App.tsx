import { useRef } from "react";
import "./App.css";
import Selections from "./components/selections";
import { useStore } from "./hooks/useStore";
import { StoreActionType } from "./providers/store/reducer";
import Canvas from "./components/canvas";
import { LoadingProvider } from "./providers/loading/loadingProvider";

function App() {
  const { dispatch } = useStore();
  const imageRef = useRef<HTMLInputElement>(null);

  const onImageChange = () => {
    dispatch({ type: StoreActionType.ClearLayers });
    const files = imageRef.current?.files;
    if (!files || files?.length == 0) {
      return;
    }
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && event.target.result instanceof ArrayBuffer) {
        dispatch({
          type: StoreActionType.UpdateState,
          payload: { key: "imgBuf", value: event.target.result },
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const generateResult = () => {
    dispatch({ type: StoreActionType.ResetImageCanvas });
    dispatch({ type: StoreActionType.GenerateResult });
  };

  return (
    <LoadingProvider>
      <input
        onChange={onImageChange}
        ref={imageRef}
        name="image"
        type="file"
        accept="image/*"
      />
      <Selections />
      <Canvas />
      <button
        onClick={() => {
          dispatch({ type: StoreActionType.DoLayerAction, payload: "undo" })
          generateResult();
        }}>
        Undo
      </button>
      <button
        onClick={() => {
          dispatch({ type: StoreActionType.DoLayerAction, payload: "redo" })
          generateResult();
        }}>
        Redo
      </button>
      <button onClick={generateResult}>Generate</button>
    </LoadingProvider>
  );
}

export default App;
