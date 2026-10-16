import { LEGACY_PAPERS, type PaperPage } from './legacyPapers';

export type PrintPaperSize = 'b5' | 'a4';
// ISO B5. Keep the same content width and type size on both papers;
// A4's extra height is used by the pagination routines. Legacy tables span
// at most 200 mm; fit that width inside B5's 5 mm side margins.
export const PRINT_CONTENT_SCALE = (176 - 10) / 200;
const PX_MM = 25.4 / 96;
export function printContentHeight(size: PrintPaperSize): number {
  return (LEGACY_PAPERS[size].height - 10) / PRINT_CONTENT_SCALE / PX_MM;
}
export function onPrintPaper(
  pages: PaperPage[],
  size: PrintPaperSize,
): PaperPage[] {
  return pages.map((page) => ({
    ...page,
    paper: size,
    contentScale: PRINT_CONTENT_SCALE,
  }));
}
