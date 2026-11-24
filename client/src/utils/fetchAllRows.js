/*
 * Supabase (PostgREST) returns at most 1,000 rows per request. A plain
 * `.select("*")` on a bigger table silently stops at 1,000 — the page then
 * works on incomplete data without any error.
 *
 * fetchAllRows() pages through the table with .range() until it has
 * everything. Pass a function that builds a fresh query each time (the same
 * select/filters/order), e.g.
 *
 *   const { data, error } = await fetchAllRows(() =>
 *     supabase.from("defective_meters").select("*").order("id", { ascending: false }),
 *   );
 *
 * Use a stable order (by id) so pages don't overlap; duplicates that can
 * appear when rows are inserted during paging are removed by id.
 */
export const SUPABASE_PAGE_SIZE = 1000;
const MAX_ROWS = 500000; // safety stop

export async function fetchAllRows(buildQuery, pageSize = SUPABASE_PAGE_SIZE) {
  const rows = [];
  const seen = new Set();

  for (let from = 0; from < MAX_ROWS; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) return { data: null, error };

    for (const row of data || []) {
      const key = row?.id ?? null;
      if (key !== null) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      rows.push(row);
    }

    if (!data || data.length < pageSize) break;
  }

  return { data: rows, error: null };
}
