import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface DemoModeContextType {
  isDemoMode: boolean;
  enableDemoMode: () => void;
  disableDemoMode: () => void;
}

const DemoModeContext = createContext<DemoModeContextType>({
  isDemoMode: false,
  enableDemoMode: () => {},
  disableDemoMode: () => {},
});

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(() => sessionStorage.getItem("demo-mode") === "true");

  const enableDemoMode = useCallback(() => {
    sessionStorage.setItem("demo-mode", "true");
    setIsDemoMode(true);
  }, []);

  const disableDemoMode = useCallback(() => {
    sessionStorage.removeItem("demo-mode");
    setIsDemoMode(false);
  }, []);

  return (
    <DemoModeContext.Provider value={{ isDemoMode, enableDemoMode, disableDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}
