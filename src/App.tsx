import { useRef } from "react";
import "./App.css";
import Canvas from "./canvas";
import Selections from "./components/selections";
import { ActionType } from "./reducer";
import { useStore } from "./hooks";

function App() {
  const { dispatch } = useStore();
  const imageRef = useRef<HTMLInputElement>(null);

  const onImageChange = () => {
    const files = imageRef.current?.files;
    if (!files || files?.length == 0) {
      return;
    }
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && event.target.result instanceof ArrayBuffer) {
        dispatch({
          type: ActionType.UpdateState,
          payload: { key: "imgBuf", value: event.target.result },
        });
      }
    };
    reader.readAsArrayBuffer(file);
    // clear every layers whenever new image loaded
    dispatch({ type: ActionType.ClearLayers });
  };

  const generateResult = () => {
    dispatch({ type: ActionType.ResetImageCanvas });
    dispatch({ type: ActionType.GenerateResult });
  };

  return (
    <>
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
        onClick={() =>
          dispatch({ type: ActionType.DoLayerAction, payload: "undo" })
        }
      >
        Undo
      </button>
      <button
        onClick={() =>
          dispatch({ type: ActionType.DoLayerAction, payload: "redo" })
        }
      >
        Redo
      </button>
      <button onClick={generateResult}>Generate</button>
    </>
  );
}

export default App;
