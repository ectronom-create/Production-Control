import React from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronUp,
  ChevronDown,
  ClipboardCheck,
  Check,
} from "lucide-react";
import {
  getCategoryInfo,
  getStationsDisplay,
} from "../../constants/checklistData";

export default function ChecklistItemCard({
  item,
  currentStatus,
  currentNote,
  isDetailsOpen,
  setItemStatus,
  setItemNote,
  toggleDetails,
  standupAttendance,
  handleSetOperatorAttendance,
  handleSetOperatorReason,
  handleMarkAllAttendancePresent,
  isArabic,
  t,
}) {
  const isPass = currentStatus === "PASS";
  const isFail = currentStatus === "FAIL";
  const isPending = currentStatus === "PENDING";

  const catInfo = getCategoryInfo(item.cat, isArabic);
  const stInfo = getStationsDisplay(item.stations, isArabic);

  return (
    <div
      className="card-white"
      style={{
        padding: "16px 20px",
        border: isFail
          ? "2px solid #f87171"
          : isPass
            ? "1px solid #86efac"
            : "1px solid #cbd5e1",
        background: isFail ? "#fff8f8" : isPass ? "#fafffd" : "#ffffff",
        boxShadow: isFail
          ? "0 2px 10px rgba(220, 38, 38, 0.08)"
          : "0 2px 6px rgba(0,0,0,0.02)",
      }}
    >
      {/* Card Header & Status Action Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        {/* Item Titles & Badges */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 6,
            }}
          >
            <div
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: "0.76rem",
                  fontWeight: 900,
                  background: "#f1f5f9",
                  color: "var(--navy)",
                  border: "1px solid #cbd5e1",
                }}
              >
                {catInfo.code}
              </span>
              <span
                style={{
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  color: "#0284c7",
                  background: "#f0f9ff",
                  padding: "2px 8px",
                  borderRadius: 6,
                  border: "1px solid #bae6fd",
                }}
              >
                {catInfo.name}
              </span>
            </div>

            <h3
              style={{
                margin: 0,
                fontSize: isArabic ? "1.26rem" : "1.12rem",
                fontWeight: 900,
                color: "var(--navy)",
                lineHeight: 1.4,
              }}
            >
              {isArabic ? item.arabicTitle || item.title : item.title}
            </h3>

            {item.critical && (
              <span
                style={{
                  fontSize: "0.74rem",
                  fontWeight: 900,
                  background: "#fee2e2",
                  color: "#b91c1c",
                  padding: "3px 10px",
                  borderRadius: 6,
                  border: "1px solid #fca5a5",
                }}
              >
                {isArabic ? "إلزامي (MANDATORY)" : "MANDATORY"}
              </span>
            )}
          </div>

          {isArabic && (
            <div
              style={{
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "#64748b",
                marginBottom: 6,
              }}
            >
              {item.title}
            </div>
          )}

          <p
            style={{
              margin: "6px 0 10px",
              fontSize: "0.96rem",
              color: "#1e293b",
              lineHeight: 1.6,
              fontWeight: 600,
            }}
          >
            {isArabic && item.arabicSummary ? item.arabicSummary : item.summary}
          </p>

          {/* Stations badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
              marginTop: 4,
            }}
          >
            <span
              style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b" }}
            >
              {isArabic ? "المحطات المشمولة:" : "Applicable Stations:"}
            </span>
            <span
              style={{
                fontSize: "0.74rem",
                fontWeight: 800,
                padding: "3px 10px",
                borderRadius: 6,
                background: stInfo.isAll ? "#f0fdf4" : "#f0f9ff",
                color: stInfo.isAll ? "#166534" : "#0369a1",
                border: stInfo.isAll
                  ? "1px solid #bbf7d0"
                  : "1px solid #bae6fd",
              }}
            >
              {stInfo.label}
            </span>
          </div>

          {/* Standup Attendance for chk-0 */}
          {item.id === "chk-0" && (
            <div
              style={{
                marginTop: 14,
                background: "#ffffff",
                border: "1.5px solid #cbd5e1",
                borderRadius: 10,
                padding: 14,
                width: "100%",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                  paddingBottom: 10,
                  borderBottom: "1px solid #e2e8f0",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "1rem" }}>📋</span>
                  <span
                    style={{
                      fontSize: "0.88rem",
                      fontWeight: 800,
                      color: "var(--navy)",
                    }}
                  >
                    {isArabic
                      ? "كشف حضور اجتماع الوقوف الصباحي والوردية"
                      : "Morning Standup Meeting Attendance"}
                  </span>
                </div>

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
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "#10b981",
                    }}
                  >
                    🟢 {isArabic ? "حاضر:" : "Present:"}{" "}
                    {
                      standupAttendance.filter((a) => a.status === "PRESENT")
                        .length
                    }
                  </span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: "rgba(234, 179, 8, 0.12)",
                      color: "#b45309",
                    }}
                  >
                    🟡 {isArabic ? "تأخير:" : "Late:"}{" "}
                    {
                      standupAttendance.filter((a) => a.status === "LATE")
                        .length
                    }
                  </span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: "rgba(239, 68, 68, 0.12)",
                      color: "#ef4444",
                    }}
                  >
                    🔴 {isArabic ? "غياب:" : "Absent:"}{" "}
                    {
                      standupAttendance.filter((a) => a.status === "ABSENT")
                        .length
                    }
                  </span>

                  <button
                    type="button"
                    onClick={handleMarkAllAttendancePresent}
                    style={{
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      color: "#334155",
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {isArabic ? "✔ تحديد الكل حاضر" : "Mark All Present"}
                  </button>

                  <a
                    href="/crew"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      background: "#eef2ff",
                      color: "#4338ca",
                      border: "1px solid #c7d2fe",
                      textDecoration: "none",
                    }}
                  >
                    <span>👥</span>
                    <span>{isArabic ? "طاقم العمل" : "Crew Page"}</span>
                    <span style={{ fontSize: "0.65rem" }}>↗</span>
                  </a>
                </div>
              </div>

              {standupAttendance.length === 0 ? (
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#64748b",
                    fontStyle: "italic",
                    padding: 8,
                  }}
                >
                  {isArabic
                    ? "لا يوجد مشغلين مسجلين تحت هذا المشرف."
                    : "No operators found under this supervisor."}
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {standupAttendance.map((op) => (
                    <div
                      key={op.id}
                      style={{
                        background:
                          op.status === "ABSENT"
                            ? "#fef2f2"
                            : op.status === "LATE"
                              ? "#fffbeb"
                              : "#f8fafc",
                        border:
                          op.status === "ABSENT"
                            ? "1px solid #fecaca"
                            : op.status === "LATE"
                              ? "1px solid #fde68a"
                              : "1px solid #e2e8f0",
                        borderRadius: 8,
                        padding: "8px 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            background:
                              op.status === "ABSENT"
                                ? "#ef4444"
                                : op.status === "LATE"
                                  ? "#f59e0b"
                                  : "var(--navy)",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                          }}
                        >
                          {op.name.charAt(0)}
                        </div>
                        <div>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "0.82rem",
                              color: "var(--navy)",
                            }}
                          >
                            {op.name}
                          </span>
                          <span
                            style={{
                              marginLeft: 6,
                              marginRight: 6,
                              fontSize: "0.72rem",
                              color: "#64748b",
                              fontFamily: "monospace",
                            }}
                          >
                            #{op.company_id}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            borderRadius: 6,
                            overflow: "hidden",
                            border: "1px solid #cbd5e1",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleSetOperatorAttendance(op.id, "PRESENT")
                            }
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              border: "none",
                              background:
                                op.status === "PRESENT" ? "#10b981" : "#ffffff",
                              color:
                                op.status === "PRESENT" ? "#ffffff" : "#475569",
                            }}
                          >
                            🟢 {isArabic ? "حاضر" : "Present"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleSetOperatorAttendance(op.id, "LATE")
                            }
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              borderLeft: "1px solid #cbd5e1",
                              borderRight: "1px solid #cbd5e1",
                              background:
                                op.status === "LATE" ? "#f59e0b" : "#ffffff",
                              color:
                                op.status === "LATE" ? "#ffffff" : "#475569",
                            }}
                          >
                            🟡 {isArabic ? "تأخير" : "Late"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleSetOperatorAttendance(op.id, "ABSENT")
                            }
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              border: "none",
                              background:
                                op.status === "ABSENT" ? "#ef4444" : "#ffffff",
                              color:
                                op.status === "ABSENT" ? "#ffffff" : "#475569",
                            }}
                          >
                            🔴 {isArabic ? "غياب" : "Absent"}
                          </button>
                        </div>

                        {op.status !== "PRESENT" && (
                          <input
                            type="text"
                            value={op.reason || ""}
                            onChange={(e) =>
                              handleSetOperatorReason(op.id, e.target.value)
                            }
                            placeholder={
                              op.status === "LATE"
                                ? isArabic
                                  ? "سبب أو مدة التأخير (مثال: تأخر 20 دقيقة)..."
                                  : "Reason / duration of delay..."
                                : isArabic
                                  ? "سبب عدم الحضور (إجازة مرضية / عذر طارئ / بدون إشعار)..."
                                  : "Reason for absence..."
                            }
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.75rem",
                              borderRadius: 6,
                              border: "1px solid #f59e0b",
                              minWidth: "220px",
                              background: "#ffffff",
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Action Buttons: PASS / FAIL / PENDING */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: isArabic ? "flex-start" : "flex-end",
            gap: 6,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              gap: 6,
              background: "#f8fafc",
              padding: 4,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          >
            <button
              type="button"
              onClick={() => setItemStatus(item.id, "PASS")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 18px",
                borderRadius: 6,
                fontSize: "0.84rem",
                fontWeight: 900,
                cursor: "pointer",
                transition: "all 0.15s ease",
                border: isPass ? "2px solid #16a34a" : "1px solid transparent",
                background: isPass ? "#16a34a" : "transparent",
                color: isPass ? "#ffffff" : "#15803d",
                boxShadow: isPass
                  ? "0 2px 6px rgba(220, 38, 38, 0.35)"
                  : "none",
              }}
            >
              <CheckCircle2 size={16} /> PASS
            </button>

            <button
              type="button"
              onClick={() => setItemStatus(item.id, "FAIL")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 18px",
                borderRadius: 6,
                fontSize: "0.84rem",
                fontWeight: 900,
                cursor: "pointer",
                transition: "all 0.15s ease",
                border: isFail ? "2px solid #dc2626" : "1px solid transparent",
                background: isFail ? "#dc2626" : "transparent",
                color: isFail ? "#ffffff" : "#b91c1c",
                boxShadow: isFail
                  ? "0 2px 6px rgba(220, 38, 38, 0.35)"
                  : "none",
              }}
            >
              <XCircle size={16} /> FAIL
            </button>

            <button
              type="button"
              onClick={() => setItemStatus(item.id, "PENDING")}
              title="Reset to Pending"
              style={{
                padding: "7px 10px",
                borderRadius: 6,
                cursor: "pointer",
                border: "none",
                background: isPending ? "#e2e8f0" : "transparent",
                color: "#94a3b8",
              }}
            >
              <Clock size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => toggleDetails(item.id)}
            style={{
              border: "1.5px solid #0284c7",
              background: isDetailsOpen ? "#0284c7" : "#f0f9ff",
              color: isDetailsOpen ? "#ffffff" : "#0369a1",
              fontSize: "0.88rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              transition: "all 0.15s ease",
              marginTop: 6,
            }}
          >
            {isDetailsOpen ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
            <span>
              {isDetailsOpen
                ? isArabic
                  ? "إخفاء معايير الفحص والتحقق"
                  : "Hide Inspection Details"
                : isArabic
                  ? `🔍 عرض معايير الفحص والتحقق الإلزامية (${(item.arabicDetails || item.details).length})`
                  : `🔍 Show Mandatory Criteria (${item.details.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* Criteria Details Accordion */}
      {isDetailsOpen && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1.5px dashed #cbd5e1",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 12,
              paddingBottom: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.96rem",
                fontWeight: 900,
                color: "var(--navy)",
              }}
            >
              <ClipboardCheck size={20} color="#0284c7" />
              <span>{t("mandatoryCriteria")}</span>
            </div>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 900,
                background: "#e0f2fe",
                color: "#0369a1",
                padding: "3px 12px",
                borderRadius: 12,
              }}
            >
              {
                (isArabic && item.arabicDetails
                  ? item.arabicDetails
                  : item.details
                ).length
              }{" "}
              {isArabic ? "معايير فحص إلزامية" : "Mandatory Criteria"}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 10,
            }}
          >
            {(isArabic && item.arabicDetails
              ? item.arabicDetails
              : item.details
            ).map((detail, dIdx) => (
              <div
                key={dIdx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  background: isPass
                    ? "#f0fdf4"
                    : isFail
                      ? "#fef2f2"
                      : "#f8fafc",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: `1.5px solid ${isPass ? "#86efac" : isFail ? "#fca5a5" : "#cbd5e1"}`,
                  direction: isArabic ? "rtl" : "ltr",
                  textAlign: isArabic ? "right" : "left",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div
                  style={{
                    minWidth: 26,
                    height: 26,
                    borderRadius: 7,
                    background: isPass
                      ? "#16a34a"
                      : isFail
                        ? "#dc2626"
                        : "#e2e8f0",
                    color: isPass || isFail ? "#ffffff" : "#475569",
                    fontSize: "0.82rem",
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {isPass ? <Check size={15} strokeWidth={3} /> : dIdx + 1}
                </div>
                <span
                  style={{
                    fontSize: "0.94rem",
                    color: "#0f172a",
                    lineHeight: 1.6,
                    fontWeight: 700,
                  }}
                >
                  {detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes / Defect Reason Input */}
      {(isFail || currentNote) && (
        <div
          style={{
            marginTop: 12,
            background: isFail ? "#fee2e2" : "#f8fafc",
            padding: "10px 14px",
            borderRadius: 8,
            border: isFail ? "1px solid #fca5a5" : "1px solid #cbd5e1",
          }}
        >
          <label
            style={{
              fontSize: "0.74rem",
              fontWeight: 800,
              color: isFail ? "#991b1b" : "var(--navy)",
              display: "block",
              marginBottom: 4,
            }}
          >
            {isFail
              ? t("defectReasonReq")
              : isArabic
                ? "ملاحظات المشرف:"
                : "Supervisor Remark:"}
          </label>
          <input
            type="text"
            value={currentNote}
            onChange={(e) => setItemNote(item.id, e.target.value)}
            placeholder={
              isFail
                ? t("defectReasonPlaceholder")
                : isArabic
                  ? "أضف ملاحظة..."
                  : "Add observation..."
            }
            style={{
              width: "100%",
              padding: "6px 10px",
              borderRadius: 6,
              fontSize: "0.8rem",
              fontWeight: 600,
              border: isFail ? "1px solid #ef4444" : "1px solid #cbd5e1",
              background: "#ffffff",
              color: isFail ? "#991b1b" : "inherit",
            }}
          />
        </div>
      )}
    </div>
  );
}
