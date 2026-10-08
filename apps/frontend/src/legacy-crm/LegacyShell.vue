<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
} from 'vue';
import { useRouter } from 'vue-router';
import PartnersView from './components/PartnersView.vue';
import MasterDataView from './components/MasterDataView.vue';
import PartsView from './components/PartsView.vue';
import MdiChild from './components/MdiChild.vue';
import { useAuthStore } from '../stores/auth';
import { useLegacyReadOnly } from './utils/legacyAccess';
import { companyProfile } from './utils/companyProfile';
import {
  OPEN_PART_DRAFT_KEY,
  PART_DRAFT_KEY,
  type PartDraft,
} from './utils/partDraft';
import { FORM_HINT, focusHint } from './utils/statusHints';
import './styles/tokens.css';
import './styles/legacy.css';

// The legacy main window (isin_vb6 src/App.vue, docs/legacy-ui-spec.md): a
// menu bar, forms opened as child windows inside it, and a status bar along
// the bottom. The whole page is the legacy screen; the new system's sidebar
// and header are not shown (LEGACY-CRM-REBUILD-PLAN.md 5.1). The status bar
// ends with the signed-in user, 唯讀 for `crm` read only, and 登出.

interface MenuItem {
  key?: string;
  command?: string;
  label?: string;
  title?: string;
  hint?: string;
  fieldHints?: boolean;
  separator?: boolean;
  id?: number;
  checked?: boolean;
}
interface Menu {
  id: string;
  label: string;
  shortcut: string;
  items: MenuItem[];
}
interface ChildWindow {
  id: number;
  key: string;
}

const SEPARATOR: MenuItem = { separator: true };
const menus: Menu[] = [
  {
    id: 'files',
    label: '檔案',
    shortcut: 'F',
    items: [
      {
        key: 'customers',
        label: '客戶建檔',
        title: '客戶資料',
        hint: FORM_HINT,
        fieldHints: true,
      },
      {
        key: 'suppliers',
        label: '廠商建檔',
        title: '廠商資料',
        hint: FORM_HINT,
        fieldHints: true,
      },
      // 員工建檔 is left out: employees are kept in the new system's HR
      // (LEGACY-CRM-REBUILD-PLAN.md 2.3).
      { key: 'parts', label: '工件建檔', hint: FORM_HINT, fieldHints: true },
      { key: 'materials', label: '材質建檔' },
      { key: 'groups', label: '圖組建檔', hint: FORM_HINT, fieldHints: true },
      { key: 'banks', label: '銀行建檔', hint: FORM_HINT, fieldHints: true },
      { key: 'phrases', label: '詞彙資料', hint: FORM_HINT, fieldHints: true },
      {
        key: 'postal-codes',
        label: '郵遞區號',
        hint: FORM_HINT,
        fieldHints: true,
      },
    ],
  },
  {
    id: 'transactions',
    label: '交易登錄',
    shortcut: 'T',
    items: [
      { key: 'orders', label: '訂單登錄', hint: FORM_HINT, fieldHints: true },
      {
        key: 'sales',
        label: '銷貨登錄',
        title: '出貨登錄',
        hint: FORM_HINT,
        fieldHints: true,
      },
      { key: 'receipts', label: '收款登錄', hint: FORM_HINT, fieldHints: true },
      SEPARATOR,
      { key: 'quotes', label: '報價登錄', hint: FORM_HINT, fieldHints: true },
      SEPARATOR,
      {
        key: 'work-orders',
        label: '工作登錄',
        hint: FORM_HINT,
        fieldHints: true,
      },
      // 完工登錄 is left out: the legacy 完工單 never held data (decided 2026-10-07).
    ],
  },
  {
    id: 'reports',
    label: '報表列印',
    shortcut: 'R',
    items: [
      {
        key: 'order-reports',
        label: '訂單報表',
        title: '訂單報表列印',
        fieldHints: true,
      },
      {
        key: 'sales-reports',
        label: '銷貨報表',
        title: '銷貨報表列印',
        fieldHints: true,
      },
      {
        key: 'work-reports',
        label: '工作報表',
        title: '工作報表列印',
        fieldHints: true,
      },
      SEPARATOR,
      {
        key: 'receipt-reports',
        label: '收款報表',
        title: '收款報表列印',
        fieldHints: true,
      },
      SEPARATOR,
      {
        key: 'customer-reports',
        label: '客戶報表',
        title: '客戶資料列印',
        fieldHints: true,
      },
      {
        key: 'supplier-reports',
        label: '廠商報表',
        title: '廠商資料列印',
        fieldHints: true,
      },
      {
        key: 'employee-reports',
        label: '員工報表',
        title: '員工資料列印',
        fieldHints: true,
      },
      {
        key: 'part-reports',
        label: '工作件報表',
        title: '工作資料列印',
        fieldHints: true,
      },
    ],
  },
  // 系統維護 is not rebuilt (decided 2026-10-07).
  {
    id: 'window',
    label: '視窗',
    shortcut: 'W',
    items: [
      { command: 'cascade', label: '梯式排列' },
      { command: 'horizontal', label: '水平並列' },
      { command: 'vertical', label: '垂直並列' },
      { command: 'icons', label: '排列圖示' },
    ],
  },
  {
    id: 'help',
    label: '說明',
    shortcut: 'H',
    items: [
      { command: 'summary', label: '使用摘要' },
      { command: 'about', label: '關於本軟體' },
    ],
  },
];
const formItems = menus
  .flatMap((menu) => menu.items)
  .filter((item) => item.key);
const itemByKey = new Map(formItems.map((item) => [item.key as string, item]));
const partnerKinds: Record<string, string> = {
  customers: 'customer',
  suppliers: 'supplier',
};
const masterKinds = new Set(['materials', 'banks', 'phrases', 'postal-codes']);

// Open child windows, the active one, and how they are laid out:
// "max" (each child fills the main window, as the legacy forms open),
// "cascade", "horizontal" or "vertical".
const windows = ref<ChildWindow[]>([]);
const activeId = ref<number | null>(null);
const arrangement = ref('max');
const minimized = ref(new Set<number>());
let nextId = 1;

const activeWindow = computed(
  () => windows.value.find((window) => window.id === activeId.value) ?? null,
);
const visibleWindows = computed(() =>
  windows.value.filter((window) => !minimized.value.has(window.id)),
);
// Forms with fieldHints change the bar as the focus moves (statusHints.js);
// the others keep the form's text.
const fieldHint = ref(new Map<number, string>());
const statusText = computed(() =>
  activeWindow.value && !minimized.value.has(activeWindow.value.id)
    ? (fieldHint.value.get(activeWindow.value.id) ??
      itemByKey.get(activeWindow.value.key)?.hint ??
      '')
    : '',
);

// A legacy text box also selects its whole text as it gets the focus
// (SetCustEnv, the same forms); a mouse click then places the caret.
function trackFieldHint(window: ChildWindow, event: FocusEvent) {
  if (!itemByKey.get(window.key)?.fieldHints) return;
  const hint = focusHint(event.target);
  if (hint === undefined) return;
  fieldHint.value = new Map(fieldHint.value).set(window.id, hint);
  (event.target as HTMLInputElement).select();
}
const titleText = computed(() => {
  const window = activeWindow.value;
  return window &&
    arrangement.value === 'max' &&
    !minimized.value.has(window.id) &&
    !isDialog(window)
    ? `${companyProfile.name} - [${windowTitle(window)}]`
    : companyProfile.name;
});
watch(
  titleText,
  (value) => {
    document.title = value;
  },
  { immediate: true },
);

// Report dialogs are small windows over the main backdrop, not maximized
// child forms.
function isDialog(window: ChildWindow | null) {
  return Boolean(window?.key.endsWith('-reports'));
}

const showBackdrop = computed(
  () =>
    !visibleWindows.value.length ||
    (arrangement.value === 'max' &&
      isDialog(activeWindow.value) &&
      !minimized.value.has(activeWindow.value.id)),
);

function windowTitle(window: ChildWindow) {
  const item = itemByKey.get(window.key);
  return item?.title ?? item?.label ?? '';
}

function openForm(key: string) {
  const existing = windows.value.find((window) => window.key === key);
  if (existing) {
    activate(existing.id);
    return;
  }
  const window = { id: nextId++, key };
  windows.value = [...windows.value, window];
  activate(window.id);
}

// 訂單登錄 F2「建立工件圖檔」opens 工件建檔 at 新增 with the row's fields.
const partDraft = ref<PartDraft | null>(null);
let draftId = 0;
provide(PART_DRAFT_KEY, partDraft);
provide(OPEN_PART_DRAFT_KEY, (values) => {
  partDraft.value = { id: ++draftId, values };
  openForm('parts');
});

function activate(id: number) {
  activeId.value = id;
  if (minimized.value.has(id)) {
    const next = new Set(minimized.value);
    next.delete(id);
    minimized.value = next;
  }
}

function closeWindow(id: number) {
  windows.value = windows.value.filter((window) => window.id !== id);
  if (fieldHint.value.has(id)) {
    const hints = new Map(fieldHint.value);
    hints.delete(id);
    fieldHint.value = hints;
  }
  const next = new Set(minimized.value);
  next.delete(id);
  minimized.value = next;
  if (activeId.value === id)
    activeId.value =
      visibleWindows.value.at(-1)?.id ?? windows.value.at(-1)?.id ?? null;
}

function minimize(id: number) {
  minimized.value = new Set([...minimized.value, id]);
  if (activeId.value === id)
    activeId.value = visibleWindows.value.at(-1)?.id ?? null;
}

function maximize(id: number) {
  arrangement.value = 'max';
  activate(id);
}

// Menu bar: click or Alt+letter opens a menu; ↑ ↓ ← → move, Enter chooses,
// Esc closes.
const openMenuId = ref<string | null>(null);
const highlighted = ref(-1);
const dialog = ref<string | null>(null);
const openMenu = computed(
  () => menus.find((menu) => menu.id === openMenuId.value) ?? null,
);

function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id;
  highlighted.value = -1;
}

function choose(item: MenuItem) {
  openMenuId.value = null;
  if (item.separator) return;
  if (item.key) openForm(item.key);
  else if (
    item.command === 'cascade' ||
    item.command === 'horizontal' ||
    item.command === 'vertical'
  )
    arrangement.value = item.command;
  else if (item.command === 'icons') minimized.value = new Set(minimized.value);
  else if (item.command === 'window') activate(item.id as number);
  else if (item.command) dialog.value = item.command;
}

function confirmExit() {
  openMenuId.value = null;
  if (
    !windows.value.length ||
    window.confirm('確定要結束？所有開啟的視窗都會關閉，未存檔的資料不會保存。')
  ) {
    windows.value = [];
    minimized.value = new Set();
    activeId.value = null;
    arrangement.value = 'max';
  }
}

// The 視窗 menu ends with the list of open windows, as in VB6 MDI programs.
const menuItems = computed<MenuItem[]>(() => {
  const menu = openMenu.value;
  if (!menu) return [];
  if (menu.id !== 'window' || !windows.value.length) return menu.items;
  return [
    ...menu.items,
    SEPARATOR,
    ...windows.value.map((window, index) => ({
      command: 'window',
      id: window.id,
      label: `${index + 1} ${windowTitle(window)}`,
      checked: window.id === activeId.value,
    })),
  ];
});

function moveHighlight(step: number) {
  const items = menuItems.value;
  if (!items.length) return;
  let index = highlighted.value;
  for (let tries = 0; tries < items.length; tries += 1) {
    index = (index + step + items.length) % items.length;
    if (!items[index].separator) break;
  }
  highlighted.value = index;
}

function handleMenuKey(event: KeyboardEvent) {
  if (
    event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    event.code?.startsWith('Key')
  ) {
    const menu = menus.find((entry) => entry.shortcut === event.code.slice(3));
    if (menu) {
      event.preventDefault();
      openMenuId.value = menu.id;
      highlighted.value = -1;
      moveHighlight(1);
    }
    return;
  }
  if (!openMenu.value) return;
  const index = menus.findIndex((menu) => menu.id === openMenuId.value);
  if (event.key === 'Escape') openMenuId.value = null;
  else if (event.key === 'ArrowDown') moveHighlight(1);
  else if (event.key === 'ArrowUp') moveHighlight(-1);
  else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    openMenuId.value =
      menus[
        (index + (event.key === 'ArrowRight' ? 1 : -1) + menus.length) %
          menus.length
      ].id;
    highlighted.value = -1;
    moveHighlight(1);
  } else if (event.key === 'Enter' && menuItems.value[highlighted.value])
    choose(menuItems.value[highlighted.value]);
  else return;
  event.preventDefault();
  event.stopPropagation();
}

// F1 and F10 belong to the forms (輔助輸入, 詞彙); a field without them
// must not open the browser's help or menu instead.
function swallowAssistKey(event: KeyboardEvent) {
  if (event.key === 'F1' || event.key === 'F10') event.preventDefault();
}

function closeMenuOnOutsideClick(event: MouseEvent) {
  if (
    openMenuId.value &&
    !(event.target as Element | null)?.closest?.('.legacy-menubar')
  )
    openMenuId.value = null;
}

onMounted(() => {
  window.addEventListener('keydown', handleMenuKey, true);
  window.addEventListener('keydown', swallowAssistKey);
  window.addEventListener('mousedown', closeMenuOnOutsideClick);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleMenuKey, true);
  window.removeEventListener('keydown', swallowAssistKey);
  window.removeEventListener('mousedown', closeMenuOnOutsideClick);
});

function childStyle(window: ChildWindow) {
  if (arrangement.value !== 'cascade') return {};
  const index = visibleWindows.value.findIndex(
    (entry) => entry.id === window.id,
  );
  return { left: `${index * 26}px`, top: `${index * 26}px` };
}

function childVisible(window: ChildWindow) {
  if (minimized.value.has(window.id)) return false;
  return arrangement.value !== 'max' || window.id === activeId.value;
}

const about = `${companyProfile.name}\n雷射銷管軟體系統（新版）\n以 Vue 3 與 PostgreSQL 重建舊版 VB6 系統，操作與列印版面依舊版。`;
const summary =
  '選單「檔案」維護主檔，「交易登錄」輸入單據，「報表列印」列印報表。單據畫面的按鈕與舊版相同：新增 F5、更新 F6、刪除 F7、查詢 R、上筆 J、下筆 K、頭筆 I、尾筆 M、列印 P、關閉 C；新增或更新時按存檔 F6 儲存、取消 F5 放棄。欄位按 F1 可開輔助輸入。';

nextTick(() => {
  document.title = titleText.value;
});

// 狀態列右側：登入者（綁定的員工姓名，沒有就用帳號）、唯讀、登出。
const auth = useAuthStore();
const router = useRouter();
const readOnly = useLegacyReadOnly();
const userLabel = computed(() => auth.staffName || auth.userName);

function logout() {
  if (
    windows.value.length &&
    !window.confirm(
      '確定要登出？所有開啟的視窗都會關閉，未存檔的資料不會保存。',
    )
  )
    return;
  auth.logout();
  void router.push('/login');
}
</script>

<template>
  <div class="legacy-root legacy-app">
    <div class="legacy-app-title">{{ titleText }}</div>

    <nav class="legacy-menubar" aria-label="主選單">
      <div v-for="menu in menus" :key="menu.id" class="legacy-menu">
        <button
          type="button"
          class="legacy-menu-title"
          :class="{ open: openMenuId === menu.id }"
          :aria-expanded="openMenuId === menu.id"
          @click="toggleMenu(menu.id)"
          @mouseenter="
            openMenuId && openMenuId !== menu.id && toggleMenu(menu.id)
          "
        >
          {{ menu.label }}({{ menu.shortcut }})
        </button>
        <div
          v-if="openMenuId === menu.id"
          class="legacy-menu-items"
          role="menu"
        >
          <template v-for="(item, index) in menuItems" :key="index">
            <hr v-if="item.separator" />
            <button
              v-else
              type="button"
              role="menuitem"
              :class="{ highlighted: index === highlighted }"
              @mouseenter="highlighted = index"
              @click="choose(item)"
            >
              <span class="legacy-menu-check">{{
                item.checked ? '✓' : ''
              }}</span
              >{{ item.label }}
            </button>
          </template>
        </div>
      </div>
      <button type="button" class="legacy-menu-title" @click="confirmExit">
        結束
      </button>
      <div class="legacy-menubar-spacer"></div>
      <div
        v-if="
          arrangement === 'max' &&
          activeWindow &&
          !minimized.has(activeWindow.id) &&
          !isDialog(activeWindow)
        "
        class="legacy-child-controls"
      >
        <button
          type="button"
          aria-label="最小化"
          @click="minimize(activeWindow.id)"
        >
          _
        </button>
        <button
          type="button"
          aria-label="還原"
          @click="arrangement = 'cascade'"
        >
          ❐
        </button>
        <button
          type="button"
          aria-label="關閉視窗"
          @click="closeWindow(activeWindow.id)"
        >
          ×
        </button>
      </div>
    </nav>

    <main class="legacy-mdi" :class="`legacy-mdi-${arrangement}`">
      <div v-if="showBackdrop" class="legacy-backdrop" aria-hidden="true">
        <div class="legacy-backdrop-panel">
          <div class="legacy-backdrop-title">雷射銷管軟體系統</div>
          <div class="legacy-backdrop-rule"></div>
          <div class="legacy-backdrop-company">{{ companyProfile.name }}</div>
        </div>
      </div>
      <div class="legacy-mdi-children">
        <section
          v-for="window in windows"
          v-show="childVisible(window)"
          :key="window.id"
          class="legacy-child"
          :class="{
            active: window.id === activeId,
            'legacy-child-dialog': isDialog(window),
          }"
          :style="childStyle(window)"
          @mousedown="activeId = window.id"
          @focusin="trackFieldHint(window, $event)"
        >
          <header
            v-if="arrangement !== 'max'"
            class="legacy-child-title"
            @dblclick="maximize(window.id)"
          >
            <span>{{ windowTitle(window) }}</span>
            <span class="legacy-child-buttons">
              <button
                type="button"
                aria-label="最小化"
                @click.stop="minimize(window.id)"
              >
                _
              </button>
              <button
                type="button"
                aria-label="最大化"
                @click.stop="maximize(window.id)"
              >
                □
              </button>
              <button
                type="button"
                aria-label="關閉視窗"
                @click.stop="closeWindow(window.id)"
              >
                ×
              </button>
            </span>
          </header>
          <div class="legacy-child-body">
            <MdiChild
              :active="window.id === activeId"
              @close="closeWindow(window.id)"
            >
              <PartnersView
                v-if="partnerKinds[window.key]"
                :kind="partnerKinds[window.key]"
                :title="windowTitle(window)"
              />
              <MasterDataView
                v-else-if="masterKinds.has(window.key)"
                :kind="window.key"
                :title="windowTitle(window)"
              />
              <PartsView
                v-else-if="window.key === 'parts'"
                :title="windowTitle(window)"
              />
              <!-- 圖組建檔、交易登錄、報表列印 move over in stage 4 (LEGACY-CRM-REBUILD-PLAN.md 10). -->
              <section v-else class="legacy-coming-soon">
                <p>
                  「{{
                    windowTitle(window)
                  }}」尚未搬入新系統，請暫時使用舊系統。
                </p>
              </section>
            </MdiChild>
          </div>
        </section>
      </div>
      <div v-if="minimized.size" class="legacy-minimized">
        <button
          v-for="window in windows.filter((entry) => minimized.has(entry.id))"
          :key="window.id"
          type="button"
          @click="activate(window.id)"
        >
          {{ windowTitle(window) }}
        </button>
      </div>
    </main>

    <footer class="legacy-app-status">
      <span class="legacy-app-status-text" role="status">{{ statusText }}</span>
      <span class="legacy-app-status-user">
        <span>{{ userLabel }}</span>
        <span v-if="readOnly">唯讀</span>
        <button type="button" @click="logout">登出</button>
      </span>
    </footer>

    <div
      v-if="dialog"
      class="legacy-modal-backdrop"
      @click.self="dialog = null"
    >
      <section class="legacy-message-box" role="dialog" aria-modal="true">
        <div class="legacy-dialog-title">
          {{ dialog === 'about' ? '關於本軟體' : '使用摘要' }}
        </div>
        <p>{{ dialog === 'about' ? about : summary }}</p>
        <div class="legacy-message-buttons">
          <button type="button" @click="dialog = null">確定</button>
        </div>
      </section>
    </div>
  </div>
</template>
