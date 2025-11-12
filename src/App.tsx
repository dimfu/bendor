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
        dispatch({ type: ActionType.SetImageBuf, payload: event.target.result })
      }
    };
    reader.readAsArrayBuffer(file);
    dispatch({ type: ActionType.ClearSelections });
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
    </>
  );
}

export default App;
