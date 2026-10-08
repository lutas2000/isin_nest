// 單據紙面（isin_vb6 src/utils/legacyDocumentPaper.js）。第 3 階段只搬工件簡圖用到的
// shapeSize；其餘在第 4 階段搬單據列印時補上。

export interface DrawingShape {
  width: number;
  height: number;
  path: string;
}

// The size above an outline, rounded half up (42.5 → 43 on 2026-10-06).
export const shapeSize = (shape: DrawingShape | null | undefined): string =>
  shape
    ? `${Math.floor(shape.width + 0.5)}x${Math.floor(shape.height + 0.5)}`
    : '';
