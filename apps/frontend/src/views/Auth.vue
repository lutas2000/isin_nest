<template>
  <div class="auth-page">
    <PageHeader 
      title="認證與授權管理" 
      description="管理系統認證與授權功能"
    />
    
    <div class="auth-sections">
      <div class="auth-section">
        <h2>用戶登入</h2>
        <div class="login-form">
          <FormField
            v-model="loginForm.username"
            label="用戶名"
            type="text"
            placeholder="請輸入用戶名"
            required
          />
          <FormField
            v-model="loginForm.password"
            label="密碼"
            type="password"
            placeholder="請輸入密碼"
            required
          />
          <button @click="handleLogin" class="btn btn-primary">
            登入
          </button>
        </div>
      </div>
      
      <div class="auth-section">
        <h2>用戶註冊</h2>
        <div class="register-form">
          <FormField
            v-model="registerForm.username"
            label="用戶名"
            type="text"
            placeholder="請輸入用戶名"
            required
          />
          <FormField
            v-model="registerForm.email"
            label="電子郵件"
            type="email"
            placeholder="請輸入電子郵件"
            required
          />
          <FormField
            v-model="registerForm.password"
            label="密碼"
            type="password"
            placeholder="請輸入密碼"
            required
          />
          <FormField
            v-model="registerForm.confirmPassword"
            label="確認密碼"
            type="password"
            placeholder="請再次輸入密碼"
            required
          />
          <button @click="handleRegister" class="btn btn-secondary">
            註冊
          </button>
        </div>
      </div>
    </div>
    
    <div class="auth-features">
      <h2>認證功能特色</h2>
      <div class="features-grid">
        <OverviewCard
          icon="🔐"
          label="JWT 認證"
          value="安全身份驗證"
          variant="primary"
        />
        <OverviewCard
          icon="👮‍♂️"
          label="角色權限管理"
          value="細粒度控制"
          variant="success"
        />
        <OverviewCard
          icon="🔄"
          label="密碼重設"
          value="電子郵件驗證"
          variant="warning"
        />
        <OverviewCard
          icon="📱"
          label="多裝置支援"
          value="會話管理"
          variant="info"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { PageHeader, OverviewCard, FormField } from '@/components';

const loginForm = ref({
  username: '',
  password: ''
})

const registerForm = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const handleLogin = () => {
  // 處理登入邏輯
  console.log('登入表單:', loginForm.value)
}

const handleRegister = () => {
  // 處理註冊邏輯
  console.log('註冊表單:', registerForm.value)
}
</script>

<style scoped>
.auth-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* 移除頁面標題樣式，由 PageHeader 組件處理 */

.auth-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.auth-section {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.auth-section h2 {
  color: #333;
  margin-bottom: 1.5rem;
  text-align: center;
}

/* 移除表單樣式，由 FormField 組件處理 */

.btn {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
  transform: translateY(-2px);
}

.auth-features {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.auth-features h2 {
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}
</style>
