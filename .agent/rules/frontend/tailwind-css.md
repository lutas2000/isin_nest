# 前端規則：Tailwind CSS

## 目的

建立可維護的 utility class 使用方式，降低樣式散亂與重複。

## 規則

- 優先使用既有 utility 組合，不先新增自訂 class
- 長 class 串應抽離為可重用元件或語意化封裝
- 避免在頁面中混用多種衝突的排版策略
- 需要新增 Tailwind 設定時，先評估是否影響既有樣式一致性

## 按需加載條件

- 任務包含 Tailwind 調整、樣式重構、class 可讀性改善時
