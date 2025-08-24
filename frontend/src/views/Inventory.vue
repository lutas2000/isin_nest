<template>
  <div class="inventory-page">
    <div class="page-header">
      <div class="header-content">
        <h1>庫存管理</h1>
        <p>管理原材料、半成品和成品的庫存狀況</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary">
          <span class="btn-icon">📦</span>
          新增物料
        </button>
        <button class="btn btn-outline">
          <span class="btn-icon">📊</span>
          庫存盤點
        </button>
      </div>
    </div>

    <!-- 庫存概覽 -->
    <div class="inventory-overview">
      <div class="overview-card">
        <div class="overview-icon">📦</div>
        <div class="overview-content">
          <div class="overview-value">{{ inventoryStats.totalItems }}</div>
          <div class="overview-label">總物料數</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">💰</div>
        <div class="overview-content">
          <div class="overview-value">NT$ {{ inventoryStats.totalValue }}</div>
          <div class="overview-label">庫存總值</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">⚠️</div>
        <div class="overview-content">
          <div class="overview-value">{{ inventoryStats.lowStock }}</div>
          <div class="overview-label">庫存不足</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">📈</div>
        <div class="overview-content">
          <div class="overview-value">{{ inventoryStats.turnover }}</div>
          <div class="overview-label">週轉率</div>
        </div>
      </div>
    </div>

    <!-- 主要內容區域 -->
    <div class="inventory-content">
      <div class="content-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 物料管理 -->
      <div v-if="activeTab === 'materials'" class="tab-content">
        <div class="content-header">
          <h3>物料管理</h3>
          <div class="header-controls">
            <div class="search-box">
              <input 
                type="text" 
                class="form-control" 
                placeholder="搜尋物料..."
                v-model="materialSearch"
              />
            </div>
            <select class="form-control" v-model="materialFilter">
              <option value="">全部類別</option>
              <option value="raw">原材料</option>
              <option value="semi">半成品</option>
              <option value="finished">成品</option>
              <option value="tool">工具耗材</option>
            </select>
          </div>
        </div>

        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>物料編號</th>
                <th>物料名稱</th>
                <th>類別</th>
                <th>規格</th>
                <th>庫存數量</th>
                <th>單位</th>
                <th>單價</th>
                <th>庫存狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="material in filteredMaterials" :key="material.id">
                <td>{{ material.id }}</td>
                <td>{{ material.name }}</td>
                <td>
                  <span class="badge" :class="`badge-${material.category}`">
                    {{ material.categoryText }}
                  </span>
                </td>
                <td>{{ material.specification }}</td>
                <td>
                  <span :class="{ 'text-danger': material.quantity < material.minStock }">
                    {{ material.quantity }}
                  </span>
                </td>
                <td>{{ material.unit }}</td>
                <td>NT$ {{ material.price }}</td>
                <td>
                  <span class="badge" :class="getStockStatusClass(material)">
                    {{ getStockStatusText(material) }}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn btn-sm btn-outline">查看詳情</button>
                    <button class="btn btn-sm btn-primary">調整庫存</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 庫存警報 -->
      <div v-if="activeTab === 'alerts'" class="tab-content">
        <div class="content-header">
          <h3>庫存警報</h3>
          <button class="btn btn-primary">處理警報</button>
        </div>

        <div class="alerts-grid">
          <div class="alert-card" v-for="alert in stockAlerts" :key="alert.id">
            <div class="alert-header">
              <div class="alert-icon" :class="`alert-${alert.level}`">
                {{ alert.icon }}
              </div>
              <div class="alert-info">
                <h4>{{ alert.materialName }}</h4>
                <p>{{ alert.description }}</p>
              </div>
              <div class="alert-level">
                <span class="badge" :class="`badge-${alert.level}`">
                  {{ alert.levelText }}
                </span>
              </div>
            </div>
            
            <div class="alert-details">
              <div class="detail-row">
                <span class="detail-label">當前庫存：</span>
                <span class="detail-value">{{ alert.currentStock }} {{ alert.unit }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">安全庫存：</span>
                <span class="detail-value">{{ alert.safetyStock }} {{ alert.unit }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">建議補貨：</span>
                <span class="detail-value">{{ alert.suggestedOrder }} {{ alert.unit }}</span>
              </div>
            </div>
            
            <div class="alert-actions">
              <button class="btn btn-sm btn-outline">查看詳情</button>
              <button class="btn btn-sm btn-primary">建立採購單</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 庫存報表 -->
      <div v-if="activeTab === 'reports'" class="tab-content">
        <div class="content-header">
          <h3>庫存報表</h3>
          <div class="header-controls">
            <select class="form-control" v-model="reportType">
              <option value="stock">庫存現況</option>
              <option value="movement">庫存異動</option>
              <option value="aging">庫存齡分析</option>
            </select>
            <button class="btn btn-primary">匯出報表</button>
          </div>
        </div>

        <div class="reports-grid">
          <div class="report-card">
            <h4>庫存分類統計</h4>
            <div class="category-stats">
              <div class="stat-item" v-for="category in categoryStats" :key="category.name">
                <div class="stat-label">{{ category.name }}</div>
                <div class="stat-value">{{ category.count }}</div>
                <div class="stat-percentage">{{ category.percentage }}%</div>
              </div>
            </div>
          </div>
          
          <div class="report-card">
            <h4>庫存價值分析</h4>
            <div class="value-chart">
              <div class="chart-placeholder">
                <div class="chart-text">📊 庫存價值圖表</div>
                <p>顯示各類物料的庫存價值分布</p>
              </div>
            </div>
          </div>
          
          <div class="report-card">
            <h4>庫存週轉分析</h4>
            <div class="turnover-list">
              <div class="turnover-item" v-for="item in turnoverItems" :key="item.id">
                <div class="item-info">
                  <div class="item-name">{{ item.name }}</div>
                  <div class="item-category">{{ item.category }}</div>
                </div>
                <div class="turnover-data">
                  <div class="turnover-rate">{{ item.turnoverRate }} 次/年</div>
                  <div class="last-movement">{{ item.lastMovement }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// 頁面標籤
const tabs = [
  { id: 'materials', label: '物料管理' },
  { id: 'alerts', label: '庫存警報' },
  { id: 'reports', label: '庫存報表' },
];

const activeTab = ref('materials');

// 庫存統計
const inventoryStats = ref({
  totalItems: 156,
  totalValue: '2,450,000',
  lowStock: 8,
  turnover: '4.2',
});

// 物料搜尋和篩選
const materialSearch = ref('');
const materialFilter = ref('');

// 物料資料
const materials = ref([
  {
    id: 'MAT-001',
    name: '鋁合金板材',
    category: 'raw',
    categoryText: '原材料',
    specification: '6061-T6, 厚度 3mm',
    quantity: 50,
    unit: '片',
    price: '450',
    minStock: 100,
    maxStock: 500,
  },
  {
    id: 'MAT-002',
    name: '不鏽鋼棒材',
    category: 'raw',
    categoryText: '原材料',
    specification: '304, 直徑 20mm',
    quantity: 20,
    unit: '根',
    price: '180',
    minStock: 50,
    maxStock: 200,
  },
  {
    id: 'MAT-003',
    name: '切削刀具',
    category: 'tool',
    categoryText: '工具耗材',
    specification: '硬質合金, 直徑 10mm',
    quantity: 5,
    unit: '組',
    price: '1200',
    minStock: 20,
    maxStock: 100,
  },
  {
    id: 'MAT-004',
    name: '鋁合金零件 A-123',
    category: 'finished',
    categoryText: '成品',
    specification: '精密加工件',
    quantity: 200,
    unit: '件',
    price: '85',
    minStock: 50,
    maxStock: 300,
  },
]);

// 篩選後的物料
const filteredMaterials = computed(() => {
  let filtered = materials.value;

  if (materialSearch.value) {
    filtered = filtered.filter(
      (material) =>
        material.id.toLowerCase().includes(materialSearch.value.toLowerCase()) ||
        material.name.toLowerCase().includes(materialSearch.value.toLowerCase()) ||
        material.specification.toLowerCase().includes(materialSearch.value.toLowerCase()),
    );
  }

  if (materialFilter.value) {
    filtered = filtered.filter((material) => material.category === materialFilter.value);
  }

  return filtered;
});

// 庫存狀態判斷
const getStockStatusClass = (material: any) => {
  if (material.quantity <= material.minStock) return 'danger';
  if (material.quantity <= material.minStock * 1.5) return 'warning';
  if (material.quantity >= material.maxStock * 0.9) return 'info';
  return 'success';
};

const getStockStatusText = (material: any) => {
  if (material.quantity <= material.minStock) return '庫存不足';
  if (material.quantity <= material.minStock * 1.5) return '庫存偏低';
  if (material.quantity >= material.maxStock * 0.9) return '庫存偏高';
  return '庫存正常';
};

// 庫存警報
const stockAlerts = ref([
  {
    id: 1,
    materialName: '鋁合金板材',
    description: '庫存數量低於安全庫存線',
    level: 'high',
    levelText: '高',
    icon: '🔴',
    currentStock: 50,
    unit: '片',
    safetyStock: 100,
    suggestedOrder: 200,
  },
  {
    id: 2,
    materialName: '不鏽鋼棒材',
    description: '庫存數量接近安全庫存線',
    level: 'medium',
    levelText: '中',
    icon: '🟡',
    currentStock: 20,
    unit: '根',
    safetyStock: 50,
    suggestedOrder: 100,
  },
  {
    id: 3,
    materialName: '切削刀具',
    description: '庫存數量嚴重不足',
    level: 'high',
    levelText: '高',
    icon: '🔴',
    currentStock: 5,
    unit: '組',
    safetyStock: 20,
    suggestedOrder: 50,
  },
]);

// 報表設定
const reportType = ref('stock');

// 分類統計
const categoryStats = ref([
  { name: '原材料', count: 45, percentage: 28.8 },
  { name: '半成品', count: 23, percentage: 14.7 },
  { name: '成品', count: 67, percentage: 42.9 },
  { name: '工具耗材', count: 21, percentage: 13.5 },
]);

// 週轉分析
const turnoverItems = ref([
  {
    id: 1,
    name: '鋁合金板材',
    category: '原材料',
    turnoverRate: 12.5,
    lastMovement: '2024-01-15',
  },
  {
    id: 2,
    name: '不鏽鋼棒材',
    category: '原材料',
    turnoverRate: 8.3,
    lastMovement: '2024-01-14',
  },
  {
    id: 3,
    name: '切削刀具',
    category: '工具耗材',
    turnoverRate: 24.1,
    lastMovement: '2024-01-16',
  },
]);
</script>

<style scoped>
.inventory-page {
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
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h1 {
  margin-bottom: 0.5rem;
  color: var(--secondary-900);
}

.header-content p {
  color: var(--secondary-600);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.btn-icon {
  margin-right: 0.5rem;
}

/* 庫存概覽 */
.inventory-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.overview-card {
  background: white;
  padding: 1.5rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.overview-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.overview-content {
  flex: 1;
}

.overview-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.overview-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

/* 主要內容區域 */
.inventory-content {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.content-tabs {
  display: flex;
  border-bottom: 1px solid var(--secondary-200);
  background-color: var(--secondary-50);
}

.tab-btn {
  background: none;
  border: none;
  padding: 1rem 2rem;
  cursor: pointer;
  font-weight: 500;
  color: var(--secondary-600);
  transition: all 0.2s ease;
  border-bottom: 3px solid transparent;
}

.tab-btn:hover {
  color: var(--secondary-800);
  background-color: var(--secondary-100);
}

.tab-btn.active {
  color: var(--primary-600);
  border-bottom-color: var(--primary-600);
  background-color: white;
}

.tab-content {
  padding: 2rem;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.content-header h3 {
  margin: 0;
  color: var(--secondary-900);
}

.header-controls {
  display: flex;
  gap: 1rem;
}

.search-box {
  min-width: 300px;
}

/* 表格容器 */
.table-container {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--secondary-200);
}

.table th {
  background-color: var(--secondary-50);
  font-weight: 600;
  color: var(--secondary-700);
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table tbody tr:hover {
  background-color: var(--secondary-50);
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

/* 警報網格 */
.alerts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.alert-card {
  background: var(--secondary-50);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--secondary-200);
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.alert-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.alert-icon.alert-high {
  color: var(--danger-500);
}

.alert-icon.alert-medium {
  color: var(--warning-500);
}

.alert-icon.alert-low {
  color: var(--info-500);
}

.alert-info h4 {
  margin: 0 0 0.25rem 0;
  color: var(--secondary-900);
}

.alert-info p {
  margin: 0;
  color: var(--secondary-600);
  font-size: var(--font-size-sm);
}

.alert-details {
  margin-bottom: 1.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: var(--font-size-sm);
}

.detail-label {
  color: var(--secondary-600);
  font-weight: 500;
}

.detail-value {
  color: var(--secondary-900);
}

.alert-actions {
  display: flex;
  gap: 0.5rem;
}

/* 報表網格 */
.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.report-card {
  background: var(--secondary-50);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--secondary-200);
}

.report-card h4 {
  margin: 0 0 1rem 0;
  color: var(--secondary-900);
}

.chart-placeholder {
  text-align: center;
  padding: 3rem 1rem;
  background: white;
  border-radius: var(--border-radius);
  border: 2px dashed var(--secondary-300);
}

.chart-text {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.chart-placeholder p {
  color: var(--secondary-600);
  margin: 0;
}

/* 分類統計 */
.category-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.stat-item {
  background: white;
  padding: 1rem;
  border-radius: var(--border-radius);
  text-align: center;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--primary-600);
  margin-bottom: 0.25rem;
}

.stat-percentage {
  font-size: var(--font-size-sm);
  color: var(--secondary-500);
}

/* 週轉分析 */
.turnover-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.turnover-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border-radius: var(--border-radius);
}

.item-info {
  flex: 1;
}

.item-name {
  font-weight: 500;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.item-category {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

.turnover-data {
  text-align: right;
}

.turnover-rate {
  font-weight: 600;
  color: var(--primary-600);
  margin-bottom: 0.25rem;
}

.last-movement {
  font-size: var(--font-size-sm);
  color: var(--secondary-500);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .header-actions {
    width: 100%;
    justify-content: center;
  }
  
  .inventory-overview {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .content-tabs {
    flex-wrap: wrap;
  }
  
  .tab-btn {
    flex: 1;
    min-width: 120px;
    text-align: center;
  }
  
  .content-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .header-controls {
    width: 100%;
    flex-direction: column;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .alerts-grid {
    grid-template-columns: 1fr;
  }
  
  .reports-grid {
    grid-template-columns: 1fr;
  }
  
  .category-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .inventory-overview {
    grid-template-columns: 1fr;
  }
  
  .tab-content {
    padding: 1rem;
  }
  
  .table-container {
    font-size: var(--font-size-sm);
  }
  
  .table th,
  .table td {
    padding: 0.5rem;
  }
}
</style>
