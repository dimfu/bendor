import { useContext } from "react";
import { StoreContext } from "../providers/store/context";

export const useStore = () => useContext(StoreContext);
