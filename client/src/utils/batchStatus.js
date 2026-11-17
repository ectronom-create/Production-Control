import { toLocalDateStr } from "./date";

// The three stages a shipment batch goes through, in order.
export const BATCH_STAGES = [
  {
    key: "DEFINED",
    ar: "تم تحديد الباتش",
    en: "Batch defined",
    dateField: "defined_date",
    color: "#0284c7",
    bg: "#e0f2fe",
    icon: "📋",
  },
  {
    key: "FAT",
    ar: "قيد الفحص FAT",
    en: "Under FAT inspection",
    dateField: "fat_date",
    color: "#d97706",
    bg: "#fef3c7",
    icon: "🔍",
  },
  {
    key: "DELIVERED",
    ar: "تم التسليم لنماء",
    en: "Delivered to Nama",
    dateField: "delivered_date",
    color: "#16a34a",
    bg: "#dcfce7",
    icon: "✅",
  },
];

export function getBatchStage(batch) {
  return BATCH_STAGES.find((s) => s.key === batch?.status) || BATCH_STAGES[0];
}

// Definition date = the date the batch was entered in the system unless edited
export function getBatchDefinedDate(batch) {
  if (!batch) return "";
  if (batch.defined_date) return batch.defined_date;
  if (batch.shipment_date) return batch.shipment_date;
  return batch.created_at ? toLocalDateStr(batch.created_at) : "";
}

export function getBatchStageDate(batch, stageKey) {
  if (stageKey === "DEFINED") return getBatchDefinedDate(batch);
  const stage = BATCH_STAGES.find((s) => s.key === stageKey);
  return (stage && batch?.[stage.dateField]) || "";
}
