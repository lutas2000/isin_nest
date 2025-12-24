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

## 使用方式

### 導入組件

```typescript
import {
  PageHeader,
  OverviewCard,
  TabNavigation,
  DataTable,
  SearchFilters,
  StatusBadge,
  Modal,
  FormField,
  DraggableList,
  SectionHeader,
  TableHeader,
} from '@/components';
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
