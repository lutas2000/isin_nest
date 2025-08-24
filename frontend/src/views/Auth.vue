<template>
  <div class="auth-page">
    <h1>認證與授權管理</h1>
    
    <div class="auth-sections">
      <div class="auth-section">
        <h2>用戶登入</h2>
        <div class="login-form">
          <div class="form-group">
            <label for="username">用戶名</label>
            <input 
              type="text" 
              id="username" 
              v-model="loginForm.username" 
              placeholder="請輸入用戶名"
            />
          </div>
          <div class="form-group">
            <label for="password">密碼</label>
            <input 
              type="password" 
              id="password" 
              v-model="loginForm.password" 
              placeholder="請輸入密碼"
            />
          </div>
          <button @click="handleLogin" class="btn btn-primary">
            登入
          </button>
        </div>
      </div>
      
      <div class="auth-section">
        <h2>用戶註冊</h2>
        <div class="register-form">
          <div class="form-group">
            <label for="reg-username">用戶名</label>
            <input 
              type="text" 
              id="reg-username" 
              v-model="registerForm.username" 
              placeholder="請輸入用戶名"
            />
          </div>
          <div class="form-group">
            <label for="reg-email">電子郵件</label>
            <input 
              type="email" 
              id="reg-email" 
              v-model="registerForm.email" 
              placeholder="請輸入電子郵件"
            />
          </div>
          <div class="form-group">
            <label for="reg-password">密碼</label>
            <input 
              type="password" 
              id="reg-password" 
              v-model="registerForm.password" 
              placeholder="請輸入密碼"
            />
          </div>
          <div class="form-group">
            <label for="reg-confirm-password">確認密碼</label>
            <input 
              type="password" 
              id="reg-confirm-password" 
              v-model="registerForm.confirmPassword" 
              placeholder="請再次輸入密碼"
            />
          </div>
          <button @click="handleRegister" class="btn btn-secondary">
            註冊
          </button>
        </div>
      </div>
    </div>
    
    <div class="auth-features">
      <h2>認證功能特色</h2>
      <div class="features-list">
        <div class="feature-item">
          <div class="feature-icon">🔐</div>
          <div class="feature-content">
            <h3>JWT 認證</h3>
            <p>使用 JSON Web Token 進行安全的身份驗證</p>
          </div>
        </div>
        
        <div class="feature-item">
          <div class="feature-icon">👮‍♂️</div>
          <div class="feature-content">
            <h3>角色權限管理</h3>
            <p>基於角色的存取控制，細粒度權限管理</p>
          </div>
        </div>
        
        <div class="feature-item">
          <div class="feature-icon">🔄</div>
          <div class="feature-content">
            <h3>密碼重設</h3>
            <p>安全的密碼重設流程，支援電子郵件驗證</p>
          </div>
        </div>
        
        <div class="feature-item">
          <div class="feature-icon">📱</div>
          <div class="feature-content">
            <h3>多裝置支援</h3>
            <p>支援多裝置同時登入，會話管理</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

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

.auth-page h1 {
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
  font-size: 2.5rem;
}

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

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e1e5e9;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

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

.features-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.feature-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.feature-content h3 {
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.feature-content p {
  color: #666;
  line-height: 1.5;
  font-size: 0.9rem;
}
</style>
