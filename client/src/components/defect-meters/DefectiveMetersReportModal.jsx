import React, { useState } from "react";
import { Printer } from "lucide-react";
import { STAGES, findStage } from "../../constants/defectStages";
import {
  getTodayDateStr,
  getDaysAgoDateStr,
  getMeterDateStr,
} from "../../utils/defectDateUtils";
import { printReportDocument } from "../../utils/printReport";

export default function DefectiveMetersReportModal({
  isOpen,
  onClose,
  defectiveMeters,
  initialDateMode = "ALL",
  initialCustomDate = "",
  initialStartDate = "",
  initialEndDate = "",
  trackerKPIs,
  overallMetrics,
  actualTarget,
  isArabic,
  t,
  currentUser,
}) {
  const [reportStageFilter, setReportStageFilter] = useState("ALL");
  const [reportStatusFilter, setReportStatusFilter] = useState("ALL");
  const [reportDateMode, setReportDateMode] = useState(initialDateMode);
  const [reportCustomDate, setReportCustomDate] = useState(
    initialCustomDate || getTodayDateStr(),
  );
  const [reportStartDate, setReportStartDate] = useState(
    initialStartDate || getDaysAgoDateStr(6),
  );
  const [reportEndDate, setReportEndDate] = useState(
    initialEndDate || getTodayDateStr(),
  );

  if (!isOpen) return null;

  // Filtered list for print report
  const filteredList = defectiveMeters.filter((m) => {
    if (reportStageFilter !== "ALL" && m.stage !== reportStageFilter)
      return false;
    if (
      reportStatusFilter === "UNDER_INSPECTION" &&
      !(m.status === "UNDER_INSPECTION" || m.status === "IN_REPAIR")
    )
      return false;
    if (
      reportStatusFilter === "RETURNED_TO_LINE" &&
      m.status !== "RETURNED_TO_LINE"
    )
      return false;
    if (reportStatusFilter === "SCRAPPED_KO" && m.status !== "SCRAPPED_KO")
      return false;
    if (reportStatusFilter === "RECURRING" && !(m.entry_count > 1))
      return false;

    const meterDateStr = getMeterDateStr(m);
    if (reportDateMode === "TODAY" && meterDateStr !== getTodayDateStr())
      return false;
    if (reportDateMode === "WEEK") {
      const today = getTodayDateStr();
      const weekStart = getDaysAgoDateStr(6);
      if (meterDateStr < weekStart || meterDateStr > today) return false;
    }
    if (
      reportDateMode === "CUSTOM_DATE" &&
      reportCustomDate &&
      meterDateStr !== reportCustomDate
    )
      return false;
    if (reportDateMode === "RANGE") {
      if (reportStartDate && meterDateStr < reportStartDate) return false;
      if (reportEndDate && meterDateStr > reportEndDate) return false;
    }
    return true;
  });

  // Calculate 8-station counts from filtered view
  const stationCounts = {};
  STAGES.forEach((s) => {
    stationCounts[s.id] = 0;
  });
  filteredList.forEach((m) => {
    const matched = findStage(m.stage);
    if (matched && stationCounts[matched.id] !== undefined) {
      stationCounts[matched.id]++;
    }
  });

  const handlePrint = () => {
    printReportDocument("defect-report-printable-area", {
      orientation: "landscape",
    });
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const recoveryPct =
    trackerKPIs.total > 0
      ? Math.round((trackerKPIs.returnedToLine / trackerKPIs.total) * 100)
      : 0;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal report-modal"
        style={{
          maxWidth: 1100,
          width: "96vw",
          maxHeight: "94vh",
          overflowY: "auto",
        }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: "12px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Printer size={20} color="var(--teal)" />
            <span
              className="modal-title"
              style={{ fontSize: "1rem", fontWeight: 800 }}
            >
              {isArabic
                ? "معاينة طباعة تقرير العدادات المعطلة وحلقات الإصلاح (PSM-DEF-08-2026)"
                : "Defective Meters Report Print Preview (PSM-DEF-08-2026)"}
            </span>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Modal Toolbar (Filters & Print trigger on screen) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            padding: "10px 18px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
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
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 800,
                color: "var(--navy)",
              }}
            >
              {isArabic ? "فلترة نطاق التقرير:" : "Report Filters:"}
            </span>

            {/* Filter by Stage */}
            <select
              value={reportStageFilter}
              onChange={(e) => setReportStageFilter(e.target.value)}
              style={{
                padding: "4px 10px",
                fontSize: "0.78rem",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontWeight: 700,
              }}
            >
              <option value="ALL">
                {isArabic ? "جميع المحطات (الـ 8)" : "All 8 Stations"}
              </option>
              {STAGES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.num}. {isArabic ? st.arabic : st.name}
                </option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={reportStatusFilter}
              onChange={(e) => setReportStatusFilter(e.target.value)}
              style={{
                padding: "4px 10px",
                fontSize: "0.78rem",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontWeight: 700,
              }}
            >
              <option value="ALL">
                {isArabic ? "جميع الحالات" : "All Statuses"}
              </option>
              <option value="UNDER_INSPECTION">
                {isArabic ? "قيد المعاينة والإصلاح" : "Under Inspection"}
              </option>
              <option value="RETURNED_TO_LINE">
                {isArabic ? "تم الإصلاح وعاد للخط" : "Returned to Line"}
              </option>
              <option value="SCRAPPED_KO">
                {isArabic ? "تالف نهائي (Scrapped)" : "Scrapped KO"}
              </option>
              <option value="RECURRING">
                {isArabic ? "المتكررة فقط (2+)" : "Recurring Only"}
              </option>
            </select>

            {/* Filter by Date Mode */}
            <select
              value={reportDateMode}
              onChange={(e) => setReportDateMode(e.target.value)}
              style={{
                padding: "4px 10px",
                fontSize: "0.78rem",
                borderRadius: 6,
                border: "1px solid #0284c7",
                fontWeight: 700,
                color: "#0369a1",
                background: "#f0f9ff",
              }}
            >
              <option value="ALL">
                {isArabic ? "جميع التواريخ" : "All Time"}
              </option>
              <option value="TODAY">{isArabic ? "اليوم" : "Today"}</option>
              <option value="WEEK">
                {isArabic ? "هذا الأسبوع (آخر 7 أيام)" : "This Week (7 Days)"}
              </option>
              <option value="CUSTOM_DATE">
                {isArabic ? "تحديد تاريخ" : "Specific Date"}
              </option>
              <option value="RANGE">
                {isArabic ? "نطاق زمني" : "Date Range"}
              </option>
            </select>

            {reportDateMode === "CUSTOM_DATE" && (
              <input
                type="date"
                value={reportCustomDate}
                onChange={(e) => setReportCustomDate(e.target.value)}
                style={{
                  padding: "3px 8px",
                  fontSize: "0.76rem",
                  borderRadius: 6,
                  border: "1px solid #0284c7",
                  fontWeight: 700,
                }}
              />
            )}

            {reportDateMode === "RANGE" && (
              <div
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  style={{
                    padding: "3px 6px",
                    fontSize: "0.74rem",
                    borderRadius: 6,
                    border: "1px solid #0284c7",
                    fontWeight: 700,
                  }}
                />
                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>-</span>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  style={{
                    padding: "3px 6px",
                    fontSize: "0.74rem",
                    borderRadius: 6,
                    border: "1px solid #0284c7",
                    fontWeight: 700,
                  }}
                />
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handlePrint}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              fontWeight: 800,
              fontSize: "0.84rem",
            }}
          >
            <Printer size={15} />
            <span>
              {isArabic ? "🖨️ طباعة التقرير (A4 أفقي)" : "🖨️ Print Report (A4)"}
            </span>
          </button>
        </div>

        {/* Printable Document Area */}
        <div
          id="defect-report-printable-area"
          className="report-document"
          style={{
            padding: "8px 12px",
            background: "#ffffff",
            color: "#0f172a",
          }}
        >
          {/* Official Document Header */}
          <div
            className="report-doc-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1.5px solid var(--navy)",
              paddingBottom: 4,
              marginBottom: 4,
            }}
          >
            <div
              className="report-logo-box"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <img
                src="/ectron-logo.png"
                alt="ECTRON"
                className="report-logo-img"
                style={{ height: 26, objectFit: "contain" }}
              />
              <div>
                <div
                  style={{
                    fontSize: "0.80rem",
                    fontWeight: 900,
                    color: "var(--navy)",
                    letterSpacing: "0.02em",
                    lineHeight: 1.1,
                  }}
                >
                  ECTRON S.A.E — SMART METERS DIVISION
                </div>
                <div
                  style={{
                    fontSize: "0.60rem",
                    color: "#64748b",
                    fontWeight: 600,
                  }}
                >
                  {isArabic
                    ? "نظام إلكترون لمتابعة وإدارة الإنتاج والجودة"
                    : "ECTRON PRODUCTION & QUALITY CONTROL SYSTEM"}
                </div>
              </div>
            </div>

            <div
              className="report-title-box"
              style={{ textAlign: isArabic ? "left" : "right" }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  justifyContent: isArabic ? "flex-start" : "flex-end",
                  marginBottom: 1,
                }}
              >
                <span
                  style={{
                    fontSize: "0.58rem",
                    background: "#0f172a",
                    color: "#ffffff",
                    fontWeight: 800,
                    padding: "1px 5px",
                    borderRadius: 3,
                  }}
                >
                  FORM NO: PSM-DEF-08-2026
                </span>
                <span
                  style={{
                    fontSize: "0.58rem",
                    background: "#e2e8f0",
                    color: "#334155",
                    fontWeight: 800,
                    padding: "1px 4px",
                    borderRadius: 3,
                  }}
                >
                  REV: 01
                </span>
              </div>
              <h1
                className="report-main-title"
                style={{
                  fontSize: "0.94rem",
                  fontWeight: 900,
                  color: "var(--navy)",
                  margin: 0,
                  lineHeight: 1.15,
                }}
              >
                {isArabic
                  ? "تقرير حصر وتتبع العدادات المعطلة وحلقات الإصلاح والهالك"
                  : "DEFECTIVE METERS & REWORK MANAGEMENT REPORT"}
              </h1>
            </div>
          </div>

          {/* Compact Metadata Row */}
          <div
            className="report-meta-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 6,
              background: "#f8fafc",
              padding: "4px 8px",
              borderRadius: 4,
              border: "1px solid #cbd5e1",
              marginBottom: 4,
            }}
          >
            <div className="report-meta-item">
              <span
                className="report-meta-label"
                style={{
                  fontSize: "0.58rem",
                  color: "#64748b",
                  fontWeight: 800,
                  display: "block",
                }}
              >
                {isArabic ? "نطاق / تاريخ التقرير" : "Report Date / Range"}
              </span>
              <span
                className="report-meta-value"
                style={{
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  color: "var(--navy)",
                }}
              >
                {reportDateMode === "TODAY"
                  ? isArabic
                    ? `اليوم (${getTodayDateStr()})`
                    : `Today (${getTodayDateStr()})`
                  : reportDateMode === "WEEK"
                    ? isArabic
                      ? `آخر 7 أيام (${getDaysAgoDateStr(6)} إلى ${getTodayDateStr()})`
                      : `Past 7 Days`
                    : reportDateMode === "CUSTOM_DATE"
                      ? reportCustomDate
                      : reportDateMode === "RANGE"
                        ? `${reportStartDate} - ${reportEndDate}`
                        : isArabic
                          ? `شامل (${todayStr})`
                          : `All Records (${todayStr})`}
              </span>
            </div>

            <div className="report-meta-item">
              <span
                className="report-meta-label"
                style={{
                  fontSize: "0.58rem",
                  color: "#64748b",
                  fontWeight: 800,
                  display: "block",
                }}
              >
                {t("supervisor")}
              </span>
              <span
                className="report-meta-value"
                style={{
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  color: "var(--navy)",
                }}
              >
                {currentUser?.name || "Supervisor"}
              </span>
            </div>

            <div className="report-meta-item">
              <span
                className="report-meta-label"
                style={{
                  fontSize: "0.58rem",
                  color: "#64748b",
                  fontWeight: 800,
                  display: "block",
                }}
              >
                {isArabic ? "إجمالي حالات KO" : "Reported KO"}
              </span>
              <span
                className="report-meta-value"
                style={{
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  color: "#b45309",
                }}
              >
                {overallMetrics.totalReportedKOAll.toLocaleString()}
              </span>
            </div>

            <div className="report-meta-item">
              <span
                className="report-meta-label"
                style={{
                  fontSize: "0.58rem",
                  color: "#64748b",
                  fontWeight: 800,
                  display: "block",
                }}
              >
                {isArabic ? "الصافي الفعلي المعاير" : "Calibrated Net"}
              </span>
              <span
                className="report-meta-value"
                style={{
                  fontSize: "0.74rem",
                  fontWeight: 900,
                  color: "#dc2626",
                }}
              >
                {actualTarget.toLocaleString()}
              </span>
            </div>

            <div className="report-meta-item">
              <span
                className="report-meta-label"
                style={{
                  fontSize: "0.58rem",
                  color: "#64748b",
                  fontWeight: 800,
                  display: "block",
                }}
              >
                {isArabic ? "معدل الإصلاح والاستعادة" : "Recovery Rate"}
              </span>
              <span
                className="report-meta-value"
                style={{
                  fontSize: "0.74rem",
                  fontWeight: 900,
                  color: "#16a34a",
                }}
              >
                {overallMetrics.repairRateOverallPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* 6 Compact KPI Badges */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 5,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                padding: "3px 6px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "0.56rem",
                  fontWeight: 800,
                  color: "#475569",
                }}
              >
                {isArabic ? "إجمالي المسجل" : "Total Logged"}
              </div>
              <div
                style={{
                  fontSize: "0.90rem",
                  fontWeight: 900,
                  color: "var(--navy)",
                }}
              >
                {trackerKPIs.total}
              </div>
            </div>
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 4,
                padding: "3px 6px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "0.56rem",
                  fontWeight: 800,
                  color: "#92400e",
                }}
              >
                {isArabic ? "قيد المعاينة" : "Under Repair"}
              </div>
              <div
                style={{
                  fontSize: "0.90rem",
                  fontWeight: 900,
                  color: "#b45309",
                }}
              >
                {trackerKPIs.underInspection}
              </div>
            </div>
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 4,
                padding: "3px 6px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "0.56rem",
                  fontWeight: 800,
                  color: "#166534",
                }}
              >
                {isArabic ? "تم الإصلاح وعاد" : "Returned"}
              </div>
              <div
                style={{
                  fontSize: "0.90rem",
                  fontWeight: 900,
                  color: "#16a34a",
                }}
              >
                {trackerKPIs.returnedToLine}
              </div>
            </div>
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 4,
                padding: "3px 6px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "0.56rem",
                  fontWeight: 800,
                  color: "#991b1b",
                }}
              >
                {isArabic ? "تالف نهائي" : "Scrapped"}
              </div>
              <div
                style={{
                  fontSize: "0.90rem",
                  fontWeight: 900,
                  color: "#dc2626",
                }}
              >
                {trackerKPIs.scrapped}
              </div>
            </div>
            <div
              style={{
                background: "#fff1f2",
                border: "1px solid #fecdd3",
                borderRadius: 4,
                padding: "3px 6px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "0.56rem",
                  fontWeight: 800,
                  color: "#9f1239",
                }}
              >
                {isArabic ? "متكرر (2+)" : "Recurring"}
              </div>
              <div
                style={{
                  fontSize: "0.90rem",
                  fontWeight: 900,
                  color: "#be123c",
                }}
              >
                {trackerKPIs.recurringCount}
              </div>
            </div>
            <div
              style={{
                background: "#e0f2fe",
                border: "1px solid #bae6fd",
                borderRadius: 4,
                padding: "3px 6px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "0.56rem",
                  fontWeight: 800,
                  color: "#0369a1",
                }}
              >
                {isArabic ? "نسبة الاستعادة" : "Recovery %"}
              </div>
              <div
                style={{
                  fontSize: "0.90rem",
                  fontWeight: 900,
                  color: "#0284c7",
                }}
              >
                {recoveryPct}%
              </div>
            </div>
          </div>

          {/* 8-Station Defect Distribution Strip */}
          <div
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: 4,
              padding: "3px 6px",
              marginBottom: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  fontSize: "0.58rem",
                  fontWeight: 900,
                  color: "var(--navy)",
                }}
              >
                {isArabic
                  ? "📊 توزيع العيوب حسب تسلسل المحطات الـ 8 المعتمد:"
                  : "📊 Defect Distribution by 8 Line Stations:"}
              </span>
              <span style={{ fontSize: "0.54rem", color: "#64748b" }}>
                {isArabic
                  ? "1.التجميع 2.العزل 3.التردد 4.المعايرة 5.الفحص الشامل 6.التخصيص 7.التغليف 8.الفيرموير"
                  : "1.Assembly 2.Insulation 3.RF 4.Calibration 5.Multin 6.Perso 7.Packaging 8.FW"}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: 4,
              }}
            >
              {STAGES.map((st) => (
                <div
                  key={st.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 3,
                    padding: "2px 4px",
                    textAlign: "center",
                    fontSize: "0.56rem",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#334155",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {st.num}. {isArabic ? st.arabic : st.name}
                  </div>
                  <div
                    style={{
                      fontWeight: 900,
                      color:
                        (stationCounts[st.id] || 0) > 0 ? "#b91c1c" : "#16a34a",
                      fontSize: "0.70rem",
                      marginTop: 1,
                    }}
                  >
                    {stationCounts[st.id] || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Defective Meters Data Table */}
          <div style={{ marginBottom: 4 }}>
            <table
              className="report-table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.62rem",
                marginBottom: 0,
              }}
            >
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th
                    style={{
                      width: 22,
                      textAlign: "center",
                      padding: "2px 3px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      width: 100,
                      padding: "2px 4px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    {isArabic ? "سيريال العداد" : "Serial Number"}
                  </th>
                  <th
                    style={{
                      width: 85,
                      padding: "2px 4px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    {isArabic ? "المحطة (من 8)" : "Station (of 8)"}
                  </th>
                  <th
                    style={{
                      width: 65,
                      textAlign: "center",
                      padding: "2px 4px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    {isArabic ? "كود العطل" : "Defect Code"}
                  </th>
                  <th
                    style={{
                      width: 45,
                      textAlign: "center",
                      padding: "2px 2px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    {isArabic ? "الدخول" : "Cycles"}
                  </th>
                  <th
                    style={{
                      width: 45,
                      textAlign: "center",
                      padding: "2px 2px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    {isArabic ? "العودة" : "Returns"}
                  </th>
                  <th
                    style={{
                      width: 95,
                      textAlign: "center",
                      padding: "2px 4px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    {isArabic ? "الحالة الحالية" : "Status"}
                  </th>
                  <th
                    style={{
                      width: 105,
                      padding: "2px 4px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    {isArabic ? "تاريخ والرصد" : "Logged Date & By"}
                  </th>
                  <th
                    style={{ padding: "2px 6px", border: "1px solid #cbd5e1" }}
                  >
                    {isArabic
                      ? "الإجراء المتخذ / ملاحظات الإصلاح"
                      : "Resolution / Notes"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        textAlign: "center",
                        padding: 12,
                        color: "#94a3b8",
                      }}
                    >
                      {isArabic
                        ? "لا توجد عدادات معطلة مطابقة للفلاتر."
                        : "No defective meters matching selected filters."}
                    </td>
                  </tr>
                ) : (
                  filteredList.slice(0, 18).map((m, idx) => {
                    const stObj = findStage(m.stage);
                    const isReturned = m.status === "RETURNED_TO_LINE";
                    const isScrapped = m.status === "SCRAPPED_KO";
                    const isRepeated = m.entry_count > 1;

                    return (
                      <tr
                        key={m.id}
                        style={{
                          background: isRepeated
                            ? "#fffbfb"
                            : idx % 2 === 1
                              ? "#f8fafc"
                              : "#ffffff",
                        }}
                      >
                        <td
                          style={{
                            textAlign: "center",
                            fontWeight: 800,
                            color: "var(--navy)",
                            border: "1px solid #cbd5e1",
                            padding: "2px 2px",
                          }}
                        >
                          {idx + 1}
                        </td>
                        <td
                          style={{
                            border: "1px solid #cbd5e1",
                            padding: "2px 4px",
                            verticalAlign: "middle",
                            fontWeight: 900,
                            color: "var(--navy)",
                            fontFamily: "monospace",
                          }}
                        >
                          {m.serial_number}
                          {isRepeated && (
                            <span
                              style={{
                                fontSize: "0.52rem",
                                fontWeight: 800,
                                color: "#dc2626",
                                marginInlineStart: 3,
                              }}
                            >
                              ({m.entry_count}x)
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            border: "1px solid #cbd5e1",
                            padding: "2px 4px",
                            verticalAlign: "middle",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 800,
                              color: "#0369a1",
                              fontSize: "0.60rem",
                            }}
                          >
                            {stObj.num}. {isArabic ? stObj.arabic : stObj.name}
                          </span>
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            border: "1px solid #cbd5e1",
                            padding: "2px 4px",
                            verticalAlign: "middle",
                            fontWeight: 800,
                            color: "#b91c1c",
                          }}
                        >
                          {m.defect_code || "—"}
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            border: "1px solid #cbd5e1",
                            padding: "2px 2px",
                            verticalAlign: "middle",
                            fontWeight: 800,
                            color: isRepeated ? "#dc2626" : "#334155",
                          }}
                        >
                          {m.entry_count || 1}
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            border: "1px solid #cbd5e1",
                            padding: "2px 2px",
                            verticalAlign: "middle",
                            fontWeight: 800,
                            color: m.return_count > 0 ? "#16a34a" : "#64748b",
                          }}
                        >
                          {m.return_count || 0}
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            border: "1px solid #cbd5e1",
                            padding: "2px 4px",
                            verticalAlign: "middle",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.56rem",
                              fontWeight: 800,
                              padding: "1px 5px",
                              borderRadius: 3,
                              display: "inline-block",
                              background: isReturned
                                ? "#dcfce7"
                                : isScrapped
                                  ? "#fee2e2"
                                  : "#fef3c7",
                              color: isReturned
                                ? "#166534"
                                : isScrapped
                                  ? "#991b1b"
                                  : "#92400e",
                            }}
                          >
                            {isReturned
                              ? isArabic
                                ? "✅ عاد للخط"
                                : "Returned"
                              : isScrapped
                                ? isArabic
                                  ? "🛑 تالف نهائي"
                                  : "Scrapped"
                                : isArabic
                                  ? "⏳ قيد الإصلاح"
                                  : "In Repair"}
                          </span>
                        </td>
                        <td
                          style={{
                            border: "1px solid #cbd5e1",
                            padding: "2px 4px",
                            verticalAlign: "middle",
                            fontSize: "0.58rem",
                            color: "#475569",
                          }}
                        >
                          <div>
                            {m.logged_at
                              ? new Date(m.logged_at).toLocaleDateString()
                              : "—"}
                          </div>
                          <div style={{ color: "#0f172a", fontWeight: 700 }}>
                            {m.logged_by || "Supervisor"}
                          </div>
                        </td>
                        <td
                          style={{
                            border: "1px solid #cbd5e1",
                            padding: "2px 6px",
                            verticalAlign: "middle",
                            fontSize: "0.58rem",
                          }}
                        >
                          {m.repair_notes || m.notes ? (
                            <span style={{ color: "#334155", fontWeight: 600 }}>
                              {m.repair_notes || m.notes}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {filteredList.length > 18 && (
              <div
                style={{
                  textAlign: "center",
                  fontSize: "0.54rem",
                  color: "#64748b",
                  marginTop: 2,
                }}
              >
                {isArabic
                  ? `* تم عرض أول 18 عداداً في الصفحة الأولى من إجمالي ${filteredList.length} عداداً مسجلاً.`
                  : `* Showing first 18 of ${filteredList.length} total logged meters in summary printout.`}
              </div>
            )}
          </div>

          {/* Quality Engineering Remarks Box */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: 4,
              padding: "3px 8px",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: "0.58rem",
                fontWeight: 800,
                color: "var(--navy)",
                textTransform: "uppercase",
                marginInlineEnd: 6,
              }}
            >
              {isArabic
                ? "توجيهات الجودة الهندسية:"
                : "Quality & Engineering Directives:"}
            </span>
            <span style={{ fontSize: "0.62rem", color: "#334155" }}>
              {isArabic
                ? "الالتزام بحصر العدادات فورياً عند كل محطة من الـ 8 محطات، وفحص العدادات المتكررة (2+ دورات) تحليلياً لاستبعاد العطل الجذري وتفريغ حاويات الهالك."
                : "Enforce immediate defective logging across all 8 line stations; analyze 2+ cycle recurring meters for root causes and clear scrap bins."}
            </span>
          </div>

          {/* Official 3-Party Sign-Off Block */}
          <div
            className="report-sign-block"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              paddingTop: 4,
              borderTop: "1px dashed #cbd5e1",
            }}
          >
            <div className="sign-line">
              <span
                className="sign-line-title"
                style={{
                  fontSize: "0.58rem",
                  fontWeight: 800,
                  color: "var(--navy)",
                }}
              >
                1.{" "}
                {isArabic
                  ? "مراقب الجودة (QA/QC Inspector)"
                  : "QA/QC INSPECTOR SIGN & STAMP"}
              </span>
              <div
                style={{
                  fontSize: "0.66rem",
                  fontWeight: 700,
                  color: "#334155",
                  margin: "1px 0",
                }}
              >
                QA Department
              </div>
              <div className="sign-line-placeholder" style={{ minHeight: 12 }}>
                <span style={{ fontSize: "0.54rem", color: "#94a3b8" }}>
                  Stamp / Sign: ____________
                </span>
              </div>
            </div>

            <div className="sign-line">
              <span
                className="sign-line-title"
                style={{
                  fontSize: "0.58rem",
                  fontWeight: 800,
                  color: "var(--navy)",
                }}
              >
                2.{" "}
                {isArabic
                  ? "فني الإصلاح والتشغيل (Rework Tech)"
                  : "REWORK TECHNICIAN SIGN"}
              </span>
              <div
                style={{
                  fontSize: "0.66rem",
                  fontWeight: 700,
                  color: "#334155",
                  margin: "1px 0",
                }}
              >
                Maintenance & Rework Team
              </div>
              <div className="sign-line-placeholder" style={{ minHeight: 12 }}>
                <span style={{ fontSize: "0.54rem", color: "#94a3b8" }}>
                  Sign: ____________________
                </span>
              </div>
            </div>

            <div className="sign-line">
              <span
                className="sign-line-title"
                style={{
                  fontSize: "0.58rem",
                  fontWeight: 800,
                  color: "var(--navy)",
                }}
              >
                3.{" "}
                {isArabic
                  ? "مشرف خط الإنتاج (Production Supervisor)"
                  : "PRODUCTION SUPERVISOR APPROVAL"}
              </span>
              <div
                style={{
                  fontSize: "0.66rem",
                  fontWeight: 700,
                  color: "#334155",
                  margin: "1px 0",
                }}
              >
                {currentUser?.name || "Production Supervisor"}
              </div>
              <div className="sign-line-placeholder" style={{ minHeight: 12 }}>
                <span style={{ fontSize: "0.54rem", color: "#94a3b8" }}>
                  Approval: _________________
                </span>
              </div>
            </div>
          </div>

          {/* Form Footer Stamp */}
          <div
            style={{
              marginTop: 3,
              paddingTop: 2,
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.52rem",
              color: "#94a3b8",
            }}
          >
            <span>
              ECTRON MANUFACTURING OPERATIONS — FORM PSM-DEF-08-2026 (REV 01) —
              A4 LANDSCAPE REPORT
            </span>
            <span>Printed: {new Date().toLocaleString()}</span>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div
          className="modal-footer"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 18px",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t("close")}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handlePrint}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 18px",
              fontWeight: 800,
            }}
          >
            <Printer size={16} />
            <span>
              {isArabic
                ? "🖨️ طباعة التقرير (A4 أفقي - صفحة واحدة)"
                : "🖨️ Print Single Page (A4 Landscape)"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
