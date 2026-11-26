import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { DEFAULT_LINE, isLine } from "../constants/lines";

const LineContext = createContext(null);
const STORAGE_KEY = "ectron_line";

function readSaved() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isLine(v)) return v;
  } catch {
    /* storage blocked */
  }
  return DEFAULT_LINE;
}

/** Which production line the pages show (3P = MT212, 1P = M11). Remembered per device. */
export function LineProvider({ children }) {
  const [line, setLineState] = useState(readSaved);

  const setLine = useCallback((code) => {
    if (!isLine(code)) return;
    setLineState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* storage blocked */
    }
  }, []);

  const value = useMemo(() => ({ line, setLine }), [line, setLine]);
  return <LineContext.Provider value={value}>{children}</LineContext.Provider>;
}

export function useLine() {
  const ctx = useContext(LineContext);
  if (!ctx) throw new Error("useLine must be used inside LineProvider");
  return ctx;
}
