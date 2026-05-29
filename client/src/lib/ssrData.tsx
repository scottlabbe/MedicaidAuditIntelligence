import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { InitialRouteData } from "./types";

const SsrDataContext = createContext<InitialRouteData | undefined>(undefined);

export function SsrDataProvider({
  children,
  initialRouteData,
}: {
  children: ReactNode;
  initialRouteData?: InitialRouteData;
}) {
  return (
    <SsrDataContext.Provider value={initialRouteData}>
      {children}
    </SsrDataContext.Provider>
  );
}

export function useSsrData() {
  return useContext(SsrDataContext);
}
