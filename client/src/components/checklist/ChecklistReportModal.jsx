import React from "react";
import { Printer } from "lucide-react";
import {
  CHECKLIST_ITEMS,
  getCategoryInfo,
  getStationsDisplay,
} from "../../constants/checklistData";
import { printReportDocument } from "../../utils/printReport";

export default function ChecklistReportModal({
  isOpen,
  onClose,
  record,
  activeData,
  isArabic,
  t,
}) {
  if (!isOpen) return null;

  const date = record ? record.date : activeData.date;
  const shift = record ? record.shift : activeData.shift;
  const supervisor = record
    ? record.supervisor || record.inspector || "Supervisor"
    : activeData.supervisor;
  const readinessPct = record
    ? (record.readiness_pct ?? 0)
    : activeData.stats.readinessPct;
  const overallStatus = record
    ? record.status || "PENDING"
    : activeData.stats.overallStatus;
  const generalNotes = record
    ? record.general_notes || ""
    : activeData.generalNotes;
  const itemStatuses = record
    ? record.item_details || {}
    : activeData.itemStatuses;
  const attendanceData =
    record?.item_details?.["chk-0"]?.attendance ||
    activeData?.standupAttendance ||
    [];

  const isCleared =
    overallStatus === "LINE_CLEARED_PASS" ||
    overallStatus === "READY_FOR_START";
  const isBlocked = overallStatus === "CRITICAL_BLOCKER";

  const presentCount = attendanceData.filter(
    (a) => a.status === "PRESENT",
  ).length;
  const lateCount = attendanceData.filter((a) => a.status === "LATE").length;
  const absentCount = attendanceData.filter(
    (a) => a.status === "ABSENT",
  ).length;
  const lateOrAbsent = attendanceData.filter(
    (a) => a.status === "LATE" || a.status === "ABSENT",
  );

  const handlePrint = () => {
    printReportDocument("report-printable-area", { orientation: "landscape" });
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal report-modal"
        style={{
          maxWidth: 1080,
          width: "96vw",
          maxHeight: "94vh",
          overflowY: "auto",
        }}
      >
        <div className="modal-header" style={{ padding: "12px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Printer size={20} color="var(--teal)" />
            <span
              className="modal-title"
              style={{ fontSize: "1rem", fontWeight: 800 }}
            >
              {isArabic
                ? `معاينة طباعة نموذج التحقق (PSM-CHK-06-2026) - صفحة أفقية واحدة`
                : `Checklist Print Preview (PSM-CHK-06-2026) - Single Landscape Page`}
            </span>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Printable Document Area */}
        <div
          id="report-printable-area"
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
                  FORM NO: PSM-CHK-06-2026
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
                  REV: 00
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
                  ? "نموذج التحقق من جاهزية الخط قبل بدء الإنتاج"
                  : "START OF PRODUCTION CHECKLIST"}
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
                {t("date")}
              </span>
              <span
                className="report-meta-value"
                style={{
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  color: "var(--navy)",
                }}
              >
                {date}
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
                {t("shift")}
              </span>
              <span
                className="report-meta-value"
                style={{
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  color: shift === "Night" ? "#6d28d9" : "#b45309",
                }}
              >
                {shift === "Night"
                  ? isArabic
                    ? "🌙 ليلية (Night)"
                    : "🌙 Night"
                  : isArabic
                    ? "☀️ صباحية (Morning)"
                    : "☀️ Morning"}
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
                {supervisor}
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
                {t("lineReadinessScore")}
              </span>
              <span
                className="report-meta-value"
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 900,
                  color: isCleared
                    ? "#16a34a"
                    : isBlocked
                      ? "#dc2626"
                      : "#d97706",
                }}
              >
                {readinessPct}%
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
                {t("status")}
              </span>
              <span
                className="report-meta-value"
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  color: isCleared
                    ? "#16a34a"
                    : isBlocked
                      ? "#dc2626"
                      : "#d97706",
                }}
              >
                {isCleared
                  ? isArabic
                    ? "✅ مصرح للإنتاج"
                    : "✅ LINE CLEARED"
                  : isBlocked
                    ? isArabic
                      ? "🛑 مانع حرج"
                      : "🛑 BLOCKER"
                    : isArabic
                      ? "⚠️ قيد التحقق"
                      : "⚠️ PENDING"}
              </span>
            </div>
          </div>

          {/* 5M Quality Classification Banner */}
          <div
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: 4,
              padding: "2px 8px",
              marginBottom: 4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 6,
              fontSize: "0.56rem",
              lineHeight: 1.2,
            }}
          >
            <div>
              <strong style={{ color: "var(--navy)" }}>
                {isArabic
                  ? "تصنيف معايير الجودة (5M Quality Framework): "
                  : "5M Quality Categories: "}
              </strong>
              <span style={{ color: "#475569" }}>
                {isArabic
                  ? "A: الأفراد والسلامة | B: طرق العمل WI | C: الآلات والمعايرة | D: القياس ونظام التتبع | E: المواد وبيئة 5S"
                  : "A: Manpower & Safety | B: Methods & WI | C: Machines & Tools | D: Measurement & QA | E: Materials & 5S"}
              </span>
            </div>
            <div>
              <strong style={{ color: "#0369a1" }}>
                {isArabic
                  ? "المحطات المعتمدة (8 محطات): "
                  : "8 Line Stations: "}
              </strong>
              <span style={{ color: "#475569" }}>
                {isArabic
                  ? "1.التجميع 2.العزل 3.التردد 4.المعايرة 5.الفحص الشامل 6.التخصيص 7.التغليف 8.الفيرموير"
                  : "1.Assembly 2.Insulation 3.RF 4.Calibration 5.Multin test 6.Perso 7.Packaging 8.FW update"}
              </span>
            </div>
          </div>

          {/* Verification Criteria Compact Single-Page Table */}
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
                      width: 95,
                      padding: "2px 4px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    {isArabic ? "التصنيف المعياري" : "Category"}
                  </th>
                  <th
                    style={{ padding: "2px 6px", border: "1px solid #cbd5e1" }}
                  >
                    {isArabic
                      ? "بند الفحص والمعيار القياسي"
                      : "Inspection Item & Standard"}
                  </th>
                  <th
                    style={{
                      width: 135,
                      padding: "2px 4px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    {isArabic ? "المحطات (من 8)" : "Stations (of 8)"}
                  </th>
                  <th
                    style={{
                      width: 65,
                      textAlign: "center",
                      padding: "2px 3px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    {isArabic ? "النتيجة" : "Result"}
                  </th>
                  <th
                    style={{
                      width: 115,
                      padding: "2px 4px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    {isArabic ? "الملاحظات" : "Remarks"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {CHECKLIST_ITEMS.map((item, idx) => {
                  const rawInfo = itemStatuses?.[item.id];
                  const itemStatus =
                    typeof rawInfo === "object"
                      ? rawInfo?.status || "PENDING"
                      : rawInfo === true
                        ? "PASS"
                        : rawInfo === false
                          ? "FAIL"
                          : "PENDING";
                  const itemNote =
                    typeof rawInfo === "object" ? rawInfo?.note || "" : "";
                  const isPass = itemStatus === "PASS" || itemStatus === "OK";
                  const isFail = itemStatus === "FAIL" || itemStatus === "NG";
                  const catInfo = getCategoryInfo(item.cat, isArabic);
                  const stInfo = getStationsDisplay(item.stations, isArabic);

                  return (
                    <tr
                      key={item.id}
                      style={{
                        background: isFail
                          ? "#fff1f2"
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
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 900,
                            color: "var(--navy)",
                            fontSize: "0.62rem",
                            lineHeight: 1.15,
                          }}
                        >
                          {catInfo.code}
                        </div>
                        <div
                          style={{
                            fontSize: "0.54rem",
                            fontWeight: 700,
                            color: "#0369a1",
                            lineHeight: 1.15,
                            marginTop: 1,
                          }}
                        >
                          {catInfo.name}
                        </div>
                      </td>
                      <td
                        style={{
                          border: "1px solid #cbd5e1",
                          padding: "2px 6px",
                          verticalAlign: "middle",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 800,
                            color: "var(--navy)",
                            fontSize: "0.70rem",
                            lineHeight: 1.2,
                          }}
                        >
                          {isArabic
                            ? item.arabicTitle || item.title
                            : item.title}
                        </div>
                        <div
                          style={{
                            fontSize: "0.58rem",
                            color: "#475569",
                            lineHeight: 1.18,
                            marginTop: 1,
                          }}
                        >
                          {isArabic && item.arabicSummary
                            ? item.arabicSummary
                            : item.summary}
                        </div>

                        {item.id === "chk-0" &&
                          attendanceData &&
                          attendanceData.length > 0 && (
                            <div
                              style={{
                                marginTop: 2,
                                padding: "1px 5px",
                                background: "#f1f5f9",
                                borderRadius: 3,
                                fontSize: "0.56rem",
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 5,
                              }}
                            >
                              <span>
                                📋 {isArabic ? "حضور الاجتماع:" : "Attendance:"}
                              </span>
                              <span style={{ color: "#16a34a" }}>
                                🟢 {presentCount}{" "}
                                {isArabic ? "حاضر" : "Present"}
                              </span>
                              <span style={{ color: "#d97706" }}>
                                🟡 {lateCount} {isArabic ? "تأخير" : "Late"}
                              </span>
                              <span style={{ color: "#dc2626" }}>
                                🔴 {absentCount} {isArabic ? "غياب" : "Absent"}
                              </span>
                              {lateOrAbsent.length > 0 && (
                                <span
                                  style={{
                                    color: "#64748b",
                                    fontSize: "0.54rem",
                                  }}
                                >
                                  (
                                  {lateOrAbsent
                                    .map(
                                      (a) =>
                                        `${a.name}: ${a.reason || a.status}`,
                                    )
                                    .join(" | ")}
                                  )
                                </span>
                              )}
                            </div>
                          )}
                      </td>
                      <td
                        style={{
                          border: "1px solid #cbd5e1",
                          padding: "2px 4px",
                          verticalAlign: "middle",
                          fontSize: "0.58rem",
                        }}
                      >
                        {stInfo.isAll ? (
                          <span
                            style={{
                              display: "inline-block",
                              background: "#f0fdf4",
                              color: "#166534",
                              fontWeight: 800,
                              padding: "1px 4px",
                              borderRadius: 3,
                              border: "1px solid #bbf7d0",
                              fontSize: "0.56rem",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {stInfo.label}
                          </span>
                        ) : (
                          <div>
                            <span
                              style={{
                                fontWeight: 800,
                                color: "#0369a1",
                                fontSize: "0.60rem",
                              }}
                            >
                              {stInfo.short}
                            </span>
                            <div
                              style={{
                                fontSize: "0.52rem",
                                color: "#64748b",
                                lineHeight: 1.15,
                                marginTop: 1,
                              }}
                            >
                              {stInfo.names}
                            </div>
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          border: "1px solid #cbd5e1",
                          padding: "2px 3px",
                          verticalAlign: "middle",
                        }}
                      >
                        {isPass && (
                          <span
                            className="report-badge-pass"
                            style={{ padding: "1px 5px", fontSize: "0.60rem" }}
                          >
                            ✓ PASS
                          </span>
                        )}
                        {isFail && (
                          <span
                            className="report-badge-fail"
                            style={{ padding: "1px 5px", fontSize: "0.60rem" }}
                          >
                            ✕ FAIL
                          </span>
                        )}
                        {!isPass && !isFail && (
                          <span
                            className="report-badge-pending"
                            style={{ padding: "1px 5px", fontSize: "0.60rem" }}
                          >
                            PENDING
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          border: "1px solid #cbd5e1",
                          padding: "2px 4px",
                          verticalAlign: "middle",
                          fontSize: "0.58rem",
                        }}
                      >
                        {itemNote ? (
                          <div
                            style={{
                              color: isFail ? "#b91c1c" : "#334155",
                              fontWeight: 700,
                              lineHeight: 1.2,
                            }}
                          >
                            {itemNote}
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Shift Handover Remarks Box */}
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
              {isArabic ? "ملاحظات تسليم الوردية:" : "Shift Handover Remarks:"}
            </span>
            <span
              style={{
                fontSize: "0.62rem",
                color: generalNotes ? "#0f172a" : "#94a3b8",
                fontStyle: generalNotes ? "normal" : "italic",
              }}
            >
              {generalNotes ||
                (isArabic
                  ? "لا توجد ملاحظات مسجلة."
                  : "No shift remarks recorded.")}
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
                  ? "المشرف المسؤول (Prepared By)"
                  : "PREPARED BY (SUPERVISOR)"}
              </span>
              <div
                style={{
                  fontSize: "0.66rem",
                  fontWeight: 700,
                  color: "#334155",
                  margin: "1px 0",
                }}
              >
                {supervisor}
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
                2.{" "}
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
                3.{" "}
                {isArabic
                  ? "اعتماد إدارة الإنتاج (Production Manager)"
                  : "PRODUCTION MANAGER APPROVAL"}
              </span>
              <div
                style={{
                  fontSize: "0.66rem",
                  fontWeight: 700,
                  color: "#334155",
                  margin: "1px 0",
                }}
              >
                Operation Head
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
              ECTRON MANUFACTURING OPERATIONS — FORM PSM-CHK-06-2026 (REV 00) —
              A4 LANDSCAPE SINGLE PAGE REPORT
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
