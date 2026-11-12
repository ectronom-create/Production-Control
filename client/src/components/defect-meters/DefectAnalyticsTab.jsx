import React from "react";
import {
  AlertTriangle,
  RefreshCw,
  Save,
  Edit3,
  RotateCcw,
  Activity,
  Eye,
} from "lucide-react";
import { DEFAULT_ACTUAL_DEFECTS } from "../../constants/defectStages";

export default function DefectAnalyticsTab({
  fetchProductionRecords,
  loadingRecords,
  overallMetrics,
  actualTarget,
  isEditingTarget,
  setIsEditingTarget,
  targetInput,
  setTargetInput,
  handleSaveTarget,
  handleResetTarget,
  searchQuery,
  setSearchQuery,
  selectedMonth,
  setSelectedMonth,
  availableMonths,
  analyticsDateMode,
  setAnalyticsDateMode,
  analyticsCustomDate,
  setAnalyticsCustomDate,
  analyticsStartDate,
  setAnalyticsStartDate,
  analyticsEndDate,
  setAnalyticsEndDate,
  filteredRecords,
  selectedShiftForModal,
  setSelectedShiftForModal,
  isAdmin,
  isArabic,
  t,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header & Target Control Bar */}
      <div
        className="card-white"
        style={{ padding: "20px 24px", border: "1.5px solid #e2e8f0" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle size={22} color="#dc2626" />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.25rem",
                  fontWeight: 900,
                  color: "var(--navy)",
                }}
              >
                {isArabic
                  ? "تحليل ومعايرة عدادات العيوب"
                  : "Defect Meters Analysis & Calibration"}
              </h2>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "0.8rem",
                  color: "var(--gray-500)",
                }}
              >
                {isArabic
                  ? "مطابقة العيوب الفعلية المعتمدة واستبعاد دورات إعادة الفحص وحلقات التعديل (Rework Loop Calibration)"
                  : "Reconciling ground-truth physical defects by eliminating test re-runs & rework loops (Rework Loop Calibration)"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchProductionRecords}
            disabled={loadingRecords}
            className="btn btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.8rem",
            }}
          >
            <RefreshCw size={13} className={loadingRecords ? "spin" : ""} />
            {loadingRecords
              ? isArabic
                ? "جارِ التحديث..."
                : "Refreshing..."
              : isArabic
                ? "تحديث البيانات"
                : "Refresh Data"}
          </button>
        </div>

        {/* Calibration Control Bar */}
        <div
          style={{
            marginTop: 16,
            background: "#f8fafc",
            border: "1.5px solid #cbd5e1",
            borderRadius: 10,
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{ fontSize: "0.8rem", fontWeight: 800, color: "#334155" }}
            >
              {isArabic
                ? "المعيار الأساسي للعدادات المعيبة الفعلية (Ground Truth)"
                : "Baseline Physical Defective Meters (Ground Truth)"}
            </div>
            <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
              {isArabic ? (
                <>
                  نسبة المعايرة الحالية:{" "}
                  <strong>
                    {(overallMetrics.calibrationRatio * 100).toFixed(2)}%
                  </strong>{" "}
                  من إجمالي حالات الفشل المسجلة (
                  {overallMetrics.totalReportedKOAll.toLocaleString()} لوحة KO)
                </>
              ) : (
                <>
                  Current Calibration Ratio:{" "}
                  <strong>
                    {(overallMetrics.calibrationRatio * 100).toFixed(2)}%
                  </strong>{" "}
                  of total reported failure instances (
                  {overallMetrics.totalReportedKOAll.toLocaleString()} Boards
                  KO)
                </>
              )}
            </div>
          </div>

          <div>
            {isEditingTarget ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="number"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  style={{
                    width: 100,
                    padding: "5px 8px",
                    borderRadius: 6,
                    border: "1.5px solid #0284c7",
                    fontWeight: 800,
                    fontSize: "0.9rem",
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveTarget}
                  className="btn btn-primary"
                  style={{ padding: "5px 10px", fontSize: "0.75rem" }}
                >
                  <Save size={13} /> {t("save")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTarget(false);
                    setTargetInput(String(actualTarget));
                  }}
                  className="btn btn-secondary"
                  style={{ padding: "5px 10px", fontSize: "0.75rem" }}
                >
                  {t("cancel")}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 900,
                    color: "#0369a1",
                    background: "#e0f2fe",
                    padding: "3px 12px",
                    borderRadius: 8,
                  }}
                >
                  {actualTarget.toLocaleString()}{" "}
                  <span style={{ fontSize: "0.72rem" }}>
                    {isArabic ? "عداد فعلي" : "Units"}
                  </span>
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setTargetInput(String(actualTarget));
                      setIsEditingTarget(true);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: "5px 8px", fontSize: "0.74rem" }}
                  >
                    <Edit3 size={12} /> {t("edit")}
                  </button>
                )}
                {actualTarget !== DEFAULT_ACTUAL_DEFECTS && (
                  <button
                    type="button"
                    onClick={handleResetTarget}
                    className="btn btn-secondary"
                    style={{
                      padding: "5px 8px",
                      fontSize: "0.74rem",
                      color: "#b91c1c",
                    }}
                  >
                    <RotateCcw size={12} /> {isArabic ? "الافتراضي" : "Default"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Analytics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {/* Net Defective Meters */}
        <div
          style={{
            background: "#fef2f2",
            border: "1.5px solid #fca5a5",
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.76rem",
                fontWeight: 800,
                color: "#991b1b",
                textTransform: "uppercase",
              }}
            >
              {isArabic
                ? "صافي العدادات المعيبة الفعلي"
                : "Actual Net Defective Meters"}
            </span>
            <span
              className="badge badge-red"
              style={{ fontSize: "0.68rem", padding: "1px 6px" }}
            >
              {isArabic ? "لايف" : "Live"}
            </span>
          </div>
          <div
            style={{
              fontSize: "1.9rem",
              fontWeight: 900,
              color: "#b91c1c",
              margin: "4px 0",
            }}
          >
            {overallMetrics.totalActualDefects.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: "#7f1d1d",
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
              flexWrap: "wrap",
              gap: 4,
            }}
          >
            <span>
              {isArabic
                ? `أساس: ${overallMetrics.baseActualDefects.toLocaleString()}`
                : `Base: ${overallMetrics.baseActualDefects.toLocaleString()}`}
            </span>
            <span style={{ fontWeight: 700, color: "#991b1b" }}>
              +{overallMetrics.liveDefectsLogged.toLocaleString()}{" "}
              {isArabic ? "مسجل" : "Logged"}
            </span>
          </div>
        </div>

        {/* Reported KO */}
        <div
          style={{
            background: "#fffbeb",
            border: "1.5px solid #fcd34d",
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontSize: "0.76rem",
              fontWeight: 800,
              color: "#92400e",
              textTransform: "uppercase",
            }}
          >
            {isArabic
              ? "حالات الفشل المسجلة (Boards KO)"
              : "Reported Failures (Boards KO)"}
          </div>
          <div
            style={{
              fontSize: "1.9rem",
              fontWeight: 900,
              color: "#b45309",
              margin: "4px 0",
            }}
          >
            {overallMetrics.totalReportedKOAll.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#78350f" }}>
            {isArabic
              ? "إجمالي اللوحات الراسبة المسجلة عبر التقارير"
              : "Total reported failed boards across all shifts"}
          </div>
        </div>

        {/* Calibration Ratio */}
        <div
          style={{
            background: "#f0fdf4",
            border: "1.5px solid #86efac",
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontSize: "0.76rem",
              fontWeight: 800,
              color: "#166534",
              textTransform: "uppercase",
            }}
          >
            {isArabic ? "معامل المعايرة" : "Calibration Ratio"}
          </div>
          <div
            style={{
              fontSize: "1.9rem",
              fontWeight: 900,
              color: "#15803d",
              margin: "4px 0",
            }}
          >
            {(overallMetrics.calibrationRatio * 100).toFixed(2)}%
          </div>
          <div style={{ fontSize: "0.72rem", color: "#14532d" }}>
            {isArabic ? "معامل الدقة المحسوب" : "Computed accuracy factor"}
          </div>
        </div>

        {/* Repaired / Recycled */}
        <div
          style={{
            background: "#eef2ff",
            border: "1.5px solid #c7d2fe",
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontSize: "0.76rem",
              fontWeight: 800,
              color: "#3730a3",
              textTransform: "uppercase",
            }}
          >
            {isArabic
              ? "العدادات المُصلحة والمعاد تدويرها"
              : "Repaired & Recycled (Rework)"}
          </div>
          <div
            style={{
              fontSize: "1.9rem",
              fontWeight: 900,
              color: "#4338ca",
              margin: "4px 0",
            }}
          >
            {overallMetrics.totalRepairedFromKOAll.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#312e81" }}>
            {overallMetrics.repairRateOverallPct.toFixed(1)}%{" "}
            {isArabic ? "نسبة الاستعادة والإصلاح" : "Recovery rate"}
          </div>
        </div>
      </div>

      {/* Shift Table for Calibration */}
      <div className="table-card">
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--gray-200)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span
            style={{
              fontWeight: 800,
              color: "var(--navy)",
              fontSize: "0.94rem",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Activity size={16} color="var(--teal)" />
            {isArabic
              ? "سجل العيوب المعايرة حسب كل وردية"
              : "Shift-by-Shift Calibrated Defects Log"}
          </span>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              placeholder={
                isArabic
                  ? "بحث بالتاريخ أو الفريق..."
                  : "Search date or team..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "5px 10px",
                fontSize: "0.78rem",
                width: 150,
                borderRadius: 6,
                border: "1px solid #cbd5e1",
              }}
            />

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: "5px 10px",
                fontSize: "0.78rem",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontWeight: 700,
              }}
            >
              <option value="ALL">
                {isArabic ? "جميع الشهور" : "All Months"}
              </option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={analyticsDateMode}
              onChange={(e) => setAnalyticsDateMode(e.target.value)}
              style={{
                padding: "5px 10px",
                fontSize: "0.78rem",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontWeight: 700,
              }}
            >
              <option value="ALL">
                {isArabic ? "جميع التواريخ" : "All Dates"}
              </option>
              <option value="TODAY">{isArabic ? "اليوم" : "Today"}</option>
              <option value="WEEK">
                {isArabic ? "هذا الأسبوع" : "This Week"}
              </option>
              <option value="CUSTOM_DATE">
                {isArabic ? "تحديد تاريخ" : "Specific Date"}
              </option>
              <option value="RANGE">
                {isArabic ? "نطاق زمني" : "Date Range"}
              </option>
            </select>

            {analyticsDateMode === "CUSTOM_DATE" && (
              <input
                type="date"
                value={analyticsCustomDate}
                onChange={(e) => setAnalyticsCustomDate(e.target.value)}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.78rem",
                  borderRadius: 6,
                  border: "1px solid #0284c7",
                  fontWeight: 700,
                }}
              />
            )}

            {analyticsDateMode === "RANGE" && (
              <div
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <input
                  type="date"
                  value={analyticsStartDate}
                  onChange={(e) => setAnalyticsStartDate(e.target.value)}
                  style={{
                    padding: "4px 6px",
                    fontSize: "0.74rem",
                    borderRadius: 6,
                    border: "1px solid #0284c7",
                    fontWeight: 700,
                  }}
                />
                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>-</span>
                <input
                  type="date"
                  value={analyticsEndDate}
                  onChange={(e) => setAnalyticsEndDate(e.target.value)}
                  style={{
                    padding: "4px 6px",
                    fontSize: "0.74rem",
                    borderRadius: 6,
                    border: "1px solid #0284c7",
                    fontWeight: 700,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>{isArabic ? "الوردية والفريق" : "Shift & Team"}</th>
                <th style={{ textAlign: "center" }}>
                  {isArabic ? "المفحوص" : "Tested"}
                </th>
                <th style={{ textAlign: "center" }}>
                  {isArabic ? "المطابق (OK)" : "OK"}
                </th>
                <th style={{ textAlign: "center" }}>
                  {isArabic ? "الفشل (KO)" : "Reported KO"}
                </th>
                <th style={{ textAlign: "center", background: "#fef2f2" }}>
                  {isArabic ? "الصافي المعاير" : "Calibrated Net"}
                </th>
                <th style={{ textAlign: "center", background: "#f0fdf4" }}>
                  {isArabic ? "المُصلح" : "Reworked"}
                </th>
                <th style={{ textAlign: "center" }}>
                  {isArabic ? "تفاصيل" : "Details"}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: 24,
                      color: "var(--gray-400)",
                    }}
                  >
                    {isArabic
                      ? "لا توجد سجلات مطابقة للفلاتر."
                      : "No records matching filters."}
                  </td>
                </tr>
              ) : (
                filteredRecords.slice(0, 15).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ fontWeight: 800, color: "var(--navy)" }}>
                        {r.date}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700 }}>
                        {r.team_name || "Standard Shift"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {r.tb.toLocaleString()}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        color: "#16a34a",
                        fontWeight: 700,
                      }}
                    >
                      {r.ach.toLocaleString()}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        color: "#b45309",
                        fontWeight: 800,
                      }}
                    >
                      {r.reportedKO.toLocaleString()}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        background: "#fef2f2",
                        color: "#b91c1c",
                        fontWeight: 900,
                      }}
                    >
                      {r.estimatedActual.toLocaleString()}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        background: "#f0fdf4",
                        color: "#15803d",
                        fontWeight: 800,
                      }}
                    >
                      {r.repairedMeters.toLocaleString()}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedShiftForModal(r)}
                        className="btn-icon"
                        style={{ background: "#e0f2fe", color: "#0369a1" }}
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Shift Defect & Rework Breakdown Details ── */}
      {selectedShiftForModal && (
        <div
          className="modal-backdrop"
          onClick={(e) =>
            e.target === e.currentTarget && setSelectedShiftForModal(null)
          }
        >
          <div
            className="modal"
            style={{ maxWidth: 580, maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Activity size={20} color="var(--teal)" />
                <span className="modal-title">
                  {isArabic
                    ? `تفاصيل فحص وعيوب الوردية: ${selectedShiftForModal.date}`
                    : `Shift Defect Details: ${selectedShiftForModal.date}`}
                </span>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedShiftForModal(null)}
              >
                ×
              </button>
            </div>

            <div
              className="modal-body"
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div
                style={{
                  background: "#f8fafc",
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div>
                  <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                    {isArabic ? "الفريق / الوردية" : "Team / Shift"}
                  </span>
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: 800,
                      color: "var(--navy)",
                    }}
                  >
                    {selectedShiftForModal.team_name ||
                      (isArabic ? "الوردية القياسية" : "Standard Shift")}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                    {isArabic ? "تاريخ التشغيل" : "Production Date"}
                  </span>
                  <div
                    style={{
                      fontSize: "0.94rem",
                      fontWeight: 800,
                      color: "#0369a1",
                    }}
                  >
                    {selectedShiftForModal.date}
                  </div>
                </div>
              </div>

              {/* Metric Cards Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    background: "#f8fafc",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.74rem",
                      color: "#64748b",
                      fontWeight: 700,
                    }}
                  >
                    {isArabic ? "إجمالي المفحوص" : "Total Tested"}
                  </div>
                  <div
                    style={{
                      fontSize: "1.35rem",
                      fontWeight: 900,
                      color: "var(--navy)",
                    }}
                  >
                    {selectedShiftForModal.tb.toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    background: "#f0fdf4",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.74rem",
                      color: "#166534",
                      fontWeight: 700,
                    }}
                  >
                    {isArabic ? "مطابق من أول مرة (OK)" : "Passed OK"}
                  </div>
                  <div
                    style={{
                      fontSize: "1.35rem",
                      fontWeight: 900,
                      color: "#16a34a",
                    }}
                  >
                    {selectedShiftForModal.ach.toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    background: "#fffbeb",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #fde68a",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.74rem",
                      color: "#92400e",
                      fontWeight: 700,
                    }}
                  >
                    {isArabic
                      ? "حالات الفشل المسجلة (KO)"
                      : "Reported KO Failures"}
                  </div>
                  <div
                    style={{
                      fontSize: "1.35rem",
                      fontWeight: 900,
                      color: "#b45309",
                    }}
                  >
                    {selectedShiftForModal.reportedKO.toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    background: "#fef2f2",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #fca5a5",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.74rem",
                      color: "#991b1b",
                      fontWeight: 700,
                    }}
                  >
                    {isArabic
                      ? "الصافي المعاير الفعلي"
                      : "Calibrated Net Defects"}
                  </div>
                  <div
                    style={{
                      fontSize: "1.35rem",
                      fontWeight: 900,
                      color: "#dc2626",
                    }}
                  >
                    {selectedShiftForModal.estimatedActual.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Recovery info box */}
              <div
                style={{
                  background: "#eef2ff",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid #c7d2fe",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      color: "#3730a3",
                    }}
                  >
                    {isArabic
                      ? "العدادات المُستعادة والمُصلحة (Rework):"
                      : "Repaired & Recovered Units:"}
                  </span>
                  <span
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 900,
                      color: "#4338ca",
                    }}
                  >
                    {selectedShiftForModal.repairedMeters.toLocaleString()}{" "}
                    {isArabic ? "عداد" : "units"}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "#4338ca",
                    marginTop: 4,
                  }}
                >
                  {isArabic
                    ? `نسبة الاستعادة المحسوبة لهذه الوردية: ${selectedShiftForModal.shiftRepairPct.toFixed(1)}%`
                    : `Calculated recovery rate for this shift: ${selectedShiftForModal.shiftRepairPct.toFixed(1)}%`}
                </div>
              </div>

              {selectedShiftForModal.notes && (
                <div
                  style={{
                    background: "#fffbeb",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid #fde68a",
                    fontSize: "0.82rem",
                    color: "#78350f",
                  }}
                >
                  <strong>
                    {isArabic ? "ملاحظات المشرف:" : "Supervisor Notes:"}{" "}
                  </strong>
                  {selectedShiftForModal.notes}
                </div>
              )}
            </div>

            <div
              className="modal-footer"
              style={{ display: "flex", justifyContent: "flex-end" }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedShiftForModal(null)}
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
