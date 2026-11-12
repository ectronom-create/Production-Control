import React from "react";
import { Wrench } from "lucide-react";
import { STAGES } from "../../constants/defectStages";

export default function RepairModal({
  repairModalMeter,
  setRepairModalMeter,
  repairTechName,
  setRepairTechName,
  repairDestination,
  setRepairDestination,
  repairActionTaken,
  setRepairActionTaken,
  isSubmittingRepair,
  handleConfirmRepair,
  isArabic,
  t,
}) {
  if (!repairModalMeter) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && setRepairModalMeter(null)}
    >
      <div className="modal" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Wrench size={20} color="#10b981" />
            <span className="modal-title">{t("repairModalTitle")}</span>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={() => setRepairModalMeter(null)}
          >
            ×
          </button>
        </div>

        <div
          className="modal-body"
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {/* Meter Quick Summary Box */}
          <div
            style={{
              background: "#f8fafc",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                {isArabic ? "سيريال العداد" : "Serial Number"}
              </span>
              <div
                style={{
                  fontWeight: 900,
                  color: "var(--navy)",
                  fontSize: "0.94rem",
                }}
              >
                {repairModalMeter.serial_number}
              </div>
            </div>
            <div>
              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                {isArabic ? "كود العطل" : "Defect Code"}
              </span>
              <div style={{ fontWeight: 900, color: "#dc2626" }}>
                {repairModalMeter.defect_code}
              </div>
            </div>
            <div>
              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                {isArabic ? "مرحلة الخروج" : "Failure Stage"}
              </span>
              <div style={{ fontWeight: 800 }}>{repairModalMeter.stage}</div>
            </div>
          </div>

          {/* Technician Name */}
          <div>
            <label
              style={{
                fontSize: "0.76rem",
                fontWeight: 800,
                color: "var(--navy)",
                display: "block",
                marginBottom: 4,
              }}
            >
              {t("technicianName")}: <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              className="search-input"
              value={repairTechName}
              onChange={(e) => setRepairTechName(e.target.value)}
              placeholder="Technician Name"
              style={{ fontWeight: 700, fontSize: "0.86rem" }}
            />
          </div>

          {/* Return Destination Stage */}
          <div>
            <label
              style={{
                fontSize: "0.76rem",
                fontWeight: 800,
                color: "var(--navy)",
                display: "block",
                marginBottom: 4,
              }}
            >
              {t("returnDestination")}:
            </label>
            <select
              className="search-input"
              value={repairDestination}
              onChange={(e) => setRepairDestination(e.target.value)}
              style={{ fontWeight: 800, fontSize: "0.86rem" }}
            >
              {STAGES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.arabic})
                </option>
              ))}
            </select>
          </div>

          {/* Action Taken & Replaced Components */}
          <div>
            <label
              style={{
                fontSize: "0.76rem",
                fontWeight: 800,
                color: "var(--navy)",
                display: "block",
                marginBottom: 4,
              }}
            >
              {t("repairActionTaken")}:{" "}
              <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <textarea
              rows={3}
              className="search-input"
              value={repairActionTaken}
              onChange={(e) => setRepairActionTaken(e.target.value)}
              placeholder={t("repairNotesPlaceholder")}
              style={{
                width: "100%",
                padding: 10,
                fontSize: "0.82rem",
                resize: "vertical",
              }}
            />
          </div>
        </div>

        <div
          className="modal-footer"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setRepairModalMeter(null)}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={isSubmittingRepair}
            onClick={handleConfirmRepair}
            style={{
              background: "#10b981",
              borderColor: "transparent",
              fontWeight: 800,
            }}
          >
            {isSubmittingRepair ? "Saving..." : t("confirmReturnBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}
