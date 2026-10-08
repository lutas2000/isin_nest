import {
  buildStaffCodeProposals,
  proposalsToCsv,
  summarizeProposals,
} from './staff-codes';

describe('buildStaffCodeProposals', () => {
  const staff = [
    { id: 'S1', name: '王小明', stop_work: null, legacy_crm_code: null },
    {
      id: 'S2',
      name: '李 大華',
      stop_work: '2020-01-31',
      legacy_crm_code: null,
    },
    { id: 'S3', name: '陳一', stop_work: null, legacy_crm_code: null },
    { id: 'S4', name: '陳一', stop_work: null, legacy_crm_code: null },
    { id: 'S5', name: '張三', stop_work: null, legacy_crm_code: 'E05' },
  ];

  it('pre-confirms only unique name matches where both sides are still employed', () => {
    const proposals = buildStaffCodeProposals(
      [
        { code: 'E01', name: '王小明', leave_date: '' },
        { code: 'E02', name: '李大華', leave_date: '' },
        { code: 'E03', name: '陳一', leave_date: '' },
        { code: 'E04', name: '林四', leave_date: '' },
        { code: 'E05', name: '張三', leave_date: '' },
        { code: 'E06', name: '王小明', leave_date: ' 99.01.01' },
        { code: ' ', name: '空白', leave_date: '' },
      ],
      staff,
    );
    expect(
      proposals.map((p) => [p.legacy_code, p.status, p.staff_id, p.confirm]),
    ).toEqual([
      ['E01', 'matched', 'S1', 'Y'],
      ['E02', 'matched', 'S2', ''],
      ['E03', 'ambiguous', '', ''],
      ['E04', 'not_found', '', ''],
      ['E05', 'already_set', 'S5', ''],
      ['E06', 'matched', 'S1', ''],
    ]);
    expect(summarizeProposals(proposals)).toMatchObject({
      total: 6,
      preconfirmed: 1,
    });
    expect(proposalsToCsv(proposals.slice(0, 1))).toBe(
      '\uFEFFlegacy_code,legacy_name,legacy_leave_date,staff_id,staff_name,staff_stop_work,status,confirm\r\n' +
        'E01,王小明,,S1,王小明,,matched,Y\r\n',
    );
  });
});
