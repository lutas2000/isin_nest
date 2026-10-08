import { parseCsv } from './legacy-csv';

describe('parseCsv', () => {
  it('reads quoted fields, escaped quotes and CRLF', () => {
    expect(parseCsv('a,b\r\n"x,1","say ""hi"""\r\n,\r\n')).toEqual([
      ['a', 'b'],
      ['x,1', 'say "hi"'],
      ['', ''],
    ]);
  });

  it('keeps line breaks inside quotes and a last row without newline', () => {
    expect(parseCsv('a\n"1\r\n2"\n3')).toEqual([['a'], ['1\r\n2'], ['3']]);
  });

  it('rejects stray quotes', () => {
    expect(() => parseCsv('a"b\n')).toThrow('欄位中間出現引號');
    expect(() => parseCsv('"a"b\n')).toThrow('引號結束後出現非分隔字元');
    expect(() => parseCsv('"a\n')).toThrow('引號沒有結束');
  });
});
