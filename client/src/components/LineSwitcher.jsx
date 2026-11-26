import { useLine } from "../context/LineContext";
import { useLanguage } from "../context/LanguageContext";
import { LINES, LINE_CODES } from "../constants/lines";

/** Segmented control: which production line the page shows. */
export default function LineSwitcher() {
  const { line, setLine } = useLine();
  const { isArabic } = useLanguage();

  return (
    <div
      role="radiogroup"
      aria-label={isArabic ? "خط الإنتاج" : "Production line"}
      style={{
        display: "inline-flex",
        gap: 4,
        padding: 4,
        marginBottom: 14,
        borderRadius: 12,
        background: "var(--gray-100, #f1f5f9)",
        border: "1px solid var(--gray-200, #e2e8f0)",
        maxWidth: "100%",
      }}
    >
      {LINE_CODES.map((code) => {
        const l = LINES[code];
        const active = code === line;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLine(code)}
            style={{
              border: "none",
              cursor: "pointer",
              borderRadius: 9,
              padding: "7px 14px",
              fontSize: "0.85rem",
              fontWeight: 700,
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              background: active ? "var(--navy, #142547)" : "transparent",
              color: active ? "#fff" : "var(--navy, #142547)",
              boxShadow: active ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
            }}
          >
            {isArabic ? l.ar : l.en}
            <span style={{ opacity: 0.7, fontWeight: 600, marginInlineStart: 6 }}>{l.model}</span>
          </button>
        );
      })}
    </div>
  );
}
