import {
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LegacyDb } from '../common/legacy-db';
import { LegacyValidationError } from '../common/legacy-validation.error';
import { DrawingShape, dxfToShape } from './dxf-shape';
import {
  LegacyFileService,
  LegacyFileTimeoutError,
} from './legacy-file.service';
import {
  cncFileCandidates,
  DEFAULT_CNC_LEGACY_ROOT,
  DEFAULT_DXF_LEGACY_ROOT,
  drawingDxfCandidates,
  LegacyFolderSettings,
  PartCncFields,
} from './legacy-paths';

/**
 * 舊版圖檔：單據列印、標籤用的工件外形（DXF），與工作登錄的 CNC 檔檢查。
 *
 * 環境變數（取代 isin_vb6 的 ISIN_*）：
 * - LEGACY_DXF_PATH：慣例設定 DXF 資料夾的本機掛載點；未設定時不印外形。
 * - LEGACY_DXF_LEGACY_ROOT：該資料夾在舊版的路徑，預設 \\Server\C\（客戶 DXF 路徑須在其下才讀）。
 * - LEGACY_CNC_PATH：舊版 CNC 路徑的本機掛載點；未設定時不檢查 CNC 檔。
 * - LEGACY_CNC_LEGACY_ROOT：該資料夾在舊版的路徑，預設 \\SERVER\n\（工件存放目錄須在其下才讀）。
 */
export interface LegacyDrawingSettings {
  dxf: LegacyFolderSettings;
  cnc: LegacyFolderSettings;
}

export const LEGACY_DRAWING_SETTINGS = Symbol('LEGACY_DRAWING_SETTINGS');

export function drawingSettingsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): LegacyDrawingSettings {
  const text = (name: string) => String(env[name] ?? '').trim();
  return {
    dxf: {
      root: text('LEGACY_DXF_PATH'),
      legacyRoot: text('LEGACY_DXF_LEGACY_ROOT') || DEFAULT_DXF_LEGACY_ROOT,
    },
    cnc: {
      root: text('LEGACY_CNC_PATH'),
      legacyRoot: text('LEGACY_CNC_LEGACY_ROOT') || DEFAULT_CNC_LEGACY_ROOT,
    },
  };
}

const MAX_DXF_BYTES = 20 * 1024 * 1024;
const MAX_NUMBERS = 99;
export const DXF_TIMEOUT_MESSAGE = '圖檔伺服器無回應';

/** CNC 檔狀態：Y 有檔、'' 沒有檔、unknown 檔案伺服器逾時無法確認。 */
export type CncFileState = 'Y' | '' | 'unknown';

export interface CncStatusResult {
  /** 圖號 → 'Y' 或 ''；未設定 CNC 資料夾時為 null。無法確認的圖號不列入（前端保留原值）。 */
  items: Record<string, 'Y' | ''> | null;
  /** 逾時無法確認的圖號（只在有時出現） */
  unknown?: string[];
}

/** 工作明細中與 CNC 檢查有關的欄位。 */
export interface CncCheckItem {
  drawing_no?: unknown;
  plating_work?: unknown;
}

@Injectable()
export class LegacyDrawingsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly files: LegacyFileService,
    @Optional()
    @Inject(LEGACY_DRAWING_SETTINGS)
    private readonly fixedSettings?: LegacyDrawingSettings,
  ) {}

  settings(): LegacyDrawingSettings {
    return this.fixedSettings ?? drawingSettingsFromEnv();
  }

  /**
   * 單據上最多 99 個圖號的外形（isin_vb6 readDrawingShapes）。customerCode 有值時讀該客戶的 DXF 路徑。
   * 檔案伺服器逾時時丟 503「圖檔伺服器無回應」。
   */
  async shapes(
    numbers: unknown[],
    customerCode = '',
  ): Promise<{
    configured: boolean;
    shapes: Record<string, DrawingShape | null>;
  }> {
    const unique = [
      ...new Set(numbers.map((value) => String(value).trim()).filter(Boolean)),
    ].slice(0, MAX_NUMBERS);
    const { dxf } = this.settings();
    const shapes: Record<string, DrawingShape | null> = {};
    for (const number of unique) shapes[number] = null;
    if (!dxf.root) return { configured: false, shapes };

    const code = String(customerCode ?? '').trim();
    const customer = code
      ? await new LegacyDb(this.dataSource.manager).get<{ dxf_path: string }>(
          `SELECT dxf_path FROM legacy_crm.partners WHERE kind = 'customer' AND code = $1`,
          [code],
        )
      : null;
    const options = {
      customerPath: customer?.dxf_path ?? '',
      legacyRoot: dxf.legacyRoot,
    };
    // 同一請求有一個操作逾時，其餘排隊中的操作就不再執行。
    const request = new AbortController();
    try {
      await Promise.all(
        unique.map(async (number) => {
          shapes[number] = await this.readShape(
            dxf.root,
            number,
            options,
            request.signal,
          );
        }),
      );
    } catch (error) {
      request.abort(new LegacyFileTimeoutError());
      if (error instanceof LegacyFileTimeoutError)
        throw new ServiceUnavailableException(DXF_TIMEOUT_MESSAGE);
      throw error;
    }
    return { configured: true, shapes };
  }

  private async readShape(
    root: string,
    drawingNo: string,
    options: { customerPath: string; legacyRoot: string },
    signal: AbortSignal,
  ): Promise<DrawingShape | null> {
    for (const path of drawingDxfCandidates(root, drawingNo, options)) {
      const text = await this.files.readSmallFile(path, MAX_DXF_BYTES, signal);
      if (text == null) continue;
      try {
        return dxfToShape(text);
      } catch {
        // 與 isin_vb6 相同：讀不懂的圖面就試另一種副檔名，再不行就不印外形。
      }
    }
    return null;
  }

  /**
   * 帶入工作明細時的 CNC_OK（isin_vb6 cncStatus）：有 CNC 檔為 Y，否則為 ''；未設定 CNC 資料夾時 items 為 null。
   * 檔案伺服器逾時而無法確認的圖號不放進 items，另列在 unknown。
   */
  async cncStatus(numbers: unknown[]): Promise<CncStatusResult> {
    const { cnc } = this.settings();
    if (!cnc.root) return { items: null };
    const list: string[] = [];
    for (const raw of numbers.slice(0, MAX_NUMBERS)) {
      const number = String(raw ?? '').trim();
      if (number && !list.includes(number)) list.push(number);
    }
    const states = await this.cncStates(
      list,
      cnc,
      new LegacyDb(this.dataSource.manager),
    );
    const items: Record<string, 'Y' | ''> = {};
    const unknown: string[] = [];
    for (const number of list) {
      const state = states.get(number) as CncFileState;
      if (state === 'unknown') unknown.push(number);
      else items[number] = state;
    }
    return unknown.length ? { items, unknown } : { items };
  }

  /**
   * 工作登錄存檔前的檢查（isin_vb6 missingCncFiles）：有圖號、雷射工件不是 N 的明細，
   * 沒有 CNC 檔時回傳「{圖號}尚未完成CNC檔」；檔案伺服器逾時無法確認時也回傳訊息（不當成有檔或沒檔），
   * 因此回傳非空陣列就必須拒絕存檔。未設定 CNC 資料夾時不檢查。
   *
   * db：在存檔 transaction 內呼叫時傳入，讀取同一 transaction 的工件資料。
   */
  async missingCncFiles(items: unknown, db?: LegacyDb): Promise<string[]> {
    const { cnc } = this.settings();
    if (!cnc.root) return [];
    const numbers: string[] = [];
    for (const item of Array.isArray(items) ? (items as CncCheckItem[]) : []) {
      const number = String(item?.drawing_no ?? '').trim();
      if (
        !number ||
        String(item?.plating_work ?? '')
          .trim()
          .toUpperCase() === 'N'
      )
        continue;
      numbers.push(number);
    }
    if (!numbers.length) return [];
    const states = await this.cncStates(
      [...new Set(numbers)],
      cnc,
      db ?? new LegacyDb(this.dataSource.manager),
    );
    const messages: string[] = [];
    for (const number of numbers) {
      const state = states.get(number);
      if (state === '') messages.push(`${number}尚未完成CNC檔`);
      else if (state === 'unknown')
        messages.push(
          `${number}無法確認CNC檔（CNC檔伺服器無回應），請稍後再存檔`,
        );
    }
    return messages;
  }

  /** missingCncFiles 有訊息時丟 LegacyValidationError（400），訊息以換行分隔，同 isin_vb6 checkedWork。 */
  async assertCncFiles(items: unknown, db?: LegacyDb): Promise<void> {
    const missing = await this.missingCncFiles(items, db);
    if (missing.length) throw new LegacyValidationError(missing.join('\n'));
  }

  private async cncStates(
    numbers: string[],
    settings: LegacyFolderSettings,
    db: LegacyDb,
  ): Promise<Map<string, CncFileState>> {
    const parts = new Map<string, PartCncFields>();
    if (numbers.length) {
      const rows = await db.all<PartCncFields & { drawing_no: string }>(
        'SELECT drawing_no, directory_path, cnc1, cnc2 FROM legacy_crm.parts WHERE drawing_no = ANY($1)',
        [numbers],
      );
      for (const row of rows) parts.set(row.drawing_no, row);
    }
    const states = new Map<string, CncFileState>();
    await Promise.all(
      numbers.map(async (number) => {
        states.set(
          number,
          await this.cncState(
            cncFileCandidates(number, parts.get(number), settings),
          ),
        );
      }),
    );
    return states;
  }

  /** 依舊版順序檢查候選檔；任一存在即 Y。沒有找到但有檢查逾時時為 unknown。 */
  private async cncState(candidates: string[]): Promise<CncFileState> {
    let timedOut = false;
    for (const file of candidates) {
      try {
        if (await this.files.exists(file)) return 'Y';
      } catch (error) {
        if (!(error instanceof LegacyFileTimeoutError)) throw error;
        timedOut = true;
      }
    }
    return timedOut ? 'unknown' : '';
  }
}
