import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

interface KiraPanelContextType {
  isOpen: boolean;
  openPanel: (prefill?: string) => void;
  closePanel: () => void;
  prefillMessage: string;
  clearPrefill: () => void;
}

const KiraPanelContext = createContext<KiraPanelContextType>({
  isOpen: false,
  openPanel: () => {},
  closePanel: () => {},
  prefillMessage: "",
  clearPrefill: () => {},
});

export function KiraPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefillMessage, setPrefillMessage] = useState("");

  const openPanel = useCallback((prefill?: string) => {
    if (prefill) setPrefillMessage(prefill);
    setIsOpen(true);
  }, []);

  const closePanel = useCallback(() => setIsOpen(false), []);
  const clearPrefill = useCallback(() => setPrefillMessage(""), []);

  return (
    <KiraPanelContext.Provider value={{ isOpen, openPanel, closePanel, prefillMessage, clearPrefill }}>
      {children}
    </KiraPanelContext.Provider>
  );
}

export function useKiraPanel() {
  return useContext(KiraPanelContext);
}
