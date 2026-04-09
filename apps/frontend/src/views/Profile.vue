<template>
  <div class="profile-page">
    <PageHeader 
      title="個人資料"
      description="查看您的帳戶資訊與員工資料"
    />

    <div class="profile-content">
      <!-- 用戶基本資訊卡片 -->
      <div class="profile-card">
        <div class="card-header">
          <div class="user-avatar">
            <span class="avatar-icon">👤</span>
          </div>
          <div class="user-basic">
            <h2 class="user-name">{{ authStore.userName }}</h2>
            <span class="user-role" :class="authStore.isAdmin ? 'admin' : 'user'">
              {{ authStore.isAdmin ? '管理員' : '一般用戶' }}
            </span>
          </div>
        </div>
        
        <div class="card-body">
          <h3 class="section-title">帳戶資訊</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">用戶 ID</span>
              <span class="info-value">{{ authStore.user?.id }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">用戶名稱</span>
              <span class="info-value">{{ authStore.userName }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">帳戶類型</span>
              <span class="info-value">
                <span class="badge" :class="authStore.isAdmin ? 'badge-primary' : 'badge-secondary'">
                  {{ authStore.isAdmin ? '管理員' : '一般用戶' }}
                </span>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">功能權限</span>
              <span class="info-value">
                <template v-if="authStore.user?.features?.length">
                  <span 
                    v-for="feature in authStore.user.features" 
                    :key="feature" 
                    class="badge badge-info"
                  >
                    {{ feature }}
                  </span>
                </template>
                <span v-else class="text-muted">無特殊權限</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 員工資訊卡片 -->
      <div class="profile-card" v-if="authStore.staff">
        <div class="card-body">
          <h3 class="section-title">
            <span class="section-icon">👨‍💼</span>
            員工資訊
          </h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">員工編號</span>
              <span class="info-value highlight">{{ authStore.staff.id }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">姓名</span>
              <span class="info-value">{{ authStore.staff.name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">職稱</span>
              <span class="info-value">{{ authStore.staff.post || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">部門</span>
              <span class="info-value">{{ authStore.staff.department || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">工作組別</span>
              <span class="info-value">{{ authStore.staff.work_group || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">到職日期</span>
              <span class="info-value">{{ formatDate(authStore.staff.begain_work) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">是否需要打卡</span>
              <span class="info-value">
                <span class="badge" :class="authStore.staff.need_check ? 'badge-success' : 'badge-secondary'">
                  {{ authStore.staff.need_check ? '是' : '否' }}
                </span>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">是否參加福委會</span>
              <span class="info-value">
                <span class="badge" :class="authStore.staff.benifit ? 'badge-success' : 'badge-secondary'">
                  {{ authStore.staff.benifit ? '是' : '否' }}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 無員工資訊提示 -->
      <div class="profile-card no-staff" v-else>
        <div class="card-body">
          <div class="no-staff-content">
            <span class="no-staff-icon">📋</span>
            <h3>尚未綁定員工資料</h3>
            <p>此帳號尚未關聯員工資料，如需綁定請聯繫管理員。</p>
          </div>
        </div>
      </div>

      <!-- 操作區 -->
      <div class="profile-actions">
        <button class="btn btn-outline" @click="goToResetPassword">
          <span class="btn-icon">🔑</span>
          修改密碼
        </button>
        <button class="btn btn-danger" @click="handleLogout">
          <span class="btn-icon">🚪</span>
          登出
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { PageHeader } from '@/components'

const router = useRouter()
const authStore = useAuthStore()

// 格式化日期
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 前往修改密碼頁面
const goToResetPassword = () => {
  router.push('/reset-password')
}

// 登出
const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.profile-page {
  width: 100%;
  margin: 0 auto;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-card {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.profile-card .card-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
  background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%);
  color: white;
}

.user-avatar {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.avatar-icon {
  font-size: 2.5rem;
}

.user-basic {
  flex: 1;
}

.user-name {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: white;
}

.user-role {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.user-role.admin {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}

.user-role.user {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
}

.profile-card .card-body {
  padding: 1.5rem 2rem 2rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--secondary-800);
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--secondary-100);
}

.section-icon {
  font-size: 1.25rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-500);
  font-weight: 500;
}

.info-value {
  font-size: var(--font-size-base);
  color: var(--secondary-800);
  font-weight: 500;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.info-value.highlight {
  color: var(--primary-600);
  font-weight: 600;
}

.text-muted {
  color: var(--secondary-400);
  font-style: italic;
}

/* Badge 樣式 */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  font-size: var(--font-size-xs);
  font-weight: 500;
  border-radius: 9999px;
}

.badge-primary {
  background-color: var(--primary-100);
  color: var(--primary-700);
}

.badge-secondary {
  background-color: var(--secondary-100);
  color: var(--secondary-600);
}

.badge-success {
  background-color: var(--success-50);
  color: var(--success-700);
}

.badge-info {
  background-color: var(--info-50);
  color: var(--info-700);
  margin-right: 0.25rem;
}

/* 無員工資訊提示 */
.no-staff .card-body {
  padding: 3rem 2rem;
}

.no-staff-content {
  text-align: center;
}

.no-staff-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.no-staff-content h3 {
  color: var(--secondary-700);
  margin-bottom: 0.5rem;
}

.no-staff-content p {
  color: var(--secondary-500);
  margin: 0;
}

/* 操作按鈕區 */
.profile-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
}

.profile-actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
}

.btn-icon {
  font-size: 1rem;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .profile-card .card-header {
    flex-direction: column;
    text-align: center;
    padding: 1.5rem;
  }

  .user-avatar {
    width: 70px;
    height: 70px;
  }

  .avatar-icon {
    font-size: 2rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .profile-card .card-body {
    padding: 1.25rem 1.5rem 1.5rem;
  }

  .profile-actions {
    flex-direction: column;
  }

  .profile-actions .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>

