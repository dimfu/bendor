import { useRef, useState } from "react";
import "./App.css";
import Canvas from "./canvas";
import { StoreProvider } from "./store";
import Selections from "./components/selections";

function App() {
  const [imgBuf, setImageBuf] = useState<ArrayBuffer>();
  const imageRef = useRef<HTMLInputElement>(null);

  const onSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
  };

  return (
    <StoreProvider>
      <form onSubmit={onSubmitForm}>
        <input ref={imageRef} name="image" type="file" accept="image/*" />
        <button>Submit</button>
      </form>
      <div>
        <Selections />
        <Canvas src={imgBuf} />
      </div>
    </StoreProvider>
  );
}

export default App;
