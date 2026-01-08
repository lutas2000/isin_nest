FROM node:22-alpine AS builder

WORKDIR /app

# 安裝依賴（含 build 需要的 devDependencies）
COPY package.json package-lock.json ./
RUN npm ci

# 複製整個 workspace（Nx build 需要設定檔與 apps/）
COPY . .

# 建置後端（輸出到 dist/apps/backend）
RUN npx nx build backend


FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# 只安裝 production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 複製編譯後產物
COPY --from=builder /app/dist ./dist

# Nest 預設 3000（可由 PORT 覆寫）
EXPOSE 3000

# 健康檢查：不用額外安裝 curl/wget
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=10 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/apps/backend/main.js"]

