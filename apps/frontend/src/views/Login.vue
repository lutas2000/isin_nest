<template>
  <div class="login-page">
    <div class="login-container">
      <SectionHeader 
        title="奕新雷射 管理系統"
      />

      <div class="login-form-container">
        <form @submit.prevent="handleLogin" class="login-form">
          <FormField
            v-model="loginForm.username"
            label="用戶名"
            type="text"
            placeholder="請輸入用戶名"
            required
            :disabled="isLoading"
          />

          <FormField
            v-model="loginForm.password"
            label="密碼"
            type="password"
            placeholder="請輸入密碼"
            required
            :disabled="isLoading"
            @keyup.enter="handleLogin"
          />

          <button
            type="submit"
            class="login-btn"
            :disabled="isLoading || !loginForm.username || !loginForm.password"
          >
            <span v-if="isLoading" class="loading-spinner">⏳</span>
            <span v-else>登入</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useErrorStore } from '../stores/error';
import { PageHeader, FormField, SectionHeader } from '@/components';

const router = useRouter();
const authStore = useAuthStore();
const errorStore = useErrorStore();

const loginForm = ref({
  username: '',
  password: ''
});

const isLoading = ref(false);

const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    errorStore.showError('請填寫所有欄位');
    return;
  }

  isLoading.value = true;
  errorStore.clearError();

  const result = await authStore.login(loginForm.value.username, loginForm.value.password);
  
  if (result.success) {
    router.push('/');
  } else {
    errorStore.showError(result.error || '登入失敗，請檢查您的帳戶資訊');
  }
  
  isLoading.value = false;
};

onMounted(() => {
  // 如果已經登入，重導向到首頁
  if (authStore.isAuthenticated) {
    router.push('/');
  }
});
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.login-container {
  background: white;
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-lg);
  padding: 3rem;
  width: 100%;
  max-width: 400px;
}

.login-form-container {
  margin-top: 2rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.login-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 1rem;
  border-radius: var(--border-radius-lg);
  font-size: var(--font-size-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 響應式設計 */
@media (max-width: 480px) {
  .login-page {
    padding: 1rem;
  }
  
  .login-container {
    padding: 2rem;
  }
}
</style>