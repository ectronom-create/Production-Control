import React from "react";
import {
  Search,
  AlertTriangle,
  Printer,
  Calendar,
  RotateCcw,
  Wrench,
  History,
  Trash2,
  Edit3,
} from "lucide-react";
import { STAGES, findStage } from "../../constants/defectStages";
import {
  getTodayDateStr,
  getDaysAgoDateStr,
} from "../../utils/defectDateUtils";

export default function TrackerTableView({
  filteredDefectiveMeters,
  totalDefectiveCount,
  loadingDefects,
  trackerSearch,
  setTrackerSearch,
  trackerStageFilter,
  setTrackerStageFilter,
  trackerStatusFilter,
  setTrackerStatusFilter,
  onlyRecurringFilter,
  setOnlyRecurringFilter,
  trackerDateMode,
  setTrackerDateMode,
  trackerCustomDate,
  setTrackerCustomDate,
  trackerStartDate,
  setTrackerStartDate,
  trackerEndDate,
  setTrackerEndDate,
  setShowReportModal,
  openRepairModal,
  setLifecycleModalMeter,
  handleScrapMeter,
  openAdminEditModal,
  handleDeleteMeter,
  isAdmin,
  isViewer,
  isArabic,
  t,
}) {
  return (
    <div
      className="card-white"
      style={{ padding: 20, border: "1px solid #cbd5e1" }}
    >
      {/* Filter Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "1.02rem",
              fontWeight: 800,
              color: "var(--navy)",
            }}
          >
            {isArabic
              ? "سجل تتبع العدادات المعطلة وحلقات الإصلاح"
              : "Defective Meters Live Tracking Registry"}
          </h3>
          <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
            {isArabic
              ? `إجمالي المسجل: ${filteredDefectiveMeters.length} عداد`
              : `Showing ${filteredDefectiveMeters.length} defective units`}
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
          {/* Search */}
          <div className="search-wrap" style={{ minWidth: 170 }}>
            <Search className="search-icon" size={13} />
            <input
              type="text"
              className="search-input"
              placeholder={
                isArabic ? "بحث بالسيريال، الكود..." : "Search serial, code..."
              }
              value={trackerSearch}
              onChange={(e) => setTrackerSearch(e.target.value)}
              style={{ padding: "6px 10px 6px 30px", fontSize: "0.78rem" }}
            />
          </div>

          {/* Stage Filter */}
          <select
            className="search-input"
            value={trackerStageFilter}
            onChange={(e) => setTrackerStageFilter(e.target.value)}
            style={{
              width: "auto",
              padding: "6px 10px",
              fontSize: "0.78rem",
              fontWeight: 700,
            }}
          >
            <option value="ALL">
              {isArabic ? "جميع المراحل" : "All Stages"}
            </option>
            {STAGES.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="search-input"
            value={trackerStatusFilter}
            onChange={(e) => setTrackerStatusFilter(e.target.value)}
            style={{
              width: "auto",
              padding: "6px 10px",
              fontSize: "0.78rem",
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
          </select>

          {/* Recurring Failures Toggle Pill */}
          <button
            type="button"
            onClick={() => setOnlyRecurringFilter(!onlyRecurringFilter)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: "0.76rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              border: onlyRecurringFilter
                ? "2px solid #dc2626"
                : "1px solid #cbd5e1",
              background: onlyRecurringFilter ? "#fee2e2" : "#ffffff",
              color: onlyRecurringFilter ? "#991b1b" : "#64748b",
            }}
          >
            <AlertTriangle size={13} />
            {isArabic ? "المتكررة فقط (2+)" : "Recurring Only"}
          </button>

          {/* Print Report Button */}
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="btn-outline"
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: "0.76rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              border: "1.5px solid #0284c7",
              background: "#f0f9ff",
              color: "#0369a1",
            }}
          >
            <Printer size={13} />
            {isArabic ? "معاينة وطباعة التقرير" : "Print Report"}
          </button>
        </div>
      </div>

      {/* Date / Time Filtering Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          padding: "10px 14px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          marginBottom: 14,
        }}
      >
        {/* Left: Mode Buttons & Date Pickers */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginInlineEnd: 4,
              color: "var(--navy)",
              fontWeight: 800,
              fontSize: "0.78rem",
            }}
          >
            <Calendar size={15} color="#0284c7" />
            <span>
              {isArabic ? "فلترة بالوقت والتاريخ:" : "Time & Date Filter:"}
            </span>
          </div>

          {[
            { id: "ALL", label: isArabic ? "الكل" : "All Time" },
            { id: "TODAY", label: isArabic ? "اليوم" : "Today" },
            { id: "WEEK", label: isArabic ? "هذا الأسبوع" : "This Week" },
            {
              id: "CUSTOM_DATE",
              label: isArabic ? "تحديد تاريخ" : "Specific Date",
            },
            { id: "RANGE", label: isArabic ? "نطاق زمني" : "Date Range" },
          ].map((tab) => {
            const isActive = trackerDateMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTrackerDateMode(tab.id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  fontSize: "0.76rem",
                  fontWeight: isActive ? 800 : 600,
                  cursor: "pointer",
                  border: isActive
                    ? "1.5px solid #0284c7"
                    : "1px solid #cbd5e1",
                  background: isActive ? "#e0f2fe" : "#ffffff",
                  color: isActive ? "#0369a1" : "#475569",
                  transition: "all 0.15s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {tab.label}
              </button>
            );
          })}

          {/* Specific Date Picker */}
          {trackerDateMode === "CUSTOM_DATE" && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#ffffff",
                padding: "3px 8px",
                borderRadius: 6,
                border: "1.5px solid #0284c7",
              }}
            >
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#0369a1",
                }}
              >
                {isArabic ? "التاريخ:" : "Date:"}
              </span>
              <input
                type="date"
                value={trackerCustomDate}
                onChange={(e) => setTrackerCustomDate(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  color: "var(--navy)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              />
            </div>
          )}

          {/* Date Range Pickers */}
          {trackerDateMode === "RANGE" && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#ffffff",
                padding: "3px 10px",
                borderRadius: 6,
                border: "1.5px solid #0284c7",
              }}
            >
              <div
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#0369a1",
                  }}
                >
                  {isArabic ? "من:" : "From:"}
                </span>
                <input
                  type="date"
                  value={trackerStartDate}
                  onChange={(e) => setTrackerStartDate(e.target.value)}
                  style={{
                    border: "none",
                    outline: "none",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    color: "var(--navy)",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                />
              </div>
              <span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>—</span>
              <div
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#0369a1",
                  }}
                >
                  {isArabic ? "إلى:" : "To:"}
                </span>
                <input
                  type="date"
                  value={trackerEndDate}
                  onChange={(e) => setTrackerEndDate(e.target.value)}
                  style={{
                    border: "none",
                    outline: "none",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    color: "var(--navy)",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                />
              </div>
            </div>
          )}

          {/* Reset button if date filter is active */}
          {trackerDateMode !== "ALL" && (
            <button
              type="button"
              onClick={() => setTrackerDateMode("ALL")}
              title={isArabic ? "إلغاء فلترة التاريخ" : "Clear date filter"}
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: "pointer",
                border: "1px solid #fca5a5",
                background: "#fef2f2",
                color: "#b91c1c",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <RotateCcw size={11} />
              {isArabic ? "إلغاء الفلترة" : "Clear"}
            </button>
          )}
        </div>

        {/* Right: Summary badges */}
        <div
          style={{
            fontSize: "0.74rem",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {trackerDateMode === "TODAY" && (
            <span
              style={{
                background: "#ecfdf5",
                color: "#047857",
                border: "1px solid #a7f3d0",
                padding: "3px 8px",
                borderRadius: 6,
                fontWeight: 700,
              }}
            >
              {isArabic
                ? `📅 اليوم (${getTodayDateStr()})`
                : `📅 Today (${getTodayDateStr()})`}
            </span>
          )}
          {trackerDateMode === "WEEK" && (
            <span
              style={{
                background: "#ecfeff",
                color: "#0e7490",
                border: "1px solid #a5f3fc",
                padding: "3px 8px",
                borderRadius: 6,
                fontWeight: 700,
              }}
            >
              {isArabic
                ? `📆 آخر 7 أيام (${getDaysAgoDateStr(6)} إلى ${getTodayDateStr()})`
                : `📆 Last 7 Days (${getDaysAgoDateStr(6)} to ${getTodayDateStr()})`}
            </span>
          )}
          {trackerDateMode === "CUSTOM_DATE" && trackerCustomDate && (
            <span
              style={{
                background: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
                padding: "3px 8px",
                borderRadius: 6,
                fontWeight: 700,
              }}
            >
              {isArabic
                ? `🗓️ تاريخ: ${trackerCustomDate}`
                : `🗓️ Date: ${trackerCustomDate}`}
            </span>
          )}
          {trackerDateMode === "RANGE" && (
            <span
              style={{
                background: "#f5f3ff",
                color: "#6d28d9",
                border: "1px solid #ddd6fe",
                padding: "3px 8px",
                borderRadius: 6,
                fontWeight: 700,
              }}
            >
              {isArabic
                ? `⏳ الفترة: ${trackerStartDate || "..."} إلى ${trackerEndDate || "..."}`
                : `⏳ Period: ${trackerStartDate || "..."} to ${trackerEndDate || "..."}`}
            </span>
          )}
          <span
            style={{
              fontWeight: 800,
              color: "var(--navy)",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              padding: "3px 8px",
              borderRadius: 6,
            }}
          >
            {isArabic
              ? `المعروض: ${filteredDefectiveMeters.length} من أصل ${totalDefectiveCount}`
              : `Showing: ${filteredDefectiveMeters.length} of ${totalDefectiveCount}`}
          </span>
        </div>
      </div>

      {/* Registry Table */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>{isArabic ? "سيريال العداد" : "Serial Number"}</th>
              <th>{isArabic ? "المرحلة" : "Stage"}</th>
              <th>{isArabic ? "كود العطل" : "Defect Code"}</th>
              <th>{isArabic ? "المشرف / وقت الرصد" : "Logged By / Time"}</th>
              <th style={{ textAlign: "center" }}>{t("entryCountLabel")}</th>
              <th style={{ textAlign: "center" }}>{t("returnCountLabel")}</th>
              <th>{t("status")}</th>
              <th>{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loadingDefects ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: "center", padding: 24, color: "#64748b" }}
                >
                  {t("loading")}
                </td>
              </tr>
            ) : filteredDefectiveMeters.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}
                >
                  {isArabic
                    ? "لا توجد عدادات مطابقة للبحث أو الفلاتر."
                    : "No defective meters matching current filters."}
                </td>
              </tr>
            ) : (
              filteredDefectiveMeters.map((meter) => {
                const isUnderRepair =
                  meter.status === "UNDER_INSPECTION" ||
                  meter.status === "IN_REPAIR";
                const isReturned = meter.status === "RETURNED_TO_LINE";
                const isScrapped = meter.status === "SCRAPPED_KO";
                const isRepeated = meter.entry_count > 1;
                const stageObj = findStage(meter.stage);

                return (
                  <tr
                    key={meter.id}
                    style={{
                      background: isRepeated ? "#fffbfb" : "transparent",
                    }}
                  >
                    {/* Serial Number & Recurring Badges */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 900,
                            color: "var(--navy)",
                            fontSize: "0.88rem",
                          }}
                        >
                          {meter.serial_number}
                        </span>
                        {meter.entry_count === 2 && (
                          <span
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              background: "#fef3c7",
                              color: "#92400e",
                              border: "1px solid #fcd34d",
                              padding: "1px 5px",
                              borderRadius: 4,
                            }}
                          >
                            ⚠️ 2nd Entry
                          </span>
                        )}
                        {meter.entry_count >= 3 && (
                          <span
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: 900,
                              background: "#fee2e2",
                              color: "#b91c1c",
                              border: "1px solid #fca5a5",
                              padding: "1px 5px",
                              borderRadius: 4,
                            }}
                          >
                            🛑 {meter.entry_count}x Cycles (Critical)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Stage */}
                    <td>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: "0.76rem",
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: stageObj.bg,
                          color: stageObj.color,
                          border: `1px solid ${stageObj.border}`,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span>{stageObj.icon}</span>
                        <span>{stageObj.name}</span>
                      </span>
                    </td>

                    {/* Defect Code */}
                    <td>
                      <span
                        style={{
                          fontWeight: 900,
                          fontSize: "0.78rem",
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: "#fee2e2",
                          color: "#b91c1c",
                          border: "1px solid #fecaca",
                        }}
                      >
                        {meter.defect_code}
                      </span>
                    </td>

                    {/* Logged by & Time */}
                    <td>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: "#334155",
                        }}
                      >
                        {meter.logged_by || "Supervisor"}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                        {meter.logged_at
                          ? new Date(meter.logged_at).toLocaleDateString()
                          : "—"}
                      </div>
                    </td>

                    {/* Entry Count */}
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 900,
                          color: isRepeated ? "#dc2626" : "#0369a1",
                          background: isRepeated ? "#fee2e2" : "#e0f2fe",
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {meter.entry_count || 1}
                      </span>
                    </td>

                    {/* Return Count */}
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: 900,
                          color: meter.return_count > 0 ? "#16a34a" : "#64748b",
                          background:
                            meter.return_count > 0 ? "#dcfce7" : "#f1f5f9",
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {meter.return_count || 0}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td>
                      <span
                        style={{
                          padding: "3px 9px",
                          borderRadius: 6,
                          fontSize: "0.74rem",
                          fontWeight: 800,
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
                          border: isReturned
                            ? "1px solid #86efac"
                            : isScrapped
                              ? "1px solid #fca5a5"
                              : "1px solid #fde68a",
                        }}
                      >
                        {isReturned
                          ? isArabic
                            ? "✅ تم الإصلاح وعاد للخط"
                            : "Repaired & Returned"
                          : isScrapped
                            ? isArabic
                              ? "🛑 تالف نهائي (Scrapped)"
                              : "Scrapped KO"
                            : isArabic
                              ? "⏳ قيد المعاينة والإصلاح"
                              : "Under Inspection"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        {/* Mark Repaired & Return Button */}
                        {isUnderRepair && !isViewer && (
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => openRepairModal(meter)}
                            title={
                              isArabic
                                ? "توثيق الإصلاح وإعادة للإنتاج"
                                : "Mark Repaired & Return"
                            }
                            style={{
                              borderColor: "#10b981",
                              color: "#047857",
                              fontSize: "0.74rem",
                              fontWeight: 800,
                              padding: "4px 8px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Wrench size={13} />{" "}
                            {isArabic ? "إصلاح وعودة" : "Repair"}
                          </button>
                        )}

                        {/* View Lifecycle History Button */}
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={() => setLifecycleModalMeter(meter)}
                          title={
                            isArabic
                              ? "عرض دورة حياة وتاريخ العداد"
                              : "View Lifecycle History"
                          }
                          style={{
                            padding: "4px 8px",
                            color: "#0369a1",
                            borderColor: "#bae6fd",
                          }}
                        >
                          <History size={14} />
                        </button>

                        {/* Scrap Button */}
                        {isUnderRepair && !isViewer && (
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => handleScrapMeter(meter)}
                            title={
                              isArabic ? "استبعاد كتالف نهائي" : "Mark Scrapped"
                            }
                            style={{
                              padding: "4px 8px",
                              color: "#dc2626",
                              borderColor: "#fecdd3",
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}

                        {/* Admin Edit Button */}
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => openAdminEditModal(meter)}
                            title={
                              isArabic
                                ? "تعديل بيانات العداد (للأدمن)"
                                : "Edit Defect Record (Admin)"
                            }
                            style={{
                              borderColor: "#0284c7",
                              color: "#0369a1",
                              fontSize: "0.74rem",
                              fontWeight: 800,
                              padding: "4px 8px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              background: "#f0f9ff",
                            }}
                          >
                            <Edit3 size={13} /> {isArabic ? "تعديل" : "Edit"}
                          </button>
                        )}

                        {/* Admin Delete */}
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => handleDeleteMeter(meter.id)}
                            title="Delete record"
                            style={{
                              padding: "4px 6px",
                              color: "#94a3b8",
                              border: "none",
                            }}
                          >
                            ×
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
