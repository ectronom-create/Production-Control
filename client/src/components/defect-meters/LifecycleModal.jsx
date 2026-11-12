import React from "react";
import { History } from "lucide-react";

export default function LifecycleModal({
  lifecycleModalMeter,
  setLifecycleModalMeter,
  isArabic,
  t,
}) {
  if (!lifecycleModalMeter) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) =>
        e.target === e.currentTarget && setLifecycleModalMeter(null)
      }
    >
      <div
        className="modal"
        style={{ maxWidth: 650, maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <History size={20} color="#0284c7" />
            <span className="modal-title">
              {isArabic
                ? `سجل دورة حياة العداد (${lifecycleModalMeter.serial_number})`
                : `Lifecycle Timeline: ${lifecycleModalMeter.serial_number}`}
            </span>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={() => setLifecycleModalMeter(null)}
          >
            ×
          </button>
        </div>

        <div
          className="modal-body"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {/* Status & Cycles Summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 10,
              background: "#f8fafc",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
            }}
          >
            <div>
              <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                {isArabic ? "مرات الدخول معطلاً" : "Total In-Cycles"}
              </span>
              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: 900,
                  color:
                    lifecycleModalMeter.entry_count > 1 ? "#dc2626" : "#0369a1",
                }}
              >
                {lifecycleModalMeter.entry_count || 1}{" "}
                {isArabic ? "مرات" : "times"}
              </div>
            </div>
            <div>
              <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                {isArabic ? "مرات الخروج للإنتاج" : "Total Returns"}
              </span>
              <div
                style={{ fontSize: "1rem", fontWeight: 900, color: "#16a34a" }}
              >
                {lifecycleModalMeter.return_count || 0}{" "}
                {isArabic ? "مرات" : "times"}
              </div>
            </div>
            <div>
              <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                {isArabic ? "الحالة الحالية" : "Current Status"}
              </span>
              <div style={{ fontSize: "0.86rem", fontWeight: 800 }}>
                {lifecycleModalMeter.status}
              </div>
            </div>
          </div>

          {/* History Timeline */}
          <div>
            <h4
              style={{
                margin: "0 0 10px",
                fontSize: "0.88rem",
                fontWeight: 800,
                color: "var(--navy)",
              }}
            >
              {isArabic
                ? "المحطات والأحداث المسجلة بالتسلسل الزمني:"
                : "Chronological Events & Rework Stages:"}
            </h4>

            {!lifecycleModalMeter.history ||
            lifecycleModalMeter.history.length === 0 ? (
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#94a3b8",
                  textAlign: "center",
                  padding: 16,
                }}
              >
                {isArabic
                  ? "لا توجد تفاصيل إضافية مسجلة."
                  : "No detailed events logged for this unit."}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  borderLeft: "2px solid #cbd5e1",
                  paddingLeft: 14,
                  marginLeft: 6,
                }}
              >
                {lifecycleModalMeter.history.map((ev, idx) => {
                  const isEntry = ev.type === "ENTRY";
                  const isReturn = ev.type === "RETURN_TO_LINE";
                  const isScrap = ev.type === "SCRAP_KO";

                  return (
                    <div key={idx} style={{ position: "relative" }}>
                      {/* Dot on timeline */}
                      <div
                        style={{
                          position: "absolute",
                          left: -21,
                          top: 4,
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: isEntry
                            ? "#dc2626"
                            : isReturn
                              ? "#10b981"
                              : "#64748b",
                          border: "2px solid #ffffff",
                          boxShadow: "0 0 0 1.5px #cbd5e1",
                        }}
                      />

                      <div
                        style={{
                          background: isEntry
                            ? "#fff8f8"
                            : isReturn
                              ? "#f0fdf4"
                              : "#f8fafc",
                          border: isEntry
                            ? "1px solid #fecaca"
                            : isReturn
                              ? "1px solid #bbf7d0"
                              : "1px solid #e2e8f0",
                          borderRadius: 8,
                          padding: "10px 14px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.74rem",
                              fontWeight: 900,
                              color: isEntry
                                ? "#991b1b"
                                : isReturn
                                  ? "#166534"
                                  : "#334155",
                            }}
                          >
                            {isEntry &&
                              (isArabic
                                ? `🔻 دخول معطل (الدورة #${ev.cycle}) - محطة ${ev.stage}`
                                : `🔻 Defect Intake (Cycle #${ev.cycle}) - ${ev.stage}`)}
                            {isReturn &&
                              (isArabic
                                ? `🟢 إصلاح وعودة لخط الإنتاج (الدورة #${ev.cycle})`
                                : `🟢 Repaired & Returned to Line (Cycle #${ev.cycle})`)}
                            {isScrap &&
                              (isArabic
                                ? `🛑 تم استبعاد العداد كتالف نهائي`
                                : `🛑 Meter Scrapped / KO Permanent`)}
                          </span>
                          <span
                            style={{ fontSize: "0.68rem", color: "#94a3b8" }}
                          >
                            {ev.logged_at
                              ? new Date(ev.logged_at).toLocaleString()
                              : ev.returned_at
                                ? new Date(ev.returned_at).toLocaleString()
                                : "—"}
                          </span>
                        </div>

                        {isEntry && (
                          <div
                            style={{ fontSize: "0.76rem", color: "#475569" }}
                          >
                            <div>
                              <strong>
                                {isArabic ? "كود العطل:" : "Defect Code:"}
                              </strong>{" "}
                              <span
                                style={{ color: "#b91c1c", fontWeight: 800 }}
                              >
                                {ev.defect_code}
                              </span>
                            </div>
                            <div>
                              <strong>
                                {isArabic ? "المشرف المدخل:" : "Logged By:"}
                              </strong>{" "}
                              {ev.logged_by}
                            </div>
                            {ev.notes && (
                              <div
                                style={{ marginTop: 2, fontStyle: "italic" }}
                              >
                                "{ev.notes}"
                              </div>
                            )}
                          </div>
                        )}

                        {isReturn && (
                          <div
                            style={{ fontSize: "0.76rem", color: "#475569" }}
                          >
                            <div>
                              <strong>
                                {isArabic ? "الفني:" : "Technician:"}
                              </strong>{" "}
                              {ev.technician}
                            </div>
                            <div>
                              <strong>
                                {isArabic
                                  ? "الإجراء التصحيحي:"
                                  : "Action Taken:"}
                              </strong>{" "}
                              {ev.action_taken}
                            </div>
                            {ev.destination && (
                              <div>
                                <strong>
                                  {isArabic
                                    ? "المحطة المستهدفة:"
                                    : "Returned To:"}
                                </strong>{" "}
                                {ev.destination}
                              </div>
                            )}
                          </div>
                        )}

                        {isScrap && (
                          <div
                            style={{ fontSize: "0.76rem", color: "#991b1b" }}
                          >
                            <div>{ev.reason || "Scrapped permanently"}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div
          className="modal-footer"
          style={{ display: "flex", justifyContent: "flex-end" }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setLifecycleModalMeter(null)}
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
