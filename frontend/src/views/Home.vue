<template>
  <div class="home">
    <div class="hero-section">
      <h1>歡迎使用 ISIN 管理系統</h1>
      <p>整合 NestJS 後端與 Vue.js 前端的現代化企業管理平台</p>
    </div>
    
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">👥</div>
        <h3>人力資源管理</h3>
        <p>員工資料、出勤記錄、工時管理、請假系統</p>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">🔐</div>
        <h3>認證與授權</h3>
        <p>JWT 認證、角色權限管理、安全登入</p>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">📊</div>
        <h3>資料分析</h3>
        <p>報表生成、資料匯出、統計分析</p>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3>高效能</h3>
        <p>TypeScript 類型安全、現代化架構設計</p>
      </div>
    </div>
    
    <div class="tech-stack">
      <h2>技術架構</h2>
      <div class="tech-items">
        <div class="tech-item">
          <strong>後端：</strong> NestJS + TypeORM + MySQL
        </div>
        <div class="tech-item">
          <strong>前端：</strong> Vue 3 + TypeScript + Vite
        </div>
        <div class="tech-item">
          <strong>狀態管理：</strong> Pinia
        </div>
        <div class="tech-item">
          <strong>路由：</strong> Vue Router 4
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 首頁組件邏輯
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
}

.hero-section {
  text-align: center;
  padding: 3rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  margin-bottom: 3rem;
}

.hero-section h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.hero-section p {
  font-size: 1.2rem;
  opacity: 0.9;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  text-align: center;
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  color: #333;
  margin-bottom: 1rem;
}

.feature-card p {
  color: #666;
  line-height: 1.6;
}

.tech-stack {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.tech-stack h2 {
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
}

.tech-items {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.tech-item {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  text-align: center;
  color: #555;
}
</style>
