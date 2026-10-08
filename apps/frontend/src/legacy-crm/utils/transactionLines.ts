// Detail rows of the legacy transaction grids (isin_vb6
// src/utils/transactionLines.js). A row carries its 項次 in line_no, a number
// or, in 圖組建檔, a string.
export type TransactionLine = Record<string, any> & {
  line_no: number | string;
};
export type BlankLine<T extends TransactionLine> = (lineNo: number) => T;

function lineNumberOf(item: TransactionLine | null | undefined): number | null {
  const value = Number(item?.line_no);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function sortByLineNumber<T extends TransactionLine>(items: T[]): T[] {
  return [...items].sort(
    (left, right) =>
      (lineNumberOf(left) ?? Infinity) - (lineNumberOf(right) ?? Infinity),
  );
}

export function nextTransactionLineNumber(
  items: TransactionLine[],
  maximum = 99,
): number | null {
  const occupied = new Set(
    items.map(lineNumberOf).filter((lineNumber) => lineNumber != null),
  );
  for (let lineNumber = 1; lineNumber <= maximum; lineNumber += 1) {
    if (!occupied.has(lineNumber)) return lineNumber;
  }
  return null;
}

export function appendTransactionLine<T extends TransactionLine>(
  items: T[],
  blankFactory: BlankLine<T>,
  maximum = 99,
): T[] {
  const lineNumber = nextTransactionLineNumber(items, maximum);
  if (lineNumber == null) return items;
  return sortByLineNumber([...items, blankFactory(lineNumber)]);
}

export function removeTransactionLine<T extends TransactionLine>(
  items: T[],
  index: number,
  blankFactory: BlankLine<T>,
): T[] {
  if (!Number.isInteger(index) || index < 0 || index >= items.length)
    return items;
  const fallbackLineNumber = lineNumberOf(items[index]) ?? 1;
  const remaining = items.filter((_, rowIndex) => rowIndex !== index);
  return remaining.length ? remaining : [blankFactory(fallbackLineNumber)];
}

export function padTransactionLines<T extends TransactionLine>(
  items: T[],
  minimum: number,
  blankFactory: BlankLine<T>,
  maximum = 99,
): T[] {
  const padded = sortByLineNumber(items);
  while (padded.length < minimum) {
    const lineNumber = nextTransactionLineNumber(padded, maximum);
    if (lineNumber == null) break;
    padded.push(blankFactory(lineNumber));
    padded.sort(
      (left, right) =>
        (lineNumberOf(left) ?? Infinity) - (lineNumberOf(right) ?? Infinity),
    );
  }
  return padded;
}

export function assignMissingLegacySerials<T extends TransactionLine>(
  items: T[],
): T[] {
  const used = new Set(
    items
      .map((item) => String(item.legacy_sn ?? ''))
      .filter((serial) => serial !== ''),
  );

  return items.map((item) => {
    if (String(item.legacy_sn ?? '') !== '') return item;

    const lineNumber = lineNumberOf(item);
    let serial = lineNumber == null ? '' : String(lineNumber);
    if (!serial || used.has(serial)) {
      serial = '';
      for (let candidate = 1; candidate <= 99; candidate += 1) {
        const available = String(candidate);
        if (!used.has(available)) {
          serial = available;
          break;
        }
      }
    }
    if (!serial) throw new Error('無法為交易明細指派唯一舊項次');
    used.add(serial);
    return { ...item, legacy_sn: serial };
  });
}

// Like the legacy grids, typing into the last row opens another blank row
// below it, up to the 99-row limit.
export function ensureTrailingBlankLine<T extends TransactionLine>(
  items: T[],
  hasData: (item: T) => boolean,
  blankFactory: BlankLine<T>,
  maximum = 99,
): T[] {
  if (!items.length || !hasData(items[items.length - 1])) return items;
  return appendTransactionLine(items, blankFactory, maximum);
}

// The legacy grids number their rows by position, so after F3／F4 the lines
// are renumbered and take new serials when saved.
function renumber<T extends TransactionLine>(items: T[]): T[] {
  return items.map((item, index) => ({
    ...item,
    line_no: typeof item.line_no === 'string' ? String(index + 1) : index + 1,
    ...('legacy_sn' in item ? { legacy_sn: '' } : {}),
  }));
}

// F3「插入一筆」: a blank row at the cursor, the rows below moving down.
export function insertTransactionLine<T extends TransactionLine>(
  items: T[],
  index: number,
  blankFactory: BlankLine<T>,
  maximum = 99,
): T[] {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= items.length ||
    items.length >= maximum
  )
    return items;
  return renumber([
    ...items.slice(0, index),
    blankFactory(index + 1),
    ...items.slice(index),
  ]);
}

// F4「刪除此筆」: the row at the cursor goes at once, the rows below moving
// up; the grid keeps at least `minimum` rows.
export function deleteTransactionLine<T extends TransactionLine>(
  items: T[],
  index: number,
  blankFactory: BlankLine<T>,
  minimum = 1,
): T[] {
  if (!Number.isInteger(index) || index < 0 || index >= items.length)
    return items;
  const remaining = renumber(items.filter((_, rowIndex) => rowIndex !== index));
  while (remaining.length < minimum)
    remaining.push(blankFactory(remaining.length + 1));
  return remaining;
}

// F2「複製上一筆」(圖組建檔): the row above, every column, over the row at the cursor.
export function copyPreviousTransactionLine<T extends TransactionLine>(
  items: T[],
  index: number,
): T[] {
  if (!Number.isInteger(index) || index < 1 || index >= items.length)
    return items;
  const { line_no: lineNo } = items[index];
  const serial =
    'legacy_sn' in items[index] ? { legacy_sn: items[index].legacy_sn } : {};
  return items.map((item, rowIndex) =>
    rowIndex === index
      ? { ...items[index - 1], line_no: lineNo, ...serial }
      : item,
  );
}

// 工作登錄 F8「圖組展開」: the cursor row gives way to `lines`, the rows below
// moving down, up to the 99-row limit.
export function replaceTransactionLine<T extends TransactionLine>(
  items: T[],
  index: number,
  lines: T[],
  maximum = 99,
): T[] {
  if (!Number.isInteger(index) || index < 0 || index >= items.length)
    return items;
  return renumber(
    [...items.slice(0, index), ...lines, ...items.slice(index + 1)].slice(
      0,
      maximum,
    ),
  );
}
