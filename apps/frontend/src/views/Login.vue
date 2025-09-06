<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <div class="logo">
          <div class="logo-icon">🏭</div>
          <h1 class="logo-text">ISIN CNC</h1>
        </div>
        <p class="login-subtitle">管理系統登入</p>
      </div>

      <div class="login-form-container">
        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label for="username">用戶名</label>
            <input
              type="text"
              id="username"
              v-model="loginForm.username"
              placeholder="請輸入用戶名"
              required
              :disabled="isLoading"
            />
          </div>

          <div class="form-group">
            <label for="password">密碼</label>
            <input
              type="password"
              id="password"
              v-model="loginForm.password"
              placeholder="請輸入密碼"
              required
              :disabled="isLoading"
            />
          </div>

          <ErrorMessage :message="errorMessage" type="error" />

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
import ErrorMessage from '../components/ErrorMessage.vue';

const router = useRouter();
const authStore = useAuthStore();

const loginForm = ref({
  username: '',
  password: '',
});

const isLoading = ref(false);
const errorMessage = ref('');

// 如果已經登入，直接跳轉到首頁
onMounted(() => {
  if (authStore.isLoggedIn) {
    router.push('/');
  }
});

const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    errorMessage.value = '請輸入用戶名和密碼';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    const result = await authStore.login(
      loginForm.value.username,
      loginForm.value.password,
    );

    if (result.success) {
      // 登入成功，跳轉到首頁
      router.push('/');
    } else {
      errorMessage.value = result.error || '登入失敗，請檢查用戶名和密碼';
    }
  } catch (error) {
    errorMessage.value = '登入過程中發生錯誤，請稍後再試';
    console.error('Login error:', error);
  } finally {
    isLoading.value = false;
  }
};
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
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 100%;
  max-width: 400px;
}

.login-header {
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

.login-subtitle {
  margin: 0;
  opacity: 0.9;
  font-size: 1.1rem;
}

.login-form-container {
  padding: 2rem;
}

.login-form {
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


.login-btn {
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
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
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
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.login-info {
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
  line-height: 1.5;
}

/* 響應式設計 */
@media (max-width: 480px) {
  .login-page {
    padding: 1rem;
  }

  .login-container {
    border-radius: 12px;
  }

  .login-header {
    padding: 1.5rem;
  }

  .login-form-container {
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
