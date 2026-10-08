import { ServiceUnavailableException } from '@nestjs/common';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { LegacyValidationError } from '../common/legacy-validation.error';
import {
  drawingSettingsFromEnv,
  LegacyDrawingSettings,
  LegacyDrawingsService,
} from './drawings.service';
import { LegacyFileService, LegacyFileSystem } from './legacy-file.service';

const directory = mkdtempSync(join(tmpdir(), 'legacy-drawings-'));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

const dxfRoot = join(directory, 'c');
const cncRoot = join(directory, 'n');
mkdirSync(join(dxfRoot, 'Z', 'ZZQ'), { recursive: true });
mkdirSync(join(dxfRoot, 'Cust'), { recursive: true });
mkdirSync(join(cncRoot, 'SUB'), { recursive: true });
const line = (x: number, y: number) =>
  [
    '0',
    'SECTION',
    '2',
    'ENTITIES',
    '0',
    'LINE',
    '10',
    '0',
    '20',
    '0',
    '11',
    String(x),
    '21',
    String(y),
    '0',
    'ENDSEC',
    '0',
    'EOF',
  ].join('\n');
writeFileSync(join(dxfRoot, 'Z', 'ZZQ', 'ZZQ1.dxf'), line(5, 2));
writeFileSync(join(dxfRoot, 'Cust', 'ZZQ2.DXF'), line(7, 3));
writeFileSync(join(cncRoot, 'P1.cnc'), '');
writeFileSync(join(cncRoot, 'SUB', 'OTHER.cnc'), '');

const settings: LegacyDrawingSettings = {
  dxf: { root: dxfRoot, legacyRoot: '\\\\Server\\C\\' },
  cnc: { root: cncRoot, legacyRoot: '\\\\SERVER\\n\\' },
};
const unconfigured: LegacyDrawingSettings = {
  dxf: { root: '', legacyRoot: '\\\\Server\\C\\' },
  cnc: { root: '', legacyRoot: '\\\\SERVER\\n\\' },
};

/** 工件 P2 的存放目錄在 CNC 資料夾的 SUB 之下；客戶 CU 有自己的 DXF 路徑。 */
function fakeDataSource() {
  const query = jest.fn(async (sql: string, params: unknown[]) => {
    if (sql.includes('FROM legacy_crm.partners'))
      return params[0] === 'CU' ? [{ dxf_path: '\\\\Server\\C\\Cust' }] : [];
    if (sql.includes('FROM legacy_crm.parts')) {
      const numbers = params[0] as string[];
      return numbers.includes('P2')
        ? [
            {
              drawing_no: 'P2',
              directory_path: '\\\\SERVER\\n\\SUB\\',
              cnc1: 'OTHER.cnc',
              cnc2: '',
            },
          ]
        : [];
    }
    return [];
  });
  return { dataSource: { manager: { query } } as unknown as DataSource, query };
}

function service(
  options: {
    settings?: LegacyDrawingSettings;
    fs?: LegacyFileSystem;
    timeoutMs?: number;
  } = {},
) {
  const { dataSource, query } = fakeDataSource();
  const files = new LegacyFileService(options.fs, {
    timeoutMs: options.timeoutMs ?? 3000,
  });
  return {
    drawings: new LegacyDrawingsService(
      dataSource,
      files,
      options.settings ?? settings,
    ),
    query,
    files,
  };
}

/** 永遠不回應的檔案系統（SMB 卡住）。 */
const hungFs: LegacyFileSystem = {
  stat: () => new Promise(() => undefined),
  readFile: () => new Promise(() => undefined),
};

describe('drawing settings', () => {
  it('reads LEGACY_* variables with the isin_vb6 defaults', () => {
    expect(drawingSettingsFromEnv({})).toEqual(unconfigured);
    expect(
      drawingSettingsFromEnv({
        LEGACY_DXF_PATH: ' /mnt/c ',
        LEGACY_DXF_LEGACY_ROOT: '\\\\S\\D\\',
        LEGACY_CNC_PATH: '/mnt/n',
        LEGACY_CNC_LEGACY_ROOT: '',
      }),
    ).toEqual({
      dxf: { root: '/mnt/c', legacyRoot: '\\\\S\\D\\' },
      cnc: { root: '/mnt/n', legacyRoot: '\\\\SERVER\\n\\' },
    });
  });
});

describe('LegacyDrawingsService.shapes', () => {
  it('reads {root}/{first}/{first three}/{number}.DXF for up to 99 unique numbers', async () => {
    const { drawings } = service();
    const result = await drawings.shapes(['ZZQ1', ' ZZQ2', 'ZZQ1', '', '../x']);
    expect(result.configured).toBe(true);
    expect(Object.keys(result.shapes)).toEqual(['ZZQ1', 'ZZQ2', '../x']);
    expect(result.shapes.ZZQ1?.width).toBe(5);
    expect(result.shapes.ZZQ2).toBeNull();
    expect(result.shapes['../x']).toBeNull();
  });

  it("uses the customer's DXF path without falling back to the shared folder", async () => {
    const { drawings } = service();
    const result = await drawings.shapes(['ZZQ1', 'ZZQ2'], 'CU');
    expect(result.shapes.ZZQ1).toBeNull();
    expect(result.shapes.ZZQ2?.width).toBe(7);
  });

  it('prints no outlines without a DXF folder and never touches the file system', async () => {
    const stat = jest.fn();
    const { drawings, query } = service({
      settings: unconfigured,
      fs: { stat, readFile: jest.fn() },
    });
    await expect(drawings.shapes(['ZZQ1'], 'CU')).resolves.toEqual({
      configured: false,
      shapes: { ZZQ1: null },
    });
    expect(stat).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it('answers 503 when the drawing server does not respond', async () => {
    const { drawings } = service({ fs: hungFs, timeoutMs: 30 });
    const error = await drawings
      .shapes(['ZZQ1', 'ZZQ3', 'ZZQ4', 'ZZQ5', 'ZZQ6'])
      .catch((caught) => caught);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.message).toBe('圖檔伺服器無回應');
    expect(error.getStatus()).toBe(503);
  });
});

describe('LegacyDrawingsService CNC checks', () => {
  const items = [
    { drawing_no: 'P1' },
    { drawing_no: 'P2', plating_work: '' },
    { drawing_no: 'P3', plating_work: '' },
    { drawing_no: 'P4', plating_work: 'n' },
    { drawing_no: '' },
  ];

  it('reports CNC_OK when lines are brought in', async () => {
    const { drawings } = service();
    await expect(
      drawings.cncStatus(['P1', 'P2', 'P3', '', 'P1']),
    ).resolves.toEqual({ items: { P1: 'Y', P2: 'Y', P3: '' } });
    await expect(
      service({ settings: unconfigured }).drawings.cncStatus(['P1']),
    ).resolves.toEqual({ items: null });
  });

  it('refuses laser lines without a CNC file; 雷射工件 N skips the check', async () => {
    const { drawings } = service();
    await expect(drawings.missingCncFiles(items)).resolves.toEqual([
      'P3尚未完成CNC檔',
    ]);
    await expect(drawings.assertCncFiles(items)).rejects.toThrow(
      new LegacyValidationError('P3尚未完成CNC檔'),
    );
    await expect(
      drawings.assertCncFiles(items.slice(0, 2)),
    ).resolves.toBeUndefined();
    // 沒有 CNC 資料夾時不檢查。
    await expect(
      service({ settings: unconfigured }).drawings.missingCncFiles(items),
    ).resolves.toEqual([]);
    await expect(drawings.missingCncFiles(null)).resolves.toEqual([]);
  });

  it('never treats a timeout as present or missing', async () => {
    const { drawings } = service({ fs: hungFs, timeoutMs: 30 });
    await expect(drawings.cncStatus(['P1', 'P3'])).resolves.toEqual({
      items: {},
      unknown: ['P1', 'P3'],
    });
    const messages = await drawings.missingCncFiles(items);
    expect(messages).toEqual([
      'P1無法確認CNC檔（CNC檔伺服器無回應），請稍後再存檔',
      'P2無法確認CNC檔（CNC檔伺服器無回應），請稍後再存檔',
      'P3無法確認CNC檔（CNC檔伺服器無回應），請稍後再存檔',
    ]);
    await expect(
      drawings.assertCncFiles([{ drawing_no: 'P1' }]),
    ).rejects.toBeInstanceOf(LegacyValidationError);
  });

  it('counts a file found after an earlier candidate timed out as present', async () => {
    const fs: LegacyFileSystem = {
      stat: (path) =>
        path.endsWith('P2.cnc') || path.endsWith('P2.CNC')
          ? new Promise(() => undefined)
          : path.endsWith('OTHER.cnc')
            ? Promise.resolve({ isFile: () => true, size: 0 })
            : Promise.reject(new Error('ENOENT')),
      readFile: async () => '',
    };
    await expect(
      service({ fs, timeoutMs: 30 }).drawings.cncStatus(['P2']),
    ).resolves.toEqual({ items: { P2: 'Y' } });
    // 新的 service：前一個的卡住呼叫仍占著名額。
    await expect(
      service({ fs, timeoutMs: 30 }).drawings.missingCncFiles([
        { drawing_no: 'P2' },
      ]),
    ).resolves.toEqual([]);
  });
});
