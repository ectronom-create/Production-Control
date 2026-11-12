import React from "react";
import { CheckCircle2, Printer, RefreshCw, Scan, Sliders } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

// Extracted Domain Constants & Helpers (re-exported for backward compatibility)
import {
  STAGES,
  STAGE_IDS,
  findStage,
  DEFAULT_ACTUAL_DEFECTS,
  STORAGE_ACTUAL_KEY,
  LOCAL_DEFECTIVE_METERS_KEY,
  COMMON_DEFECT_CODES,
} from "../constants/defectStages";
import {
  getTodayDateStr,
  getDaysAgoDateStr,
  getMeterDateStr,
} from "../utils/defectDateUtils";

// Extracted Sub-Components
import TrackerIntakeStepper from "../components/defect-meters/TrackerIntakeStepper";
import TrackerKPICards from "../components/defect-meters/TrackerKPICards";
import TrackerTableView from "../components/defect-meters/TrackerTableView";
import RepairModal from "../components/defect-meters/RepairModal";
import LifecycleModal from "../components/defect-meters/LifecycleModal";
import AdminEditModal from "../components/defect-meters/AdminEditModal";
import DefectAnalyticsTab from "../components/defect-meters/DefectAnalyticsTab";
import DefectiveMetersReportModal from "../components/defect-meters/DefectiveMetersReportModal";

// Extracted Data & Workflow Custom Hook
import { useDefectMetersData } from "../hooks/useDefectMetersData";

export {
  STAGES,
  STAGE_IDS,
  findStage,
  DEFAULT_ACTUAL_DEFECTS,
  STORAGE_ACTUAL_KEY,
  LOCAL_DEFECTIVE_METERS_KEY,
  COMMON_DEFECT_CODES,
  getTodayDateStr,
  getDaysAgoDateStr,
  getMeterDateStr,
};

export default function DefectMeters() {
  const { user } = useAuth();
  const { t, isArabic } = useLanguage();

  const data = useDefectMetersData(user, isArabic);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        paddingBottom: 60,
      }}
    >
      {/* ── Status Message Banner ── */}
      {data.trackerSuccessMsg && (
        <div
          style={{
            background: "#dcfce7",
            color: "#15803d",
            border: "1.5px solid #86efac",
            padding: "14px 20px",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontWeight: 800,
            fontSize: "0.94rem",
            boxShadow: "0 4px 12px rgba(21, 128, 61, 0.12)",
          }}
        >
          <CheckCircle2 size={22} />
          {data.trackerSuccessMsg}
        </div>
      )}

      {/* ── Official Page Header & Report Action ── */}
      <div
        className="card-white"
        style={{
          padding: "16px 22px",
          border: "1px solid #cbd5e1",
          boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="/ectron-logo.png"
              alt="ECTRON"
              style={{ height: 36, objectFit: "contain" }}
            />
            <div
              style={{
                borderLeft: isArabic ? "none" : "2px solid #cbd5e1",
                borderRight: isArabic ? "2px solid #cbd5e1" : "none",
                paddingLeft: isArabic ? 0 : 12,
                paddingRight: isArabic ? 12 : 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "1.18rem",
                    fontWeight: 900,
                    color: "var(--navy)",
                  }}
                >
                  {isArabic
                    ? "إدارة وتتبع العدادات المعطلة وحلقات الإصلاح"
                    : "Defective Meters Tracking & Rework Hub"}
                </h2>
                <span
                  style={{
                    fontSize: "0.72rem",
                    background: "#e0f2fe",
                    color: "#0369a1",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  FORM NO: PSM-DEF-08-2026
                </span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    background: "#f1f5f9",
                    color: "#475569",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  Rev: 01
                </span>
              </div>
              <p
                style={{
                  margin: "3px 0 0",
                  fontSize: "0.78rem",
                  color: "#64748b",
                }}
              >
                {isArabic
                  ? "رصد العدادات المعطوبة، منع تكرار الأعطال، وتوثيق دورات الإصلاح والهالك عبر المحطات الـ 8"
                  : "Track defective meters, prevent loop recurrences, and record repairs & scrap across 8 stations"}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => data.setShowReportModal(true)}
              className="btn-outline"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 16px",
                fontWeight: 800,
                fontSize: "0.84rem",
                color: "#0369a1",
                borderColor: "#0284c7",
                background: "#f0f9ff",
              }}
            >
              <Printer size={16} />
              <span>
                {isArabic
                  ? "🖨️ تقرير العدادات المعطلة"
                  : "🖨️ Defective Meters Report"}
              </span>
            </button>

            <button
              type="button"
              onClick={data.fetchDefectiveMeters}
              disabled={data.loadingDefects}
              className="btn-outline"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.82rem",
                padding: "8px 14px",
              }}
            >
              <RefreshCw
                size={14}
                className={data.loadingDefects ? "spin" : ""}
              />
              <span>{isArabic ? "تحديث" : "Refresh"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Primary Navigation Tabs: TRACKER vs ANALYTICS ── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "2px solid #e2e8f0",
          paddingBottom: 2,
        }}
      >
        <button
          type="button"
          onClick={() => data.setActiveTab("TRACKER")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 22px",
            borderRadius: "10px 10px 0 0",
            fontWeight: 800,
            fontSize: "0.94rem",
            cursor: "pointer",
            border: "none",
            background:
              data.activeTab === "TRACKER" ? "#ffffff" : "transparent",
            color: data.activeTab === "TRACKER" ? "#0284c7" : "#64748b",
            borderBottom:
              data.activeTab === "TRACKER"
                ? "3px solid #0284c7"
                : "3px solid transparent",
            boxShadow:
              data.activeTab === "TRACKER"
                ? "0 -2px 8px rgba(0,0,0,0.04)"
                : "none",
          }}
        >
          <Scan size={18} />
          {t("defectiveTrackerTab")}
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 900,
              background: data.activeTab === "TRACKER" ? "#e0f2fe" : "#f1f5f9",
              color: data.activeTab === "TRACKER" ? "#0369a1" : "#64748b",
              padding: "2px 8px",
              borderRadius: 999,
            }}
          >
            {data.trackerKPIs.allLifetimeTotal ?? data.trackerKPIs.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => data.setActiveTab("ANALYTICS")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 22px",
            borderRadius: "10px 10px 0 0",
            fontWeight: 800,
            fontSize: "0.94rem",
            cursor: "pointer",
            border: "none",
            background:
              data.activeTab === "ANALYTICS" ? "#ffffff" : "transparent",
            color: data.activeTab === "ANALYTICS" ? "#0284c7" : "#64748b",
            borderBottom:
              data.activeTab === "ANALYTICS"
                ? "3px solid #0284c7"
                : "3px solid transparent",
            boxShadow:
              data.activeTab === "ANALYTICS"
                ? "0 -2px 8px rgba(0,0,0,0.04)"
                : "none",
          }}
        >
          <Sliders size={18} />
          {t("analyticsCalibrationTab")}
        </button>
      </div>

      {/* ── TAB 1: DEFECTIVE METERS TRACKER & REWORK HUB ── */}
      {data.activeTab === "TRACKER" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Step-by-Step Guided Intake Stepper */}
          <TrackerIntakeStepper
            wizardStep={data.wizardStep}
            setWizardStep={data.setWizardStep}
            scanSerial={data.scanSerial}
            setScanSerial={data.setScanSerial}
            selectedStage={data.selectedStage}
            setSelectedStage={data.setSelectedStage}
            defectCode={data.defectCode}
            setDefectCode={data.setDefectCode}
            meterBlockReason={data.meterBlockReason}
            detectedPreviousMeter={data.detectedPreviousMeter}
            isArabic={isArabic}
            isViewer={data.isViewer}
            isSubmittingDefect={data.isSubmittingDefect}
            openRepairModal={data.openRepairModal}
            handleRegisterDefective={data.handleRegisterDefective}
          />

          {/* KPI Summary Cards */}
          <TrackerKPICards trackerKPIs={data.trackerKPIs} isArabic={isArabic} />

          {/* Filter Bar & Live Defective Meters Table */}
          <TrackerTableView
            filteredDefectiveMeters={data.filteredDefectiveMeters}
            totalDefectiveCount={data.defectiveMeters.length}
            loadingDefects={data.loadingDefects}
            trackerSearch={data.trackerSearch}
            setTrackerSearch={data.setTrackerSearch}
            trackerStageFilter={data.trackerStageFilter}
            setTrackerStageFilter={data.setTrackerStageFilter}
            trackerStatusFilter={data.trackerStatusFilter}
            setTrackerStatusFilter={data.setTrackerStatusFilter}
            onlyRecurringFilter={data.onlyRecurringFilter}
            setOnlyRecurringFilter={data.setOnlyRecurringFilter}
            trackerDateMode={data.trackerDateMode}
            setTrackerDateMode={data.setTrackerDateMode}
            trackerCustomDate={data.trackerCustomDate}
            setTrackerCustomDate={data.setTrackerCustomDate}
            trackerStartDate={data.trackerStartDate}
            setTrackerStartDate={data.setTrackerStartDate}
            trackerEndDate={data.trackerEndDate}
            setTrackerEndDate={data.setTrackerEndDate}
            setShowReportModal={data.setShowReportModal}
            openRepairModal={data.openRepairModal}
            setLifecycleModalMeter={data.setLifecycleModalMeter}
            handleScrapMeter={data.handleScrapMeter}
            openAdminEditModal={data.openAdminEditModal}
            handleDeleteMeter={data.handleDeleteMeter}
            isAdmin={data.isAdmin}
            isViewer={data.isViewer}
            isArabic={isArabic}
            t={t}
          />
        </div>
      )}

      {/* ── TAB 2: STATISTICAL CALIBRATION & REWORK ENGINE ── */}
      {data.activeTab === "ANALYTICS" && (
        <DefectAnalyticsTab
          fetchProductionRecords={data.fetchProductionRecords}
          loadingRecords={data.loadingRecords}
          overallMetrics={data.overallMetrics}
          actualTarget={data.actualTarget}
          isEditingTarget={data.isEditingTarget}
          setIsEditingTarget={data.setIsEditingTarget}
          targetInput={data.targetInput}
          setTargetInput={data.setTargetInput}
          handleSaveTarget={data.handleSaveTarget}
          handleResetTarget={data.handleResetTarget}
          searchQuery={data.searchQuery}
          setSearchQuery={data.setSearchQuery}
          selectedMonth={data.selectedMonth}
          setSelectedMonth={data.setSelectedMonth}
          availableMonths={data.availableMonths}
          analyticsDateMode={data.analyticsDateMode}
          setAnalyticsDateMode={data.setAnalyticsDateMode}
          analyticsCustomDate={data.analyticsCustomDate}
          setAnalyticsCustomDate={data.setAnalyticsCustomDate}
          analyticsStartDate={data.analyticsStartDate}
          setAnalyticsStartDate={data.setAnalyticsStartDate}
          analyticsEndDate={data.analyticsEndDate}
          setAnalyticsEndDate={data.setAnalyticsEndDate}
          filteredRecords={data.filteredRecords}
          selectedShiftForModal={data.selectedShiftForModal}
          setSelectedShiftForModal={data.setSelectedShiftForModal}
          isAdmin={data.isAdmin}
          isArabic={isArabic}
          t={t}
        />
      )}

      {/* ── Modal: Repair & Return ── */}
      <RepairModal
        repairModalMeter={data.repairModalMeter}
        setRepairModalMeter={data.setRepairModalMeter}
        repairTechName={data.repairTechName}
        setRepairTechName={data.setRepairTechName}
        repairDestination={data.repairDestination}
        setRepairDestination={data.setRepairDestination}
        repairActionTaken={data.repairActionTaken}
        setRepairActionTaken={data.setRepairActionTaken}
        isSubmittingRepair={data.isSubmittingRepair}
        handleConfirmRepair={data.handleConfirmRepair}
        isArabic={isArabic}
        t={t}
      />

      {/* ── Modal: Lifecycle Timeline ── */}
      <LifecycleModal
        lifecycleModalMeter={data.lifecycleModalMeter}
        setLifecycleModalMeter={data.setLifecycleModalMeter}
        isArabic={isArabic}
        t={t}
      />

      {/* ── Modal: Admin Edit ── */}
      <AdminEditModal
        adminEditModalMeter={data.adminEditModalMeter}
        setAdminEditModalMeter={data.setAdminEditModalMeter}
        editFormData={data.editFormData}
        setEditFormData={data.setEditFormData}
        isSavingAdminEdit={data.isSavingAdminEdit}
        handleSaveAdminEdit={data.handleSaveAdminEdit}
        isArabic={isArabic}
        t={t}
      />

      {/* ── Modal: Printable Report ── */}
      <DefectiveMetersReportModal
        isOpen={data.showReportModal}
        onClose={() => data.setShowReportModal(false)}
        defectiveMeters={data.defectiveMeters}
        initialDateMode={data.trackerDateMode}
        initialCustomDate={data.trackerCustomDate}
        initialStartDate={data.trackerStartDate}
        initialEndDate={data.trackerEndDate}
        trackerKPIs={data.trackerKPIs}
        overallMetrics={data.overallMetrics}
        actualTarget={data.actualTarget}
        isArabic={isArabic}
        t={t}
        currentUser={user}
      />
    </div>
  );
}
