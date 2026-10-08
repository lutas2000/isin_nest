import { join, resolve, sep } from 'path';

/**
 * 舊版銷管讀取的 DXF 與 CNC 檔路徑（移植自 isin_vb6 server/drawingShapes.mjs、server/cncFiles.mjs）。
 * 路徑只由圖號（與工件建檔的存放目錄、CNC 檔名）推得，不列目錄、不建索引。
 *
 * 舊版程式寫的是 Windows 路徑（例 \\Server\C\...）；這裡把「舊版根目錄」之下的路徑換成
 * 本機掛載點（root）之下的路徑，根目錄以外、含 . 或 .. 的路徑一律不讀。
 */

/** 慣例設定的 DXF 路徑（現場 \\Server\C\）。 */
export const DEFAULT_DXF_LEGACY_ROOT = '\\\\Server\\C\\';
/** 慣例設定的 CNC 路徑（master.mdb Optiona.Cncpath，\\SERVER\n\）。 */
export const DEFAULT_CNC_LEGACY_ROOT = '\\\\SERVER\\n\\';

const DRAWING_NO = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/;
const FILE_NAME = /^[^\\/:*?"<>|]{1,60}$/;

export interface LegacyFolderSettings {
  /** 本機掛載點；空白表示沒有設定，不讀任何檔案 */
  root: string;
  /** 掛載點對應的舊版 Windows 路徑 */
  legacyRoot: string;
}

const backslashes = (path: unknown) =>
  String(path ?? '')
    .trim()
    .replace(/\//g, '\\');

/** 圖號可用來組檔名：英數開頭、只含英數 . _ -，且不含 ..。 */
export function isSafeDrawingNo(drawingNo: unknown): boolean {
  const name = String(drawingNo ?? '').trim();
  return DRAWING_NO.test(name) && !name.includes('..');
}

/** 確認組出的路徑仍在 root 之下（多一層防護；上面的檢查已排除 . 與 ..）。 */
function insideRoot(root: string, file: string): string | null {
  const base = resolve(root);
  const target = resolve(file);
  return target.startsWith(`${base}${sep}`) ? file : null;
}

/** 舊版根目錄之下的 Windows 路徑換成本機路徑；不在根目錄下或含 . / .. 時回傳 null。 */
export function localPath(
  root: string,
  legacyPath: string,
  legacyRoot: string,
): string | null {
  const base = backslashes(legacyRoot).replace(/\\+$/, '');
  const path = backslashes(legacyPath);
  if (
    !base ||
    path.slice(0, base.length + 1).toLowerCase() !== `${base}\\`.toLowerCase()
  )
    return null;
  const parts = path
    .slice(base.length + 1)
    .split('\\')
    .filter(Boolean);
  if (!parts.length || parts.some((part) => part === '.' || part === '..'))
    return null;
  return insideRoot(root, join(root, ...parts));
}

/**
 * 圖號的 DXF 檔：客戶有自己的 DXF 路徑時為 {DXF 路徑}\{圖號}.DXF（舊版此時不再找共用資料夾），
 * 否則為 {慣例 DXF 路徑}\{首字}\{前三字}\{圖號}.DXF。大小寫兩種副檔名都試。
 */
export function drawingDxfCandidates(
  root: string,
  drawingNo: unknown,
  {
    customerPath = '',
    legacyRoot = DEFAULT_DXF_LEGACY_ROOT,
  }: { customerPath?: string; legacyRoot?: string } = {},
): string[] {
  const name = String(drawingNo ?? '').trim();
  if (!root || !isSafeDrawingNo(name)) return [];
  if (String(customerPath ?? '').trim()) {
    const file = localPath(
      root,
      `${backslashes(customerPath)}\\${name}.DXF`,
      legacyRoot,
    );
    return file ? [file, file.replace(/\.DXF$/, '.dxf')] : [];
  }
  const folder = join(root, name.slice(0, 1), name.slice(0, 3));
  return [join(folder, `${name}.DXF`), join(folder, `${name}.dxf`)]
    .map((file) => insideRoot(root, file))
    .filter((file): file is string => file !== null);
}

export interface PartCncFields {
  directory_path?: string | null;
  cnc1?: string | null;
  cnc2?: string | null;
}

/**
 * 算作圖號 CNC 檔的檔案（舊版順序）：{CNC 路徑}{圖號}.cnc，或工件存放目錄（dcst.DISK）加 CNC 檔一／二。
 * 存放目錄不在舊版 CNC 路徑之下（或空白，舊版相對於工作目錄）時不跟隨。
 */
export function cncFileCandidates(
  drawingNo: unknown,
  part: PartCncFields | null | undefined,
  { root, legacyRoot = DEFAULT_CNC_LEGACY_ROOT }: LegacyFolderSettings,
): string[] {
  const name = String(drawingNo ?? '').trim();
  if (!root || !isSafeDrawingNo(name)) return [];
  const files = [join(root, `${name}.cnc`), join(root, `${name}.CNC`)].filter(
    (file) => insideRoot(root, file),
  );
  const folder = backslashes(part?.directory_path).replace(/\\+$/, '');
  if (folder) {
    for (const key of ['cnc1', 'cnc2'] as const) {
      const file = String(part?.[key] ?? '').trim();
      if (!FILE_NAME.test(file)) continue;
      const local = localPath(root, `${folder}\\${file}`, legacyRoot);
      if (local) files.push(local);
    }
  }
  return files;
}
