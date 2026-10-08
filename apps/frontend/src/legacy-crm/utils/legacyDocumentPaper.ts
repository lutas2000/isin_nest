import type { LegacyPaperName, PaperPage, PaperShape } from './legacyPapers';

// Printouts of single documents (isin_vb6 src/utils/legacyDocumentPaper.js,
// docs/legacy-ui-spec.md, 單據列印): 訂貨單, the pre-printed 出貨單, 估價單,
// 圖組組合表, 工作單 and the part labels.
//
// Units are those of the legacy program's printed output: 1/96 inch ("px")
// from the paper's top-left corner, read from the XPS files the legacy
// program printed for synthetic test documents on 2026-10-06. Text y values
// are baselines, as in XPS. The legacy program prints these at the same
// place whatever paper is chosen in its 設定列印格式 dialog; each page names
// the legacy paper it was designed for (legacyPapers.ts).

export interface DrawingShape {
  width: number;
  height: number;
  path: string;
}

type Row = Record<string, any>;

// What a document printout is built from (documentPrinting.ts).
export interface DocumentPrintContext {
  customer: Row | null;
  shapes: Record<string, DrawingShape | null | undefined>;
  profile: { name: string; address: string; phone: string; fax: string };
}

export const PX_MM = 25.4 / 96;

const ORDER_FONT = 16;
const SALE_FONT = 14.72;
const ORDER_ROWS = 10;
const SALE_ROWS = 7;

const text = (value: unknown) => (value == null ? '' : String(value).trim());
const isBlank = (value: unknown) =>
  value == null || String(value).trim() === '';
const halfWidth = (char: string) =>
  char.charCodeAt(0) < 0x2000 ||
  (char.charCodeAt(0) >= 0xff61 && char.charCodeAt(0) <= 0xff9f);

// Width in half-width cells: ASCII takes one, Chinese two (細明體 metrics).
export const cells = (value: unknown): number =>
  [...String(value ?? '')].reduce(
    (width, char) => width + (halfWidth(char) ? 1 : 2),
    0,
  );
export const textWidth = (value: unknown, size = ORDER_FONT): number =>
  (cells(value) * size) / 2;
const padStart = (value: string, width: number) =>
  ' '.repeat(Math.max(0, width - cells(value))) + value;

// Whole numbers rounded half to even, as the legacy unit prices print
// (12.5 → 12, 1234.5 → 1234 on 2026-10-06).
function roundHalfEven(number: number) {
  const floor = Math.floor(number);
  if (Math.abs(number - floor - 0.5) < 1e-9)
    return floor % 2 === 0 ? floor : floor + 1;
  return Math.round(number);
}
const grouping = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
export function wholeNumber(value: unknown, { group = true } = {}): string {
  if (isBlank(value)) return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return text(value);
  const rounded = roundHalfEven(number);
  return group ? grouping.format(rounded) : String(rounded);
}
const plainQuantity = (value: unknown) =>
  isBlank(value) ? '' : String(Number(value));

// Splits text into pieces of at most `width` half-width cells, as the legacy
// sales and quote forms wrap long models onto the next line.
export function wrapText(value: unknown, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  let used = 0;
  for (const char of text(value)) {
    const units = halfWidth(char) ? 1 : 2;
    if (used + units > width && line) {
      lines.push(line);
      line = '';
      used = 0;
    }
    line += char;
    used += units;
  }
  if (line) lines.push(line);
  return lines;
}

// Fits a drawing into a box centred on (cx, cy): "contain" keeps it inside
// both sides, "width" always fills the width as the labels do.
export function fitShape(
  shape: DrawingShape | null | undefined,
  {
    cx,
    cy,
    width,
    height,
    fit = 'contain',
  }: {
    cx: number;
    cy: number;
    width: number;
    height: number;
    fit?: 'contain' | 'width';
  },
): PaperShape | null {
  if (!shape || !(shape.width > 0 || shape.height > 0)) return null;
  const scale =
    fit === 'width' || !(shape.height > 0)
      ? width / (shape.width || shape.height)
      : Math.min(
          shape.width > 0 ? width / shape.width : Infinity,
          height / shape.height,
        );
  const w = Math.max(shape.width * scale, 0.5);
  const h = Math.max(shape.height * scale, 0.5);
  return {
    x: cx - w / 2,
    y: cy - h / 2,
    width: w,
    height: h,
    viewWidth: shape.width || 1e-6,
    viewHeight: shape.height || 1e-6,
    path: shape.path,
  };
}

// The size above an outline, rounded half up (42.5 → 43 on 2026-10-06).
export const shapeSize = (shape: DrawingShape | null | undefined): string =>
  shape
    ? `${Math.floor(shape.width + 0.5)}x${Math.floor(shape.height + 0.5)}`
    : '';

const filledLines = (items: Row[] | null | undefined): Row[] =>
  (items ?? []).filter((item) =>
    [
      'drawing_no',
      'customer_model',
      'material',
      'thickness',
      'unit',
      'quantity',
    ].some((key) => !isBlank(item[key])),
  );

const chunks = <T>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size)
    result.push(items.slice(index, index + size));
  return result.length ? result : [[]];
};

type DocumentPage = PaperPage & { shapes: PaperShape[] };

function newPage(
  number: number,
  kind: string,
  paper: LegacyPaperName,
): DocumentPage {
  return { number, kind, paper, unit: 'px', items: [], rules: [], shapes: [] };
}

const writer =
  (page: PaperPage, defaultSize: number) =>
  (
    x: number,
    y: number,
    value: unknown,
    options: { size?: number; align?: 'left' | 'center' | 'right' } = {},
  ) => {
    const content = String(value ?? '');
    if (content.trim() === '') return;
    page.items.push({
      x,
      y,
      baseline: true,
      size: options.size ?? defaultSize,
      text: content,
      ...(options.align ? { align: options.align } : {}),
    });
  };

// Writes characters one by one with a fixed advance, as the legacy titles
// are spaced.
function spaced(
  page: PaperPage,
  value: unknown,
  {
    x,
    y,
    size,
    advance,
  }: { x: number; y: number; size: number; advance: number },
) {
  [...text(value)].forEach((char, index) => {
    if (char.trim())
      page.items.push({
        x: x + index * advance,
        y,
        baseline: true,
        size,
        text: char,
      });
  });
}

const hline = (page: PaperPage, x1: number, x2: number, y: number) =>
  page.rules.push({ x1, x2, y });
const vline = (page: PaperPage, x: number, y1: number, y2: number) =>
  page.rules.push({ x, y1, y2 });

// 訂貨單: a ruled box with the customer block, ten lines a page and the
// sign-off row beneath. 「<以下空白>」 follows the last line when the page has
// room.
export function orderDocumentPages(
  order: Row,
  ctx: DocumentPrintContext,
): PaperPage[] {
  const lines = filledLines(order.items as Row[]);
  const groups = chunks(lines, ORDER_ROWS);
  const customer = ctx.customer ?? {};
  const name = text(customer.full_name) || text(order.customer_name);
  return groups.map((group, pageIndex) => {
    const page = newPage(pageIndex + 1, 'document', 'half');
    const write = writer(page, ORDER_FONT);
    spaced(page, ctx.profile.name, {
      x: 224,
      y: 21.76,
      size: 24,
      advance: 26.4,
    });
    spaced(page, '訂貨單', { x: 313.6, y: 52.48, size: 24, advance: 55.2 });

    for (const y of [64, 145.92, 166.4, 371.2]) hline(page, 6.4, 716.8, y);
    vline(page, 6.4, 64, 371.2);
    vline(page, 716.8, 64, 371.2);
    for (const x of [51.2, 147.2, 326.4, 409.6, 454.4, 531.2, 576, 620.8])
      vline(page, x, 145.92, 371.2);

    write(
      12.8,
      80.64,
      `公司名稱：${name}${isBlank(order.customer_code) ? '' : `    [${text(order.customer_code)}]`}`,
    );
    write(12.8, 99.84, `交貨日期：${text(order.delivery_date)}`);
    write(12.8, 119.04, `送貨方式：${text(order.delivery_method)}`);
    write(12.8, 138.24, `備    註：${text(order.note)}`);
    write(537.62, 80.64, `單據編號：${text(order.order_no)}`);
    write(537.62, 99.84, `訂單日期：${text(order.order_date)}`);
    write(537.62, 119.04, `付款方式：${text(order.payment_method)}`);
    write(537.62, 138.24, `頁    次：${pageIndex + 1}/${groups.length}`);
    for (const [label, x] of [
      ['項次', 12.8],
      ['電腦圖號', 67.2],
      ['客 戶 型 號', 192.81],
      ['材  料', 344.01],
      ['厚度', 416.02],
      ['數  量', 468.82],
      ['代料', 537.62],
      ['圖源', 582.42],
      ['後 加 工', 636.82],
    ] as const) {
      write(x, 161.28, label);
    }

    group.forEach((item, row) => {
      const y = 181.76 + row * 20.48;
      write(12.8, y, padStart(String(pageIndex * ORDER_ROWS + row + 1), 3));
      write(57.6, y, text(item.drawing_no));
      write(153.61, y, text(item.customer_model));
      write(332.81, y, text(item.material));
      write(416.02, y, text(item.thickness));
      if (!isBlank(item.quantity))
        write(
          460.82,
          y,
          `${padStart(plainQuantity(item.quantity), 6)}${text(item.unit)}`,
        );
      write(537.62, y, text(item.outsource));
      write(582.42, y, text(item.source));
      write(627.22, y, text(item.post_process));
    });
    if (pageIndex === groups.length - 1 && group.length < ORDER_ROWS)
      write(57.6, 181.76 + group.length * 20.48, '<以下空白>');

    write(12.8, 390.4, '覆核：');
    write(268.81, 390.4, '製圖：');
    write(524.82, 390.4, `業務：${text(order.actor_name)}`);
    return page;
  });
}

interface SaleRow {
  item?: Row;
  number?: number;
  model: string;
}

// 出貨單 on the pre-printed form (慣例設定 出貨單套表): data only. A page has
// seven printed lines; a customer model longer than 18 cells continues on
// the next line. The totals print on the last page, and each part's outline
// along the bottom with its size above it.
export function saleDocumentPages(
  sale: Row,
  ctx: DocumentPrintContext,
): PaperPage[] {
  const customer = ctx.customer ?? {};
  const name = text(customer.full_name) || text(sale.customer_name);
  const rows: SaleRow[] = [];
  filledLines(sale.items as Row[]).forEach((item, index) => {
    const models = wrapText(item.customer_model, 18);
    rows.push({ item, number: index + 1, model: models[0] ?? '' });
    for (const model of models.slice(1)) rows.push({ model });
  });
  // The lines of one item stay on one page.
  const groups: SaleRow[][] = [];
  let current: SaleRow[] = [];
  for (let index = 0; index < rows.length; ) {
    let end = index + 1;
    while (end < rows.length && !rows[end].item) end += 1;
    const block = rows.slice(index, end);
    if (current.length + block.length > SALE_ROWS && current.length) {
      groups.push(current);
      current = [];
    }
    current.push(...block);
    index = end;
  }
  groups.push(current);

  const rowY = (row: number) => 171.84 + row * 15.36;
  const totalsX = 641.3;
  return groups.map((group, pageIndex) => {
    const page = newPage(pageIndex + 1, 'document', 'half');
    const write = writer(page, SALE_FONT);
    write(
      97.6,
      79.68,
      `${name}${isBlank(sale.customer_code) ? '' : `    [${text(sale.customer_code)}]`}`,
    );
    write(570.87, 79.68, text(sale.sale_date));
    write(705.56, 79.68, `${pageIndex + 1}/${groups.length}`);
    write(97.6, 96.32, text(customer.tax_id));
    write(334.01, 96.32, text(customer.phone1));
    write(570.87, 96.32, text(sale.sale_no));
    write(97.6, 112.96, text(sale.shipping_address));
    write(570.87, 112.96, text(sale.linked_order_no));

    let slot = 0;
    group.forEach((row, index) => {
      const y = rowY(index);
      write(148.48, y, row.model);
      if (!row.item) return;
      const item = row.item;
      write(16.64, y, padStart(String(row.number), 4));
      write(65.22, y, text(item.drawing_no));
      write(305.25, y, text(item.material));
      write(401.23, y, text(item.thickness));
      write(449.22, y, text(item.outsource));
      if (!isBlank(item.quantity))
        write(
          497.36,
          y,
          `${padStart(plainQuantity(item.quantity), 5)}${text(item.unit)}`,
        );
      write(
        561.25,
        y,
        padStart(wholeNumber(item.unit_price, { group: false }), 8),
      );
      write(
        totalsX,
        y,
        padStart(wholeNumber(item.line_total ?? item.amount), 12),
      );

      const shape = ctx.shapes?.[text(item.drawing_no)];
      const cx = 61.2 + slot * 101.76;
      const placed = fitShape(shape, {
        cx,
        cy: 393.6,
        width: 96.64,
        height: 66.88,
      });
      if (placed) {
        page.shapes.push(placed);
        const size = shapeSize(shape);
        write(cx + 9.52 - (cells(size) * SALE_FONT) / 4, 353.6, size);
      }
      slot += 1;
    });
    if (pageIndex === groups.length - 1) {
      if (group.length < SALE_ROWS)
        write(65.28, rowY(group.length), '以下空白');
      const amount = (value: unknown) =>
        Number(value) ? padStart(wholeNumber(value), 12) : '';
      write(totalsX, rowY(8), amount(sale.amount));
      write(totalsX, rowY(9), amount(sale.tax_amount));
      write(totalsX, rowY(10), amount(sale.total_amount));
    }
    return page;
  });
}

// 列印標籤(L): one label per line on 90 × 38.1 mm stock, with the part's
// outline (慣例設定 標籤列印簡圖). Order labels show the quantity as typed;
// sales labels use two decimals.
export function partLabelPages(
  document: Row,
  ctx: DocumentPrintContext,
  { quantityDecimals = 0 } = {},
): PaperPage[] {
  return filledLines(document.items as Row[]).map((item, index) => {
    const page = newPage(index + 1, 'part-label', 'label');
    const write = writer(page, ORDER_FONT);
    const quantity = isBlank(item.quantity)
      ? ''
      : quantityDecimals
        ? Number(item.quantity).toFixed(quantityDecimals)
        : plainQuantity(item.quantity);
    write(6.4, 23.04, `圖號：${text(item.drawing_no)}`);
    write(6.4, 43.52, `型號：${text(item.customer_model)}`);
    write(6.4, 64, `材質：${text(item.material)}`);
    write(6.4, 84.48, `厚度：${text(item.thickness)}`);
    write(6.4, 104.96, `數量：${quantity}${text(item.unit)}`);
    const shape = ctx.shapes?.[text(item.drawing_no)];
    const placed = fitShape(shape, {
      cx: 249.6,
      cy: 67.92,
      width: 97.28,
      height: 67.68,
      fit: 'width',
    });
    if (placed) {
      page.shapes.push(placed);
      write(249.6, 28.16, shapeSize(shape), { align: 'center' });
    }
    return page;
  });
}

export const drawingNumbers = (document: Row): string[] => [
  ...new Set(
    filledLines(document.items as Row[])
      .map((item) => text(item.drawing_no))
      .filter(Boolean),
  ),
];

// The legacy print routines' own commands, read from the program by running
// them (2026-10-06): positions are in tenths of a 9.6 pt 細明體 half-width
// cell across (0.64 px) and tenths of its line height down (1.28 px), and
// most routines move every y down by 列印高度調整 (registry Mine/syslpty,
// 2 on site).
// Text y is the top of the line; 細明體 sits its baseline 0.8 em below.
// Checked against the 訂貨單 XPS: rules x 10…1120 → 6.4…716.8 px, the first
// line y 130 → baseline 181.76 px.
const LEGACY_TOP = 2;
const unitX = (x: number) => x * 0.64;

function legacyCommands(page: PaperPage, { top = LEGACY_TOP } = {}) {
  const unitY = (y: number) => (y + top) * 1.28;
  let size = 16;
  const put = (x: number, y: number, value: unknown) => {
    if (String(value ?? '').trim())
      page.items.push({
        x,
        y: unitY(y) + size * 0.8,
        baseline: true,
        size,
        text: String(value),
      });
  };
  return {
    // 'F': the font size in points.
    font(points: number) {
      size = (points * 4) / 3;
    },
    // 'T': text from (x, y).
    text(x: number, y: number, value: unknown) {
      put(unitX(x), y, value);
    },
    // 'C': text centred between x1 and x2.
    centre(x1: number, x2: number, y: number, value: string) {
      put((unitX(x1) + unitX(x2)) / 2 - textWidth(value, size) / 2, y, value);
    },
    // 'D': characters spread so the first starts at x1 and the last ends at x2.
    spread(x1: number, x2: number, y: number, value: unknown) {
      const chars = [...text(value)];
      const widths = chars.map((char) => textWidth(char, size));
      const total = widths.reduce((sum, width) => sum + width, 0);
      const gap =
        chars.length > 1 && total < unitX(x2) - unitX(x1)
          ? (unitX(x2) - unitX(x1) - total) / (chars.length - 1)
          : 0;
      let x = unitX(x1);
      chars.forEach((char, index) => {
        put(x, y, char);
        x += widths[index] + gap;
      });
    },
    // 'L': a horizontal or vertical rule.
    line(x1: number, y1: number, x2: number, y2: number) {
      if (y1 === y2) hline(page, unitX(x1), unitX(x2), unitY(y1));
      else vline(page, unitX(x1), unitY(y1), unitY(y2));
    },
    size: () => size,
    y: unitY,
  };
}

// The legacy MyNumber class (0x4acc30): zero prints nothing; otherwise the
// number, with `decimals` places (half away from zero) or cut to a whole
// number, right-aligned in `width` and cut to it from the left.
function legacyNumber(value: unknown, width: number, decimals: number) {
  const number = Math.round((Number(value) || 0) * 10000) / 10000;
  if (number === 0) return '';
  const body = decimals
    ? (
        (Math.sign(number) *
          Math.floor(Math.abs(number) * 10 ** decimals + 0.5)) /
        10 ** decimals
      ).toFixed(decimals)
    : String(Math.floor(number));
  return (' '.repeat(width) + body).slice(-width);
}

// Splits once: the first line takes up to `width` cells without breaking a
// character, the rest goes whole onto the next line.
function splitOnce(value: unknown, width: number): [string, string] {
  const chars = [...text(value)];
  let used = 0;
  let index = 0;
  while (
    index < chars.length &&
    used + (halfWidth(chars[index]) ? 1 : 2) <= width
  ) {
    used += halfWidth(chars[index]) ? 1 : 2;
    index += 1;
  }
  return [chars.slice(0, index).join(''), chars.slice(index).join('')];
}

// 工作單 (工作登錄 列印 P), from the legacy routine at 0x507260. Seven printed
// lines a page under the ruled table; 後加工 longer than 26 cells continues
// on the next line. The boxes along the bottom hold the part outline of the
// line printed in the same position (1–7).
const WORK_ROWS = 7;
const WORK_COLUMNS = [30, 100, 260, 420, 500, 580, 680, 780, 1130];

interface WorkLine {
  item?: Row;
  number?: number;
  post?: string;
  blank?: boolean;
}

export function workDocumentPages(
  work: Row,
  ctx: DocumentPrintContext,
): PaperPage[] {
  const items = ((work.items ?? []) as Row[]).filter((item) =>
    [
      'drawing_no',
      'material',
      'thickness',
      'outsource',
      'order_quantity',
      'completed_quantity',
      'post_process',
    ].some((key) => !isBlank(item[key])),
  );
  const lines: WorkLine[] = [];
  items.forEach((item, index) => {
    const [first, rest] = splitOnce(item.post_process, 26);
    lines.push({ item, number: index + 1, post: first });
    if (rest) lines.push({ post: rest });
  });
  if (lines.length % WORK_ROWS) lines.push({ blank: true });
  const pages = chunks(lines, WORK_ROWS);
  const code = text(work.customer_code);

  return pages.map((group, pageIndex) => {
    const page = newPage(pageIndex + 1, 'document', 'half');
    const print = legacyCommands(page);
    print.font(18);
    print.spread(340, 790, 0, ctx.profile.name);
    print.spread(490, 640, 24, '工作單');
    print.font(12);
    for (const y of [48, 80, 96, 208]) print.line(30, y, 1130, y);
    print.text(40, 50, `客戶名稱：${text(work.customer_name)}      [${code}]`);
    print.text(
      790,
      50,
      `工作編號：${text(work.work_no)}  ${pageIndex + 1}/${pages.length}`,
    );
    print.text(40, 66, `訂單編號：${text(work.order_no)}`);
    print.text(790, 66, `日    期：${text(work.transfer_date)}`);
    [
      '項次',
      '電腦圖號',
      '材  料',
      '厚度',
      '代料',
      '訂單數',
      '完成數',
      '後      加      工',
    ].forEach((label, index) => {
      print.centre(WORK_COLUMNS[index], WORK_COLUMNS[index + 1], 82, label);
    });
    print.line(30, 48, 30, 208);
    print.line(1130, 48, 1130, 208);
    for (const x of WORK_COLUMNS.slice(1, -1)) print.line(x, 80, x, 208);

    group.forEach((line, row) => {
      const y = 98 + row * 16;
      if (line.blank) {
        print.text(110, y, '<以下空白>');
        return;
      }
      print.text(790, y, line.post);
      const item = line.item;
      if (!item) return;
      print.text(40, y, padStart(String(line.number), 3));
      print.text(110, y, text(item.drawing_no));
      print.text(270, y, text(item.material));
      print.text(430, y, text(item.thickness));
      print.text(510, y, text(item.outsource));
      print.text(590, y, legacyNumber(item.order_quantity, 6, 0));
      print.text(690, y, legacyNumber(item.completed_quantity, 6, 0));

      // 'J': the outline, in the box of this line's position.
      const shape = code ? ctx.shapes?.[text(item.drawing_no)] : null;
      const left = unitX(row * 157 + 30);
      const width = unitX(157);
      const cx = left + width / 2;
      const placed = fitShape(shape, {
        cx,
        cy: print.y(230) + 27.5 * 1.28,
        width: width - 5.12,
        height: 66.88,
      });
      if (placed) {
        page.shapes.push(placed);
        const size = shapeSize(shape);
        page.items.push({
          x: cx + 9.52 - textWidth(size, print.size()) / 2,
          y: print.y(215) + print.size() * 0.8,
          baseline: true,
          size: print.size(),
          text: size,
        });
      }
    });

    print.line(30, 210, 1129, 210);
    for (let box = 0; box < WORK_ROWS; box += 1) {
      const x = 30 + box * 157;
      print.line(x, 225, x + 30, 225);
      print.line(x, 210, x, 295);
      print.line(x + 30, 210, x + 30, 225);
      print.centre(x, x + 30, 212, String(box + 1));
    }
    print.line(1129, 210, 1129, 295);
    print.line(30, 295, 1129, 295);
    return page;
  });
}

// 估價單 (報價登錄 列印 P), from the legacy routine at 0x5b3180 (class
// SetQuote). It prints one page of 30 lines: lines past the 30th are not
// printed. 客戶型號 wraps every 15 cells; 摘要 wraps once after 15 cells and
// keeps the rest whole on its second line. The quantity, price and amount
// columns hold the form's grid text, right-aligned in 10 with two decimals.
const QUOTE_LINES = 30;
const QUOTE_COLUMNS = [40, 110, 310, 450, 530, 730, 870, 1010, 1155];

interface QuoteLine {
  item?: Row;
  number?: number;
  model: string;
  summary: string;
}

export function quoteDocumentPages(
  quote: Row,
  ctx: DocumentPrintContext,
): PaperPage[] {
  const customer = ctx.customer ?? {};
  const profile = ctx.profile;
  const items = ((quote.items ?? []) as Row[]).filter((item) =>
    [
      'customer_model',
      'material',
      'thickness',
      'summary',
      'quantity',
      'unit_price',
    ].some((key) => !isBlank(item[key])),
  );
  const lines: QuoteLine[] = [];
  items.forEach((item, index) => {
    const models = wrapText(item.customer_model, 15);
    const [summary, rest] = splitOnce(item.summary, 15);
    const count = Math.max(models.length, rest ? 2 : 1);
    for (let line = 0; line < count; line += 1) {
      lines.push(
        line === 0
          ? { item, number: index + 1, model: models[0] ?? '', summary }
          : { model: models[line] ?? '', summary: line === 1 ? rest : '' },
      );
    }
  });

  const page = newPage(1, 'document', 'full');
  const print = legacyCommands(page);
  print.font(18);
  print.spread(380, 870, 0, profile.name);
  print.font(12);
  print.spread(380, 870, 20, profile.address);
  print.spread(
    380,
    870,
    34,
    `TEL:${text(profile.phone)}    FAX:${text(profile.fax)}`,
  );
  print.font(18);
  print.spread(500, 750, 48, '估價單');
  print.font(12);
  for (const y of [69, 117, 133, 613, 635]) print.line(40, y, 1155, y);
  print.text(
    50,
    74,
    `客戶名稱 ：${text(customer.full_name) || text(quote.customer_name)}    [${text(quote.customer_code)}]`,
  );
  print.text(880, 74, `報價編號：${text(quote.quote_no)}`);
  print.text(50, 88, `ATTENTION：${text(quote.attention)}`);
  print.text(880, 88, `日    期：${text(quote.quote_date)}`);
  print.text(50, 102, `聯絡電話 ：${text(customer.phone1)}`);
  print.text(460, 102, `傳真號碼：${text(customer.fax)}`);
  print.text(880, 102, `經 手 人：${text(quote.actor_name)}`);
  [
    '項次',
    '客 戶 型 號',
    '材  質',
    '厚度',
    '摘       要',
    '數  量',
    '單  價',
    '金  額',
  ].forEach((label, index) => {
    print.centre(QUOTE_COLUMNS[index], QUOTE_COLUMNS[index + 1], 119, label);
  });
  print.line(40, 69, 40, 635);
  print.line(1155, 69, 1155, 635);
  for (const x of [110, 310, 450, 530, 730]) print.line(x, 117, x, 613);
  for (const x of [870, 1010]) print.line(x, 117, x, 635);

  lines.slice(0, QUOTE_LINES).forEach((line, row) => {
    const y = 136 + row * 16;
    print.text(120, y, line.model);
    print.text(540, y, line.summary);
    const item = line.item;
    if (!item) return;
    print.text(50, y, padStart(String(line.number), 3));
    print.text(320, y, text(item.material));
    print.text(460, y, text(item.thickness));
    print.text(740, y, legacyNumber(item.quantity, 10, 2));
    print.text(880, y, legacyNumber(item.unit_price, 10, 2));
    print.text(1020, y, legacyNumber(item.line_total ?? item.amount, 10, 2));
  });
  print.centre(870, 1010, 616, '合  計');
  print.text(1020, 616, legacyNumber(quote.total ?? quote.amount, 10, 2));
  print.text(50, 656, '備註：');
  ((quote.notes ?? []) as Row[]).forEach((note, index) => {
    const position =
      Number(note.line_no) > 0 ? Number(note.line_no) - 1 : index;
    print.text(120, 672 + position * 16, text(note.note));
  });
  return [page];
}

// 圖組組合表 (圖組建檔 列印 P), from the legacy routine at 0x5b1860 (class
// SetAudit). It does not use 列印高度調整. The title block repeats on every
// page; each drawing takes one line with a rule under it, and a line whose
// rule falls below 772 (the 230 × 279.4 mm page) ends the page. Lines
// without a drawing number are skipped.
const GROUP_BOTTOM = 772;

export function groupDocumentPages(group: Row): PaperPage[] {
  const items = ((group.items ?? []) as Row[]).filter((item) =>
    text(item.drawing_no),
  );
  const pages: PaperPage[] = [];
  let print!: ReturnType<typeof legacyCommands>;
  let y = 0;
  const start = () => {
    const page = newPage(pages.length + 1, 'document', 'full');
    pages.push(page);
    print = legacyCommands(page, { top: 0 });
    print.font(15);
    print.centre(30, 1150, 36, '圖組組合表');
    print.font(12);
    print.line(30, 55, 1150, 55);
    print.text(30, 58, `電腦編號：${text(group.group_no)}`);
    print.text(580, 58, `客戶圖號：${text(group.customer_drawing_no)}`);
    print.text(
      30,
      73,
      `客    戶：${text(group.customer_code)} ${text(group.customer_name)}`,
    );
    print.text(580, 73, `備    註：${text(group.notes)}`);
    print.line(30, 88, 1150, 88);
    for (const [x, label] of [
      [30, '電腦圖號'],
      [180, '客戶型號'],
      [580, '材質'],
      [730, '厚度'],
      [830, '      數量'],
      [980, '雷射工件'],
    ] as const) {
      print.text(x, 91, label);
    }
    print.line(30, 106, 1150, 106);
    y = 109;
  };
  start();
  items.forEach((item, index) => {
    print.text(30, y, text(item.drawing_no));
    print.text(180, y, text(item.customer_drawing_no));
    print.text(580, y, text(item.material));
    print.text(730, y, text(item.thickness));
    print.text(830, y, legacyNumber(item.quantity, 10, 2));
    print.text(980, y, text(item.is_laser));
    print.line(30, y + 15, 1150, y + 15);
    if (y + 15 > GROUP_BOTTOM && index < items.length - 1) start();
    else y += 18;
  });
  return pages;
}
