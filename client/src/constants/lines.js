/*
 * Production lines. Every line-specific row (production, downtime, defects,
 * kits, shipment batches) carries a `line` column with one of these codes.
 * Rows from before the single-phase line existed are "3P".
 * Change a model name here (e.g. when M11 gets its final name).
 */
export const LINES = {
  "3P": {
    code: "3P",
    ar: "ثري فيز",
    en: "Three-phase",
    model: "MT212",
    productType: "Three Phase", // kit_meters.product_name / shipment_batches.product_type
    defaultProduct: "254100543S - SFIN MT212 OMAN - A01",
    hasFirmwareSync: true, // LOG.csv / Google Drive firmware count
  },
  "1P": {
    code: "1P",
    ar: "سنجل فيز",
    en: "Single-phase",
    model: "M11",
    productType: "Single Phase",
    defaultProduct: "M11",
    hasFirmwareSync: false,
  },
};

export const LINE_CODES = Object.keys(LINES);
export const DEFAULT_LINE = "3P";

export const isLine = (code) => Object.prototype.hasOwnProperty.call(LINES, code);

/** "ثري فيز MT212" / "Three-phase MT212" */
export const lineLabel = (code, isArabic) => {
  const l = LINES[code] || LINES[DEFAULT_LINE];
  return `${isArabic ? l.ar : l.en} ${l.model}`;
};

/** localStorage key per line; the 3P line keeps the old key so existing caches stay valid. */
export const lineKey = (key, line) => (line && line !== DEFAULT_LINE ? `${key}__${line}` : key);

/** Line code for a kit / batch product type ("Single Phase" → 1P, anything else → 3P). */
export const lineForProductType = (type) => (type === LINES["1P"].productType ? "1P" : "3P");
