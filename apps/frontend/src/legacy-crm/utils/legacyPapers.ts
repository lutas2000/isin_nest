// The paper each legacy printout is laid out on (isin_vb6 src/utils/legacyPapers.js).
// The legacy 資料列印 window sets the page for each print class in twips (read
// from the program, 2026-10-06; isin_vb6 docs/legacy-ui-spec.md, 單據列印):
// the documents and reports are for 9.06-inch continuous forms, half (5.5 in)
// or full (11 in) high, and the labels for 90 × 38.1 mm stock. The user chose
// these papers on 2026-10-07. styles/legacy-print.css sets the same sizes.
const mm = (twips: number) => (twips / 1440) * 25.4;

export type LegacyPaperName = 'half' | 'full' | 'label';

export const LEGACY_PAPERS: Record<
  LegacyPaperName,
  { width: number; height: number }
> = {
  // 訂貨單, 出貨單, 工作單, 信封, and 請款單 with 慣例設定 紙張大小 半張 (on site).
  half: { width: mm(13040), height: mm(7920) },
  // 估價單, 完工記錄單, 圖組組合表 and the reports.
  full: { width: mm(13040), height: mm(15840) },
  // 名條 and the part labels.
  label: { width: mm(5100), height: mm(2160) },
};

// A printed page as LegacyReportSheet.vue draws it. Units are 1/96 inch
// ("px") from the paper's top-left corner when `unit` is "px", with text y on
// the baseline when `baseline` is set.
export interface PaperText {
  x: number;
  y: number;
  size: number;
  text: string;
  baseline?: boolean;
  align?: 'left' | 'center' | 'right';
  spacing?: number;
  logo?: boolean;
}

// Horizontal rules are {x1, x2, y}; vertical ones {x, y1, y2}.
export interface PaperRule {
  x1?: number;
  x2?: number;
  y?: number;
  x?: number;
  y1?: number;
  y2?: number;
  weight?: number;
}

// A part outline fitted into a box (legacyDocumentPaper.ts fitShape).
export interface PaperShape {
  x: number;
  y: number;
  width: number;
  height: number;
  viewWidth: number;
  viewHeight: number;
  path: string;
}

// A picture the legacy program prints, by name (LegacyReportSheet.vue IMAGES).
export interface PaperImage {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PaperPage {
  number: number;
  kind?: string;
  paper?: LegacyPaperName;
  unit?: 'px';
  group?: { code: string; name: string } | null;
  items: PaperText[];
  rules: PaperRule[];
  shapes?: PaperShape[];
  images?: PaperImage[];
}
