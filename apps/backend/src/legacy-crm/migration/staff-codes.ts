/**
 * 預填 staff.legacy_crm_code（舊版員工編號）。舊員工檔（personel.mdb）不匯入；
 * 以姓名比對 public.staff 產生建議表，人工確認（confirm 欄填 Y）後再用 apply-staff-codes.ts 寫入。
 * 建議表含真實姓名，只放在 CSV 匯出目錄旁，不進 Git。
 */
export interface LegacyEmployee {
  code: string;
  name: string;
  leave_date: string;
}

export interface StaffRecord {
  id: string;
  name: string;
  stop_work: string | null;
  legacy_crm_code: string | null;
}

export type ProposalStatus =
  | 'matched'
  | 'ambiguous'
  | 'not_found'
  | 'already_set'
  | 'code_taken';

export interface StaffCodeProposal {
  legacy_code: string;
  legacy_name: string;
  legacy_leave_date: string;
  staff_id: string;
  staff_name: string;
  staff_stop_work: string;
  status: ProposalStatus;
  /** Y 表示要寫入；只有雙方都在職且姓名唯一對上時預填 */
  confirm: '' | 'Y';
}

const normalizeName = (name: string) => name.replace(/\s+/g, '');

export function buildStaffCodeProposals(
  employees: LegacyEmployee[],
  staff: StaffRecord[],
): StaffCodeProposal[] {
  const byName = new Map<string, StaffRecord[]>();
  for (const record of staff) {
    const key = normalizeName(record.name);
    byName.set(key, [...(byName.get(key) ?? []), record]);
  }
  const codeOwner = new Map(
    staff
      .filter((record) => record.legacy_crm_code)
      .map((record) => [record.legacy_crm_code, record]),
  );

  return employees
    .filter((employee) => employee.code.trim())
    .map((employee) => {
      const code = employee.code.trim();
      const proposal: StaffCodeProposal = {
        legacy_code: code,
        legacy_name: employee.name.trim(),
        legacy_leave_date: employee.leave_date.trim(),
        staff_id: '',
        staff_name: '',
        staff_stop_work: '',
        status: 'not_found',
        confirm: '',
      };
      const owner = codeOwner.get(code);
      if (owner) {
        return {
          ...proposal,
          staff_id: owner.id,
          staff_name: owner.name,
          staff_stop_work: owner.stop_work ?? '',
          status: 'already_set',
        };
      }
      const candidates = byName.get(normalizeName(employee.name)) ?? [];
      if (candidates.length > 1) return { ...proposal, status: 'ambiguous' };
      if (candidates.length === 0) return proposal;
      const [match] = candidates;
      const filled = {
        ...proposal,
        staff_id: match.id,
        staff_name: match.name,
        staff_stop_work: match.stop_work ?? '',
      };
      if (match.legacy_crm_code) return { ...filled, status: 'code_taken' };
      const bothActive = !proposal.legacy_leave_date && !match.stop_work;
      return { ...filled, status: 'matched', confirm: bothActive ? 'Y' : '' };
    });
}

export const PROPOSAL_COLUMNS: (keyof StaffCodeProposal)[] = [
  'legacy_code',
  'legacy_name',
  'legacy_leave_date',
  'staff_id',
  'staff_name',
  'staff_stop_work',
  'status',
  'confirm',
];

const csvCell = (value: string) =>
  /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export function proposalsToCsv(proposals: StaffCodeProposal[]): string {
  const lines = [
    PROPOSAL_COLUMNS.join(','),
    ...proposals.map((p) =>
      PROPOSAL_COLUMNS.map((c) => csvCell(p[c])).join(','),
    ),
  ];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function summarizeProposals(proposals: StaffCodeProposal[]) {
  const counts: Record<string, number> = {};
  for (const proposal of proposals)
    counts[proposal.status] = (counts[proposal.status] ?? 0) + 1;
  return {
    total: proposals.length,
    preconfirmed: proposals.filter((p) => p.confirm === 'Y').length,
    byStatus: counts,
  };
}
