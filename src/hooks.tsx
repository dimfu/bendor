import { useContext } from "react";
import { StoreContext } from "./context";

export const useStore = () => useContext(StoreContext);
