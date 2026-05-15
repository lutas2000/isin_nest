<template>
  <Modal
    :show="show"
    title="編輯員工"
    max-width-class="max-w-3xl"
    @close="handleClose"
  >
    <form id="staff-edit-form" class="space-y-6" @submit.prevent="updateStaff">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label class="form-label">員工編號</label>
          <input
            type="text"
            class="form-control"
            v-model="editingStaff.id"
            readonly
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="form-label">姓名 *</label>
          <input
            type="text"
            class="form-control"
            v-model="editingStaff.name"
            required
            maxlength="50"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label class="form-label">職稱</label>
          <input
            type="text"
            class="form-control"
            v-model="editingStaff.post"
            maxlength="50"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="form-label">工作組別</label>
          <input
            type="text"
            class="form-control"
            v-model="editingStaff.work_group"
            maxlength="20"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label class="form-label">部門</label>
          <input
            type="text"
            class="form-control"
            v-model="editingStaff.department"
            list="staff-edit-department-options"
            placeholder="輸入或選擇部門"
          />
          <datalist id="staff-edit-department-options">
            <option
              v-for="dept in departmentOptions"
              :key="dept"
              :value="dept"
            />
          </datalist>
        </div>
        <div class="flex flex-col gap-1">
          <label class="form-label">到職日期</label>
          <input
            type="date"
            class="form-control"
            v-model="editingStaff.begain_work"
            @change="handleDateChange('begain_work')"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label class="form-label">離職日期</label>
          <input
            type="date"
            class="form-control"
            v-model="editingStaff.stop_work"
            @change="handleDateChange('stop_work')"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="form-label">本薪 *</label>
          <input
            type="number"
            class="form-control"
            v-model="editingStaff.wage"
            required
            min="0"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label class="form-label">勤務津貼</label>
          <input
            type="number"
            class="form-control"
            v-model="editingStaff.allowance"
            min="0"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="form-label">幹部加給</label>
          <input
            type="number"
            class="form-control"
            v-model="editingStaff.organizer"
            min="0"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label class="form-label">勞保</label>
          <input
            type="number"
            class="form-control"
            v-model="editingStaff.labor_insurance"
            min="0"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="form-label">健保</label>
          <input
            type="number"
            class="form-control"
            v-model="editingStaff.health_insurance"
            min="0"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label class="form-label">退休提撥</label>
          <input
            type="number"
            class="form-control"
            v-model="editingStaff.pension"
            min="0"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="form-label">是否為外勞</label>
          <select class="form-control" v-model="editingStaff.is_foreign">
            <option :value="false">否</option>
            <option :value="true">是</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label class="form-label">是否參加福委會</label>
          <select class="form-control" v-model="editingStaff.benifit">
            <option :value="false">否</option>
            <option :value="true">是</option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="form-label">是否需要打卡</label>
          <select class="form-control" v-model="editingStaff.need_check">
            <option :value="true">是</option>
            <option :value="false">否</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1">
          <label class="form-label">是否需要外帳</label>
          <select class="form-control" v-model="editingStaff.have_fake">
            <option :value="false">否</option>
            <option :value="true">是</option>
          </select>
        </div>
      </div>
    </form>
    <template #footer>
      <button type="button" class="btn btn-outline" @click="handleClose">
        取消
      </button>
      <button
        type="submit"
        class="btn btn-primary"
        form="staff-edit-form"
        :disabled="saving"
      >
        {{ saving ? '更新中...' : '更新員工' }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Modal } from '@/components';
import { useErrorStore } from '@/stores/error';

export interface StaffEditRecord {
  id: string;
  name: string;
  post: string;
  work_group: string;
  department: string;
  wage: number;
  allowance: number;
  organizer: number;
  labor_insurance: number;
  health_insurance: number;
  pension: number;
  is_foreign: boolean;
  benifit: boolean;
  need_check: boolean;
  begain_work: string | null;
  stop_work: string | null;
  have_fake: boolean;
  userId?: number | null;
}

const props = defineProps<{
  show: boolean;
  staff: StaffEditRecord | null;
  departmentOptions: string[];
}>();

const emit = defineEmits<{
  close: [];
  updated: [staff: StaffEditRecord];
}>();

const errorStore = useErrorStore();

const emptyStaff = (): StaffEditRecord => ({
  id: '',
  name: '',
  post: '',
  work_group: '',
  department: '',
  wage: 0,
  allowance: 0,
  organizer: 0,
  labor_insurance: 0,
  health_insurance: 0,
  pension: 0,
  is_foreign: false,
  benifit: false,
  need_check: true,
  begain_work: null,
  stop_work: null,
  have_fake: false,
});

const editingStaff = ref<StaffEditRecord>(emptyStaff());
const saving = ref(false);

const formatDateForInput = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getTodayDateKey = (): string => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isStopWorkOnOrBeforeToday = (stopWork: string | null): boolean => {
  if (!stopWork) return false;
  return stopWork <= getTodayDateKey();
};

watch(
  () => [props.show, props.staff] as const,
  ([show, staff]) => {
    if (show && staff) {
      editingStaff.value = {
        ...staff,
        begain_work: formatDateForInput(staff.begain_work),
        stop_work: formatDateForInput(staff.stop_work),
      };
    }
  },
);

const handleClose = () => {
  emit('close');
};

const handleDateChange = (field: 'begain_work' | 'stop_work') => {
  if (editingStaff.value[field] === '') {
    editingStaff.value[field] = null;
  }
};

const buildUpdatePayload = (staff: StaffEditRecord) => {
  const payload = { ...staff };
  if (payload.begain_work === '') payload.begain_work = null;
  if (payload.stop_work === '') payload.stop_work = null;
  delete payload.userId;
  return payload;
};

const updateStaff = async () => {
  errorStore.clearError();

  const staffId = editingStaff.value.id;
  const hasLinkedUser = editingStaff.value.userId != null;
  const shouldPromptDeleteUser =
    hasLinkedUser && isStopWorkOnOrBeforeToday(editingStaff.value.stop_work);

  let deleteUserAfterUpdate = false;
  if (shouldPromptDeleteUser) {
    deleteUserAfterUpdate = window.confirm(
      '離職日期為今天或更早，是否要刪除該員工的系統登入帳號？\n（員工資料仍會保留）',
    );
  }

  saving.value = true;
  try {
    const response = await fetch(`/api/staffs/${staffId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildUpdatePayload(editingStaff.value)),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      errorStore.showError(errorData.message || '更新員工失敗，請稍後再試');
      return;
    }

    let updatedStaff: StaffEditRecord = await response.json();

    if (deleteUserAfterUpdate && updatedStaff.userId != null) {
      const deleteUserResponse = await fetch(`/api/staffs/${staffId}/delete-user`, {
        method: 'POST',
      });

      if (deleteUserResponse.ok) {
        updatedStaff = await deleteUserResponse.json();
      } else {
        const errorData = await deleteUserResponse.json().catch(() => ({}));
        errorStore.showError(
          errorData.message ||
            '員工資料已更新，但刪除登入帳號失敗，請稍後再試',
        );
      }
    }

    emit('updated', updatedStaff);
    emit('close');
  } catch (error) {
    console.error('更新員工失敗:', error);
    errorStore.showError('網路連線錯誤，請檢查網路連線後再試');
  } finally {
    saving.value = false;
  }
};
</script>
