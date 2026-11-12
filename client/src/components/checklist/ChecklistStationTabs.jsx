import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import {
  STANDARD_8_STATIONS,
  CHECKLIST_ITEMS,
} from "../../constants/checklistData";

export default function ChecklistStationTabs({
  stationFilter,
  setStationFilter,
  expandedDetails,
  setExpandedDetails,
  isArabic,
  t,
}) {
  const allOpen = Object.values(expandedDetails).every(Boolean);

  const toggleAllDetails = () => {
    const next = {};
    CHECKLIST_ITEMS.forEach((it) => {
      next[it.id] = !allOpen;
    });
    setExpandedDetails(next);
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10,
        background: "#f8fafc",
        padding: "8px 14px",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--navy)" }}
        >
          {t("filterByStation")}
        </span>
        <button
          type="button"
          onClick={() => setStationFilter("ALL")}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: "0.74rem",
            fontWeight: 800,
            cursor: "pointer",
            border:
              stationFilter === "ALL"
                ? "1.5px solid #0284c7"
                : "1px solid #cbd5e1",
            background: stationFilter === "ALL" ? "#e0f2fe" : "#ffffff",
            color: stationFilter === "ALL" ? "#0369a1" : "#64748b",
          }}
        >
          {t("allStations")}
        </button>
        {STANDARD_8_STATIONS.map((st) => (
          <button
            key={st.id}
            type="button"
            onClick={() => setStationFilter(st.id)}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: "0.74rem",
              fontWeight: 700,
              cursor: "pointer",
              border:
                stationFilter === st.id
                  ? "1.5px solid #0284c7"
                  : "1px solid #cbd5e1",
              background: stationFilter === st.id ? "#e0f2fe" : "#ffffff",
              color: stationFilter === st.id ? "#0369a1" : "#64748b",
            }}
          >
            {st.num}. {isArabic ? st.nameAr : st.nameEn}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={toggleAllDetails}
        style={{
          border: "1.5px solid #0284c7",
          background: allOpen ? "#0284c7" : "#f0f9ff",
          color: allOpen ? "#ffffff" : "#0369a1",
          fontSize: "0.86rem",
          fontWeight: 800,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          transition: "all 0.15s ease",
        }}
      >
        {allOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        <span>
          {allOpen
            ? isArabic
              ? "إخفاء كافة معايير الفحص"
              : "Collapse All"
            : isArabic
              ? "🔍 عرض كافة معايير الفحص"
              : "Expand All Checkpoints"}
        </span>
      </button>
    </div>
  );
}
