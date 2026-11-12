import React, { useState } from "react";
import {
  useManagementDashboardData,
  getStatusBadge,
} from "../hooks/useManagementDashboardData";
import ManagementHeader from "../components/dashboard/ManagementHeader";
import ProgramOverviewHero from "../components/dashboard/ProgramOverviewHero";
import ProductionKpiCards from "../components/dashboard/ProductionKpiCards";
import FirmwareKpiCards from "../components/dashboard/FirmwareKpiCards";
import RecoveryEngineCard from "../components/dashboard/RecoveryEngineCard";
import NamaDispatchCard from "../components/dashboard/NamaDispatchCard";
import KitSupplyRunwayCard from "../components/dashboard/KitSupplyRunwayCard";
import DefectCalibrationCard from "../components/dashboard/DefectCalibrationCard";
import SummaryMatrixTable from "../components/dashboard/SummaryMatrixTable";
import ExecutiveBurnupChart from "../components/dashboard/ExecutiveBurnupChart";
import ManagementSettingsModal from "../components/dashboard/ManagementSettingsModal";
import ManagementReportModal from "../components/dashboard/ManagementReportModal";

export { getStatusBadge };

/**
 * ManagementDashboard: Executive overview of 3-Phase production targets,
 * firmware flashing milestones, monthly recovery analysis, kit inventory runway,
 * calibrated defect metrics, real-time sync, and official A4 reporting.
 */
export default function ManagementDashboard() {
  const {
    records,
    availableDates,
    activeDate,
    todayStr,
    setSelectedDate,
    availableRecoveryMonths,
    selectedRecoveryMonth,
    setSelectedRecoveryMonth,
    recoveryHorizonDays,
    setRecoveryHorizonDays,
    targets,
    updateTargets,
    weekStartDateStr,
    productionMetrics,
    fwMetrics,
    recoveryAnalysis,
    namaDispatchPlan,
    kitMetrics,
    defectMetrics,
    topDefectCodes,
    kitRunwayMetrics,
    burnupData,
    projectStatus,
    fetchRecords,
    isLiveSyncing,
    lastSyncedAt,
    syncError,
  } = useManagementDashboardData();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Top Header Navigation & Status Bar ── */}
      <ManagementHeader
        availableDates={availableDates}
        activeDate={activeDate}
        todayStr={todayStr}
        onDateChange={setSelectedDate}
        onRefresh={fetchRecords}
        isLiveSyncing={isLiveSyncing}
        lastSyncedAt={lastSyncedAt}
        syncError={syncError}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* ── 1. Overall Status & Percentage (Hero Header Banner) ── */}
      <ProgramOverviewHero
        productionMetrics={productionMetrics}
        projectStatus={projectStatus}
      />

      {/* ── 2. Executive Burn-up & Cumulative Trajectory Chart ── */}
      <ExecutiveBurnupChart
        burnupData={burnupData}
        targets={targets}
        overallCompleted={productionMetrics.overallCompleted}
        overallTarget={productionMetrics.overallTarget}
      />

      {/* ── 3. Production – 3-Phase Targets Hierarchy ── */}
      <ProductionKpiCards
        productionMetrics={productionMetrics}
        weekStartDateStr={weekStartDateStr}
      />

      {/* ── 4. Firmware (FW) Management ── */}
      <FirmwareKpiCards
        fwMetrics={fwMetrics}
        weekStartDateStr={weekStartDateStr}
        activeDate={activeDate}
      />

      {/* ── 5. Monthly Dynamic Production Recovery Engine ── */}
      <RecoveryEngineCard
        recoveryAnalysis={recoveryAnalysis}
        availableRecoveryMonths={availableRecoveryMonths}
        selectedRecoveryMonth={selectedRecoveryMonth}
        setSelectedRecoveryMonth={setSelectedRecoveryMonth}
        recoveryHorizonDays={recoveryHorizonDays}
        setRecoveryHorizonDays={setRecoveryHorizonDays}
        targets={targets}
      />

      {/* ── 6. Dispatched to Nama / Field Schedule (Plan of Dispatch) ── */}
      <NamaDispatchCard namaDispatchPlan={namaDispatchPlan} />

      {/* ── 7. Kit Meters Supply & Delivery Pipeline + Operational Runway ── */}
      <KitSupplyRunwayCard
        kitMetrics={kitMetrics}
        kitRunwayMetrics={kitRunwayMetrics}
      />

      {/* ── 8. Defect Meters Analysis & Calibration + Top 4 Failure Codes ── */}
      <DefectCalibrationCard
        defectMetrics={defectMetrics}
        recordsCount={records.length}
        topDefectCodes={topDefectCodes}
      />

      {/* ── 9. Summary Comparison Table ── */}
      <SummaryMatrixTable
        productionMetrics={productionMetrics}
        fwMetrics={fwMetrics}
        kitMetrics={kitMetrics}
        defectMetrics={defectMetrics}
      />

      {/* ── Baseline & Targets Configuration Modal ── */}
      <ManagementSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        targets={targets}
        onSaveTargets={updateTargets}
      />

      {/* ── Official A4 Printable Executive Management Report Modal ── */}
      <ManagementReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        productionMetrics={productionMetrics}
        fwMetrics={fwMetrics}
        recoveryAnalysis={recoveryAnalysis}
        kitMetrics={kitMetrics}
        kitRunwayMetrics={kitRunwayMetrics}
        defectMetrics={defectMetrics}
        topDefectCodes={topDefectCodes}
        namaDispatchPlan={namaDispatchPlan}
        targets={targets}
        todayStr={todayStr}
        activeDate={activeDate}
      />
    </div>
  );
}
