# Views Components 使用說明

本目錄包含了從 `apps/frontend/src/views` 中提取的重複使用組件，用於提高代碼重用性和維護性。

## 組件列表

### 1. PageHeader

頁面標題組件，包含標題、描述和操作按鈕區域。

```vue
<PageHeader title="頁面標題" description="頁面描述">
  <template #actions>
    <button class="btn btn-primary">操作按鈕</button>
  </template>
</PageHeader>
```

### 2. OverviewCard

概覽卡片組件，用於顯示統計數據。

```vue
<OverviewCard icon="📊" :value="123" label="統計標籤" variant="primary" />
```

**變體選項：** `default`, `primary`, `success`, `warning`, `danger`, `info`

### 3. TabNavigation

標籤頁導航組件。

```vue
<TabNavigation
  :tabs="[
    { id: 'tab1', label: '標籤1' },
    { id: 'tab2', label: '標籤2' },
  ]"
  v-model:activeTab="activeTab"
>
  <div v-if="activeTab === 'tab1'">標籤1內容</div>
  <div v-if="activeTab === 'tab2'">標籤2內容</div>
</TabNavigation>
```

### 4. DataTable

數據表格組件，支援自定義列和操作按鈕。

```vue
<DataTable
  :columns="[
    { key: 'name', label: '姓名' },
    { key: 'email', label: '電子郵件' },
  ]"
  :data="tableData"
  :show-actions="true"
>
  <template #cell-name="{ row }">
    <strong>{{ row.name }}</strong>
  </template>
  
  <template #actions="{ row }">
    <button class="btn btn-sm btn-primary">編輯</button>
  </template>
</DataTable>
```

### 5. SearchFilters

搜尋和篩選控制項組件。

```vue
<SearchFilters
  title="搜尋標題"
  :show-search="true"
  search-placeholder="搜尋..."
  :filters="[
    {
      key: 'status',
      placeholder: '選擇狀態',
      options: [
        { value: 'active', label: '啟用' },
        { value: 'inactive', label: '停用' },
      ],
    },
  ]"
  :show-date-filter="true"
  v-model:search="searchValue"
  v-model:filter="filterValue"
  v-model:date="dateValue"
/>
```

### 6. StatusBadge

狀態徽章組件。

```vue
<StatusBadge text="狀態文字" variant="success" size="md" />
```

**變體選項：** `default`, `primary`, `success`, `warning`, `danger`, `info`, `secondary`
**尺寸選項：** `sm`, `md`, `lg`

### 7. Modal

模態框組件。

```vue
<Modal :show="showModal" title="模態框標題" @close="showModal = false">
  <p>模態框內容</p>
  
  <template #footer>
    <button class="btn btn-outline" @click="showModal = false">取消</button>
    <button class="btn btn-primary">確認</button>
  </template>
</Modal>
```

### 8. FormField

表單欄位組件，支援多種輸入類型。

```vue
<FormField
  v-model="formData.name"
  type="text"
  label="姓名"
  placeholder="請輸入姓名"
  :required="true"
  error-message="姓名不能為空"
/>
```

**支援的類型：** `text`, `email`, `password`, `number`, `select`, `textarea`

### 9. DraggableList

可拖曳排序的列表組件，支援自定義項目內容和操作按鈕。

```vue
<DraggableList
  :items="configList"
  :show-actions="true"
  item-key="id"
  @order-change="handleOrderChange"
>
  <template #item="{ item, index }">
    <div class="item-code">{{ item.code }}</div>
    <div class="item-label">{{ item.label }}</div>
  </template>
  
  <template #actions="{ item, index }">
    <button class="btn btn-sm btn-primary" @click="editItem(item)">
      編輯
    </button>
    <button class="btn btn-sm btn-danger" @click="deleteItem(item)">
      刪除
    </button>
  </template>
</DraggableList>
```

**Props:**
- `items` (required): 要顯示的項目陣列
- `showActions` (optional, default: `true`): 是否顯示操作按鈕區域
- `itemKey` (optional, default: `'id'`): 用於識別項目的鍵名

**Events:**
- `order-change`: 當項目順序改變時觸發，參數為重新排序後的項目陣列

**Slots:**
- `#item`: 自定義項目內容，接收 `{ item, index }`
- `#actions`: 自定義操作按鈕，接收 `{ item, index }`

### 10. SectionHeader

區塊標題組件，用於顯示區塊標題和操作按鈕。

```vue
<SectionHeader title="區塊標題">
  <template #actions>
    <button class="btn btn-primary">
      <span class="btn-icon">➕</span>
      新增
    </button>
  </template>
</SectionHeader>
```

**Props:**
- `title` (required): 區塊標題文字

**Slots:**
- `#actions`: 操作按鈕區域（可選）

### 11. TableHeader

表格標題組件，專門用於表格容器內部的標題和操作區域。

```vue
<TableHeader title="員工列表">
  <template #actions>
    <div class="search-box">
      <input
        type="text"
        class="form-control"
        placeholder="搜尋..."
        v-model="searchQuery"
      />
    </div>
    <select class="form-control" v-model="filter">
      <option value="">全部</option>
      <option value="active">啟用</option>
    </select>
    <button class="btn btn-primary">新增</button>
  </template>
</TableHeader>
```

**Props:**
- `title` (optional): 表格標題文字

**Slots:**
- `#actions`: 操作區域，可放置搜尋框、篩選器、按鈕等

**與 SectionHeader 的區別：**
- `TableHeader` 專為表格容器設計，內建 padding 和 border-bottom
- `SectionHeader` 用於一般區塊標題，margin-bottom 較大

## CRM 列表搜尋與篩選

CRM 列表頁建議使用 `CrmTableContainer` 搭配 **單一搜尋框** + **chip 篩選器**。UI 為圓角 pill 按鈕，點擊後展開下拉面板（可參考 [Arto Plus Currency Filter](https://dribbble.com/shots/23696638-Arto-Plus-Currency-Filter-in-SaaS-Payment-System) 風格）。

**設計原則：**

| 層級 | 職責 |
|------|------|
| `CrmTableContainer` | Toolbar UI：搜尋框、chip 篩選、排序、載入／錯誤狀態 |
| `FilterChipControl` | 單一或多個 chip 的下拉互動（選項搜尋、日期區間） |
| 頁面（如 `Quotes.vue`） | 定義 `chipFilters` 選項、維護 `search`／`chipFilterValues`，並在 `computed` 實作 AND 過濾邏輯 |

搜尋與所有已填寫的 filter 條件之間為 **AND** 關係；空白的搜尋或 filter 不參與過濾。

### 12. CrmTableContainer

CRM 列表外層容器，整合 toolbar 與表格內容 slot。

```vue
<CrmTableContainer
  :loading="loading"
  :error="error"
  :show-search="true"
  :search="searchQuery"
  search-placeholder="搜尋報價單編號..."
  :chip-filters="chipFilters"
  :chip-filter-values="filterValues"
  @update:search="searchQuery = $event"
  @update:chip-filter-values="filterValues = $event"
  @retry="loadData"
>
  <EditableDataTable :columns="columns" :data="filteredRows" />
</CrmTableContainer>
```

**搜尋相關 Props：**

| Prop | 說明 |
|------|------|
| `showSearch` | 是否顯示搜尋框（預設 `false`） |
| `search` | 搜尋字串（v-model） |
| `searchPlaceholder` | 搜尋框 placeholder |

**Chip 篩選 Props：**

| Prop | 說明 |
|------|------|
| `chipFilters` | `CrmFilterDefinition[]`，由頁面定義可用篩選 |
| `chipFilterValues` | `Record<string, string>`，各 filter 的目前值 |

**Events：**

| Event | 說明 |
|-------|------|
| `update:search` | 搜尋字串變更 |
| `update:chipFilterValues` | chip 篩選值變更 |
| `update:filters` | 舊版 `FilterControl` 使用（見下方） |
| `update:sort` | 排序變更 |
| `retry` | 錯誤狀態下點擊重試 |

**其他：**

- `chipFilters.length > 0` 時顯示 `FilterChipControl`；否則若傳入舊版 `filters` 則顯示 `FilterControl`（原生 `<select>`），供尚未遷移的列表頁使用。
- `sortOptions` / `sortValue` 與 `SortControl` 搭配；有排序或 `#controls` slot 時，排序與自訂按鈕顯示在第二行。
- 預設 slot 為表格內容；`#controls` 為 toolbar 右側自訂按鈕。

### 13. FilterChipControl

Chip 篩選控制元件，通常由 `CrmTableContainer` 內部使用，也可單獨引用。

```vue
<FilterChipControl
  :filters="chipFilters"
  :model-value="filterValues"
  @update:model-value="filterValues = $event"
/>
```

**Filter 型別（`@/types/crm-filter`）：**

```typescript
// 可搜尋下拉
{
  type: 'select',
  key: 'customerId',        // 對應 chipFilterValues 的 key
  label: '客戶',
  placeholder: '搜尋客戶...',
  searchable: true,         // 預設 true；false 則隱藏下拉內搜尋框
  options: [{ value: 'C001', label: 'C001(簡稱)' }],
}

// 日期區間（使用兩個 key 存起訖）
{
  type: 'date-range',
  label: '建立時間',
  fromKey: 'createdAtFrom',
  toKey: 'createdAtTo',
}
```

**互動行為：**

- 點擊 chip 展開下拉；點擊外部關閉。
- `select`：下拉頂部可搜尋選項，支援「全部」清除該條件。
- `date-range`：開始／結束日期輸入，可「清除日期」。
- 已選條件時 chip 以 primary 色高亮，並顯示摘要文字。

### 14. SearchField

單行文字搜尋輸入，用於 toolbar 或獨立區塊。

```vue
<SearchField
  v-model="searchQuery"
  placeholder="搜尋..."
  :inline="true"
/>
```

| Prop | 說明 |
|------|------|
| `modelValue` | 搜尋字串 |
| `placeholder` | 預設「搜尋...」 |
| `inline` | `true` 時移除外層 `px-4 py-1`，適合嵌入 `CrmTableContainer` toolbar |

### 頁面端實作範例（Quotes.vue）

示範：**搜尋**報價單編號（模糊）+ **篩選**客戶、業務、建立時間（AND）。

**1. 宣告狀態與 filter 定義**

```typescript
import type { CrmFilterDefinition } from '@/types/crm-filter';
import { matchesDateRange } from '@/utils/crmFilter';

const quoteSearch = ref('');
const quoteFilterValues = ref<Record<string, string>>({
  customerId: '',
  staffId: '',
  createdAtFrom: '',
  createdAtTo: '',
});

const quoteChipFilters = computed<CrmFilterDefinition[]>(() => [
  {
    type: 'select',
    key: 'customerId',
    label: '客戶',
    placeholder: '搜尋客戶...',
    options: customers.value.map((c) => ({
      value: c.id,
      label: c.companyShortName ? `${c.id}(${c.companyShortName})` : c.id,
    })),
  },
  {
    type: 'select',
    key: 'staffId',
    label: '業務',
    placeholder: '搜尋業務...',
    options: staffList.value.map((s) => ({ value: s.id, label: s.name })),
  },
  {
    type: 'date-range',
    label: '建立時間',
    fromKey: 'createdAtFrom',
    toKey: 'createdAtTo',
  },
]);
```

**2. 在 `computed` 中套用 AND 過濾（邏輯由頁面負責）**

```typescript
const filteredQuotes = computed(() => {
  let filtered = quotes.value;

  const search = quoteSearch.value.trim().toLowerCase();
  if (search) {
    filtered = filtered.filter((q) => q.id.toString().toLowerCase().includes(search));
  }

  const { customerId, staffId, createdAtFrom, createdAtTo } = quoteFilterValues.value;
  if (customerId) filtered = filtered.filter((q) => q.customerId === customerId);
  if (staffId) filtered = filtered.filter((q) => q.staffId === staffId);
  if (createdAtFrom || createdAtTo) {
    filtered = filtered.filter((q) =>
      matchesDateRange(q.createdAt, createdAtFrom, createdAtTo),
    );
  }

  return filtered;
});
```

**3. 工具函式 `matchesDateRange`（`@/utils/crmFilter`）**

比對 ISO 日期字串是否在區間內（取前 10 字元 `YYYY-MM-DD`）。僅填開始或僅填結束時，另一側不限制。

### 遷移其他 CRM 列表頁

1. 將 `:search` + `@update:search` 保留為單一搜尋欄位。
2. 以 `:chip-filters` / `:chip-filter-values` 取代舊版 `:filters`（若需 chip UI）。
3. 在頁面 `computed` 依業務欄位實作 AND 過濾；`chipFilters` 的 `options` 可來自 API 載入的列表。
4. 未遷移頁面可繼續使用 `:filters` + `FilterControl`，行為不變。

## 使用方式

### 導入組件

```typescript
import {
  PageHeader,
  OverviewCard,
  TabNavigation,
  DataTable,
  SearchFilters,
  CrmTableContainer,
  FilterChipControl,
  StatusBadge,
  Modal,
  FormField,
  DraggableList,
  SectionHeader,
  TableHeader,
} from '@/components';
import type { CrmFilterDefinition } from '@/types/crm-filter';
import { matchesDateRange } from '@/utils/crmFilter';
```

### 在模板中使用

```vue
<template>
  <div class="page">
    <PageHeader title="頁面標題" description="頁面描述">
      <template #actions>
        <button class="btn btn-primary">新增</button>
      </template>
    </PageHeader>

    <div class="overview-grid">
      <OverviewCard
        icon="📊"
        :value="stats.total"
        label="總數"
        variant="primary"
      />
    </div>

    <DataTable :columns="columns" :data="data">
      <template #cell-status="{ row }">
        <StatusBadge :text="row.status" variant="success" />
      </template>
    </DataTable>

    <DraggableList :items="draggableItems" @order-change="handleOrderChange">
      <template #item="{ item }">
        <div>{{ item.name }}</div>
      </template>
    </DraggableList>

    <SectionHeader title="區塊標題">
      <template #actions>
        <button class="btn btn-primary">操作</button>
      </template>
    </SectionHeader>

    <div class="table-container">
      <TableHeader title="數據列表">
        <template #actions>
          <input type="text" class="form-control" placeholder="搜尋..." />
          <button class="btn btn-primary">新增</button>
        </template>
      </TableHeader>
      <DataTable :columns="columns" :data="data" />
    </div>
  </div>
</template>
```

## 樣式變數

所有組件都使用 CSS 變數來定義樣式，確保與現有設計系統的一致性：

- `--primary-*`: 主要顏色
- `--secondary-*`: 次要顏色
- `--success-*`: 成功顏色
- `--warning-*`: 警告顏色
- `--danger-*`: 危險顏色
- `--info-*`: 資訊顏色
- `--border-radius`: 邊框圓角
- `--shadow`: 陰影效果
- `--font-size-*`: 字體大小

## 響應式設計

所有組件都內建響應式設計，會在移動裝置上自動調整佈局和樣式。

## 注意事項

1. 確保在使用組件前已正確導入
2. 所有組件都支援 TypeScript
3. 組件的 props 都有適當的類型定義和預設值
4. 使用 slot 來自定義組件內容
5. 遵循 Vue 3 Composition API 的最佳實踐
