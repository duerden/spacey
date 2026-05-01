import { createContext, useContext } from "solid-js";

export const MasterContext = createContext();

export const MasterProvider = MasterContext.Provider
export const useMaster = ()=>{
    return useContext(MasterContext)
}