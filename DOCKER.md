## 目標

用 Docker + Docker Compose 一次啟動：

- **database**: PostgreSQL
- **backend**: NestJS（Nx build 後以 Node 執行）
- **frontend**: Vue（Vite build 後由 Nginx 提供靜態檔案）

並且讓前端用 **同網域 `/api`** 呼叫後端（由 Nginx 反向代理轉發），避免跨網域/主機名在不同設備上造成問題。

---

## 前置需求（新機器）

- 安裝 Docker Engine 與 Docker Compose plugin  
  - Linux（Ubuntu/Debian）建議依 Docker 官方文件安裝
- 取得本專案原始碼（git clone 或下載）

---

## 一鍵啟動（推薦）

在專案根目錄（`/workspace`）執行：

```bash
docker compose up -d --build
```

啟動後：

- **前端**: `http://localhost:3001`
- **後端（含 Swagger）**: `http://localhost:3000/api`
- **DB（選用，若你需要從 host 連線）**: `localhost:5432`

停止：

```bash
docker compose down
```

連資料庫資料也要一起清掉（危險操作）：

```bash
docker compose down -v
```

---

## 如何 build Docker images（不啟動容器）

```bash
docker compose build
```

或單獨 build：

```bash
# 後端
docker build -f docker/backend.Dockerfile -t isin-backend:local .

# 前端
docker build -f docker/frontend.Dockerfile -t isin-frontend:local .
```

---

## 環境變數（Docker Compose 預設值）

`docker-compose.yml` 內已提供可用的預設值：

- **PostgreSQL**
  - `POSTGRES_USER=postgres`
  - `POSTGRES_PASSWORD=postgres`
  - `POSTGRES_DB=isin`
- **Backend**
  - `PORT=3000`
  - `DB_HOST=db`
  - `DB_PORT=5432`
  - `DB_USER=postgres`
  - `DB_PASS=postgres`
  - `DB_NAME=isin`
  - `DB_SYNC=true`（Docker 本機快速啟動：自動建表；正式環境建議關掉）
  - `JWT_SECRET=your-secret-key`（請在正式環境更換）
- **Frontend**
  - build-time `VITE_API_BASE_URL=/api`

你可以在正式環境把這些值改為更安全的設定（尤其是 `POSTGRES_PASSWORD` / `JWT_SECRET`），再重新 `docker compose up -d --build`。

---

## 在「新的 device」上啟動（最短流程）

1. 安裝 Docker
2. 取得專案原始碼
3. （可選）修改 `docker-compose.yml` 內的密碼與 `JWT_SECRET`
4. 執行：

```bash
docker compose up -d --build
```

5. 用瀏覽器打開前端：
   - `http://<該台機器的IP或域名>:3001`

---

## 常見問題

### 前端打 API 失敗或 404？

- 本專案 Docker 版設計為 **前端走 `/api`**：
  - 前端請求 `/api/auth/login`
  - Nginx 會轉發到後端 `http://backend:3000/auth/login`
- 如果你改了路由前綴或後端 port，請同步更新：
  - `docker/nginx.conf`
  - `docker-compose.yml`

