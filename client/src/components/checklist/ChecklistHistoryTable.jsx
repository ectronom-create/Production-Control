import React from "react";
import { Search, Printer, Eye, Trash2 } from "lucide-react";

export default function ChecklistHistoryTable({
  filteredHistory,
  loading,
  historySearch,
  setHistorySearch,
  historyShiftFilter,
  setHistoryShiftFilter,
  openPrintModal,
  handleDeleteHistory,
  isAdmin,
  isArabic,
  t,
}) {
  return (
    <div
      className="card-white"
      style={{ padding: 20, border: "1px solid #cbd5e1" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 800,
              color: "var(--navy)",
            }}
          >
            {t("auditLogTitle")}
          </h3>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
            {t("auditLogSubtitle")}
          </span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="search-wrap" style={{ minWidth: 200 }}>
            <Search className="search-icon" size={14} />
            <input
              type="text"
              className="search-input"
              placeholder={t("searchSupervisorDate")}
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              style={{ padding: "6px 10px 6px 32px", fontSize: "0.8rem" }}
            />
          </div>

          <select
            className="search-input"
            value={historyShiftFilter}
            onChange={(e) => setHistoryShiftFilter(e.target.value)}
            style={{
              width: "auto",
              padding: "6px 10px",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            <option value="ALL">
              {isArabic ? "جميع الورديات" : "All Shifts"}
            </option>
            <option value="Day">{isArabic ? "نهاري" : "Day"}</option>
            <option value="Night">{isArabic ? "ليلي" : "Night"}</option>
          </select>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("date")}</th>
              <th>{t("shift")}</th>
              <th>{t("supervisor")}</th>
              <th>{isArabic ? "النسبة" : "Score"}</th>
              <th>{t("status")}</th>
              <th>{t("resultsBreakdown")}</th>
              <th>{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  style={{ textAlign: "center", padding: 24, color: "#64748b" }}
                >
                  {t("loading")}
                </td>
              </tr>
            ) : filteredHistory.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}
                >
                  {isArabic
                    ? "لم يتم العثور على سجلات سابقة. يمكنك حفظ أول فحص من الأعلى."
                    : "No checklist records found. Submit your first checklist above."}
                </td>
              </tr>
            ) : (
              filteredHistory.map((rec) => {
                const isCleared =
                  rec.status === "LINE_CLEARED_PASS" ||
                  rec.status === "READY_FOR_START";
                const isBlocked = rec.status === "CRITICAL_BLOCKER";

                return (
                  <tr key={rec.id}>
                    <td style={{ fontWeight: 800, color: "var(--navy)" }}>
                      {rec.date}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          background:
                            rec.shift === "Day" || rec.shift === "Morning"
                              ? "#fffbeb"
                              : "#f5f3ff",
                          color:
                            rec.shift === "Day" || rec.shift === "Morning"
                              ? "#b45309"
                              : "#6d28d9",
                        }}
                      >
                        {rec.shift === "Day" || rec.shift === "Morning"
                          ? isArabic
                            ? "☀️ نهاري"
                            : "☀️ Day"
                          : isArabic
                            ? "🌙 ليلي"
                            : "🌙 Night"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {rec.supervisor || rec.inspector}
                    </td>
                    <td
                      style={{
                        fontWeight: 800,
                        color: isCleared
                          ? "#16a34a"
                          : isBlocked
                            ? "#dc2626"
                            : "#d97706",
                      }}
                    >
                      {rec.readiness_pct}%
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: "0.74rem",
                          fontWeight: 800,
                          background: isCleared
                            ? "#dcfce7"
                            : isBlocked
                              ? "#fee2e2"
                              : "#fef3c7",
                          color: isCleared
                            ? "#166534"
                            : isBlocked
                              ? "#991b1b"
                              : "#92400e",
                        }}
                      >
                        {isCleared
                          ? isArabic
                            ? "الخط جاهز ومصرح"
                            : "Line Cleared"
                          : isBlocked
                            ? isArabic
                              ? "معطل (حرج)"
                              : "Blocked"
                            : isArabic
                              ? "توجد ملاحظات"
                              : "Issues Flagged"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      <span style={{ color: "#16a34a", fontWeight: 700 }}>
                        ✓ {rec.passed_count || rec.ok_count || 0} PASS
                      </span>
                      {(rec.failed_count > 0 || rec.ng_count > 0) && (
                        <span
                          style={{
                            color: "#dc2626",
                            fontWeight: 700,
                            margin: "0 8px",
                          }}
                        >
                          ✕ {rec.failed_count || rec.ng_count} FAIL
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="btn-outline"
                          title={
                            isArabic
                              ? "معاينة وطباعة التقرير"
                              : "Preview & Print Report"
                          }
                          onClick={() => openPrintModal(rec)}
                          style={{
                            padding: "4px 8px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-outline"
                          title={
                            isArabic
                              ? "عرض تفاصيل الفحص"
                              : "View Checklist Details"
                          }
                          onClick={() => openPrintModal(rec)}
                          style={{ padding: "4px 8px" }}
                        >
                          <Eye size={14} />
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn-outline"
                            title={
                              isArabic
                                ? "حذف السجل (للأدمن فقط)"
                                : "Delete Record (Admin Only)"
                            }
                            onClick={() => handleDeleteHistory(rec.id)}
                            style={{
                              padding: "4px 8px",
                              color: "#dc2626",
                              borderColor: "#fecdd3",
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
