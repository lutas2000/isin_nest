"""Generate an anonymized attendance fixture by running isin_django's real methods.

Usage: python3 legacy-attendance-oracle.py DJANGO_ROOT RAW_DATA_DIR > legacy-attendance.json
The Django ORM is replaced with an in-memory record store; no database or third-party
Python packages are needed. Only the CSV columns used by staff.mapper are retained.
The adjacent anonymized staff map records which device IDs differ from staff.id
in the historical database.
"""

import csv
import datetime
import importlib
import json
import pathlib
import sys
import types


django_root = pathlib.Path(sys.argv[1])
raw_dir = pathlib.Path(sys.argv[2])
sys.path.insert(0, str(django_root))

records = {}
manhours = []


class QuerySet(list):
    def filter(self, **conditions):
        def matches(record):
            for key, value in conditions.items():
                if key.endswith('__gte'):
                    if getattr(record, key[:-5]) < value:
                        return False
                elif key.endswith('__lt'):
                    if getattr(record, key[:-4]) >= value:
                        return False
                elif getattr(record, key) != value:
                    return False
            return True
        return QuerySet(record for record in self if matches(record))

    def order_by(self, key):
        return QuerySet(sorted(self, key=lambda record: getattr(record, key)))


class RecordManager:
    def filter(self, **conditions):
        return QuerySet(records.values()).filter(**conditions)


class AttendRecord:
    objects = RecordManager()

    def save(self):
        records[self.id] = self


class StaffManhour:
    def __init__(self, **values):
        self.__dict__.update(values)
        self.work_time = 0  # staff.models.StaffManhour's Django default
        self.end_time = None

    def save(self):
        manhours.append(self)


fake_models = types.ModuleType('staff.models')
fake_models.AttendRecord = AttendRecord
fake_models.StaffManhour = StaffManhour
fake_models.Staff = type('Staff', (), {})
fake_models.StaffSegment = type('StaffSegment', (), {})
fake_models.TYPE_ON_WORK = 1
fake_models.TYPE_OFF_WORK = 2
fake_models.TYPE_UNKNOWN = 3
sys.modules['staff.models'] = fake_models
fake_pytz = types.ModuleType('pytz')
fake_pytz.UTC = datetime.timezone.utc
sys.modules['pytz'] = fake_pytz
sys.modules['django'] = types.ModuleType('django')
sys.modules['django.db'] = types.ModuleType('django.db')
fake_django_models = types.ModuleType('django.db.models')
fake_django_models.Q = type('Q', (), {})
sys.modules['django.db.models'] = fake_django_models

mapper = importlib.import_module('staff.mapper').AttendMapperMapper()
schedule = importlib.import_module('staff.api.schedule')

raw_rows = []
raw_files = sorted(raw_dir.glob('*.txt'))
for file_path in raw_files:
    with file_path.open(encoding='utf-8', newline='') as source:
        raw_rows.extend(csv.reader(source))

# Keep every punch and its timestamp, but replace employee identifiers and names.
identifiers = {value: index + 1 for index, value in enumerate(sorted({row[1] for row in raw_rows}))}
mismatched_numbers = set(json.loads(
    pathlib.Path(__file__).with_name('legacy-attendance-staff-map.json').read_text()
)['mismatchedDeviceStaffNumbers'])
fixture_staff = []
for raw_row in raw_rows:
    number = identifiers[raw_row[1]]
    name = f'員工{number:02}'
    staff_id = f'C{number:03}' if number in mismatched_numbers else f'E{number:03}'
    if not any(staff['name'] == name for staff in fixture_staff):
        fixture_staff.append({'id': staff_id, 'name': name})
fixture_rows = []
for raw_row in raw_rows:
    number = identifiers[raw_row[1]]
    row = ['', f'E{number:03}', f'員工{number:02}', '', '', '', raw_row[6], '', raw_row[8], '']
    fixture_rows.append(row)
    mapper.csv_to_entity(row).save()

schedule.WorkingHours().appoint_attend_records_type()
manager = schedule.ManHourManager()
names = sorted({record.staff_name for record in records.values()})
manager.find_names = lambda date: names
manager.del_man_hour = lambda name, date: None
days = sorted({record.create_time.date() for record in records.values()})
for day in days:
    manager.calculate_man_hour(datetime.datetime.combine(day, datetime.time(6), datetime.timezone.utc))

output = {
    'sourceFileCount': len(raw_files),
    'sourceRowCount': len(raw_rows),
    'staff': sorted(fixture_staff, key=lambda staff: staff['name']),
    'rows': fixture_rows,
    'records': sorted(({
        'id': record.id,
        'staffId': record.staff_id,
        'staffName': record.staff_name,
        'createTime': record.create_time.isoformat().replace('+00:00', 'Z'),
        'inputType': record.input_type,
        'attendType': record.attend_type,
    } for record in records.values()), key=lambda record: record['id']),
    'manhours': sorted(({
        'name': record.name,
        'day': record.day.date().isoformat(),
        'startTime': record.start_time.isoformat().replace('+00:00', 'Z'),
        'endTime': record.end_time.isoformat().replace('+00:00', 'Z') if record.end_time else None,
        'workTime': record.work_time,
    } for record in manhours), key=lambda record: (record['day'], record['name'], record['startTime'])),
}
json.dump(output, sys.stdout, ensure_ascii=False, separators=(',', ':'))
