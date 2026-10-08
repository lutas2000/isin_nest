// 收款登錄 沖帳 (isin_vb6 src/utils/receiptAllocation.js).
const UNITS = 10000;

type AmountValue = number | string | null | undefined;

export interface AllocationLine {
  sale_no?: string;
  merchandise?: AmountValue;
  tax?: AmountValue;
  discount?: AmountValue;
  receivable?: AmountValue;
  unpaid?: AmountValue;
  offset?: AmountValue;
  reserved?: string;
  [key: string]: unknown;
}

function toUnits(value: unknown): number {
  if (value == null || String(value).trim() === '') return 0;
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * UNITS) : 0;
}

// The legacy form leaves zero amounts blank.
function fromUnits(units: number): number | '' {
  return units ? units / UNITS : '';
}

function hasSale(line: AllocationLine | null | undefined): boolean {
  return String(line?.sale_no ?? '').trim() !== '';
}

// 保留: a sale marked ＊ is neither offset nor counted in the period's totals.
export const RESERVED_MARK = '＊';
export const isReserved = (line: AllocationLine | null | undefined): boolean =>
  String(line?.reserved ?? '').trim() === RESERVED_MARK;

// Mirrors the legacy receipt form (read from the program 2026-10-07):
// - 本期貨款／稅額／折讓 add up the listed sales not marked 保留. A sale
//   nothing has been received for counts its goods, tax and discount; one
//   partly received counts its tax first and the rest of its unpaid amount
//   as goods, without its discount.
// - With diff = (本期實收 + 前期預收) − (貨款 + 稅額 − 折讓 + 前期未收), a positive
//   diff is 本期預收 and a negative one 本期未收.
// - The amount offset, 本期實收 + 前期預收 − 本期預收, is applied to the sales
//   in row order, each taking at most its unpaid amount, skipping 保留.
export function allocateReceipt<T extends AllocationLine>({
  allocations,
  previousAdvance,
  received,
  previousUnpaid,
}: {
  allocations: T[];
  previousAdvance: unknown;
  received: unknown;
  previousUnpaid: unknown;
}): {
  allocations: T[];
  totals: Record<
    | 'current_merchandise'
    | 'current_tax'
    | 'current_discount'
    | 'current_unpaid'
    | 'current_advance',
    number | ''
  >;
} {
  const paidUnits = toUnits(previousAdvance) + toUnits(received);
  let merchandiseUnits = 0;
  let taxUnits = 0;
  let discountUnits = 0;
  for (const line of allocations) {
    if (!hasSale(line) || isReserved(line)) continue;
    const unpaid = Math.max(0, toUnits(line.unpaid));
    const tax = toUnits(line.tax);
    if (unpaid >= toUnits(line.receivable)) {
      merchandiseUnits += toUnits(line.merchandise);
      taxUnits += tax;
      discountUnits += toUnits(line.discount);
    } else {
      const lineTax = Math.min(tax, unpaid);
      taxUnits += lineTax;
      merchandiseUnits += unpaid - lineTax;
    }
  }
  const diffUnits =
    paidUnits -
    (merchandiseUnits + taxUnits - discountUnits + toUnits(previousUnpaid));
  const advanceUnits = Math.max(0, diffUnits);
  let availableUnits = paidUnits - advanceUnits;

  const lines = allocations.map((line) => {
    if (!hasSale(line)) return line;
    if (isReserved(line)) return { ...line, offset: '' };
    const offsetUnits = Math.min(
      Math.max(0, toUnits(line.unpaid)),
      Math.max(0, availableUnits),
    );
    availableUnits -= offsetUnits;
    return { ...line, offset: fromUnits(offsetUnits) };
  });

  return {
    allocations: lines,
    totals: {
      current_merchandise: fromUnits(merchandiseUnits),
      current_tax: fromUnits(taxUnits),
      current_discount: fromUnits(discountUnits),
      current_unpaid: fromUnits(Math.max(0, -diffUnits)),
      current_advance: fromUnits(advanceUnits),
    },
  };
}
