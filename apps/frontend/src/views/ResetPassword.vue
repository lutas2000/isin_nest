<template>
  <div class="reset-password-page">
    <div class="reset-password-container">
      <div class="reset-password-header">
        <div class="logo">
          <div class="logo-icon">🏭</div>
          <h1 class="logo-text">ISIN CNC</h1>
        </div>
        <p class="reset-password-subtitle">重設密碼</p>
        <p class="reset-password-info">您只能重設自己的密碼</p>
      </div>

      <div class="reset-password-form-container">
        <form @submit.prevent="handleResetPassword" class="reset-password-form">
          <div class="form-group">
            <label for="userName">用戶名</label>
            <input
              type="text"
              id="userName"
              v-model="resetForm.userName"
              placeholder="請輸入用戶名"
              required
              :disabled="
                isLoading || (authStore.isLoggedIn && authStore.userName)
              "
              readonly
            />
          </div>

          <div class="form-group">
            <label for="oldPassword">目前密碼</label>
            <input
              type="password"
              id="oldPassword"
              v-model="resetForm.oldPassword"
              placeholder="請輸入目前密碼"
              required
              :disabled="isLoading"
            />
          </div>

          <div class="form-group">
            <label for="newPassword">新密碼</label>
            <input
              type="password"
              id="newPassword"
              v-model="resetForm.newPassword"
              placeholder="請輸入新密碼"
              required
              :disabled="isLoading"
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword">確認新密碼</label>
            <input
              type="password"
              id="confirmPassword"
              v-model="resetForm.confirmPassword"
              placeholder="請再次輸入新密碼"
              required
              :disabled="isLoading"
            />
          </div>


          <button
            type="submit"
            class="reset-password-btn"
            :disabled="isLoading || !isFormValid"
          >
            <span v-if="isLoading" class="loading-spinner">⏳</span>
            <span v-else>重設密碼</span>
          </button>

          <div class="form-footer">
            <button
              type="button"
              class="back-to-login-btn"
              @click="goToLogin"
              :disabled="isLoading"
            >
              返回登入
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useErrorStore } from '../stores/error';
import { buildApiUrl, API_CONFIG } from '../config/api';

const router = useRouter();
const authStore = useAuthStore();
const errorStore = useErrorStore();

const resetForm = ref({
  userName: '',
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const isLoading = ref(false);
const successMessage = ref('');

// 表單驗證
const isFormValid = computed(() => {
  return (
    resetForm.value.userName &&
    resetForm.value.oldPassword &&
    resetForm.value.newPassword &&
    resetForm.value.confirmPassword &&
    resetForm.value.newPassword === resetForm.value.confirmPassword &&
    resetForm.value.newPassword.length >= 6
  );
});

// 頁面載入時可以預填當前用戶名
onMounted(() => {
  if (authStore.isLoggedIn && authStore.userName) {
    resetForm.value.userName = authStore.userName;
  }
});

const handleResetPassword = async () => {
  // 驗證新密碼長度
  if (resetForm.value.newPassword.length < 6) {
    errorStore.showError('新密碼至少需要6個字元');
    return;
  }

  // 驗證兩次輸入的新密碼是否一致
  if (resetForm.value.newPassword !== resetForm.value.confirmPassword) {
    errorStore.showError('兩次輸入的新密碼不一致');
    return;
  }

  // 驗證新密碼不能與目前密碼相同
  if (resetForm.value.oldPassword === resetForm.value.newPassword) {
    errorStore.showError('新密碼不能與目前密碼相同');
    return;
  }

  isLoading.value = true;
  errorStore.clearError();
  successMessage.value = '';

  try {
    // 調用後端 API 來重設密碼
    const response = await fetch(buildApiUrl(API_CONFIG.AUTH.RESET_PASSWORD), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({
        userName: resetForm.value.userName,
        oldPassword: resetForm.value.oldPassword,
        newPassword: resetForm.value.newPassword,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '重設密碼失敗');
    }

    const result = await response.json();

    // 重設密碼成功
    successMessage.value =
      result.message || '密碼重設成功！即將跳轉到登入頁面...';

    // 清除本地認證資訊並更新 authStore 狀態
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    authStore.logout(); // 通知 authStore 更新狀態

    // 延遲跳轉到登入頁面
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  } catch (error) {
    console.error('Reset password error:', error);
    if (error instanceof Error) {
      errorStore.showError(error.message);
    } else {
      errorStore.showError('重設密碼失敗，請檢查輸入資訊是否正確');
    }
  } finally {
    isLoading.value = false;
  }
};

const goToLogin = () => {
  router.push('/login');
};
</script>

<style scoped>
.reset-password-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.reset-password-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 100%;
  max-width: 450px;
}

.reset-password-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.logo-icon {
  font-size: 3rem;
}

.logo-text {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

.reset-password-subtitle {
  margin: 0;
  opacity: 0.9;
  font-size: 1.1rem;
}

.reset-password-info {
  margin: 0.5rem 0 0 0;
  opacity: 0.8;
  font-size: 0.9rem;
  font-style: italic;
}

.reset-password-form-container {
  padding: 2rem;
}

.reset-password-form {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 500;
  font-size: 0.9rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input:disabled {
  background-color: #f9fafb;
  cursor: not-allowed;
}


.reset-password-btn {
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.875rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.reset-password-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.reset-password-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.form-footer {
  text-align: center;
}

.back-to-login-btn {
  background: none;
  border: 1px solid #d1d5db;
  color: #6b7280;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-to-login-btn:hover:not(:disabled) {
  background-color: #f9fafb;
  border-color: #9ca3af;
  color: #374151;
}

.back-to-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 響應式設計 */
@media (max-width: 480px) {
  .reset-password-page {
    padding: 1rem;
  }

  .reset-password-container {
    border-radius: 12px;
  }

  .reset-password-header {
    padding: 1.5rem;
  }

  .reset-password-form-container {
    padding: 1.5rem;
  }

  .logo-icon {
    font-size: 2.5rem;
  }

  .logo-text {
    font-size: 1.75rem;
  }
}
</style>
