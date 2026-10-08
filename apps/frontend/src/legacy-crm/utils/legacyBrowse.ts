import { watch, type Ref } from 'vue';
import { legacyGet, queryString } from '../services/legacyApi';

// 頭筆／上筆／下筆／尾筆 and 查詢 for the legacy forms
// (backend legacy-crm/browse, ported from isin_vb6 server/legacyBrowse.mjs).

export type BrowseDirection = 'first' | 'previous' | 'next' | 'last';

export interface QueryResult<Row = Record<string, unknown>> {
  items: Row[];
  truncated: boolean;
}

export async function navigateDocument(
  type: string,
  direction: BrowseDirection,
  from = '',
): Promise<string | null> {
  const params = new URLSearchParams({ direction, from });
  return (
    await legacyGet<{ number: string | null }>(
      `/documents/${type}/navigate?${params}`,
    )
  ).number;
}

// After 刪除 the legacy forms show the record that followed the deleted one,
// or the one before it when it was the last; asked before deleting.
export async function neighbourDocument(
  type: string,
  key: string,
): Promise<string | null> {
  return (
    (await navigateDocument(type, 'next', key)) ??
    (await navigateDocument(type, 'previous', key))
  );
}

export async function queryDocuments(
  type: string,
  { number = '', party = '' } = {},
): Promise<QueryResult> {
  const params = new URLSearchParams();
  if (number.trim()) params.set('number', number.trim());
  if (party.trim()) params.set('party', party.trim());
  return legacyGet<QueryResult>(
    `/documents/${type}/query${queryString(params)}`,
  );
}

export async function nextDocumentNumber(
  type: string,
  date: unknown,
): Promise<string | null> {
  const params = new URLSearchParams({ date: String(date ?? '').trim() });
  return (
    await legacyGet<{ number: string | null }>(
      `/documents/${type}/next-number?${params}`,
    )
  ).number;
}

// While a form is adding a record, fills its number from the date as 新增 does
// on Win7, and again whenever the date changes. A date that is not complete
// leaves the number as it is.
export function useNewDocumentNumber(
  type: string,
  current: Ref<Record<string, unknown>>,
  mode: Ref<string>,
  numberKey: string,
  dateKey: string,
): void {
  let token = 0;
  watch(
    () => [mode.value, current.value?.[dateKey]] as const,
    async ([nowMode, date]) => {
      const asked = ++token;
      if (nowMode !== 'new') return;
      try {
        const number = await nextDocumentNumber(type, date);
        if (number && asked === token && mode.value === 'new')
          current.value[numberKey] = number;
      } catch {
        // The number can still be typed in.
      }
    },
    { immediate: true },
  );
}
