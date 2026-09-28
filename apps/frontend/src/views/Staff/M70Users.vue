<template>
  <div class="m70-page">
    <header class="heading">
      <div>
        <h1>M70 員工對照</h1>
        <p>Machine ID 對應舊 MariaDB 員工；儲存與刪除只影響對照表。</p>
      </div>
      <button :disabled="busy" @click="sync">從 M70 同步</button>
    </header>

    <div class="toolbar">
      <label>Machine ID <input v-model="newId" type="number" min="0" step="1" /></label>
      <label>員工
        <select v-model="newStaffId">
          <option value="">未連結</option>
          <option v-for="staff in staffOptions" :key="staff.id" :value="staff.id">{{ staff.name }}（{{ staff.id }}）</option>
        </select>
      </label>
      <button :disabled="busy || !newId" @click="create">新增對照</button>
    </div>

    <p v-if="message" class="message">{{ message }}</p>
    <p v-if="loading">載入中…</p>
    <div v-else class="table-wrap">
      <table>
        <thead><tr><th>Machine ID</th><th>M70 姓名</th><th>舊庫員工</th><th>紀錄姓名</th><th>設備狀態</th><th>最後同步</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="row in rows" :key="row.machine_id">
            <td>{{ row.machine_id }}</td>
            <td>{{ row.device_name || '—' }}</td>
            <td>
              <select v-model="row.staff_id" :disabled="busy">
                <option :value="null">未連結</option>
                <option v-for="staff in staffOptions" :key="staff.id" :value="staff.id">{{ staff.name }}（{{ staff.id }}）</option>
              </select>
            </td>
            <td>{{ row.record_name || '—' }}</td>
            <td>{{ row.present_on_device ? '設備中' : '設備未見' }}</td>
            <td>{{ row.last_synced_at || '—' }}</td>
            <td class="actions">
              <button :disabled="busy" @click="save(row)">儲存</button>
              <button :disabled="busy || !row.present_on_device" @click="rename(row)">改 M70 姓名</button>
              <button :disabled="busy" class="danger" @click="remove(row)">刪除對照</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="hint">刪除對照不會刪除設備員工；下次同步會將仍在設備上的 ID 重建為未連結。修改 M70 姓名需按「改 M70 姓名」，並會檢查打卡紀錄是否保持不變。</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiDelete, apiGet, apiPatch, apiPost } from '../../services/api'

interface Staff { id: string; name: string }
interface Mapping {
  machine_id: number
  device_name: string | null
  staff_id: string | null
  staff_name: string | null
  record_name: string | null
  present_on_device: number
  last_synced_at: string | null
}
const rows = ref<Mapping[]>([])
const staffOptions = ref<Staff[]>([])
const newId = ref('')
const newStaffId = ref('')
const loading = ref(true)
const busy = ref(false)
const message = ref('')
const base = '/staff/m70-users'

async function load() {
  const [mappings, staff] = await Promise.all([
    apiGet<Mapping[]>(base), apiGet<Staff[]>(`${base}/staff-options`),
  ])
  rows.value = mappings
  staffOptions.value = staff
}
async function action(run: () => Promise<void>) {
  busy.value = true
  message.value = ''
  try { await run(); await load() } finally { busy.value = false }
}
async function sync() {
  await action(async () => {
    const result = await apiPost<{ read: number; linked: number; unlinked: number }>(`${base}/sync`)
    message.value = `同步 ${result.read} 人；已連結 ${result.linked} 人，未連結 ${result.unlinked} 人。`
  })
}
async function create() {
  await action(async () => {
    await apiPost(base, { machine_id: Number(newId.value), staff_id: newStaffId.value || null })
    newId.value = ''
    newStaffId.value = ''
    message.value = '對照已新增。'
  })
}
async function save(row: Mapping) {
  await action(async () => {
    await apiPatch(`${base}/${row.machine_id}`, { staff_id: row.staff_id })
    message.value = `Machine ID ${row.machine_id} 已儲存。`
  })
}
async function remove(row: Mapping) {
  if (!window.confirm(`刪除 Machine ID ${row.machine_id} 的 MariaDB 對照？`)) return
  await action(async () => {
    await apiDelete(`${base}/${row.machine_id}`)
    message.value = '對照已刪除。'
  })
}
async function rename(row: Mapping) {
  const name = window.prompt(`修改 M70 Machine ID ${row.machine_id} 的設備姓名`, row.device_name || '')
  if (!name || name === row.device_name) return
  if (!window.confirm(`確定將 M70 設備上的 ${row.device_name} 改為 ${name}？`)) return
  await action(async () => {
    await apiPost(`${base}/${row.machine_id}/rename-device`, { name })
    message.value = `M70 姓名已改為 ${name}；打卡紀錄與未讀數未變。`
  })
}
onMounted(async () => { try { await load() } finally { loading.value = false } })
</script>

<style scoped>
.m70-page { padding: 1.5rem; }
.heading, .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
h1 { font-size: 1.5rem; font-weight: 700; }
p { color: #475569; }
.toolbar { justify-content: flex-start; padding: 1rem; background: white; border-radius: .5rem; }
.toolbar label { display: flex; align-items: center; gap: .5rem; }
input, select { border: 1px solid #cbd5e1; border-radius: .375rem; padding: .4rem .5rem; background: white; }
button { padding: .45rem .7rem; border-radius: .375rem; background: #1d4ed8; color: white; }
button:disabled { opacity: .5; cursor: default; }
button.danger { background: #b91c1c; }
.table-wrap { overflow-x: auto; background: white; border-radius: .5rem; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th, td { padding: .75rem; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
th { background: #f1f5f9; }
.actions { display: flex; gap: .4rem; }
.message { margin-bottom: 1rem; color: #166534; }
.hint { margin-top: 1rem; font-size: .875rem; }
</style>
