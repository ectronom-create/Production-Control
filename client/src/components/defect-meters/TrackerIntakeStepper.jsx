import React, { useRef, useEffect } from "react";
import {
  Scan,
  Layers,
  Tag,
  Check,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  ArrowRight,
  QrCode,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import { STAGES } from "../../constants/defectStages";

export default function TrackerIntakeStepper({
  wizardStep,
  setWizardStep,
  scanSerial,
  setScanSerial,
  selectedStage,
  setSelectedStage,
  defectCode,
  setDefectCode,
  meterBlockReason,
  detectedPreviousMeter,
  isArabic,
  isViewer,
  isSubmittingDefect,
  openRepairModal,
  handleRegisterDefective,
}) {
  const serialInputRef = useRef(null);
  const codeInputRef = useRef(null);

  useEffect(() => {
    if (wizardStep === 1) {
      setTimeout(() => serialInputRef.current?.focus(), 80);
    } else if (wizardStep === 3) {
      setTimeout(() => {
        codeInputRef.current?.focus();
        codeInputRef.current?.select();
      }, 80);
    }
  }, [wizardStep]);

  return (
    <div
      className="card-white"
      style={{
        padding: "28px 32px",
        border: "2px solid #cbd5e1",
        borderRadius: 16,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Step Progress Pills Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            step: 1,
            label: isArabic ? "1. مسح السيريال" : "1. Scan Serial",
            icon: <Scan size={14} />,
          },
          {
            step: 2,
            label: isArabic ? "2. اختيار المرحلة" : "2. Select Stage",
            icon: <Layers size={14} />,
          },
          {
            step: 3,
            label: isArabic ? "3. كود العطل" : "3. Defect Code",
            icon: <Tag size={14} />,
          },
        ].map((s) => {
          const isActive = wizardStep === s.step;
          const isPassed = wizardStep > s.step;
          return (
            <div
              key={s.step}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 14px",
                borderRadius: 20,
                fontSize: "0.78rem",
                fontWeight: 800,
                background: isActive
                  ? "#0284c7"
                  : isPassed
                    ? "#dcfce7"
                    : "#f1f5f9",
                color: isActive ? "#ffffff" : isPassed ? "#15803d" : "#64748b",
                border: isActive
                  ? "1.5px solid #0284c7"
                  : isPassed
                    ? "1px solid #86efac"
                    : "1px solid #cbd5e1",
                boxShadow: isActive
                  ? "0 2px 8px rgba(2, 132, 199, 0.25)"
                  : "none",
                transition: "all 0.2s ease",
              }}
            >
              {isPassed ? <Check size={13} strokeWidth={3} /> : s.icon}
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: SCAN OR ENTER SERIAL NUMBER ── */}
      {wizardStep === 1 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#e0f2fe",
              color: "#0284c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Scan size={30} />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.45rem",
                fontWeight: 900,
                color: "var(--navy)",
              }}
            >
              {isArabic
                ? "امسح باركود العداد المعطل أو اكتب السيريال"
                : "Scan Defective Meter Barcode or Enter Serial"}
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "0.86rem",
                color: "#64748b",
              }}
            >
              {isArabic
                ? "وجّه قارئ الباركود (Scanner) أو اكتب السيريال واضغط Enter للمتابعة لاختيار المرحلة"
                : "Point barcode scanner or type serial number and press Enter to select stage"}
            </p>
          </div>

          <div
            style={{
              width: "100%",
              maxWidth: 520,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <input
              ref={serialInputRef}
              type="text"
              className="search-input"
              value={scanSerial}
              onChange={(e) => setScanSerial(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!scanSerial.trim()) return;
                  if (meterBlockReason) {
                    alert(
                      `${meterBlockReason.title}\n\n${meterBlockReason.message}\n\n${meterBlockReason.rule || ""}`,
                    );
                    return;
                  }
                  setWizardStep(2);
                }
              }}
              placeholder={
                isArabic
                  ? "مثال: 2601004523 (Enter)"
                  : "e.g. 2601004523 (Enter)"
              }
              style={{
                height: 54,
                fontSize: "1.35rem",
                fontWeight: 900,
                textAlign: "center",
                letterSpacing: "0.06em",
                border: meterBlockReason
                  ? "2.5px solid #ef4444"
                  : detectedPreviousMeter
                    ? "2.5px solid #f59e0b"
                    : "2px solid #0284c7",
                boxShadow: meterBlockReason
                  ? "0 4px 14px rgba(239, 68, 68, 0.2)"
                  : "0 4px 14px rgba(2, 132, 199, 0.14)",
                borderRadius: 12,
              }}
              autoFocus
            />

            {/* Strict Block Banner */}
            {meterBlockReason && detectedPreviousMeter && (
              <div
                style={{
                  background: "#fef2f2",
                  color: "#991b1b",
                  border: "2px solid #ef4444",
                  borderRadius: 12,
                  padding: "14px 18px",
                  textAlign: isArabic ? "right" : "left",
                  direction: isArabic ? "rtl" : "ltr",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "0.94rem",
                    fontWeight: 900,
                  }}
                >
                  <ShieldAlert size={20} color="#dc2626" />
                  <span>{meterBlockReason.title}</span>
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "#7f1d1d",
                    lineHeight: 1.45,
                    fontWeight: 700,
                  }}
                >
                  {meterBlockReason.message}
                </p>

                <div
                  style={{
                    background: "#fee2e2",
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: "#991b1b",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>🔄</span>
                  <span>{meterBlockReason.rule}</span>
                </div>

                {meterBlockReason.type === "PENDING_REPAIR" && (
                  <button
                    type="button"
                    onClick={() => openRepairModal(detectedPreviousMeter)}
                    style={{
                      marginTop: 4,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "10px 16px",
                      borderRadius: 8,
                      background: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: 900,
                      fontSize: "0.86rem",
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(22, 163, 74, 0.3)",
                    }}
                  >
                    <Wrench size={16} />
                    <span>
                      {isArabic
                        ? "فتح نافذة الصيانة والإصلاح لهذا العداد الآن"
                        : "Open Repair Modal for this Meter Now"}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Recurring Meter Notice */}
            {!meterBlockReason && detectedPreviousMeter && (
              <div
                style={{
                  background:
                    detectedPreviousMeter.entry_count >= 2
                      ? "#fef3c7"
                      : "#f0fdf4",
                  color:
                    detectedPreviousMeter.entry_count >= 2
                      ? "#92400e"
                      : "#166534",
                  border:
                    detectedPreviousMeter.entry_count >= 2
                      ? "1.5px solid #f59e0b"
                      : "1.5px solid #86efac",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: "0.84rem",
                  fontWeight: 800,
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <CheckCircle2 size={18} />
                <span>
                  {isArabic
                    ? `⚠️ عداد عائد من صيانة سابقة (أعيد للخط سابقاً). سيتم تسجيل خروج جديد كـ دورة رقم #${(detectedPreviousMeter.entry_count || 1) + 1}.`
                    : `⚠️ Meter returned from previous repair. Ready to log as Defect Cycle #${(detectedPreviousMeter.entry_count || 1) + 1}.`}
                </span>
              </div>
            )}

            <button
              type="button"
              disabled={!scanSerial.trim() || !!meterBlockReason}
              onClick={() => {
                if (!scanSerial.trim()) return;
                if (meterBlockReason) {
                  alert(
                    `${meterBlockReason.title}\n\n${meterBlockReason.message}\n\n${meterBlockReason.rule || ""}`,
                  );
                  return;
                }
                setWizardStep(2);
              }}
              className={meterBlockReason ? "btn-secondary" : "btn-primary"}
              style={{
                height: 48,
                fontSize: "0.98rem",
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 10,
                opacity: !scanSerial.trim() || meterBlockReason ? 0.6 : 1,
                cursor: meterBlockReason ? "not-allowed" : "pointer",
                background: meterBlockReason ? "#e2e8f0" : undefined,
                color: meterBlockReason ? "#64748b" : undefined,
                border: meterBlockReason ? "1px solid #cbd5e1" : undefined,
              }}
            >
              <span>
                {meterBlockReason
                  ? isArabic
                    ? "🛑 التسجيل محظور (العداد بانتظار الصيانة أولاً)"
                    : "🛑 Blocked (Pending Repair)"
                  : isArabic
                    ? "المتابعة لاختيار المرحلة"
                    : "Continue to Stage Selection"}
              </span>
              {!meterBlockReason && <ArrowRight size={18} />}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: INTERACTIVE COLORED STAGE BUTTONS ── */}
      {wizardStep === 2 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "#0f172a",
              color: "#ffffff",
              padding: "6px 16px",
              borderRadius: 999,
            }}
          >
            <QrCode size={15} color="#38bdf8" />
            <span
              style={{
                fontSize: "0.92rem",
                fontWeight: 900,
                letterSpacing: "0.04em",
              }}
            >
              {scanSerial}
            </span>
            <button
              type="button"
              onClick={() => setWizardStep(1)}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: "0.74rem",
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginLeft: 6,
              }}
            >
              <RotateCcw size={12} /> {isArabic ? "تعديل السيريال" : "Change"}
            </button>
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.45rem",
                fontWeight: 900,
                color: "var(--navy)",
              }}
            >
              {isArabic
                ? "اختر مرحلة خروج العداد المعطل"
                : "Select Failure Stage"}
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "0.86rem",
                color: "#64748b",
              }}
            >
              {isArabic
                ? "اضغط على المحطة التي تم رصد العطل فيها للمتابعة الفورية لكتابة الكود"
                : "Click the station where this defect was detected"}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 12,
              width: "100%",
              maxWidth: 920,
              marginTop: 6,
            }}
          >
            {STAGES.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setSelectedStage(st.id);
                  setWizardStep(3);
                }}
                style={{
                  padding: "18px 12px",
                  borderRadius: 14,
                  border: `2px solid ${st.border}`,
                  background: st.bg,
                  color: st.color,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = `0 8px 18px ${st.color}33`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 2px 8px rgba(0,0,0,0.04)";
                }}
              >
                <span style={{ fontSize: "1.6rem" }}>{st.icon}</span>
                <span style={{ fontSize: "1rem", fontWeight: 900 }}>
                  {st.name}
                </span>
                <span
                  style={{ fontSize: "0.74rem", fontWeight: 700, opacity: 0.9 }}
                >
                  {st.arabic}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setWizardStep(1)}
            style={{
              border: "none",
              background: "transparent",
              color: "#64748b",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 4,
            }}
          >
            <ArrowLeft size={14} />{" "}
            {isArabic ? "رجوع لتعديل السيريال" : "Back to Serial"}
          </button>
        </div>
      )}

      {/* ── STEP 3: ENTER DEFECT CODE ── */}
      {wizardStep === 3 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#0f172a",
                color: "#ffffff",
                padding: "5px 14px",
                borderRadius: 999,
                fontSize: "0.86rem",
                fontWeight: 800,
              }}
            >
              <QrCode size={14} color="#38bdf8" />
              <span>{scanSerial}</span>
            </div>

            {(() => {
              const stObj =
                STAGES.find((s) => s.id === selectedStage) || STAGES[0];
              return (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: stObj.bg,
                    color: stObj.color,
                    border: `1.5px solid ${stObj.border}`,
                    padding: "4px 14px",
                    borderRadius: 999,
                    fontSize: "0.84rem",
                    fontWeight: 900,
                  }}
                >
                  <span>{stObj.icon}</span>
                  <span>
                    {stObj.name} ({stObj.arabic})
                  </span>
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() => setWizardStep(2)}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                color: "#475569",
                padding: "4px 10px",
                borderRadius: 999,
                cursor: "pointer",
                fontSize: "0.72rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <RotateCcw size={12} />{" "}
              {isArabic ? "تغيير المرحلة" : "Change Stage"}
            </button>
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.45rem",
                fontWeight: 900,
                color: "var(--navy)",
              }}
            >
              {isArabic
                ? "أدخل كود العطل أو نوع الخلل"
                : "Enter Defect Code or Symptom"}
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "0.86rem",
                color: "#64748b",
              }}
            >
              {isArabic
                ? "اكتب كود العطل ثم اضغط Enter للحفظ"
                : "Type defect code and press Enter to save"}
            </p>
          </div>

          <div
            style={{
              width: "100%",
              maxWidth: 500,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <input
              ref={codeInputRef}
              type="text"
              className="search-input"
              value={defectCode}
              onChange={(e) => setDefectCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRegisterDefective();
                }
              }}
              placeholder={
                isArabic ? "اكتب كود العطل هنا..." : "Enter defect code..."
              }
              style={{
                height: 54,
                fontSize: "1.35rem",
                fontWeight: 900,
                textAlign: "center",
                border: "2px solid #dc2626",
                boxShadow: "0 4px 14px rgba(220, 38, 38, 0.14)",
                borderRadius: 12,
              }}
              autoFocus
            />

            {/* Assembly & Traceability Note */}
            <div
              style={{
                background: "#f0fdf4",
                border: "1.5px solid #86efac",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                direction: isArabic ? "rtl" : "ltr",
                textAlign: isArabic ? "right" : "left",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>💡</span>
              <span
                style={{
                  fontSize: "0.86rem",
                  fontWeight: 800,
                  color: "#166534",
                  lineHeight: 1.45,
                }}
              >
                {isArabic
                  ? "ملاحظة: في حال كان العداد في مرحلة التجميع (Assembly) ولم يدخل نظام التتبع، يكون الكود 0"
                  : "Note: If the meter is at Assembly and has not entered the traceability system, code is 0"}
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="btn-secondary"
                style={{ flex: 1, height: 46, fontWeight: 800 }}
              >
                {isArabic ? "← رجوع للمرحلة" : "← Back"}
              </button>

              <button
                type="button"
                disabled={
                  isSubmittingDefect ||
                  isViewer ||
                  !defectCode.trim() ||
                  !!meterBlockReason
                }
                onClick={handleRegisterDefective}
                className="btn-primary"
                style={{
                  flex: 2,
                  height: 46,
                  fontWeight: 900,
                  fontSize: "0.96rem",
                  background: "#059669",
                  borderColor: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Check size={18} />
                {isSubmittingDefect
                  ? "Saving..."
                  : isArabic
                    ? "تأكيد وتسجيل العداد المعطل (Enter)"
                    : "Confirm & Log Defect (Enter)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
