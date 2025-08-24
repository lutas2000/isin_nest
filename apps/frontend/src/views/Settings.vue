<template>
  <div class="settings-page">
    <div class="page-header">
      <div class="header-content">
        <h1>系統設定</h1>
        <p>管理系統配置、用戶偏好和基本設定</p>
      </div>
    </div>

    <div class="settings-content">
      <div class="settings-sidebar">
        <div class="sidebar-nav">
          <button
            v-for="section in sections"
            :key="section.id"
            class="nav-item"
            :class="{ active: activeSection === section.id }"
            @click="activeSection = section.id"
          >
            <span class="nav-icon">{{ section.icon }}</span>
            {{ section.label }}
          </button>
        </div>
      </div>

      <div class="settings-main">
        <!-- 一般設定 -->
        <div v-if="activeSection === 'general'" class="settings-section">
          <h3>一般設定</h3>
          <div class="settings-form">
            <div class="form-group">
              <label class="form-label">公司名稱</label>
              <input
                type="text"
                class="form-control"
                v-model="generalSettings.companyName"
              />
            </div>

            <div class="form-group">
              <label class="form-label">系統語言</label>
              <select class="form-control" v-model="generalSettings.language">
                <option value="zh-TW">繁體中文</option>
                <option value="en">English</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">時區</label>
              <select class="form-control" v-model="generalSettings.timezone">
                <option value="Asia/Taipei">台北 (UTC+8)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">日期格式</label>
              <select class="form-control" v-model="generalSettings.dateFormat">
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 通知設定 -->
        <div v-if="activeSection === 'notifications'" class="settings-section">
          <h3>通知設定</h3>
          <div class="settings-form">
            <div class="form-group">
              <label class="form-label">電子郵件通知</label>
              <div class="checkbox-group">
                <label class="checkbox-item">
                  <input
                    type="checkbox"
                    v-model="notificationSettings.emailNotifications"
                  />
                  <span class="checkmark"></span>
                  啟用電子郵件通知
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">系統通知</label>
              <div class="checkbox-group">
                <label class="checkbox-item">
                  <input
                    type="checkbox"
                    v-model="notificationSettings.systemNotifications"
                  />
                  <span class="checkmark"></span>
                  啟用系統內通知
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">庫存警報</label>
              <div class="checkbox-group">
                <label class="checkbox-item">
                  <input
                    type="checkbox"
                    v-model="notificationSettings.inventoryAlerts"
                  />
                  <span class="checkmark"></span>
                  庫存不足時通知
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 安全設定 -->
        <div v-if="activeSection === 'security'" class="settings-section">
          <h3>安全設定</h3>
          <div class="settings-form">
            <div class="form-group">
              <label class="form-label">密碼最小長度</label>
              <input
                type="number"
                class="form-control"
                v-model="securitySettings.minPasswordLength"
                min="6"
                max="20"
              />
            </div>

            <div class="form-group">
              <label class="form-label">登入嘗試次數</label>
              <input
                type="number"
                class="form-control"
                v-model="securitySettings.maxLoginAttempts"
                min="3"
                max="10"
              />
            </div>

            <div class="form-group">
              <label class="form-label">會話超時 (分鐘)</label>
              <input
                type="number"
                class="form-control"
                v-model="securitySettings.sessionTimeout"
                min="15"
                max="480"
              />
            </div>
          </div>
        </div>

        <!-- 備份設定 -->
        <div v-if="activeSection === 'backup'" class="settings-section">
          <h3>備份設定</h3>
          <div class="settings-form">
            <div class="form-group">
              <label class="form-label">自動備份</label>
              <div class="checkbox-group">
                <label class="checkbox-item">
                  <input type="checkbox" v-model="backupSettings.autoBackup" />
                  <span class="checkmark"></span>
                  啟用自動備份
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">備份頻率</label>
              <select
                class="form-control"
                v-model="backupSettings.backupFrequency"
              >
                <option value="daily">每日</option>
                <option value="weekly">每週</option>
                <option value="monthly">每月</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">保留備份數量</label>
              <input
                type="number"
                class="form-control"
                v-model="backupSettings.retentionCount"
                min="1"
                max="100"
              />
            </div>
          </div>
        </div>

        <!-- 儲存按鈕 -->
        <div class="settings-actions">
          <button class="btn btn-outline" @click="resetSettings">
            重置設定
          </button>
          <button class="btn btn-primary" @click="saveSettings">
            儲存設定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 設定區段
const sections = [
  { id: 'general', label: '一般設定', icon: '⚙️' },
  { id: 'notifications', label: '通知設定', icon: '🔔' },
  { id: 'security', label: '安全設定', icon: '🔒' },
  { id: 'backup', label: '備份設定', icon: '💾' },
];

const activeSection = ref('general');

// 一般設定
const generalSettings = ref({
  companyName: 'ISIN CNC 工廠',
  language: 'zh-TW',
  timezone: 'Asia/Taipei',
  dateFormat: 'YYYY-MM-DD',
});

// 通知設定
const notificationSettings = ref({
  emailNotifications: true,
  systemNotifications: true,
  inventoryAlerts: true,
});

// 安全設定
const securitySettings = ref({
  minPasswordLength: 8,
  maxLoginAttempts: 10,
  sessionTimeout: 120,
});

// 備份設定
const backupSettings = ref({
  autoBackup: true,
  backupFrequency: 'daily',
  retentionCount: 30,
});

// 儲存設定
const saveSettings = () => {
  // TODO: 調用 API 儲存設定
  console.log('儲存設定:', {
    general: generalSettings.value,
    notifications: notificationSettings.value,
    security: securitySettings.value,
    backup: backupSettings.value,
  });

  // 顯示成功訊息
  alert('設定已儲存');
};

// 重置設定
const resetSettings = () => {
  if (confirm('確定要重置所有設定嗎？')) {
    // TODO: 重置為預設值
    console.log('重置設定');
  }
};
</script>

<style scoped>
.settings-page {
  max-width: 1400px;
  margin: 0 auto;
}

/* 頁面標題 */
.page-header {
  background: white;
  padding: 2rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  margin-bottom: 2rem;
}

.page-header h1 {
  margin-bottom: 0.5rem;
  color: var(--secondary-900);
}

.page-header p {
  color: var(--secondary-600);
  margin: 0;
}

/* 設定內容 */
.settings-content {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 2rem;
}

/* 側邊欄 */
.settings-sidebar {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
}

.nav-item {
  background: none;
  border: none;
  padding: 1rem 1.5rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--secondary-600);
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--secondary-100);
}

.nav-item:hover {
  background-color: var(--secondary-50);
  color: var(--secondary-800);
}

.nav-item.active {
  background-color: var(--primary-50);
  color: var(--primary-600);
  border-right: 3px solid var(--primary-500);
}

.nav-icon {
  font-size: 1.25rem;
}

/* 主要內容 */
.settings-main {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  padding: 2rem;
}

.settings-section {
  margin-bottom: 2rem;
}

.settings-section h3 {
  margin: 0 0 1.5rem 0;
  color: var(--secondary-900);
  font-size: var(--font-size-xl);
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-weight: 500;
  color: var(--secondary-700);
  margin-bottom: 0.5rem;
}

.form-control {
  padding: 0.75rem;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px var(--primary-100);
}

/* 核取方塊群組 */
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-weight: 500;
  color: var(--secondary-700);
}

.checkbox-item input[type='checkbox'] {
  display: none;
}

.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid var(--secondary-300);
  border-radius: var(--border-radius);
  position: relative;
  transition: all 0.2s ease;
}

.checkbox-item input[type='checkbox']:checked + .checkmark {
  background-color: var(--primary-500);
  border-color: var(--primary-500);
}

.checkbox-item input[type='checkbox']:checked + .checkmark::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
}

/* 設定操作 */
.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 2rem;
  border-top: 1px solid var(--secondary-200);
  margin-top: 2rem;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .settings-content {
    grid-template-columns: 1fr;
  }

  .settings-sidebar {
    order: 2;
  }

  .settings-main {
    order: 1;
  }

  .sidebar-nav {
    flex-direction: row;
    overflow-x: auto;
  }

  .nav-item {
    white-space: nowrap;
    border-bottom: none;
    border-right: 1px solid var(--secondary-100);
  }

  .nav-item.active {
    border-right: 3px solid var(--primary-500);
    border-bottom: none;
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 1.5rem;
  }

  .settings-main {
    padding: 1.5rem;
  }

  .settings-actions {
    flex-direction: column;
  }

  .settings-actions .btn {
    width: 100%;
  }
}
</style>
