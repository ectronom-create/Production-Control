import React from "react";
import { Edit3, Save } from "lucide-react";
import { STAGES } from "../../constants/defectStages";

export default function AdminEditModal({
  adminEditModalMeter,
  setAdminEditModalMeter,
  editFormData,
  setEditFormData,
  isSavingAdminEdit,
  handleSaveAdminEdit,
  isArabic,
  t,
}) {
  if (!adminEditModalMeter) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) =>
        e.target === e.currentTarget && setAdminEditModalMeter(null)
      }
    >
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Edit3 size={20} color="#0284c7" />
            <span className="modal-title">
              {isArabic
                ? "تعديل بيانات العداد المعطل (صلاحية الأدمن)"
                : "Edit Defective Meter (Admin Privileges)"}
            </span>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={() => setAdminEditModalMeter(null)}
          >
            ×
          </button>
        </div>

        <div
          className="modal-body"
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {/* Grid fields: Serial, Stage, Code, Status, Cycles */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            {/* Serial Number */}
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
                {isArabic ? "سيريال العداد:" : "Serial Number:"}{" "}
                <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                className="search-input"
                value={editFormData.serial_number}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    serial_number: e.target.value,
                  }))
                }
                style={{ fontWeight: 800, fontSize: "0.9rem" }}
              />
            </div>

            {/* Stage */}
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
                {isArabic ? "مرحلة الخروج:" : "Failure Stage:"}
              </label>
              <select
                className="search-input"
                value={editFormData.stage}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    stage: e.target.value,
                  }))
                }
                style={{ fontWeight: 800, fontSize: "0.86rem" }}
              >
                {STAGES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.arabic})
                  </option>
                ))}
              </select>
            </div>

            {/* Defect Code */}
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
                {isArabic ? "كود العطل:" : "Defect Code:"}{" "}
                <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                className="search-input"
                value={editFormData.defect_code}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    defect_code: e.target.value,
                  }))
                }
                placeholder={isArabic ? "مثال: 0 أو -640" : "e.g. 0 or -640"}
                style={{
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  color: "#dc2626",
                }}
              />
            </div>

            {/* Status */}
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
                {isArabic ? "حالة العداد:" : "Status:"}
              </label>
              <select
                className="search-input"
                value={editFormData.status}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                style={{ fontWeight: 800, fontSize: "0.86rem" }}
              >
                <option value="UNDER_INSPECTION">
                  {isArabic
                    ? "⏳ قيد المعاينة / بانتظار الإصلاح"
                    : "UNDER_INSPECTION (Pending Repair)"}
                </option>
                <option value="RETURNED_TO_LINE">
                  {isArabic
                    ? "✅ تم الإصلاح وأعيد للخط"
                    : "RETURNED_TO_LINE (Repaired)"}
                </option>
                <option value="SCRAPPED_KO">
                  {isArabic
                    ? "🛑 تالف دائم (Scrapped / KO)"
                    : "SCRAPPED_KO (Scrapped)"}
                </option>
              </select>
            </div>

            {/* Entry Count */}
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
                {isArabic ? "مرات الدخول (دورة العطل):" : "Entry Cycles:"}
              </label>
              <input
                type="number"
                min="1"
                className="search-input"
                value={editFormData.entry_count}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    entry_count: e.target.value,
                  }))
                }
                style={{ fontWeight: 800, fontSize: "0.86rem" }}
              />
            </div>

            {/* Return Count */}
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
                {isArabic ? "مرات الخروج / الإصلاح:" : "Return Cycles:"}
              </label>
              <input
                type="number"
                min="0"
                className="search-input"
                value={editFormData.return_count}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    return_count: e.target.value,
                  }))
                }
                style={{ fontWeight: 800, fontSize: "0.86rem" }}
              />
            </div>

            {/* Logged By */}
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
                {isArabic ? "مسؤول التسجيل / المشرف:" : "Logged By:"}
              </label>
              <input
                type="text"
                className="search-input"
                value={editFormData.logged_by}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    logged_by: e.target.value,
                  }))
                }
                style={{ fontWeight: 700, fontSize: "0.86rem" }}
              />
            </div>

            {/* Repaired By */}
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
                {isArabic ? "فني الصيانة:" : "Repaired By:"}
              </label>
              <input
                type="text"
                className="search-input"
                value={editFormData.repaired_by}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    repaired_by: e.target.value,
                  }))
                }
                placeholder={isArabic ? "اسم الفني..." : "Technician name..."}
                style={{ fontWeight: 700, fontSize: "0.86rem" }}
              />
            </div>
          </div>

          {/* Defect Notes */}
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
              {isArabic ? "ملاحظات العطل أو العرض:" : "Defect Symptom Notes:"}
            </label>
            <textarea
              rows={2}
              className="search-input"
              value={editFormData.notes}
              onChange={(e) =>
                setEditFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder={isArabic ? "تفاصيل العطل..." : "Defect details..."}
              style={{
                width: "100%",
                padding: 8,
                fontSize: "0.82rem",
                resize: "vertical",
              }}
            />
          </div>

          {/* Repair Notes */}
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
              {isArabic
                ? "إجراءات وقطع الصيانة المستبدلة:"
                : "Repair Action & Replaced Parts:"}
            </label>
            <textarea
              rows={2}
              className="search-input"
              value={editFormData.repair_notes}
              onChange={(e) =>
                setEditFormData((prev) => ({
                  ...prev,
                  repair_notes: e.target.value,
                }))
              }
              placeholder={
                isArabic ? "الإجراء التصحيحي..." : "Corrective action taken..."
              }
              style={{
                width: "100%",
                padding: 8,
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
            onClick={() => setAdminEditModalMeter(null)}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={isSavingAdminEdit}
            onClick={handleSaveAdminEdit}
            style={{
              background: "#0284c7",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 900,
            }}
          >
            <Save size={16} />
            {isSavingAdminEdit
              ? "Saving..."
              : isArabic
                ? "حفظ التعديلات"
                : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
