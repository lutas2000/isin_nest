<template>
  <div class="attendance-page">
    <TableHeader :border="false">
      <template #actions>
        <button class="btn btn-primary" @click="refreshAttendance">重新整理</button>
      </template>
    </TableHeader>

    <div class="attendance-overview">
      <div class="overview-card"><strong>{{ attendanceStats.totalStaff }}</strong><span>總員工數</span></div>
      <div class="overview-card"><strong>{{ attendanceStats.present }}</strong><span>已到班</span></div>
      <div class="overview-card"><strong>{{ attendanceStats.late }}</strong><span>遲到</span></div>
      <div class="overview-card"><strong>{{ attendanceStats.absent }}</strong><span>缺勤</span></div>
    </div>

    <div class="attendance-content">
      <div class="content-tabs">
        <button v-for="tab in tabs" :key="tab.id" class="tab-btn" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
          {{ tab.label }}
        </button>
      </div>

      <div v-if="activeTab === 'today'" class="tab-content">
        <SectionHeader :title="`今日出勤狀況 - ${todayDate}`">
          <template #actions><button class="btn btn-success" @click="refreshAttendance">刷新資料</button></template>
        </SectionHeader>
        <div v-if="loading" class="empty-state">載入中...</div>
        <EditableDataTable v-else :columns="todayColumns" :data="todayAttendance" :show-actions="false" :editable="false">
          <template #cell-checkInTime="{ row }"><span :class="{ 'text-danger': row.status === 'late' }">{{ row.checkInTime || '-' }}</span></template>
          <template #cell-checkOutTime="{ value }">{{ value || '-' }}</template>
          <template #cell-workHours="{ value }">{{ value || '-' }}</template>
          <template #cell-status="{ row }"><span class="badge" :class="`badge-${row.status}`">{{ row.statusText }}</span></template>
          <template #cell-notes="{ value }">{{ value || '-' }}</template>
        </EditableDataTable>
      </div>

      <div v-if="activeTab === 'records'" class="tab-content">
        <SectionHeader title="出勤記錄查詢">
          <template #actions>
            <input v-model="recordSearch" class="form-control" placeholder="搜尋員工姓名或編號..." />
            <input v-model="recordDate" type="date" class="form-control" @change="refreshAttendance" />
            <select v-model="recordDepartment" class="form-control">
              <option value="">全部部門</option>
              <option v-for="department in departments" :key="department" :value="department">{{ department }}</option>
            </select>
          </template>
        </SectionHeader>
        <EditableDataTable :columns="recordColumns" :data="filteredRecords" :show-actions="false" :editable="false">
          <template #cell-checkInTime="{ value }">{{ value || '-' }}</template>
          <template #cell-checkOutTime="{ value }">{{ value || '-' }}</template>
          <template #cell-workHours="{ value }">{{ value || '-' }}</template>
          <template #cell-overtimeHours="{ value }">{{ value || '-' }}</template>
          <template #cell-status="{ row }"><span class="badge" :class="`badge-${row.status}`">{{ row.statusText }}</span></template>
        </EditableDataTable>
      </div>

      <div v-if="activeTab === 'reports'" class="tab-content">
        <SectionHeader title="出勤統計報表" />
        <div class="reports-grid">
          <div class="report-card"><h4>部門出勤率</h4><p v-for="item in departmentStats" :key="item.name">{{ item.name }}：{{ item.attendanceRate }}%</p></div>
          <div class="report-card"><h4>遲到統計</h4><p v-for="item in lateStats" :key="item.employeeId">{{ item.employeeName }}：{{ item.lateCount }} 次</p></div>
          <div class="report-card"><h4>加班統計</h4><p v-for="item in overtimeStats" :key="item.employeeId">{{ item.employeeName }}：{{ item.totalHours }} 小時</p></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { EditableDataTable, SectionHeader, TableHeader } from '@/components'
import { apiGet, getApiItems } from '@/services/api'
import { API_CONFIG } from '@/config/api'

interface Staff {
  id: string
  name: string
  department?: string
  need_check?: boolean
}

interface AttendRecord {
  id: number
  staffId: string
  staffName?: string
  createTime: string
  attendType: number
}

interface Segment {
  staffId: string
  begain_time: string
  end_time: string
  rest_time?: number
  create_date?: string
}

interface AttendanceRow {
  id: string
  date: string
  employeeId: string
  employeeName: string
  department: string
  checkInTime: string
  checkOutTime: string
  workHours: string
  overtimeHours: string
  status: 'present' | 'late' | 'absent' | 'incomplete'
  statusText: string
  notes: string
}

const tabs = [
  { id: 'today', label: '今日出勤' },
  { id: 'records', label: '出勤記錄' },
  { id: 'reports', label: '統計報表' },
]
const activeTab = ref('today')
const loading = ref(false)
const todayDate = ref(toDateKey(new Date()))
const recordDate = ref(todayDate.value)
const recordSearch = ref('')
const recordDepartment = ref('')
const staffList = ref<Staff[]>([])
const segments = ref<Segment[]>([])
const todayAttendance = ref<AttendanceRow[]>([])
const attendanceRecords = ref<AttendanceRow[]>([])
const attendanceStats = ref({ totalStaff: 0, present: 0, late: 0, absent: 0 })
const departmentStats = ref<{ name: string; attendanceRate: number }[]>([])
const lateStats = ref<{ employeeId: string; employeeName: string; lateCount: number }[]>([])
const overtimeStats = ref<{ employeeId: string; employeeName: string; totalHours: number }[]>([])

const departments = computed(() => Array.from(new Set(staffList.value.map((staff) => staff.department).filter(Boolean) as string[])).sort())

const filteredRecords = computed(() => {
  const search = recordSearch.value.toLowerCase()
  return attendanceRecords.value.filter((record) => {
    const matchesSearch = !search || record.employeeId.toLowerCase().includes(search) || record.employeeName.toLowerCase().includes(search)
    const matchesDepartment = !recordDepartment.value || record.department === recordDepartment.value
    return matchesSearch && matchesDepartment
  })
})

const todayColumns = [
  { key: 'employeeId', label: '員工編號' },
  { key: 'employeeName', label: '姓名' },
  { key: 'department', label: '部門' },
  { key: 'checkInTime', label: '上班時間' },
  { key: 'checkOutTime', label: '下班時間' },
  { key: 'workHours', label: '工作時數' },
  { key: 'status', label: '狀態' },
  { key: 'notes', label: '備註' },
]
const recordColumns = [
  { key: 'date', label: '日期' },
  { key: 'employeeId', label: '員工編號' },
  { key: 'employeeName', label: '姓名' },
  { key: 'department', label: '部門' },
  { key: 'checkInTime', label: '上班時間' },
  { key: 'checkOutTime', label: '下班時間' },
  { key: 'workHours', label: '工作時數' },
  { key: 'overtimeHours', label: '加班時數' },
  { key: 'status', label: '狀態' },
]

async function refreshAttendance() {
  loading.value = true
  try {
    const date = recordDate.value || toDateKey(new Date())
    const [staffResponse, recordResponse, segmentResponse] = await Promise.all([
      apiGet<Staff[]>(API_CONFIG.HR.STAFF_ALL),
      apiGet<AttendRecord[] | { data: AttendRecord[] }>(API_CONFIG.HR.ATTEND_RECORD, { startDate: date, endDate: date }),
      apiGet<Segment[] | { data: Segment[] }>(API_CONFIG.HR.STAFF_SEGMENT, { page: 1, limit: 100 }),
    ])
    staffList.value = getApiItems(staffResponse).filter((staff) => staff.need_check !== false)
    segments.value = getApiItems(segmentResponse)
    const records = getApiItems(recordResponse)
    const rows = staffList.value.map((staff) => buildRow(staff, records.filter((record) => record.staffId === staff.id), date))
    todayAttendance.value = rows
    attendanceRecords.value = rows
    updateStatistics(rows)
  } finally {
    loading.value = false
  }
}

function buildRow(staff: Staff, records: AttendRecord[], date: string): AttendanceRow {
  const sorted = [...records].sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime())
  const checkIn = sorted.find((record) => record.attendType === 1)
  const checkOut = sorted.find((record) => record.attendType === 2 && (!checkIn || new Date(record.createTime) > new Date(checkIn.createTime)))
  const staffSegments = segments.value
    .filter((item) => item.staffId === staff.id && (!item.create_date || item.create_date <= date))
    .sort((a, b) => (b.create_date || '').localeCompare(a.create_date || ''))
  const segment = staffSegments[0]
  const checkInTime = checkIn ? formatTime(checkIn.createTime) : ''
  const checkOutTime = checkOut ? formatTime(checkOut.createTime) : ''
  const workHours = checkIn && checkOut ? Math.max(0, (new Date(checkOut.createTime).getTime() - new Date(checkIn.createTime).getTime()) / 3600000) : 0
  const expected = segment?.begain_time?.slice(0, 5) || '09:00'
  const late = checkInTime ? timeToMinutes(checkInTime) > timeToMinutes(expected) : false
  const status = !checkIn ? 'absent' : !checkOut ? 'incomplete' : late ? 'late' : 'present'
  const statusText = { present: '正常', late: '遲到', absent: '缺勤', incomplete: '未完成' }[status]
  const standardHours = segment ? scheduledHours(segment) : 8
  return {
    id: `${staff.id}-${date}`,
    date,
    employeeId: staff.id,
    employeeName: staff.name,
    department: staff.department || '未分部門',
    checkInTime,
    checkOutTime,
    workHours: workHours ? workHours.toFixed(2) : '',
    overtimeHours: workHours > standardHours ? (workHours - standardHours).toFixed(2) : '0',
    status,
    statusText,
    notes: '',
  }
}

function updateStatistics(rows: AttendanceRow[]) {
  const present = rows.filter((row) => row.status === 'present' || row.status === 'late' || row.status === 'incomplete').length
  const late = rows.filter((row) => row.status === 'late').length
  attendanceStats.value = { totalStaff: rows.length, present, late, absent: rows.filter((row) => row.status === 'absent').length }
  const byDepartment = new Map<string, AttendanceRow[]>()
  rows.forEach((row) => byDepartment.set(row.department, [...(byDepartment.get(row.department) || []), row]))
  departmentStats.value = Array.from(byDepartment, ([name, departmentRows]) => ({
    name,
    attendanceRate: departmentRows.length ? Number(((departmentRows.filter((row) => row.status !== 'absent').length / departmentRows.length) * 100).toFixed(1)) : 0,
  }))
  lateStats.value = rows.filter((row) => row.status === 'late').map((row) => ({ employeeId: row.employeeId, employeeName: row.employeeName, lateCount: 1 }))
  overtimeStats.value = rows.filter((row) => Number(row.overtimeHours) > 0).map((row) => ({ employeeId: row.employeeId, employeeName: row.employeeName, totalHours: Number(row.overtimeHours) }))
}

function scheduledHours(segment: Segment) {
  const [startHour, startMinute] = segment.begain_time.split(':').map(Number)
  const [endHour, endMinute] = segment.end_time.split(':').map(Number)
  let minutes = endHour * 60 + endMinute - startHour * 60 - startMinute
  if (minutes < 0) minutes += 24 * 60
  return Math.max(0, minutes / 60 - (segment.rest_time || 0) / 60)
}

function formatTime(value: string) { return new Date(value).toISOString().slice(11, 16) }
function timeToMinutes(value: string) { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute }
function toDateKey(value: Date) { return value.toISOString().slice(0, 10) }

onMounted(refreshAttendance)
</script>

<style scoped>
.attendance-page { width: 100%; margin: 0 auto; }
.attendance-overview { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.overview-card, .report-card { background: white; padding: 1.25rem; border-radius: var(--border-radius-lg); box-shadow: var(--shadow); }
.overview-card strong { display: block; font-size: var(--font-size-2xl); color: var(--secondary-900); }
.overview-card span { color: var(--secondary-600); }
.attendance-content { background: white; border-radius: var(--border-radius-lg); box-shadow: var(--shadow); overflow: hidden; }
.content-tabs { display: flex; border-bottom: 1px solid var(--secondary-200); background: var(--secondary-50); }
.tab-btn { border: 0; background: none; padding: 1rem 1.5rem; cursor: pointer; color: var(--secondary-600); }
.tab-btn.active { color: var(--primary-700); border-bottom: 3px solid var(--primary-500); }
.tab-content { padding: 1rem; }
.reports-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
.empty-state { padding: 2rem; text-align: center; color: var(--secondary-600); }
.badge { padding: .25rem .5rem; border-radius: var(--border-radius); }
.badge-present { background: var(--success-100); color: var(--success-700); }
.badge-late, .badge-incomplete { background: var(--warning-100); color: var(--warning-700); }
.badge-absent { background: var(--danger-100); color: var(--danger-700); }
</style>
