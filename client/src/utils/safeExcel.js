/*
 * Checks a spreadsheet the user picked BEFORE it is handed to the Excel parser.
 * A crafted file is the only way to reach the parser's known weaknesses, so we
 * accept only real spreadsheet types and a sane size.
 */
export const MAX_SPREADSHEET_BYTES = 25 * 1024 * 1024; // 25 MB — a full batch file is ~3 MB

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv", ".xlsm"];

export function spreadsheetFileProblem(file, isArabic = false) {
  if (!file) return isArabic ? "ما تم اختيار ملف." : "No file selected.";
  const name = (file.name || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return isArabic
      ? "نوع الملف غير مدعوم — استخدم ملف Excel (.xlsx / .xls) أو CSV."
      : "Unsupported file type — use an Excel (.xlsx / .xls) or CSV file.";
  }
  if (file.size === 0) {
    return isArabic ? "الملف فاضي." : "The file is empty.";
  }
  if (file.size > MAX_SPREADSHEET_BYTES) {
    return isArabic
      ? "حجم الملف أكبر من 25 ميجا."
      : "The file is larger than 25 MB.";
  }
  return "";
}

/** Options for XLSX.read that skip features we never use (formulas, HTML, VBA). */
export const SAFE_READ_OPTIONS = {
  type: "array",
  cellFormula: false,
  cellHTML: false,
  bookVBA: false,
  bookFiles: false,
};
