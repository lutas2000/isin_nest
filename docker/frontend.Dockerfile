FROM node:22-alpine AS builder

WORKDIR /app/apps/frontend

# 前端依賴獨立管理（apps/frontend/package-lock.json）
COPY apps/frontend/package.json apps/frontend/package-lock.json ./
RUN npm ci

# 複製前端原始碼
COPY apps/frontend/ ./

# 讓 build 時把 API base 內嵌進 bundle（預設 /api）
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build


FROM nginx:1.27-alpine AS runner

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/apps/frontend /usr/share/nginx/html

EXPOSE 80

