import { useRef, useState } from "react";
import "./App.css";
import Canvas from "./canvas";
import Selections from "./components/selections";
import { ActionType } from "./reducer";
import { useStore } from "./hooks";

function App() {
  const { dispatch } = useStore();
  const [imgBuf, setImageBuf] = useState<ArrayBuffer>();
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
        setImageBuf(event.target.result);
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
      <div>
        <Selections />
        <Canvas src={imgBuf} />
      </div>
    </>
  );
}

export default App;
