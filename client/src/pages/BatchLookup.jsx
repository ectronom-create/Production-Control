import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ArrowLeft,
  ArrowRight,
  Package,
  Boxes,
  Calendar,
  MapPin,
  Cpu,
  Layers,
  Copy,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Hash,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useLanguage } from "../context/LanguageContext";

/**
 * BatchLookup: Dedicated, mobile-optimized search page to quickly trace
 * meters, boxes, or pallets across all shipment batches.
 */
export default function BatchLookup() {
  const navigate = useNavigate();
  const { isArabic } = useLanguage();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [batchesMap, setBatchesMap] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);
  const [filterWithinResults, setFilterWithinResults] = useState("");

  const inputRef = useRef(null);

  // Auto-focus the input on page load for immediate scanning / typing
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Copy to clipboard helper
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Perform search across batch_meter_records and retrieve shipment info
  const handleSearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    setLoading(true);
    setHasSearched(true);
    setResults([]);
    setFilterWithinResults("");

    try {
      // Search batch_meter_records by serial, pallet, box, factory_sn, imei, iccid
      const { data: meterData, error: meterErr } = await supabase
        .from("batch_meter_records")
        .select("*")
        .or(
          `serial_number.ilike.%${cleanQuery}%,device_pallet_number.ilike.%${cleanQuery}%,device_box_number.ilike.%${cleanQuery}%,factory_serial_number.ilike.%${cleanQuery}%,module_imei.ilike.%${cleanQuery}%,module_iccid.ilike.%${cleanQuery}%`,
        )
        .limit(200);

      if (meterErr) {
        console.warn("Error querying batch_meter_records:", meterErr.message);
        setResults([]);
      } else {
        const meters = meterData || [];
        setResults(meters);

        // Fetch parent shipment_batches for all unique batch_ids found
        const batchIds = Array.from(
          new Set(meters.map((m) => m.batch_id).filter(Boolean)),
        );

        if (batchIds.length > 0) {
          const { data: batchList } = await supabase
            .from("shipment_batches")
            .select("*")
            .in("id", batchIds);

          const bMap = {};
          if (batchList) {
            batchList.forEach((b) => {
              bMap[b.id] = b;
            });
          }
          setBatchesMap(bMap);
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter meters if multiple results returned (e.g. a whole pallet)
  const displayedResults = results.filter((m) => {
    if (!filterWithinResults.trim()) return true;
    const q = filterWithinResults.toLowerCase();
    return (
      (m.serial_number && m.serial_number.toLowerCase().includes(q)) ||
      (m.device_box_number && m.device_box_number.toLowerCase().includes(q)) ||
      (m.device_pallet_number &&
        m.device_pallet_number.toLowerCase().includes(q)) ||
      (m.factory_serial_number &&
        m.factory_serial_number.toLowerCase().includes(q))
    );
  });

  // Group by shipment batch for clear multi-batch summary if applicable
  const primaryBatch =
    results.length > 0 && results[0].batch_id
      ? batchesMap[results[0].batch_id]
      : null;

  return (
    <div
      style={{
        maxWidth: 780,
        margin: "0 auto",
        padding: "16px 12px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      {/* ── Top Navigation Bar (Mobile-friendly) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/batches")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#f1f5f9",
            color: "#334155",
            border: "1px solid #cbd5e1",
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: "0.86rem",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          {isArabic ? <ArrowRight size={17} /> : <ArrowLeft size={17} />}
          <span>{isArabic ? "العودة للباتشز" : "Back to Batches"}</span>
        </button>

        <span
          style={{
            background: "linear-gradient(135deg, #0284c7, #0369a1)",
            color: "white",
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: "0.75rem",
            fontWeight: 800,
            letterSpacing: "0.04em",
          }}
        >
          {isArabic ? "تتبع العدادات والشحنات" : "TRACE LOOKUP"}
        </span>
      </div>

      {/* ── Main Search Card (Label + Input + Action Button) ── */}
      <div
        style={{
          background: "white",
          borderRadius: 16,
          padding: "22px 20px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.05)",
        }}
      >
        <form onSubmit={handleSearch}>
          <label
            htmlFor="meterLookupInput"
            style={{
              display: "block",
              fontSize: "1rem",
              fontWeight: 800,
              color: "var(--navy)",
              marginBottom: 8,
            }}
          >
            {isArabic
              ? "رقم السيريال / رقم الصندوق / رقم البليت:"
              : "Serial / Box / Pallet Number:"}
          </label>

          <p
            style={{
              margin: "0 0 14px",
              fontSize: "0.82rem",
              color: "#64748b",
              lineHeight: 1.4,
            }}
          >
            {isArabic
              ? "اكتب الرقم أو استخدم قارئ الباركود/الكاميرا للبحث المباشر ومعرفة الشحنة والتفاصيل."
              : "Enter or scan barcode to retrieve the shipment batch and all essential meter details."}
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Input with embedded Clear (X) icon */}
            <div style={{ position: "relative", width: "100%" }}>
              <input
                id="meterLookupInput"
                ref={inputRef}
                type="text"
                autoComplete="off"
                placeholder={
                  isArabic
                    ? "مثال: 24001234 أو رقم البليت / الصندوق..."
                    : "e.g. Serial, Box No, or Pallet No..."
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: 50,
                  padding: isArabic
                    ? "12px 42px 12px 16px"
                    : "12px 16px 12px 42px",
                  borderRadius: 12,
                  border: "2px solid #0284c7",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  fontFamily: "JetBrains Mono, monospace",
                  outline: "none",
                  boxShadow: "0 0 0 3px rgba(2, 132, 199, 0.12)",
                  boxSizing: "border-box",
                }}
              />

              {/* Leading Search Icon */}
              <Search
                size={20}
                style={{
                  position: "absolute",
                  [isArabic ? "right" : "left"]: 14,
                  top: 15,
                  color: "#0284c7",
                  pointerEvents: "none",
                }}
              />

              {/* Trailing Clear (X) Button */}
              {query.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  style={{
                    position: "absolute",
                    [isArabic ? "left" : "right"]: 12,
                    top: 13,
                    background: "#f1f5f9",
                    border: "none",
                    borderRadius: "50%",
                    width: 26,
                    height: 26,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#64748b",
                  }}
                  title={isArabic ? "مسح الحقل" : "Clear input"}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Submit Search Button (Large & Touch-friendly) */}
            <button
              type="submit"
              disabled={loading || !query.trim()}
              style={{
                width: "100%",
                minHeight: 48,
                borderRadius: 12,
                background:
                  !query.trim() || loading
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #0284c7, #0369a1)",
                color: "white",
                border: "none",
                fontSize: "1.02rem",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: !query.trim() || loading ? "not-allowed" : "pointer",
                boxShadow: !query.trim()
                  ? "none"
                  : "0 4px 10px rgba(2, 132, 199, 0.3)",
                transition: "all 0.15s ease",
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="spin" />
                  <span>{isArabic ? "جاري البحث..." : "Searching..."}</span>
                </>
              ) : (
                <>
                  <Search size={18} />
                  <span>{isArabic ? "بحث الآن" : "Search Now"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Search Results Section ── */}
      {hasSearched && (
        <div>
          {/* Case 1: No results found */}
          {!loading && results.length === 0 && (
            <div
              style={{
                background: "#fef2f2",
                border: "1.5px solid #fecaca",
                borderRadius: 14,
                padding: "24px 20px",
                textAlign: "center",
                color: "#991b1b",
              }}
            >
              <AlertCircle
                size={36}
                color="#dc2626"
                style={{ margin: "0 auto 10px" }}
              />
              <h4 style={{ margin: "0 0 6px", fontSize: "1.08rem" }}>
                {isArabic
                  ? "لم يتم العثور على أي نتائج!"
                  : "No Matching Records Found!"}
              </h4>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: "#b91c1c",
                  lineHeight: 1.5,
                }}
              >
                {isArabic
                  ? `لم نجد أي عداد أو صندوق أو طبلية مطابقة للقيمة: "${query}". يرجى التحقق من صحة الرقم أو التأكد من رفع ملف الشحنة في صفحة الباتشز.`
                  : `No meter, box, or pallet matched "${query}". Please verify the number or ensure the batch has been uploaded.`}
              </p>
            </div>
          )}

          {/* Case 2: Results Found */}
          {!loading && results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Match Header Pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8,
                  padding: "6px 2px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={18} color="#16a34a" />
                  <span
                    style={{
                      fontWeight: 800,
                      color: "var(--navy)",
                      fontSize: "0.95rem",
                    }}
                  >
                    {isArabic
                      ? `تم العثور على (${results.length}) نتيجة مطابقة`
                      : `Found (${results.length}) matching record(s)`}
                  </span>
                </div>

                <span
                  style={{
                    background: "#e0f2fe",
                    color: "#0369a1",
                    padding: "4px 10px",
                    borderRadius: 8,
                    fontSize: "0.78rem",
                    fontWeight: 800,
                  }}
                >
                  {isArabic ? "نتائج معتمدة" : "Verified Records"}
                </span>
              </div>

              {/* ── 1. SHIPMENT ORIGIN BANNER (من أي شحنة) ── */}
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                  borderRadius: 14,
                  padding: "18px 20px",
                  color: "white",
                  border: "1.5px solid #334155",
                  boxShadow: "0 6px 14px rgba(15, 23, 42, 0.15)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <Package size={20} color="#38bdf8" />
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      color: "#38bdf8",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {isArabic
                      ? "معلومات الشحنة والدفعة (Shipment Batch)"
                      : "Shipment Batch Information"}
                  </span>
                </div>

                {/* Batch Name */}
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: "1.3rem",
                    fontWeight: 900,
                    color: "#f8fafc",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {primaryBatch?.batch_name ||
                    results[0].batch_name ||
                    (isArabic ? "دفعة شحن معتمدة" : "Shipment Batch")}
                </h3>

                {/* Shipment Details Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 10,
                    background: "rgba(255, 255, 255, 0.06)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div>
                    <span
                      style={{
                        display: "block",
                        fontSize: "0.72rem",
                        color: "#94a3b8",
                      }}
                    >
                      {isArabic ? "تاريخ الشحن" : "Shipment Date"}
                    </span>
                    <strong style={{ fontSize: "0.92rem", color: "#e2e8f0" }}>
                      {primaryBatch?.shipment_date ||
                        results[0].date_of_manufactory ||
                        "N/A"}
                    </strong>
                  </div>

                  <div>
                    <span
                      style={{
                        display: "block",
                        fontSize: "0.72rem",
                        color: "#94a3b8",
                      }}
                    >
                      {isArabic ? "الوجهة / العميل" : "Destination"}
                    </span>
                    <strong style={{ fontSize: "0.92rem", color: "#38bdf8" }}>
                      {primaryBatch?.destination || "Nama / Field"}
                    </strong>
                  </div>

                  <div>
                    <span
                      style={{
                        display: "block",
                        fontSize: "0.72rem",
                        color: "#94a3b8",
                      }}
                    >
                      {isArabic ? "نوع العداد" : "Product Type"}
                    </span>
                    <strong style={{ fontSize: "0.92rem", color: "#4ade80" }}>
                      {primaryBatch?.product_type || "Three Phase"}
                    </strong>
                  </div>

                  {primaryBatch?.total_meters && (
                    <div>
                      <span
                        style={{
                          display: "block",
                          fontSize: "0.72rem",
                          color: "#94a3b8",
                        }}
                      >
                        {isArabic ? "إجمالي الدفعة" : "Total in Batch"}
                      </span>
                      <strong style={{ fontSize: "0.92rem", color: "#f8fafc" }}>
                        {Number(primaryBatch.total_meters).toLocaleString()}{" "}
                        {isArabic ? "عداد" : "meters"}
                      </strong>
                    </div>
                  )}
                </div>

                {primaryBatch?.notes && (
                  <p
                    style={{
                      margin: "10px 0 0",
                      fontSize: "0.8rem",
                      color: "#cbd5e1",
                      fontStyle: "italic",
                    }}
                  >
                    "{primaryBatch.notes}"
                  </p>
                )}
              </div>

              {/* ── 2. SINGLE METER DETAILED CARD (If 1 result) ── */}
              {results.length === 1 && (
                <div
                  style={{
                    background: "white",
                    borderRadius: 14,
                    padding: "20px",
                    border: "1.5px solid #cbd5e1",
                    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid #f1f5f9",
                      paddingBottom: 12,
                      marginBottom: 16,
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#64748b",
                          textTransform: "uppercase",
                        }}
                      >
                        {isArabic
                          ? "سيريال العداد (Serial Number)"
                          : "Serial Number"}
                      </span>
                      <div
                        style={{
                          fontSize: "1.45rem",
                          fontWeight: 900,
                          color: "var(--navy)",
                          fontFamily: "JetBrains Mono, monospace",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginTop: 2,
                        }}
                      >
                        <span>{results[0].serial_number || "N/A"}</span>
                        {results[0].serial_number && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(results[0].serial_number, "sn-0")
                            }
                            style={{
                              background:
                                copiedKey === "sn-0" ? "#dcfce7" : "#f1f5f9",
                              border: "none",
                              borderRadius: 6,
                              padding: "4px 8px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: "0.75rem",
                              color:
                                copiedKey === "sn-0" ? "#16a34a" : "#475569",
                            }}
                            title={isArabic ? "نسخ الرقم" : "Copy Serial"}
                          >
                            {copiedKey === "sn-0" ? (
                              <Check size={14} color="#16a34a" />
                            ) : (
                              <Copy size={14} />
                            )}
                            <span>
                              {copiedKey === "sn-0"
                                ? isArabic
                                  ? "تم النسخ"
                                  : "Copied"
                                : isArabic
                                  ? "نسخ"
                                  : "Copy"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pallet & Box Badges */}
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          border: "1px solid #bfdbfe",
                          padding: "6px 12px",
                          borderRadius: 8,
                          fontSize: "0.85rem",
                          fontWeight: 800,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Layers size={14} />
                        {isArabic ? "طبلية #" : "Pallet #"}{" "}
                        {results[0].device_pallet_number || "N/A"}
                      </span>

                      <span
                        style={{
                          background: "#f0fdf4",
                          color: "#15803d",
                          border: "1px solid #bbf7d0",
                          padding: "6px 12px",
                          borderRadius: 8,
                          fontSize: "0.85rem",
                          fontWeight: 800,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Boxes size={14} />
                        {isArabic ? "صندوق #" : "Box #"}{" "}
                        {results[0].device_box_number || "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Key Technical Identifiers (Clean & Focused) */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        background: "#f8fafc",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: "0.72rem",
                          color: "#64748b",
                          fontWeight: 700,
                        }}
                      >
                        {isArabic
                          ? "سيريال المصنع (Factory SN)"
                          : "Factory Serial"}
                      </span>
                      <strong
                        style={{
                          fontSize: "0.95rem",
                          color: "var(--navy)",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        {results[0].factory_serial_number || "—"}
                      </strong>
                    </div>

                    <div
                      style={{
                        background: "#f8fafc",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: "0.72rem",
                          color: "#64748b",
                          fontWeight: 700,
                        }}
                      >
                        {isArabic ? "تاريخ التصنيع" : "Mfg Date"}
                      </span>
                      <strong
                        style={{ fontSize: "0.95rem", color: "var(--navy)" }}
                      >
                        {results[0].date_of_manufactory || "—"}
                      </strong>
                    </div>

                    <div
                      style={{
                        background: "#f8fafc",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: "0.72rem",
                          color: "#64748b",
                          fontWeight: 700,
                        }}
                      >
                        {isArabic ? "إصدار الهاردوير" : "Hardware Version"}
                      </span>
                      <strong
                        style={{ fontSize: "0.95rem", color: "var(--navy)" }}
                      >
                        {results[0].hardware_version || "—"}
                      </strong>
                    </div>

                    <div
                      style={{
                        background: "#f8fafc",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: "0.72rem",
                          color: "#64748b",
                          fontWeight: 700,
                        }}
                      >
                        {isArabic ? "رقم اللوت (Lot Number)" : "Lot Number"}
                      </span>
                      <strong
                        style={{ fontSize: "0.95rem", color: "var(--navy)" }}
                      >
                        {results[0].lot_number || "—"}
                      </strong>
                    </div>

                    {results[0].module_imei && (
                      <div
                        style={{
                          background: "#f8fafc",
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            fontSize: "0.72rem",
                            color: "#64748b",
                            fontWeight: 700,
                          }}
                        >
                          Module IMEI
                        </span>
                        <strong
                          style={{
                            fontSize: "0.85rem",
                            color: "#0369a1",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {results[0].module_imei}
                        </strong>
                      </div>
                    )}

                    {results[0].module_iccid && (
                      <div
                        style={{
                          background: "#f8fafc",
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            fontSize: "0.72rem",
                            color: "#64748b",
                            fontWeight: 700,
                          }}
                        >
                          Module ICCID
                        </span>
                        <strong
                          style={{
                            fontSize: "0.85rem",
                            color: "#0369a1",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {results[0].module_iccid}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── 3. MULTI-METER RESULTS (e.g. Searched by Pallet or Box) ── */}
              {results.length > 1 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {/* Search within results for fast mobile filtering */}
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder={
                        isArabic
                          ? `تصفية سريعة داخل النتائج (${results.length} عداد)...`
                          : `Filter within ${results.length} meters...`
                      }
                      value={filterWithinResults}
                      onChange={(e) => setFilterWithinResults(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1.5px solid #cbd5e1",
                        fontSize: "0.9rem",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* List of Meter Cards */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {displayedResults.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        style={{
                          background: "white",
                          borderRadius: 12,
                          padding: "14px 16px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 10,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                fontSize: "1.08rem",
                                fontWeight: 800,
                                color: "var(--navy)",
                                fontFamily: "JetBrains Mono, monospace",
                              }}
                            >
                              {m.serial_number || "N/A"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(m.serial_number, `sn-${idx}`)
                              }
                              style={{
                                background:
                                  copiedKey === `sn-${idx}`
                                    ? "#dcfce7"
                                    : "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: 6,
                                padding: "2px 6px",
                                cursor: "pointer",
                                fontSize: "0.72rem",
                                color:
                                  copiedKey === `sn-${idx}`
                                    ? "#16a34a"
                                    : "#64748b",
                              }}
                            >
                              {copiedKey === `sn-${idx}` ? (
                                <Check size={12} color="#16a34a" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              fontSize: "0.78rem",
                              color: "#64748b",
                              display: "flex",
                              gap: 12,
                              flexWrap: "wrap",
                            }}
                          >
                            <span>
                              {isArabic ? "سيريال المصنع:" : "Factory SN:"}{" "}
                              <strong>{m.factory_serial_number || "—"}</strong>
                            </span>
                            <span>
                              {isArabic ? "تاريخ:" : "Date:"}{" "}
                              <strong>{m.date_of_manufactory || "—"}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Pallet / Box Pills */}
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}
                          >
                            P: {m.device_pallet_number || "—"}
                          </span>
                          <span
                            style={{
                              background: "#f0fdf4",
                              color: "#15803d",
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}
                          >
                            B: {m.device_box_number || "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
