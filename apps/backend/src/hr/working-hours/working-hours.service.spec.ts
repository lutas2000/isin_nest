import { SchedulePicker } from './schedule-picker';
import { WorkingHours } from './working-hours';
import { ManHourManager } from './man-hour-manager';
import { WorkingHoursService } from './working-hours.service';
import {
  AttendRecordCsvReader,
  AttendRecordUsbReader,
} from '../attend-record/attend-record-csv-reader';
import { StaffWorkhourService } from '../staff-workhour/staff-workhour.service';

describe('WorkingHoursService', () => {
  it('completes today flow by importing both sources, classifying, and calculating two workdays', async () => {
    const schedulePicker = {} as SchedulePicker;
    const workingHours = {
      appointAttendanceTypes: jest.fn().mockResolvedValue(null),
    } as unknown as WorkingHours;
    const manHourManager = {
      calculateManHour: jest.fn().mockResolvedValue(undefined),
    } as unknown as ManHourManager;
    const csvReader = {
      searchAttendLogs: jest.fn().mockResolvedValue(undefined),
    } as unknown as AttendRecordCsvReader;
    const usbReader = {
      read: jest.fn().mockResolvedValue(undefined),
    } as unknown as AttendRecordUsbReader;
    const staffWorkhourService = {
      calculate: jest.fn().mockResolvedValue([]),
    } as unknown as StaffWorkhourService;
    const service = new WorkingHoursService(
      schedulePicker,
      workingHours,
      manHourManager,
      csvReader,
      usbReader,
      staffWorkhourService,
    );

    await service.calculateTodayWorkingHours(
      new Date('2024-06-02T10:00:00.000Z'),
    );

    expect(csvReader.searchAttendLogs).toHaveBeenCalledTimes(1);
    expect(usbReader.read).toHaveBeenCalledTimes(1);
    expect(workingHours.appointAttendanceTypes).toHaveBeenCalledTimes(1);
    expect(manHourManager.calculateManHour).toHaveBeenCalledTimes(2);
    expect(staffWorkhourService.calculate).toHaveBeenCalledTimes(2);
  });
});
