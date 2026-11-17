import { useState } from "react";
import { Factory, Cpu, Package, AlertCircle, Truck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useManagementDashboardData } from "../hooks/useManagementDashboardData";
import ManagementHeader from "../components/dashboard/ManagementHeader";
import DecisionBar from "../components/dashboard/DecisionBar";
import AttentionList from "../components/dashboard/AttentionList";
import DailyOutputChart from "../components/dashboard/DailyOutputChart";
import CompletionForecastCard from "../components/dashboard/CompletionForecastCard";
import ProductionKpiCards from "../components/dashboard/ProductionKpiCards";
import FirmwareKpiCards from "../components/dashboard/FirmwareKpiCards";
import RecoveryEngineCard from "../components/dashboard/RecoveryEngineCard";
import NamaDispatchCard from "../components/dashboard/NamaDispatchCard";
import KitSupplyRunwayCard from "../components/dashboard/KitSupplyRunwayCard";
import DefectCalibrationCard from "../components/dashboard/DefectCalibrationCard";
import ManagementSettingsModal from "../components/dashboard/ManagementSettingsModal";
import ManagementReportModal from "../components/dashboard/ManagementReportModal";
import { C } from "../components/dashboard/dashTheme";

const TABS = [
  { key: "production", icon: Factory, ar: "الإنتاج", en: "Production" },
  { key: "firmware", icon: Cpu, ar: "الفيرموير", en: "Firmware" },
  { key: "kits", icon: Package, ar: "الكيت", en: "Kits" },
  { key: "defects", icon: AlertCircle, ar: "العيوب", en: "Defects" },
  { key: "shipments", icon: Truck, ar: "الشحنات", en: "Shipments" },
];

/**
 * Management dashboard
 *  1. Decision bar  — are we on track, when do we finish
 *  2. Needs attention + daily chart — what to act on
 *  3. Tabs — details per area
 */
export default function ManagementDashboard() {
  const d = useManagementDashboardData();
  const { user } = useAuth();
  const { isArabic } = useLanguage();
  const isAdmin = user?.access === "admin";
  const [tab, setTab] = useState("production");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <ManagementHeader
        availableDates={d.availableDates}
        activeDate={d.activeDate}
        todayStr={d.todayStr}
        onDateChange={d.setSelectedDate}
        onRefresh={d.fetchRecords}
        lastSyncedAt={d.lastSyncedAt}
        syncError={d.syncError}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenSettings={isAdmin ? () => setIsSettingsOpen(true) : null}
      />

      {isAdmin && !d.targetsShared && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            color: "#92400e",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: "0.84rem",
            fontWeight: 600,
          }}
        >
          {isArabic
            ? "⚠️ جدول app_settings غير موجود في Supabase — الأهداف محفوظة على هذا الجهاز فقط. شغّل app_settings.sql."
            : "⚠️ The app_settings table is missing in Supabase — targets are saved on this device only. Run app_settings.sql."}
        </div>
      )}

      {/* 1. Are we on track? */}
      <DecisionBar
        forecast={d.forecast}
        shiftTotals={d.shiftTotals}
        lastCompleteDate={d.lastCompleteDate}
        shiftTarget={d.targets.shiftProd}
      />

      {/* 2. What needs action + daily trend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
        <AttentionList
          forecast={d.forecast}
          shiftTotals={d.shiftTotals}
          lastCompleteDate={d.lastCompleteDate}
          shiftTarget={d.targets.shiftProd}
          downtime={d.downtimeSummary}
          kitRunway={d.kitRunwayMetrics}
          kitMetrics={d.kitMetrics}
          topDefects={d.topDefectCodes}
        />
        </div>
        <div style={{ flex: "2 1 520px", minWidth: 0 }}>
          <DailyOutputChart
            series={d.dailySeries}
            target={d.targets.dailyProd}
            burnupData={d.burnupData}
            overallCompleted={d.productionMetrics.overallCompleted}
            overallTarget={d.productionMetrics.overallTarget}
          />
        </div>
      </div>

      {/* 3. Details */}
      <div>
        <div
          role="tablist"
          style={{
            display: "flex",
            gap: 4,
            overflowX: "auto",
            borderBottom: `2px solid ${C.border}`,
            marginBottom: 16,
          }}
        >
          {TABS.map((t) => {
            const on = tab === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 16px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: "0.88rem",
                  whiteSpace: "nowrap",
                  color: on ? C.navy : C.muted,
                  borderBottom: `3px solid ${on ? C.teal : "transparent"}`,
                  marginBottom: -2,
                }}
              >
                <Icon size={16} />
                {isArabic ? t.ar : t.en}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {tab === "production" && (
            <>
              <CompletionForecastCard forecast={d.forecast} />
              <ProductionKpiCards productionMetrics={d.productionMetrics} weekStartDateStr={d.weekStartDateStr} />
              <RecoveryEngineCard
                recoveryAnalysis={d.recoveryAnalysis}
                availableRecoveryMonths={d.availableRecoveryMonths}
                selectedRecoveryMonth={d.selectedRecoveryMonth}
                setSelectedRecoveryMonth={d.setSelectedRecoveryMonth}
                recoveryHorizonDays={d.recoveryHorizonDays}
                setRecoveryHorizonDays={d.setRecoveryHorizonDays}
                targets={d.targets}
              />
            </>
          )}
          {tab === "firmware" && (
            <FirmwareKpiCards fwMetrics={d.fwMetrics} weekStartDateStr={d.weekStartDateStr} activeDate={d.activeDate} />
          )}
          {tab === "kits" && <KitSupplyRunwayCard kitMetrics={d.kitMetrics} kitRunwayMetrics={d.kitRunwayMetrics} />}
          {tab === "defects" && (
            <DefectCalibrationCard
              defectMetrics={d.defectMetrics}
              recordsCount={d.records.length}
              topDefectCodes={d.topDefectCodes}
            />
          )}
          {tab === "shipments" && <NamaDispatchCard namaDispatchPlan={d.namaDispatchPlan} />}
        </div>
      </div>

      <ManagementSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        targets={d.targets}
        onSaveTargets={d.updateTargets}
      />

      <ManagementReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} data={d} />
    </div>
  );
}
