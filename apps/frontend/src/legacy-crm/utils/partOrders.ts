import { legacyGet } from '../services/legacyApi';

// 訂單記錄 (backend legacy-crm/parts/:drawingNo/orders): the order lines of a
// drawing, or of the same 客戶型號, newest order first. The first line is
// 「上次製作」, which 訂單登錄 copies into the blank fields of a line when a
// drawing is chosen (業務 2026-10: only blank fields, so nothing typed is lost).
export type PartOrderLine = {
  order_date: string;
  order_no: string;
  drawing_no: string;
  customer_model: string;
  quantity: number;
  unit: string;
  material: string;
  thickness: string;
  outsource: string;
  source: string;
  post_process: string;
};

export type PartOrderFilter = {
  customerCode?: string;
  customerModel?: string;
  excludeOrderNo?: string;
};

export async function loadPartOrders(
  drawingNo: string,
  {
    customerCode = '',
    customerModel = '',
    excludeOrderNo = '',
  }: PartOrderFilter = {},
): Promise<PartOrderLine[]> {
  const params = new URLSearchParams({
    customer: customerCode,
    model: customerModel,
    exclude: excludeOrderNo,
  });
  const payload = await legacyGet<{ items: PartOrderLine[] }>(
    `/parts/${encodeURIComponent(drawingNo)}/orders?${params}`,
  );
  return payload.items;
}

export const LAST_ORDER_FIELDS = [
  'material',
  'thickness',
  'outsource',
  'unit',
  'post_process',
] as const;

type LastOrderField = (typeof LAST_ORDER_FIELDS)[number];

const isBlank = (value: unknown) => String(value ?? '').trim() === '';

// The fields of a line that are blank before a drawing is chosen; only these
// take the last order's values.
export function blankLastOrderFields(
  line: Record<string, unknown>,
): LastOrderField[] {
  return LAST_ORDER_FIELDS.filter((field) => isBlank(line[field]));
}

export function fillFromLastOrder(
  line: Record<string, unknown>,
  fields: readonly LastOrderField[],
  last: PartOrderLine | undefined,
) {
  if (!last) return false;
  let changed = false;
  for (const field of fields) {
    if (isBlank(last[field])) continue;
    line[field] = last[field];
    changed = true;
  }
  return changed;
}
