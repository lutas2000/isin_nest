import { join } from 'path';
import {
  cncFileCandidates,
  drawingDxfCandidates,
  isSafeDrawingNo,
} from './legacy-paths';
import { dxfToShape } from './dxf-shape';

function dxf(entities: (string | number)[][]): string {
  return [
    '0',
    'SECTION',
    '2',
    'ENTITIES',
    ...entities.flatMap(([type, ...pairs]) => [
      '0',
      String(type),
      ...pairs.map(String),
    ]),
    '0',
    'ENDSEC',
    '0',
    'EOF',
  ].join('\n');
}

describe('DXF paths', () => {
  it('derives {root}/{first}/{first three}/{number}.DXF from the drawing number only', () => {
    expect(drawingDxfCandidates('/r', 'ZZQ1')).toEqual([
      join('/r', 'Z', 'ZZQ', 'ZZQ1.DXF'),
      join('/r', 'Z', 'ZZQ', 'ZZQ1.dxf'),
    ]);
    expect(drawingDxfCandidates('', 'ZZQ1')).toEqual([]);
  });

  it('rejects drawing numbers that could leave the folder', () => {
    for (const number of [
      '../x',
      '..',
      'a..b',
      'A/B',
      'A\\B',
      '.x',
      '',
      'X'.repeat(41),
      '中文',
      '/etc/passwd',
    ]) {
      expect(drawingDxfCandidates('/r', number)).toEqual([]);
      expect(isSafeDrawingNo(number)).toBe(false);
    }
    expect(isSafeDrawingNo(' A_B-C.D ')).toBe(true);
  });

  it("reads a customer's own DXF path only under the legacy folder", () => {
    const options = (customerPath: string) => ({
      customerPath,
      legacyRoot: '\\\\Server\\C\\',
    });
    expect(
      drawingDxfCandidates('/r', 'ZZQ1', options('\\\\server\\c\\Cust\\A')),
    ).toEqual([
      join('/r', 'Cust', 'A', 'ZZQ1.DXF'),
      join('/r', 'Cust', 'A', 'ZZQ1.dxf'),
    ]);
    expect(
      drawingDxfCandidates('/r', 'ZZQ1', options('\\\\Server\\C\\Cust\\')),
    ).toEqual(drawingDxfCandidates('/r', 'ZZQ1', options('//Server/C/Cust')));
    expect(drawingDxfCandidates('/r', 'ZZQ1', options('D:\\DXF\\'))).toEqual(
      [],
    );
    expect(
      drawingDxfCandidates('/r', 'ZZQ1', options('\\\\Server\\C\\..\\x')),
    ).toEqual([]);
    expect(
      drawingDxfCandidates('/r', 'ZZQ1', options('\\\\Server\\C\\a\\.\\b')),
    ).toEqual([]);
    expect(
      drawingDxfCandidates('/r', 'ZZQ1', options('\\\\Server\\Cx\\A')),
    ).toEqual([]);
  });
});

describe('CNC paths', () => {
  const settings = { root: '/n', legacyRoot: '\\\\SERVER\\n\\' };

  it('is {CNC path}{drawing}.cnc, else the part folder with CNC 檔一／二', () => {
    expect(cncFileCandidates('P1', null, settings)).toEqual([
      join('/n', 'P1.cnc'),
      join('/n', 'P1.CNC'),
    ]);
    const part = {
      directory_path: '\\\\server\\N\\SUB',
      cnc1: 'OTHER.cnc',
      cnc2: '',
    };
    expect(cncFileCandidates('P2', part, settings).at(-1)).toBe(
      join('/n', 'SUB', 'OTHER.cnc'),
    );
    // 舊版 CNC 路徑以外或空白的存放目錄不跟隨。
    expect(
      cncFileCandidates(
        'P2',
        { directory_path: 'G:\\', cnc1: 'P2.cnc' },
        settings,
      ),
    ).toHaveLength(2);
    expect(
      cncFileCandidates('P2', { directory_path: '', cnc1: 'P2.cnc' }, settings),
    ).toHaveLength(2);
    expect(
      cncFileCandidates(
        'P2',
        { directory_path: '\\\\SERVER\\n\\..', cnc1: 'x.cnc' },
        settings,
      ),
    ).toHaveLength(2);
    expect(
      cncFileCandidates(
        'P2',
        { directory_path: '\\\\SERVER\\n\\A', cnc1: '..', cnc2: 'a/b' },
        settings,
      ),
    ).toHaveLength(2);
    expect(cncFileCandidates('../x', null, settings)).toEqual([]);
    expect(cncFileCandidates('P1', null, { root: '', legacyRoot: '' })).toEqual(
      [],
    );
  });
});

describe('dxfToShape', () => {
  it('draws LINE, CIRCLE, ARC and POLYLINE, and ignores LWPOLYLINE as the legacy program does', () => {
    const shape = dxfToShape(
      dxf([
        ['LINE', 10, 0, 20, 0, 11, 40, 21, 0],
        ['CIRCLE', 10, 20, 20, 10, 40, 5],
        ['ARC', 10, 40, 20, 10, 40, 10, 50, 270, 51, 90],
        ['LWPOLYLINE', 70, 1, 10, -100, 20, 0, 10, 0, 20, 99],
        ['TEXT', 10, 999, 20, 999],
      ]),
    );
    expect(shape?.width).toBe(50);
    expect(shape?.height).toBe(20);
    expect(shape?.path).toMatch(/^M0 20L40 20/);
    expect(dxfToShape(dxf([['TEXT', 10, 1, 20, 1]]))).toBeNull();
    expect(
      dxfToShape(dxf([['LWPOLYLINE', 70, 0, 10, 0, 20, 0, 10, 10, 20, 0]])),
    ).toBeNull();
  });

  it('reads right-justified group codes and bulged POLYLINE vertices', () => {
    const padded = [
      '  0',
      'SECTION',
      '  2',
      'ENTITIES',
      '  0',
      'POLYLINE',
      ' 70',
      '0',
      '  0',
      'VERTEX',
      ' 10',
      '0',
      ' 20',
      '0',
      ' 42',
      '1',
      '  0',
      'VERTEX',
      ' 10',
      '10',
      ' 20',
      '0',
      '  0',
      'SEQEND',
      '  0',
      'ENDSEC',
      '  0',
      'EOF',
    ].join('\r\n');
    const bulged = dxfToShape(padded);
    expect(bulged?.width).toBe(10);
    expect(bulged?.height).toBe(5);
  });
});
