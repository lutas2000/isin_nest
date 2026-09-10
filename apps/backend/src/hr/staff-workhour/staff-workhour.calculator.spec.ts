import {
  calculatePayroll,
  calculateStaffWorkhour,
} from './staff-workhour.calculator';

describe('staff workhour calculations', () => {
  it('calculates work, leave, overtime, and late minutes for a day', () => {
    const result = calculateStaffWorkhour({
      staffId: 'A001',
      date: new Date('2024-06-01T00:00:00.000Z'),
      expectedStartTime: '09:00:00',
      standardHours: 8,
      manhours: [
        {
          start_time: new Date('2024-06-01T09:15:00.000Z'),
          end_time: new Date('2024-06-01T18:15:00.000Z'),
          work_time: 9,
        },
      ],
      leaves: [{ time: 1 }],
    });

    expect(result).toEqual(
      expect.objectContaining({
        staffId: 'A001',
        work_time: 9,
        leave_time: 1,
        overtime: 1,
        late: 15,
      }),
    );
  });

  it('builds the payroll summary from staff pay fields and deductions', () => {
    expect(
      calculatePayroll(
        {
          id: 'A001',
          name: '張三',
          wage: 50000,
          allowance: 5000,
          organizer: 3000,
          labor_insurance: 2000,
          health_insurance: 1500,
          pension: 3000,
        },
        { work_time: 160, leave_time: 8, overtime: 4, late: 15 },
      ),
    ).toEqual({
      staffId: 'A001',
      staffName: '張三',
      grossPay: 58000,
      deductions: 6500,
      netPay: 51500,
      workHours: 160,
      leaveHours: 8,
      overtimeHours: 4,
      lateMinutes: 15,
    });
  });

  it('falls back to the recorded interval when work_time was not populated', () => {
    const result = calculateStaffWorkhour({
      staffId: 'A001',
      date: new Date('2024-06-01T00:00:00.000Z'),
      manhours: [
        {
          start_time: new Date('2024-06-01T09:00:00.000Z'),
          end_time: new Date('2024-06-01T18:00:00.000Z'),
          work_time: 0,
        },
      ],
      leaves: [],
    });

    expect(result.work_time).toBe(9);
  });
});
