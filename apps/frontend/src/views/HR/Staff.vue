<template>
  <div class="mx-auto w-full">
    <!-- 上鎖畫面 -->
    <div
      v-if="isLocked"
      class="flex min-h-[60vh] items-center justify-center px-4"
    >
      <div
        class="w-full max-w-md rounded-lg border border-secondary-200 bg-white p-8 shadow-lg"
      >
        <h2 class="m-0 text-xl font-semibold text-secondary-900">
          員工管理 - 已上鎖
        </h2>
        <p class="mb-6 mt-2 text-secondary-600">
          請輸入解鎖密碼以檢視員工資料
        </p>
        <div class="flex flex-col gap-3">
          <label class="form-label">解鎖密碼</label>
          <input
            v-model="passwordInput"
            type="password"
            class="form-control"
            placeholder="請輸入解鎖密碼"
            @keyup.enter="tryUnlock"
          />
          <p v-if="passwordError" class="text-sm text-danger-600">
            {{ passwordError }}
          </p>
          <div class="form-actions !mt-4 !border-t-0 !pt-0">
            <button class="btn btn-primary" type="button" @click="tryUnlock">
              解鎖
            </button>
          </div>
          <p class="mt-2 text-xs text-secondary-500">
            此頁面若超過 5 分鐘未操作，將自動再次上鎖。
          </p>
        </div>
      </div>
    </div>

    <!-- 主要內容（解鎖後顯示） -->
    <div v-else class="space-y-0">
      <div class="overflow-hidden rounded-lg bg-white shadow">
        <TableHeader title="員工列表">
          <template #actions>
            <button class="btn btn-primary" type="button" @click="showAddModal = true">
              <span class="mr-2">👤</span>
              新增員工
            </button>
            <input
              v-model="staffSearch"
              type="text"
              class="form-control min-w-[200px] md:min-w-0"
              placeholder="搜尋員工姓名或編號..."
            />
            <select v-model="departmentFilter" class="form-control min-w-[140px] md:min-w-0">
              <option value="">全部部門</option>
              <option
                v-for="dept in departmentOptions"
                :key="dept"
                :value="dept"
              >
                {{ dept }}
              </option>
            </select>
            <select v-model="statusFilter" class="form-control min-w-[120px] md:min-w-0">
              <option value="">全部狀態</option>
              <option value="active">在職</option>
              <option value="resigned">離職</option>
            </select>
          </template>
        </TableHeader>

        <EditableDataTable
          row-key="id"
          :columns="tableColumns"
          :data="filteredStaff"
          :show-actions="true"
          :editable="false"
          :auto-focus-on-mount="false"
          @row-view="viewStaff"
          @row-edit="(row) => editStaff(row)"
        >
          <template #cell-id="{ row, value }">
            <button
              type="button"
              class="cursor-pointer border-0 bg-transparent p-0 font-medium text-primary-600 underline-offset-2 hover:text-primary-700 hover:underline"
              @click="viewStaff(row)"
            >
              {{ value }}
            </button>
          </template>

          <template #cell-name="{ row }">
            <div class="flex items-center gap-3">
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-lg font-semibold text-white"
              >
                {{ row.name.charAt(0) }}
              </span>
              <div class="min-w-0">
                <button
                  type="button"
                  class="block cursor-pointer border-0 bg-transparent p-0 text-left font-medium text-secondary-900 hover:text-primary-600 hover:underline"
                  @click="viewStaff(row)"
                >
                  {{ row.name }}
                </button>
                <span
                  v-if="row.is_foreign"
                  class="mt-0.5 block text-xs text-secondary-500"
                >
                  外勞
                </span>
              </div>
            </div>
          </template>

          <template #cell-post="{ value }">
            <span class="text-secondary-700">{{ value || '-' }}</span>
          </template>

          <template #cell-department="{ value }">
            <span class="text-secondary-700">{{ value || '-' }}</span>
          </template>

          <template #cell-work_group="{ value }">
            <span class="text-secondary-700">{{ value || '-' }}</span>
          </template>

          <template #cell-wage="{ value }">
            <span class="tabular-nums text-secondary-900">
              {{ value != null ? Number(value).toLocaleString() : '-' }}
            </span>
          </template>

          <template #cell-begain_work="{ value }">
            <span class="text-secondary-700">{{ formatDate(value) }}</span>
          </template>

          <template #actions="{ row, isEditing }">
            <template v-if="!isEditing">
              <span class="dropdown-item" @click="viewStaff(row)">查看詳情</span>
              <span class="dropdown-item" @click="editStaff(row)">編輯</span>
            </template>
          </template>
        </EditableDataTable>
      </div>

      <Modal
        :show="showAddModal"
        title="新增員工"
        max-width-class="max-w-3xl"
        @close="showAddModal = false"
      >
        <form id="staff-add-form" class="space-y-6" @submit.prevent="addStaff">

          <!-- 用戶資訊區塊 -->
          <div class="space-y-4 border-b border-secondary-200 pb-6 last:border-b-0">
            <h4 class="mb-4 border-b-2 border-primary-500 pb-2 text-lg font-semibold text-secondary-800">用戶資訊</h4>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-1">
                <label class="form-label">員工編號 *</label>
                <input
                  type="text"
                  class="form-control"
                  v-model="newStaff.userName"
                  required
                  placeholder="請輸入員工編號"
                  @input="handleUserNameInput"
                />
                <small class="mt-1 block text-xs italic text-secondary-600">用於登入系統的ID</small>
              </div>
              <div class="flex flex-col gap-1">
                <label class="form-label">密碼 *</label>
                <input
                  type="password"
                  class="form-control"
                  v-model="newStaff.password"
                  required
                  placeholder="請輸入密碼"
                  minlength="6"
                />
                <small class="mt-1 block text-xs italic text-secondary-600">至少 6 個字符</small>
              </div>
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-1">
                <label class="form-label">是否為管理員</label>
                <select class="form-control" v-model="newStaff.isAdmin">
                  <option :value="false">否</option>
                  <option :value="true">是</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 員工資訊區塊 -->
          <div class="space-y-4 border-b border-secondary-200 pb-6 last:border-b-0">
            <h4 class="mb-4 border-b-2 border-primary-500 pb-2 text-lg font-semibold text-secondary-800">員工資訊</h4>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-1">
                <label class="form-label">姓名 *</label>
                <input
                  type="text"
                  class="form-control"
                  v-model="newStaff.name"
                  required
                  maxlength="50"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="form-label">職稱</label>
                <input
                  type="text"
                  class="form-control"
                  v-model="newStaff.post"
                  maxlength="50"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-1">
                <label class="form-label">工作組別</label>
                <input
                  type="text"
                  class="form-control"
                  v-model="newStaff.work_group"
                  maxlength="20"
                  placeholder="例如：A組、B組"
                />
                <small class="mt-1 block text-xs italic text-secondary-600">將根據工作組別自動分配預設權限</small>
              </div>
            <div class="flex flex-col gap-1">
              <label class="form-label">部門</label>
              <!-- 可手動輸入或從目前已存在部門中選擇 -->
              <input
                type="text"
                class="form-control"
                v-model="newStaff.department"
                list="department-options"
                placeholder="輸入或選擇部門"
              />
              <datalist id="department-options">
                <option
                  v-for="dept in departmentOptions"
                  :key="dept"
                  :value="dept"
                />
              </datalist>
            </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="flex flex-col gap-1">
                <label class="form-label">到職日期</label>
                <input
                  type="date"
                  class="form-control"
                  v-model="newStaff.begain_work"
                  @change="handleDateChange('begain_work')"
                />
              </div>
            </div>
          </div>

          <!-- 薪資資訊區塊 -->
          <div class="space-y-4 border-b border-secondary-200 pb-6 last:border-b-0">
            <h4 class="mb-4 border-b-2 border-primary-500 pb-2 text-lg font-semibold text-secondary-800">薪資資訊</h4>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1">
              <label class="form-label">本薪 *</label>
              <input
                type="number"
                class="form-control"
                v-model="newStaff.wage"
                required
                min="0"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="form-label">勤務津貼</label>
              <input
                type="number"
                class="form-control"
                v-model="newStaff.allowance"
                min="0"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1">
              <label class="form-label">幹部加給</label>
              <input
                type="number"
                class="form-control"
                v-model="newStaff.organizer"
                min="0"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="form-label">勞保</label>
              <input
                type="number"
                class="form-control"
                v-model="newStaff.labor_insurance"
                min="0"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1">
              <label class="form-label">健保</label>
              <input
                type="number"
                class="form-control"
                v-model="newStaff.health_insurance"
                min="0"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="form-label">退休提撥</label>
              <input
                type="number"
                class="form-control"
                v-model="newStaff.pension"
                min="0"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1">
              <label class="form-label">是否為外勞</label>
              <select class="form-control" v-model="newStaff.is_foreign">
                <option :value="false">否</option>
                <option :value="true">是</option>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="form-label">是否參加福委會</label>
              <select class="form-control" v-model="newStaff.benifit">
                <option :value="false">否</option>
                <option :value="true">是</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1">
              <label class="form-label">是否需要打卡</label>
              <select class="form-control" v-model="newStaff.need_check">
                <option :value="true">是</option>
                <option :value="false">否</option>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="form-label">是否需要外帳</label>
              <select class="form-control" v-model="newStaff.have_fake">
                <option :value="false">否</option>
                <option :value="true">是</option>
              </select>
            </div>
          </div>
          </div>

        </form>
        <template #footer>
          <button
            type="button"
            class="btn btn-outline"
            @click="showAddModal = false"
          >
            取消
          </button>
          <button type="submit" class="btn btn-primary" form="staff-add-form">
            新增員工
          </button>
        </template>
      </Modal>

      <!-- 編輯員工模態框 -->
      <Modal
        :show="showEditModal"
        title="編輯員工"
        max-width-class="max-w-3xl"
        @close="showEditModal = false"
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
              <!-- 可手動輸入或從目前已存在部門中選擇 -->
              <input
                type="text"
                class="form-control"
                v-model="editingStaff.department"
                list="department-options"
                placeholder="輸入或選擇部門"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="form-label">到職日期</label>
              <input
                type="date"
                class="form-control"
                v-model="editingStaff.begain_work"
                @change="handleEditDateChange('begain_work')"
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
                @change="handleEditDateChange('stop_work')"
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
          <button
            type="button"
            class="btn btn-outline"
            @click="showEditModal = false"
          >
            取消
          </button>
          <button type="submit" class="btn btn-primary" form="staff-edit-form">
            更新員工
          </button>
        </template>
      </Modal>

      <!-- 查看員工詳情模態框 -->
      <Modal
        :show="showViewModal"
        title="員工詳情"
        max-width-class="max-w-4xl"
        @close="showViewModal = false"
      >
          <div class="grid gap-6 md:grid-cols-2">
            <!-- 基本資訊 -->
            <div class="rounded-lg border border-secondary-200 bg-secondary-50 p-4">
              <h4 class="mb-4 border-b-2 border-primary-500 pb-2 text-lg font-semibold text-secondary-800">基本資訊</h4>
              <div class="flex items-center justify-between gap-4 border-b border-secondary-200 py-3 last:border-b-0">
                <div class="shrink-0 font-medium text-secondary-700">員工編號</div>
                <div class="text-right font-medium text-secondary-900">{{ viewingStaff.id }}</div>
              </div>
              <div class="flex items-center justify-between gap-4 border-b border-secondary-200 py-3 last:border-b-0">
                <div class="shrink-0 font-medium text-secondary-700">姓名</div>
                <div class="text-right font-medium text-secondary-900">{{ viewingStaff.name }}</div>
              </div>
              <div class="flex items-center justify-between gap-4 border-b border-secondary-200 py-3 last:border-b-0">
                <div class="shrink-0 font-medium text-secondary-700">職稱</div>
                <div class="text-right font-medium text-secondary-900">{{ viewingStaff.post || '-' }}</div>
              </div>
              <div class="flex items-center justify-between gap-4 border-b border-secondary-200 py-3 last:border-b-0">
                <div class="shrink-0 font-medium text-secondary-700">工作組別</div>
                <div class="text-right font-medium text-secondary-900">
                  {{ viewingStaff.work_group || '-' }}
                </div>
              </div>
              <div class="flex items-center justify-between gap-4 border-b border-secondary-200 py-3 last:border-b-0">
                <div class="shrink-0 font-medium text-secondary-700">部門</div>
                <div class="text-right font-medium text-secondary-900">
                  {{ viewingStaff.department || '-' }}
                </div>
              </div>
            </div>

            <!-- 薪資資訊 -->
            <div class="rounded-lg border border-secondary-200 bg-secondary-50 p-4">
              <h4 class="mb-4 border-b-2 border-primary-500 pb-2 text-lg font-semibold text-secondary-800">薪資資訊</h4>
              <div class="flex items-center justify-between gap-4 border-b border-secondary-200 py-3 last:border-b-0">
                <div class="shrink-0 font-medium text-secondary-700">本薪</div>
                <div class="text-right font-medium text-secondary-900">
                  {{ viewingStaff.wage?.toLocaleString() || '-' }}
                </div>
              </div>
              <div class="flex items-center justify-between gap-4 border-b border-secondary-200 py-3 last:border-b-0">
                <div class="shrink-0 font-medium text-secondary-700">勤務津貼</div>
                <div class="text-right font-medium text-secondary-900">
                  {{ viewingStaff.allowance?.toLocaleString() || '-' }}
                </div>
              </div>
              <div class="flex items-center justify-between gap-4 border-b border-secondary-200 py-3 last:border-b-0">
                <div class="shrink-0 font-medium text-secondary-700">幹部加給</div>
                <div class="text-right font-medium text-secondary-900">
                  {{ viewingStaff.organizer?.toLocaleString() || '-' }}
                </div>
              </div>
              <div class="flex items-center justify-between gap-4 border-b border-secondary-200 py-3 last:border-b-0">
                <div class="shrink-0 font-medium text-secondary-700">勞保</div>
                <div class="text-right font-medium text-secondary-900">
                  {{ viewingStaff.labor_insurance?.toLocaleString() || '-' }}
                </div>
              </div>
              <div class="flex items-center justify-between gap-4 border-b border-secondary-200 py-3 last:border-b-0">
                <div class="shrink-0 font-medium text-secondary-700">健保</div>
                <div class="text-right font-medium text-secondary-900">
                  {{ viewingStaff.health_insurance?.toLocaleString() || '-' }}
                </div>
              </div>
              <div class="flex items-center justify-between gap-4 border-b border-secondary-200 py-3 last:border-b-0">
                <div class="shrink-0 font-medium text-secondary-700">退休提撥</div>
                <div class="text-right font-medium text-secondary-900">
                  {{ viewingStaff.pension?.toLocaleString() || '-' }}
                </div>
              </div>
            </div>

            <!-- 工作資訊 -->
            <div class="rounded-lg border border-secondary-200 bg-secondary-50 p-4">
              <h4 class="mb-4 border-b-2 border-primary-500 pb-2 text-lg font-semibold text-secondary-800">工作資訊</h4>
              <div class="flex items-center justify-between gap-4 border-b border-secondary-200 py-3 last:border-b-0">
                <div class="shrink-0 font-medium text-secondary-700">到職日期</div>
                <div class="text-right font-medium text-secondary-900">
                  {{ formatDate(viewingStaff.begain_work) }}
                </div>
              </div>
              <div class="flex items-center justify-between gap-4 border-b border-secondary-200 py-3 last:border-b-0">
                <div class="shrink-0 font-medium text-secondary-700">離職日期</div>
                <div class="text-right font-medium text-secondary-900">
                  {{
                    viewingStaff.stop_work
                      ? formatDate(viewingStaff.stop_work)
                      : '-'
                  }}
                </div>
              </div>
              <div class="flex items-center justify-between gap-4 border-b border-secondary-200 py-3 last:border-b-0">
                <div class="shrink-0 font-medium text-secondary-700">狀態</div>
                <div class="text-right font-medium text-secondary-900">
                  {{ getStatusText(viewingStaff) }}
                </div>
              </div>
            </div>

            <!-- 其他設定 -->
            <div class="rounded-lg border border-secondary-200 bg-secondary-50 p-4">
              <h4 class="mb-4 border-b-2 border-primary-500 pb-2 text-lg font-semibold text-secondary-800">其他設定</h4>
              <div class="flex items-center justify-between gap-4 border-b border-secondary-200 py-3 last:border-b-0">
                <div class="shrink-0 font-medium text-secondary-700">是否為外勞</div>
                <div class="text-right font-medium text-secondary-900">
                  {{ viewingStaff.is_foreign ? '是' : '否' }}
                </div>
              </div>
              <div class="flex items-center justify-between gap-4 border-b border-secondary-200 py-3 last:border-b-0">
                <div class="shrink-0 font-medium text-secondary-700">是否參加福委會</div>
                <div class="text-right font-medium text-secondary-900">
                  {{ viewingStaff.benifit ? '是' : '否' }}
                </div>
              </div>

              <div class="flex items-center justify-between gap-4 border-b border-secondary-200 py-3 last:border-b-0">
                <div class="shrink-0 font-medium text-secondary-700">是否需要打卡</div>
                <div class="text-right font-medium text-secondary-900">
                  {{ viewingStaff.need_check ? '是' : '否' }}
                </div>
              </div>
            </div>
          </div>
        <template #footer>
          <button type="button" class="btn btn-outline" @click="showViewModal = false">
            關閉
          </button>
          <button type="button" class="btn btn-primary" @click="openEditFromView">
            編輯員工
          </button>
        </template>
      </Modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  EditableDataTable,
  Modal,
  TableHeader,
  type EditableColumn,
} from '@/components';
import { useErrorStore } from '@/stores/error';
import { apiPost } from '@/services/api';
import { API_CONFIG } from '@/config/api';

const errorStore = useErrorStore();

// 員工類型定義
interface Staff {
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
}

// 頁面鎖定相關
const isLocked = ref(true);
const passwordInput = ref('');
const passwordError = ref('');
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 分鐘
let idleTimer: ReturnType<typeof setTimeout> | null = null;

const lockScreen = () => {
  isLocked.value = true;
  passwordInput.value = '';
  passwordError.value = '';
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
};

const startIdleTimer = () => {
  if (idleTimer) {
    clearTimeout(idleTimer);
  }
  idleTimer = setTimeout(() => {
    lockScreen();
  }, IDLE_TIMEOUT);
};

const resetIdleTimer = () => {
  if (!isLocked.value) {
    startIdleTimer();
  }
};

const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];

const handleUserActivity = () => {
  resetIdleTimer();
};

const tryUnlock = async () => {
  passwordError.value = '';

  if (!passwordInput.value) {
    passwordError.value = '請輸入密碼';
    return;
  }

  try {
    const response = await fetch('/api/staffs/lock/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: passwordInput.value }),
    });

    if (!response.ok) {
      passwordError.value = '驗證失敗，請稍後再試';
      return;
    }

    const data = await response.json();
    if (data?.valid) {
      isLocked.value = false;
      passwordError.value = '';
      startIdleTimer();
    } else {
      passwordError.value = '密碼錯誤，請再試一次';
    }
  } catch (error) {
    console.error('解鎖驗證失敗:', error);
    passwordError.value = '網路錯誤，請稍後再試';
  }
};

// 搜尋和篩選
const staffSearch = ref('');
const departmentFilter = ref('');
const statusFilter = ref('active');

// 模態框控制
const showAddModal = ref(false);
const showEditModal = ref(false);
const showViewModal = ref(false);


// 新增員工表單（包含用戶資訊）
interface CreateStaffWithUser {
  // 用戶資訊
  userName: string;
  password: string;
  isAdmin?: boolean;
  // 員工資訊
  name: string;
  post?: string;
  work_group?: string;
  department?: string;
  wage?: number;
  allowance?: number;
  organizer?: number;
  labor_insurance?: number;
  health_insurance?: number;
  pension?: number;
  is_foreign?: boolean;
  benifit?: boolean;
  need_check?: boolean;
  begain_work?: string | null;
  stop_work?: string | null;
  have_fake?: boolean;
}

const newStaff = ref<CreateStaffWithUser>({
  userName: '',
  password: '',
  isAdmin: false,
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
  begain_work: new Date().toISOString().split('T')[0], // 預設為今天
  stop_work: null,
  have_fake: false,
});

// 編輯員工表單
const editingStaff = ref<Staff>({} as Staff);

// 查看員工詳情
const viewingStaff = ref<Staff>({} as Staff);

// 員工資料
const staffList = ref<Staff[]>([]);

// 載入員工資料
const loadStaffData = async () => {
  try {
    const response = await fetch('/api/staffs');
    if (response.ok) {
      const data = await response.json();
      // 確保最後一定是陣列，避免之後呼叫 push 時出現「不是函式」的錯誤
      const list =
        Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.items)
            ? (data as any).items
            : Array.isArray((data as any)?.data)
              ? (data as any).data
              : [];

      staffList.value = list;
    }
  } catch (error) {
    console.error('載入員工資料失敗:', error);
    // 使用模擬資料作為備用
    staffList.value = getMockStaffData();
  }
};

// 模擬員工資料（當 API 不可用時使用）
const getMockStaffData = () => [
  {
    id: 'STAFF001',
    name: '張小明',
    post: 'CNC操作員',
    work_group: 'A組',
    department: '生產部',
    wage: 35000,
    allowance: 5000,
    organizer: 0,
    labor_insurance: 2000,
    health_insurance: 1500,
    pension: 3000,
    is_foreign: false,
    benifit: true,
    need_check: true,
    begain_work: '2023-01-15',
    stop_work: null,
    have_fake: false,
  },
  {
    id: 'STAFF002',
    name: '李小華',
    post: '機械工程師',
    work_group: 'B組',
    department: '技術部',
    wage: 45000,
    allowance: 5000,
    organizer: 3000,
    labor_insurance: 2500,
    health_insurance: 1800,
    pension: 3500,
    is_foreign: false,
    benifit: true,
    need_check: true,
    begain_work: '2022-08-20',
    stop_work: null,
    have_fake: false,
  },
  {
    id: 'STAFF003',
    name: '王美玲',
    post: '業務專員',
    work_group: 'C組',
    department: '業務部',
    wage: 38000,
    allowance: 4000,
    organizer: 0,
    labor_insurance: 2200,
    health_insurance: 1600,
    pension: 3200,
    is_foreign: false,
    benifit: true,
    need_check: false,
    begain_work: '2023-03-10',
    stop_work: null,
    have_fake: false,
  },
  {
    id: 'STAFF004',
    name: '陳志強',
    post: '品質檢驗員',
    work_group: 'A組',
    department: '生產部',
    wage: 32000,
    allowance: 4000,
    organizer: 0,
    labor_insurance: 1800,
    health_insurance: 1400,
    pension: 2800,
    is_foreign: false,
    benifit: true,
    need_check: true,
    begain_work: '2022-11-05',
    stop_work: null,
    have_fake: false,
  },
  {
    id: 'STAFF005',
    name: '林雅婷',
    post: '人資專員',
    work_group: 'D組',
    department: '人資部',
    wage: 40000,
    allowance: 4500,
    organizer: 0,
    labor_insurance: 2300,
    health_insurance: 1700,
    pension: 3300,
    is_foreign: false,
    benifit: true,
    need_check: true,
    begain_work: '2023-02-18',
    stop_work: null,
    have_fake: false,
  },
];

// 部門選項（從目前員工資料中彙總）
const departmentOptions = computed(() => {
  const set = new Set<string>()
  staffList.value.forEach((staff) => {
    if (staff.department) {
      set.add(staff.department)
    }
  })
  return Array.from(set).sort()
})

// 篩選後的員工列表
const filteredStaff = computed(() => {
  let filtered = staffList.value;

  if (staffSearch.value) {
    filtered = filtered.filter(
      (staff) =>
        staff.id.toLowerCase().includes(staffSearch.value.toLowerCase()) ||
        staff.name.toLowerCase().includes(staffSearch.value.toLowerCase()) ||
        (staff.post &&
          staff.post.toLowerCase().includes(staffSearch.value.toLowerCase())),
    );
  }

  if (departmentFilter.value) {
    filtered = filtered.filter(
      (staff) => staff.department === departmentFilter.value,
    );
  }

  if (statusFilter.value) {
    if (statusFilter.value === 'active') {
      filtered = filtered.filter((staff) => !staff.stop_work);
    } else if (statusFilter.value === 'resigned') {
      filtered = filtered.filter((staff) => staff.stop_work);
    }
  }

  return filtered;
});

// 表格欄位定義
const tableColumns: EditableColumn[] = [
  { key: 'id', label: '員工編號', editable: false, width: 'sequence' },
  { key: 'name', label: '姓名', editable: false },
  { key: 'post', label: '職稱', editable: false },
  { key: 'department', label: '部門', editable: false },
  { key: 'work_group', label: '工作組別', editable: false },
  { key: 'wage', label: '本薪', editable: false, width: 'long-number' },
  { key: 'begain_work', label: '到職日期', editable: false },
];

// 查看員工詳情
const viewStaff = (staff: Staff) => {
  viewingStaff.value = { ...staff };
  showViewModal.value = true;
};

// 處理日期欄位變更
const handleDateChange = (field: 'begain_work' | 'stop_work') => {
  if (newStaff.value[field] === '') {
    newStaff.value[field] = null;
  }
};

// 處理用戶名輸入（自動生成建議）
const handleUserNameInput = () => {
  // 可以根據姓名自動生成建議的用戶名
  if (!newStaff.value.userName && newStaff.value.name) {
    // 這裡可以添加自動生成邏輯，例如使用姓名的拼音或英文
  }
};

// 處理編輯表單日期欄位變更
const handleEditDateChange = (field: 'begain_work' | 'stop_work') => {
  if (editingStaff.value[field] === '') {
    editingStaff.value[field] = null;
  }
};

// 編輯員工
const editStaff = (staff: Staff) => {
  editingStaff.value = { ...staff };
  showEditModal.value = true;
};

// 新增員工（同時創建用戶）
const addStaff = async () => {
  errorStore.clearError();

  // 驗證必填欄位
  if (!newStaff.value.userName || !newStaff.value.password || !newStaff.value.name) {
    errorStore.showError('請填寫所有必填欄位');
    return;
  }

  // 驗證密碼長度
  if (newStaff.value.password.length < 6) {
    errorStore.showError('密碼長度至少需要 6 個字符');
    return;
  }

  // 處理日期欄位，將空字串轉換為 null 或 Date 對象
  const requestData: CreateStaffWithUser = { ...newStaff.value };
  if (requestData.begain_work === '') {
    requestData.begain_work = null;
  } else if (requestData.begain_work) {
    // 將日期字符串轉換為 Date 對象（後端會處理）
    requestData.begain_work = new Date(requestData.begain_work).toISOString().split('T')[0] as any;
  }
  if (requestData.stop_work === '') {
    requestData.stop_work = null;
  } else if (requestData.stop_work) {
    requestData.stop_work = new Date(requestData.stop_work).toISOString().split('T')[0] as any;
  }

  try {
    const response = await apiPost<{ message: string; user: any; staff: Staff }>(
      API_CONFIG.AUTH.CREATE_USER_WITH_STAFF,
      requestData
    );

    // 將新創建的員工添加到列表
    staffList.value.push(response.staff);

    // 重置表單
    newStaff.value = {
      userName: '',
      password: '',
      isAdmin: false,
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
      begain_work: new Date().toISOString().split('T')[0], // 預設為今天
      stop_work: null,
      have_fake: false,
    };

    showAddModal.value = false;
  } catch (error) {
    console.error('新增員工失敗:', error);
    errorStore.showError(error instanceof Error ? error.message : '新增員工失敗，請稍後再試');
  }
};

// 更新員工
const updateStaff = async () => {
  errorStore.clearError();

  // 處理日期欄位，將空字串轉換為 null
  const staffData: Staff = { ...editingStaff.value };
  if (staffData.begain_work === '') staffData.begain_work = null;
  if (staffData.stop_work === '') staffData.stop_work = null;

  try {
    const response = await fetch(`/api/staffs/${editingStaff.value.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(staffData),
    });

    if (response.ok) {
      const updatedStaff = await response.json();
      const index = staffList.value.findIndex(
        (staff) => staff.id === updatedStaff.id,
      );
      if (index !== -1) {
        staffList.value[index] = updatedStaff;
      }
      showEditModal.value = false;
    } else {
      const errorData = await response.json().catch(() => ({}));
      errorStore.showError(errorData.message || '更新員工失敗，請稍後再試');
    }
  } catch (error) {
    console.error('更新員工失敗:', error);
    errorStore.showError('網路連線錯誤，請檢查網路連線後再試');
  }
};

// 取得狀態顯示文字
const getStatusText = (staff: Staff) => {
  if (staff.stop_work) {
    return '離職';
  }
  return '在職';
};

const openEditFromView = () => {
  if (!viewingStaff.value?.id) return;
  showViewModal.value = false;
  editStaff(viewingStaff.value);
};

// 格式化日期
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('zh-TW');
};

// 頁面載入時取得資料與掛載活動監聽
onMounted(() => {
  loadStaffData();
  activityEvents.forEach((eventName) => {
    window.addEventListener(eventName, handleUserActivity);
  });
});

onUnmounted(() => {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  activityEvents.forEach((eventName) => {
    window.removeEventListener(eventName, handleUserActivity);
  });
});
</script>

