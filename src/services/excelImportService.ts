/**
 * Excel Import Service — PLACEHOLDER
 *
 * This module is a skeleton for the future Excel import system.
 * The actual Excel format will be provided later.
 *
 * Future workflow:
 *   Upload Excel → Validate file → Read Excel → Preview records
 *   → Validate duplicates/errors → Confirm Import → Save to Supabase
 *   → Update production reports → Update dashboard
 *
 * DO NOT implement the parser until the Excel format is provided.
 */

import type { ExcelImportRecord, ExcelImportResult } from '../types';

const NOT_IMPLEMENTED = 'Excel import is not yet implemented. The Excel format will be provided later.';

/**
 * Parse an uploaded Excel file into raw records.
 * @future Implement using SheetJS (xlsx) once the format is known.
 */
export async function parseExcelFile(_file: File): Promise<ExcelImportRecord[]> {
  throw new Error(NOT_IMPLEMENTED);
}

/**
 * Validate parsed records before import.
 * @future Implement validation rules based on the Excel format.
 */
export async function validateImportRecords(
  _records: ExcelImportRecord[]
): Promise<ExcelImportResult> {
  throw new Error(NOT_IMPLEMENTED);
}

/**
 * Import validated records into Supabase.
 * @future Implement bulk insert with duplicate checking.
 */
export async function importRecords(_records: ExcelImportRecord[]): Promise<{ inserted: number; skipped: number }> {
  throw new Error(NOT_IMPLEMENTED);
}

/**
 * Full pipeline: parse → validate → preview (returns result without saving).
 * @future Implement once Excel format is known.
 */
export async function previewImport(_file: File): Promise<ExcelImportResult> {
  throw new Error(NOT_IMPLEMENTED);
}

export const excelImportService = {
  parseExcelFile,
  validateImportRecords,
  importRecords,
  previewImport,
};
