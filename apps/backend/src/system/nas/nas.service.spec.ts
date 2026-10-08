import { cifsOptions, parseSmbUrl } from './nas.service';

describe('parseSmbUrl', () => {
  it('帳號密碼', () => {
    expect(parseSmbUrl('//mac:secret@192.168.0.200/c')).toEqual({
      username: 'mac',
      password: 'secret',
      host: '192.168.0.200',
      share: 'c',
    });
  });

  it('密碼空白（訪客）', () => {
    const smb = parseSmbUrl('//GUEST:@192.168.0.150/isin');
    expect(smb).toEqual({
      username: 'GUEST',
      password: '',
      host: '192.168.0.150',
      share: 'isin',
    });
    expect(cifsOptions(smb)).toBe('username=GUEST,guest,vers=1.0');
  });

  it('有密碼時帶 password', () => {
    expect(cifsOptions(parseSmbUrl('//mac:secret@h/c'))).toBe(
      'username=mac,password=secret,vers=1.0',
    );
  });

  it('格式不對', () => {
    expect(() => parseSmbUrl('//host/share')).toThrow('Invalid SMB URL');
  });
});
