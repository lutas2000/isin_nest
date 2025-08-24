<template>
  <div id="app">
    <nav class="navbar">
      <div class="nav-brand">
        <h1>ISIN 管理系統</h1>
      </div>
      <div class="nav-links">
        <router-link to="/" class="nav-link">首頁</router-link>
        <router-link to="/hr" class="nav-link">人力資源</router-link>
        <router-link to="/auth" class="nav-link">認證</router-link>
      </div>
    </nav>
    
    <main class="main-content">
      <router-view />
    </main>
    
    <footer class="footer">
      <p>&copy; 2024 ISIN 管理系統. 使用 NestJS + Vue.js 建構.</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
// 使用 Composition API
</script>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.nav-brand h1 {
  color: white;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.main-content {
  flex: 1;
  padding: 2rem;
  background-color: #f8f9fa;
}

.footer {
  background-color: #343a40;
  color: white;
  text-align: center;
  padding: 1rem;
  margin-top: auto;
}
</style>
