export const DEFAULT_ACTUAL_DEFECTS = 4250;
export const STORAGE_ACTUAL_KEY = "ectron_defect_actual_count";
export const LOCAL_DEFECTIVE_METERS_KEY = "ectron_defective_meters_cache";

// Standard 8 Production Stations Sequence
export const STAGES = [
  {
    id: "Assembly",
    name: "Assembly",
    arabic: "التجميع",
    color: "#0284c7",
    bg: "#e0f2fe",
    border: "#38bdf8",
    icon: "🔧",
    num: 1,
  },
  {
    id: "Insulation",
    name: "Insulation",
    arabic: "العزل",
    color: "#7c3aed",
    bg: "#f3e8ff",
    border: "#c084fc",
    icon: "⚡",
    num: 2,
  },
  {
    id: "RF",
    name: "RF",
    arabic: "التردد اللاسلكي",
    color: "#0891b2",
    bg: "#cffafe",
    border: "#22d3ee",
    icon: "📡",
    num: 3,
  },
  {
    id: "Calibration",
    name: "Calibration",
    arabic: "المعايرة",
    color: "#059669",
    bg: "#d1fae5",
    border: "#34d399",
    icon: "⚖️",
    num: 4,
  },
  {
    id: "Multin test",
    name: "Multin test",
    arabic: "الفحص الشامل",
    color: "#d97706",
    bg: "#fef3c7",
    border: "#fbbf24",
    icon: "🔬",
    num: 5,
  },
  {
    id: "Perso",
    name: "Perso",
    arabic: "التخصيص",
    color: "#e11d48",
    bg: "#ffe4e6",
    border: "#fb7185",
    icon: "🏷️",
    num: 6,
  },
  {
    id: "Packaging",
    name: "Packaging",
    arabic: "التغليف",
    color: "#475569",
    bg: "#f1f5f9",
    border: "#94a3b8",
    icon: "📦",
    num: 7,
  },
  {
    id: "Firmware update",
    name: "Firmware update",
    arabic: "تحديث الفيرموير",
    color: "#06b6d4",
    bg: "#ecfeff",
    border: "#a5f3fc",
    icon: "💾",
    num: 8,
  },
];

export const STAGE_IDS = STAGES.map((s) => s.id);

// Seamlessly resolve both 'Multin test' and 'Multi-Test'
export function findStage(stageId) {
  if (!stageId) return STAGES[0];
  const matched = STAGES.find(
    (st) =>
      st.id.toLowerCase() === stageId.toLowerCase() ||
      (stageId.toLowerCase().includes("multi") && st.id === "Multin test"),
  );
  return (
    matched || {
      id: stageId,
      name: stageId,
      arabic: stageId,
      color: "#334155",
      bg: "#f1f5f9",
      border: "#cbd5e1",
      icon: "•",
      num: "-",
    }
  );
}

export const COMMON_DEFECT_CODES = [
  "0",
  "-640",
  "E-101",
  "KO_COMM",
  "RF_NO_SIG",
  "CALIB_OFFSET",
  "DISP_ERR",
  "FLASH_ERR",
  "HIGH_CURRENT",
];
