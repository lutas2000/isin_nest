<template>
  <div class="leave-page">
    <TableHeader :border="false">
      <template #actions>
        <button class="btn btn-primary" @click="showCreateModal = true">新增請假</button>
        <button class="btn btn-outline" @click="loadLeaveData">重新整理</button>
      </template>
    </TableHeader>

    <div class="leave-overview">
      <div class="overview-card"><strong>{{ leaveStats.pendingCount }}</strong><span>待審核</span></div>
      <div class="overview-card"><strong>{{ leaveStats.approvedCount }}</strong><span>已核准</span></div>
      <div class="overview-card"><strong>{{ leaveStats.rejectedCount }}</strong><span>已拒絕</span></div>
      <div class="overview-card"><strong>{{ leaveStats.totalDays }}</strong><span>總請假天數</span></div>
    </div>

    <div class="leave-content">
      <div class="content-tabs">
        <button v-for="tab in tabs" :key="tab.id" class="tab-btn" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">{{ tab.label }}</button>
      </div>

      <div v-if="activeTab === 'applications'" class="tab-content">
        <SectionHeader title="請假申請">
          <template #actions>
            <input v-model="applicationSearch" class="form-control" placeholder="搜尋員工姓名或編號..." />
            <select v-model="applicationStatus" class="form-control">
              <option value="">全部狀態</option>
              <option value="pending">待審核</option>
              <option value="approved">已核准</option>
              <option value="rejected">已拒絕</option>
            </select>
            <select v-model="leaveType" class="form-control">
              <option value="">全部類型</option>
              <option v-for="type in leaveTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </template>
        </SectionHeader>
        <div v-if="loading" class="empty-state">載入中...</div>
        <EditableDataTable v-else :columns="applicationColumns" :data="filteredApplications" :show-actions="true" :editable="false">
          <template #cell-leaveTypeText="{ row }"><span class="badge badge-info">{{ row.leaveTypeText }}</span></template>
          <template #cell-days="{ value }">{{ value }} 天</template>
          <template #cell-statusText="{ row }"><span class="badge" :class="`badge-${row.status}`">{{ row.statusText }}</span></template>
          <template #actions="{ row }">
            <div class="action-buttons">
              <button v-if="row.status === 'pending'" class="btn btn-sm btn-success" @click="reviewLeave(row.id, 'approve')">核准</button>
              <button v-if="row.status === 'pending'" class="btn btn-sm btn-danger" @click="reviewLeave(row.id, 'reject')">拒絕</button>
            </div>
          </template>
        </EditableDataTable>
      </div>

      <div v-if="activeTab === 'statistics'" class="tab-content">
        <SectionHeader title="請假統計" />
        <div class="statistics-grid">
          <div class="stat-card"><h4>請假類型統計</h4><p v-for="item in leaveTypeStats" :key="item.name">{{ item.name }}：{{ item.count }} 次／{{ item.totalDays }} 天</p></div>
          <div class="stat-card"><h4>部門請假統計</h4><p v-for="item in deptLeaveStats" :key="item.name">{{ item.name }}：{{ item.leaveCount }} 次／{{ item.totalDays }} 天</p></div>
        </div>
      </div>

      <div v-if="activeTab === 'policies'" class="tab-content">
        <SectionHeader title="請假政策" />
        <div class="policies-grid"><div v-for="policy in leavePolicies" :key="policy.type" class="policy-card"><h4>{{ policy.name }}</h4><p>{{ policy.description }}</p><span>年度配額：{{ policy.annualQuota }} 天</span></div></div>
      </div>
    </div>

    <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header"><h3>新增請假</h3><button class="modal-close" @click="showCreateModal = false">×</button></div>
        <form class="modal-form" @submit.prevent="createLeave">
          <label>員工<select v-model="createForm.staff_id" class="form-control" required><option value="">請選擇員工</option><option v-for="staff in staffList" :key="staff.id" :value="staff.id">{{ staff.id }} - {{ staff.name }}</option></select></label>
          <label>假別<input v-model="createForm.type" class="form-control" required placeholder="例如：特休" /></label>
          <label>開始時間<input v-model="createForm.start_time" class="form-control" type="datetime-local" required /></label>
          <label>結束時間<input v-model="createForm.end_time" class="form-control" type="datetime-local" required /></label>
          <div class="form-actions"><button type="button" class="btn btn-outline" @click="showCreateModal = false">取消</button><button type="submit" class="btn btn-primary">送出申請</button></div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { EditableDataTable, SectionHeader, TableHeader } from '@/components'
import { apiGet, apiPost, getApiItems } from '@/services/api'
import { API_CONFIG } from '@/config/api'

type LeaveStatus = 'pending' | 'approved' | 'rejected'
interface Staff { id: string; name: string; department?: string }
interface StaffLeaveApi { id: number; staff_id: string; staff?: Staff; type: string; start_time: string; end_time: string; time: number; status?: LeaveStatus; verify_note?: string }
interface LeaveApplication { id: number; applyDate: string; employeeId: string; employeeName: string; department: string; leaveType: string; leaveTypeText: string; startDate: string; endDate: string; days: number; reason: string; status: LeaveStatus; statusText: string }

const tabs = [{ id: 'applications', label: '請假申請' }, { id: 'statistics', label: '請假統計' }, { id: 'policies', label: '請假政策' }]
const activeTab = ref('applications')
const loading = ref(false)
const applicationSearch = ref('')
const applicationStatus = ref('')
const leaveType = ref('')
const showCreateModal = ref(false)
const staffList = ref<Staff[]>([])
const leaveApplications = ref<LeaveApplication[]>([])
const createForm = ref({ staff_id: '', type: '', start_time: '', end_time: '' })
const statusText: Record<LeaveStatus, string> = { pending: '待審核', approved: '已核准', rejected: '已拒絕' }

const leaveStats = computed(() => ({
  pendingCount: leaveApplications.value.filter((item) => item.status === 'pending').length,
  approvedCount: leaveApplications.value.filter((item) => item.status === 'approved').length,
  rejectedCount: leaveApplications.value.filter((item) => item.status === 'rejected').length,
  totalDays: Number((leaveApplications.value.reduce((sum, item) => sum + item.days, 0)).toFixed(2)),
}))
const leaveTypes = computed(() => Array.from(new Set(leaveApplications.value.map((item) => item.leaveType))).sort())
const filteredApplications = computed(() => {
  const search = applicationSearch.value.toLowerCase()
  return leaveApplications.value.filter((item) => {
    const matchesSearch = !search || item.employeeId.toLowerCase().includes(search) || item.employeeName.toLowerCase().includes(search)
    return matchesSearch && (!applicationStatus.value || item.status === applicationStatus.value) && (!leaveType.value || item.leaveType === leaveType.value)
  })
})
const applicationColumns = [
  { key: 'applyDate', label: '申請日期' }, { key: 'employeeName', label: '員工姓名' }, { key: 'leaveTypeText', label: '請假類型' },
  { key: 'startDate', label: '開始' }, { key: 'endDate', label: '結束' }, { key: 'days', label: '請假天數' }, { key: 'reason', label: '備註' }, { key: 'statusText', label: '狀態' },
]
const leaveTypeStats = computed(() => Array.from(new Set(leaveApplications.value.map((item) => item.leaveType))).map((name) => {
  const items = leaveApplications.value.filter((item) => item.leaveType === name)
  return { name, count: items.length, totalDays: Number(items.reduce((sum, item) => sum + item.days, 0).toFixed(2)) }
}))
const deptLeaveStats = computed(() => Array.from(new Set(leaveApplications.value.map((item) => item.department))).map((name) => {
  const items = leaveApplications.value.filter((item) => item.department === name)
  return { name, leaveCount: items.length, totalDays: Number(items.reduce((sum, item) => sum + item.days, 0).toFixed(2)) }
}))
const leavePolicies = [
  { type: 'annual', name: '年假', description: '年度休假', annualQuota: 14 },
  { type: 'sick', name: '病假', description: '因病無法工作時使用', annualQuota: 30 },
  { type: 'personal', name: '事假', description: '個人事務使用', annualQuota: 7 },
]

async function loadLeaveData() {
  loading.value = true
  try {
    const [leaveResponse, staffResponse] = await Promise.all([
      apiGet<StaffLeaveApi[] | { data: StaffLeaveApi[] }>(API_CONFIG.HR.STAFF_LEAVE, { page: 1, limit: 100 }),
      apiGet<Staff[]>(API_CONFIG.HR.STAFF_ALL),
    ])
    staffList.value = getApiItems(staffResponse)
    leaveApplications.value = getApiItems(leaveResponse).map(toApplication)
  } finally {
    loading.value = false
  }
}

function toApplication(item: StaffLeaveApi): LeaveApplication {
  const status = item.status || 'pending'
  return {
    id: item.id, applyDate: dateKey(item.start_time), employeeId: item.staff_id, employeeName: item.staff?.name || item.staff_id,
    department: item.staff?.department || '未分部門', leaveType: item.type, leaveTypeText: item.type, startDate: formatDateTime(item.start_time), endDate: formatDateTime(item.end_time),
    days: Number(((item.time || 0) / 8).toFixed(2)), reason: item.verify_note || '-', status, statusText: statusText[status],
  }
}

async function createLeave() {
  await apiPost(API_CONFIG.HR.STAFF_LEAVE, { staff_id: createForm.value.staff_id, type: createForm.value.type, start_time: new Date(createForm.value.start_time).toISOString(), end_time: new Date(createForm.value.end_time).toISOString() })
  createForm.value = { staff_id: '', type: '', start_time: '', end_time: '' }
  showCreateModal.value = false
  await loadLeaveData()
}

async function reviewLeave(id: number, action: 'approve' | 'reject') {
  if (!confirm(action === 'approve' ? '確定核准這筆請假？' : '確定拒絕這筆請假？')) return
  await apiPost(`${API_CONFIG.HR.STAFF_LEAVE}/${id}/${action}`, {})
  await loadLeaveData()
}

function dateKey(value: string) { return new Date(value).toISOString().slice(0, 10) }
function formatDateTime(value: string) { return new Date(value).toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' }) }

onMounted(loadLeaveData)
</script>

<style scoped>
.leave-page { width: 100%; margin: 0 auto; }
.leave-overview { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.overview-card, .stat-card, .policy-card { background: white; padding: 1.25rem; border-radius: var(--border-radius-lg); box-shadow: var(--shadow); }
.overview-card strong { display: block; font-size: var(--font-size-2xl); color: var(--secondary-900); }
.overview-card span { color: var(--secondary-600); }
.leave-content { background: white; border-radius: var(--border-radius-lg); box-shadow: var(--shadow); overflow: hidden; }
.content-tabs { display: flex; border-bottom: 1px solid var(--secondary-200); background: var(--secondary-50); }
.tab-btn { border: 0; background: none; padding: 1rem 1.5rem; cursor: pointer; color: var(--secondary-600); }
.tab-btn.active { color: var(--primary-700); border-bottom: 3px solid var(--primary-500); }
.tab-content { padding: 1rem; }
.statistics-grid, .policies-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }
.empty-state { padding: 2rem; text-align: center; color: var(--secondary-600); }
.badge { padding: .25rem .5rem; border-radius: var(--border-radius); }
.badge-pending { background: var(--warning-100); color: var(--warning-700); }
.badge-approved { background: var(--success-100); color: var(--success-700); }
.badge-rejected { background: var(--danger-100); color: var(--danger-700); }
.badge-info { background: var(--info-100); color: var(--info-700); }
.action-buttons { display: flex; gap: .5rem; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: white; border-radius: var(--border-radius-lg); width: min(520px, 90%); padding: 1.25rem; }
.modal-header, .form-actions { display: flex; justify-content: space-between; align-items: center; gap: .75rem; }
.modal-form { display: grid; gap: 1rem; }
.modal-form label { display: grid; gap: .35rem; }
.modal-close { border: 0; background: none; font-size: 1.5rem; cursor: pointer; }
</style>
