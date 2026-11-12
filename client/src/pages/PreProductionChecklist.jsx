import React from "react";
import { CheckCircle2, RotateCcw, Save } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

// Extracted Domain Constants & Helpers
import {
  STANDARD_8_STATIONS,
  ALL_STATION_IDS,
  ALL_STATIONS,
  CHECKLIST_ITEMS,
  LOCAL_STORAGE_KEY,
  getCategoryInfo,
  getStationsDisplay,
  getTodayString,
  getInitialShift,
} from "../constants/checklistData";

// Extracted Sub-Components
import ChecklistHeader from "../components/checklist/ChecklistHeader";
import ChecklistKPICards from "../components/checklist/ChecklistKPICards";
import ChecklistStationTabs from "../components/checklist/ChecklistStationTabs";
import ChecklistItemCard from "../components/checklist/ChecklistItemCard";
import ChecklistHistoryTable from "../components/checklist/ChecklistHistoryTable";
import ChecklistReportModal from "../components/checklist/ChecklistReportModal";

// Extracted Custom Hook
import { usePreProductionChecklistData } from "../hooks/usePreProductionChecklistData";

export {
  STANDARD_8_STATIONS,
  ALL_STATION_IDS,
  ALL_STATIONS,
  CHECKLIST_ITEMS,
  LOCAL_STORAGE_KEY,
  getCategoryInfo,
  getStationsDisplay,
  getTodayString,
  getInitialShift,
};

export default function PreProductionChecklist() {
  const { user } = useAuth();
  const { isArabic, t } = useLanguage();

  const data = usePreProductionChecklistData(user, isArabic);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        paddingBottom: 60,
      }}
    >
      {/* ── Status Banner ── */}
      {data.saveSuccessMsg && (
        <div
          style={{
            background: "#dcfce7",
            color: "#15803d",
            border: "1px solid #bbf7d0",
            padding: "12px 18px",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={20} />
          {data.saveSuccessMsg}
        </div>
      )}

      {/* ── Official Form Header ── */}
      <ChecklistHeader
        activeDate={data.activeDate}
        setActiveDate={data.setActiveDate}
        activeShift={data.activeShift}
        setActiveShift={data.setActiveShift}
        supervisorName={data.supervisorName}
        setSupervisorName={data.setSupervisorName}
        stats={data.stats}
        isSaving={data.isSaving}
        isViewer={data.isViewer}
        markAllPass={data.markAllPass}
        handleSaveChecklist={data.handleSaveChecklist}
        openPrintModal={data.openPrintModal}
        isArabic={isArabic}
        t={t}
      />

      {/* ── KPI & Readiness Score Bar ── */}
      <ChecklistKPICards stats={data.stats} isArabic={isArabic} t={t} />

      {/* ── Station Filter Tabs ── */}
      <ChecklistStationTabs
        stationFilter={data.stationFilter}
        setStationFilter={data.setStationFilter}
        expandedDetails={data.expandedDetails}
        setExpandedDetails={data.setExpandedDetails}
        isArabic={isArabic}
        t={t}
      />

      {/* ── Interactive Checklist Items ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {data.displayedItems.map((item) => (
          <ChecklistItemCard
            key={item.id}
            item={item}
            currentStatus={data.itemStatuses[item.id]?.status || "PENDING"}
            currentNote={data.itemStatuses[item.id]?.note || ""}
            isDetailsOpen={data.expandedDetails[item.id]}
            setItemStatus={data.setItemStatus}
            setItemNote={data.setItemNote}
            toggleDetails={data.toggleDetails}
            standupAttendance={data.standupAttendance}
            handleSetOperatorAttendance={data.handleSetOperatorAttendance}
            handleSetOperatorReason={data.handleSetOperatorReason}
            handleMarkAllAttendancePresent={data.handleMarkAllAttendancePresent}
            isArabic={isArabic}
            t={t}
          />
        ))}
      </div>

      {/* ── General Handover Remarks & Sign-off Section ── */}
      <div
        className="card-white"
        style={{ padding: 18, border: "1px solid #cbd5e1" }}
      >
        <h3
          style={{
            margin: "0 0 8px",
            fontSize: "0.94rem",
            fontWeight: 800,
            color: "var(--navy)",
          }}
        >
          {t("shiftRemarksTitle")}
        </h3>
        <textarea
          rows={2}
          className="search-input"
          value={data.generalNotes}
          onChange={(e) => data.setGeneralNotes(e.target.value)}
          placeholder={t("shiftRemarksPlaceholder")}
          style={{
            width: "100%",
            padding: 10,
            resize: "vertical",
            fontSize: "0.82rem",
          }}
        />

        <div
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <button
            type="button"
            className="btn-outline"
            onClick={data.resetCurrentChecklist}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "#64748b",
              fontSize: "0.82rem",
            }}
          >
            <RotateCcw size={14} /> {t("resetCurrentForm")}
          </button>

          <button
            type="button"
            className="btn-primary"
            disabled={data.isSaving || data.isViewer}
            onClick={data.handleSaveChecklist}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background:
                data.stats.overallStatus === "CRITICAL_BLOCKER"
                  ? "#ef4444"
                  : data.stats.overallStatus === "LINE_CLEARED_PASS"
                    ? "#10b981"
                    : "#0284c7",
              borderColor: "transparent",
              padding: "10px 24px",
              fontWeight: 800,
              fontSize: "0.9rem",
            }}
          >
            <Save size={16} />
            {data.isSaving ? t("signingOff") : t("signOffLineStart")}
          </button>
        </div>
      </div>

      {/* ── Historical Submissions Audit Trail ── */}
      <ChecklistHistoryTable
        filteredHistory={data.filteredHistory}
        loading={data.loading}
        historySearch={data.historySearch}
        setHistorySearch={data.setHistorySearch}
        historyShiftFilter={data.historyShiftFilter}
        setHistoryShiftFilter={data.setHistoryShiftFilter}
        openPrintModal={data.openPrintModal}
        handleDeleteHistory={data.handleDeleteHistory}
        isAdmin={data.isAdmin}
        isArabic={isArabic}
        t={t}
      />

      {/* ── Printable Checklist Report Modal ── */}
      <ChecklistReportModal
        isOpen={data.showPrintModal}
        onClose={() => data.setShowPrintModal(false)}
        record={data.printModalRecord}
        activeData={{
          date: data.activeDate,
          shift: data.activeShift,
          supervisor: data.supervisorName,
          generalNotes: data.generalNotes,
          itemStatuses: data.itemStatuses,
          stats: data.stats,
          standupAttendance: data.standupAttendance,
        }}
        isArabic={isArabic}
        t={t}
      />
    </div>
  );
}
