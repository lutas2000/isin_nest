<template>
  <div id="app" class="app">
    <!-- 未登入時或重設密碼頁面時顯示滿版 -->
    <div
      v-if="!authStore.isLoggedIn || isResetPasswordPage"
      class="full-page-container"
    >
      <router-view />
    </div>

    <!-- 登入後且非重設密碼頁面時顯示主應用 -->
    <template v-else>
      <!-- 側邊欄 -->
      <aside class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
        <div class="sidebar-header">
          <div class="logo">
            <div class="logo-icon">🏭</div>
            <h2 v-if="!sidebarCollapsed" class="logo-text">奕新雷射</h2>
          </div>
          <button
            class="sidebar-toggle"
            @click="toggleSidebar"
            :title="sidebarCollapsed ? '展開側邊欄' : '收起側邊欄'"
          >
            <span v-if="!sidebarCollapsed">◀</span>
            <span v-else>▶</span>
          </button>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section">
            <h3 v-if="!sidebarCollapsed" class="nav-section-title">主要功能</h3>
            <router-link to="/" class="nav-item" active-class="active">
              <div class="nav-icon">🏠</div>
              <span v-if="!sidebarCollapsed" class="nav-text">儀表板</span>
            </router-link>
            <router-link
              to="/production"
              class="nav-item"
              active-class="active"
            >
              <div class="nav-icon">⚙️</div>
              <span v-if="!sidebarCollapsed" class="nav-text">生產管理</span>
            </router-link>
          </div>

          <div class="nav-section">
            <h3 v-if="!sidebarCollapsed" class="nav-section-title">人力資源</h3>
            <router-link to="/hr/staff" class="nav-item" active-class="active">
              <div class="nav-icon">👨‍💼</div>
              <span v-if="!sidebarCollapsed" class="nav-text">員工管理</span>
            </router-link>
            <router-link
              to="/hr/attendance"
              class="nav-item"
              active-class="active"
            >
              <div class="nav-icon">📅</div>
              <span v-if="!sidebarCollapsed" class="nav-text">出勤管理</span>
            </router-link>
            <router-link
              to="/hr/manhour"
              class="nav-item"
              active-class="active"
            >
              <div class="nav-icon">⏰</div>
              <span v-if="!sidebarCollapsed" class="nav-text">工時管理</span>
            </router-link>
            <router-link to="/hr/leave" class="nav-item" active-class="active">
              <div class="nav-icon">🏖️</div>
              <span v-if="!sidebarCollapsed" class="nav-text">請假管理</span>
            </router-link>
            <router-link to="/hr/staff-segment" class="nav-item" active-class="active">
              <div class="nav-icon">⏰</div>
              <span v-if="!sidebarCollapsed" class="nav-text">上班時段管理</span>
            </router-link>
          </div>

          <div class="nav-section">
            <h3 v-if="!sidebarCollapsed" class="nav-section-title">銷售管理</h3>
            <router-link to="/crm" class="nav-item" active-class="active">
              <div class="nav-icon">🤝</div>
              <span v-if="!sidebarCollapsed" class="nav-text">客戶</span>
            </router-link>
            <router-link
              to="/crm/contacts"
              class="nav-item"
              active-class="active"
            >
              <div class="nav-icon">👤</div>
              <span v-if="!sidebarCollapsed" class="nav-text">聯絡人</span>
            </router-link>
            <router-link
              to="/crm/quotes"
              class="nav-item"
              active-class="active"
            >
              <div class="nav-icon">💰</div>
              <span v-if="!sidebarCollapsed" class="nav-text">報價單</span>
            </router-link>
            <router-link
              to="/crm/orders"
              class="nav-item"
              active-class="active"
            >
              <div class="nav-icon">📋</div>
              <span v-if="!sidebarCollapsed" class="nav-text">訂貨單</span>
            </router-link>
          </div>

          <div class="nav-section">
            <h3 v-if="!sidebarCollapsed" class="nav-section-title">生產管理</h3>
            <router-link
              to="/crm/design-work-orders"
              class="nav-item"
              active-class="active"
            >
              <div class="nav-icon">✏️</div>
              <span v-if="!sidebarCollapsed" class="nav-text">設計工作單</span>
            </router-link>
            <router-link
              to="/crm/cutting-work-orders"
              class="nav-item"
              active-class="active"
            >
              <div class="nav-icon">✂️</div>
              <span v-if="!sidebarCollapsed" class="nav-text">切割工作單</span>
            </router-link>
            <router-link
              to="/crm/processing-work-orders"
              class="nav-item"
              active-class="active"
            >
              <div class="nav-icon">🔧</div>
              <span v-if="!sidebarCollapsed" class="nav-text">加工工作單</span>
            </router-link>
            <router-link
              to="/crm/delivery-work-orders"
              class="nav-item"
              active-class="active"
            >
              <div class="nav-icon">🚚</div>
              <span v-if="!sidebarCollapsed" class="nav-text">送貨工作單</span>
            </router-link>
            <router-link
              to="/crm/nestings"
              class="nav-item"
              active-class="active"
            >
              <div class="nav-icon">📐</div>
              <span v-if="!sidebarCollapsed" class="nav-text">排版管理</span>
            </router-link>
          </div>

          <div class="nav-section">
            <h3 v-if="!sidebarCollapsed" class="nav-section-title">系統管理</h3>
            <router-link to="/settings" class="nav-item" active-class="active">
              <div class="nav-icon">⚙️</div>
              <span v-if="!sidebarCollapsed" class="nav-text">系統設定</span>
            </router-link>
          </div>
        </nav>

        <div class="sidebar-footer">
          <router-link to="/profile" class="user-info-link">
            <div class="user-info">
              <div class="user-avatar">👤</div>
              <div v-if="!sidebarCollapsed" class="user-details">
                <div class="user-name">{{ authStore.userName }}</div>
                <div class="user-role">
                  {{ authStore.userRole === 'admin' ? '系統管理員' : '一般用戶' }}
                </div>
              </div>
            </div>
          </router-link>
        </div>
      </aside>

      <!-- 主要內容區域 -->
      <main class="main-content" :class="{ 'main-expanded': sidebarCollapsed }">
        <!-- 頂部導航欄 -->
        <header class="top-header">
          <div class="header-left">
            <h1 class="page-title">{{ currentPageTitle }}</h1>
          </div>
          <div class="header-right">
            <div class="header-actions">
              <div class="user-menu">
                <button class="user-menu-btn" @click="toggleUserMenu">
                  <span class="user-avatar-sm">👤</span>
                  <span class="user-name-sm">{{ authStore.userName }}</span>
                  <span
                    class="dropdown-arrow"
                    :class="{ rotated: showUserMenu }"
                    >▼</span
                  >
                </button>

                <!-- 用戶下拉選單 -->
                <div
                  v-show="showUserMenu"
                  class="user-dropdown-menu"
                  :class="{ show: showUserMenu }"
                >
                  <div class="dropdown-item" @click="handleResetPassword">
                    <span class="dropdown-icon">🔑</span>
                    <span>重設密碼</span>
                  </div>
                  <div class="dropdown-divider"></div>
                  <div class="dropdown-item" @click="handleLogout">
                    <span class="dropdown-icon">🚪</span>
                    <span>登出</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <!-- 頁面內容 -->
        <div class="page-content">
          <router-view />
        </div>
      </main>

      <!-- 移動端遮罩 -->
      <div
        v-if="showMobileOverlay"
        class="mobile-overlay"
        @click="closeMobileSidebar"
      ></div>
    </template>

    <!-- 全局錯誤 Modal -->
    <ErrorModal
      :show="errorStore.show"
      :message="errorStore.message"
      :type="errorStore.type"
      :title="errorStore.isLogoutError ? '登出提示' : '錯誤'"
      @close="handleErrorClose"
      @confirm="handleErrorConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { useErrorStore } from './stores/error';
import ErrorModal from './components/ErrorModal.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const errorStore = useErrorStore();

const sidebarCollapsed = ref(false);
const showMobileOverlay = ref(false);
const showUserMenu = ref(false); // 新增：控制用戶下拉選單的顯示

// 頁面標題映射
const pageTitles: Record<string, string> = {
  '/': '儀表板',
  '/production': '生產管理',
  '/hr/staff': '員工管理',
  '/hr/attendance': '出勤管理',
  '/hr/manhour': '工時管理',
  '/hr/leave': '請假管理',
  '/hr/staff-segment': '上班時段管理',
  '/crm': '客戶',
  '/crm/contacts': '聯絡人',
  '/crm/orders': '工作單',
  '/crm/quotes': '報價單',
  '/settings': '系統設定',
  '/profile': '個人資料',
};

const currentPageTitle = computed(() => {
  return pageTitles[route.path] || 'ISIN CNC 管理系統';
});

// 檢查是否為重設密碼頁面
const isResetPasswordPage = computed(() => {
  return route.path === '/reset-password';
});

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

const closeMobileSidebar = () => {
  showMobileOverlay.value = false;
};

// 監聽路由變化，在移動端自動收起側邊欄
watch(route, () => {
  if (window.innerWidth <= 768) {
    showMobileOverlay.value = false;
  }
});

// 響應式處理
const handleResize = () => {
  if (window.innerWidth <= 768) {
    sidebarCollapsed.value = true;
  }
};

// 登出功能
const handleLogout = () => {
  authStore.logout();
  showUserMenu.value = false; // 關閉下拉選單
  router.push('/login');
};

// 重設密碼功能
const handleResetPassword = () => {
  showUserMenu.value = false; // 關閉下拉選單
  router.push('/reset-password');
};

// 切換用戶下拉選單顯示
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
};

// 點擊外部關閉下拉選單
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.user-menu')) {
    showUserMenu.value = false;
  }
};

// 組件掛載時初始化認證狀態
onMounted(() => {
  authStore.initializeAuth();
  handleResize();
  window.addEventListener('resize', handleResize);

  // 添加點擊外部關閉下拉選單的監聽器
  document.addEventListener('click', handleClickOutside);
});

// 監聽認證狀態變化，簡單重定向
watch(
  () => authStore.isLoggedIn,
  (isLoggedIn) => {
    if (
      isLoggedIn &&
      (route.path === '/login' || route.path === '/reset-password')
    ) {
      // 如果已登入且在登入頁面或重設密碼頁面，重定向到首頁
      router.push('/');
    }
  },
);

// 處理錯誤 Modal 關閉
const handleErrorClose = () => {
  errorStore.clearError();
};

// 處理錯誤 Modal 確認
const handleErrorConfirm = () => {
  if (errorStore.isLogoutError) {
    // 401 錯誤：登出並跳轉到登入頁面
    errorStore.clearError();
    authStore.logout();
    router.push('/login');
  } else {
    // 其他錯誤：關閉 modal
    errorStore.clearError();
  }
};

// 組件卸載時移除事件監聽
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.app {
  display: flex;
  min-height: 100vh;
  background-color: var(--secondary-50);
}

.full-page-container {
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
}

/* 側邊欄樣式 */
.sidebar {
  width: var(--sidebar-width);
  background: linear-gradient(
    180deg,
    var(--secondary-900) 0%,
    var(--secondary-800) 100%
  );
  color: white;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: fixed;
  height: 100vh;
  z-index: 1000;
  box-shadow: var(--shadow-xl);
}

.sidebar-collapsed {
  width: 70px;
}

.sidebar-header {
  padding: 1.5rem 1rem;
  border-bottom: 1px solid var(--secondary-700);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.logo-text {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: white;
  margin: 0;
}

.sidebar-toggle {
  background: none;
  border: none;
  color: var(--secondary-300);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--border-radius);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.sidebar-toggle:hover {
  background-color: var(--secondary-700);
  color: white;
}

/* 側邊欄導航 */
.sidebar-nav {
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 2rem;
}

.nav-section-title {
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--secondary-400);
  margin: 0 1rem 0.75rem;
  padding: 0 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: var(--secondary-300);
  text-decoration: none;
  transition: all 0.2s ease;
  border-radius: 0;
  margin: 0 0.5rem;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background-color: var(--secondary-700);
  color: white;
}

.nav-item.active {
  background-color: var(--primary-600);
  color: white;
  border-left-color: var(--primary-300);
}

.nav-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  width: 1.5rem;
  text-align: center;
}

.nav-text {
  font-weight: 500;
  white-space: nowrap;
}

/* 側邊欄底部 */
.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid var(--secondary-700);
}

.user-info-link {
  text-decoration: none;
  display: block;
  padding: 0.5rem;
  margin: -0.5rem;
  border-radius: var(--border-radius);
  transition: background-color 0.2s ease;
}

.user-info-link:hover {
  background-color: var(--secondary-700);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  font-size: 2rem;
  flex-shrink: 0;
}

.user-details {
  min-width: 0;
}

.user-name {
  font-weight: 600;
  color: white;
  font-size: var(--font-size-sm);
}

.user-role {
  font-size: var(--font-size-xs);
  color: var(--secondary-400);
}

/* 主要內容區域 */
.main-content {
  flex: 1;
  margin-left: var(--sidebar-width);
  transition: margin-left 0.3s ease;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-expanded {
  margin-left: 70px;
}

/* 頂部導航欄 */
.top-header {
  background: white;
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--secondary-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 100;
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--secondary-900);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.header-btn:hover {
  background-color: var(--secondary-100);
}

.header-icon {
  font-size: 1.25rem;
}

.notification-badge {
  position: absolute;
  top: 0;
  right: 0;
  background-color: var(--danger-500);
  color: white;
  font-size: var(--font-size-xs);
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  min-width: 1.25rem;
  text-align: center;
}

.user-menu {
  position: relative;
}

.user-menu-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: 1px solid var(--secondary-300);
  padding: 0.5rem 0.75rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-menu-btn:hover {
  background-color: var(--secondary-50);
  border-color: var(--secondary-400);
}

.user-avatar-sm {
  font-size: 1.25rem;
}

.user-name-sm {
  font-weight: 500;
  color: var(--secondary-700);
}

.dropdown-arrow {
  font-size: var(--font-size-xs);
  color: var(--secondary-500);
  transition: transform 0.3s ease;
}

.dropdown-arrow.rotated {
  transform: rotate(180deg);
}

/* 用戶下拉選單 */
.user-dropdown-menu {
  position: absolute;
  top: 100%; /* 下拉選單在按鈕下方 */
  right: 0;
  background-color: white;
  border: 1px solid var(--secondary-200);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-md);
  z-index: 1001; /* 確保在其他元素上方 */
  min-width: 200px;
  padding: 0.5rem 0;
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  transform: scale(0.9);
  opacity: 0;
  transition:
    transform 0.2s ease-in-out,
    opacity 0.2s ease-in-out;
}

.user-dropdown-menu.show {
  transform: scale(1);
  opacity: 1;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: var(--secondary-900);
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: var(--secondary-100);
  color: var(--primary-600);
}

.dropdown-divider {
  height: 1px;
  background-color: var(--secondary-200);
  margin: 0.5rem 0;
}

.dropdown-icon {
  font-size: 1.125rem;
  flex-shrink: 0;
}

/* 頁面內容 */
.page-content {
  flex: 1;
  padding: 2rem;
}

/* 移動端遮罩 */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

/* 響應式設計 */
@media (max-width: 1024px) {
  .sidebar {
    width: 240px;
  }

  .sidebar-collapsed {
    width: 60px;
  }

  .main-content {
    margin-left: 240px;
  }

  .main-expanded {
    margin-left: 60px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .sidebar.show {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
  }

  .main-expanded {
    margin-left: 0;
  }

  .top-header {
    padding: 1rem;
  }

  .page-content {
    padding: 1rem;
  }

  .header-actions {
    gap: 0.5rem;
  }

  .user-name-sm {
    display: none;
  }

  /* 移動端下拉選單調整 */
  .user-dropdown-menu {
    right: -1rem; /* 調整右側位置 */
    min-width: 180px; /* 減少最小寬度 */
  }
}

@media (max-width: 480px) {
  .top-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .page-title {
    font-size: var(--font-size-xl);
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
