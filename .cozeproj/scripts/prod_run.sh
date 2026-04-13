#!/usr/bin/env bash
# 产物部署使用
set -euo pipefail

ROOT_DIR="$(pwd)"

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-5000}"

# ==================== 工具函数 ====================
info() {
  echo "[INFO] $1"
}
warn() {
  echo "[WARN] $1"
}
error() {
  echo "[ERROR] $1"
  exit 1
}
check_command() {
  if ! command -v "$1" &> /dev/null; then
    error "命令 $1 未找到，请先安装"
  fi
}

# ============== 启动服务 ======================
check_command "pnpm"
check_command "node"

info "启动前端静态文件服务，端口: $PORT"
info "前端构建产物目录: $ROOT_DIR/client/dist"

# 检查前端构建产物是否存在
if [ ! -d "$ROOT_DIR/client/dist" ]; then
  error "前端构建产物不存在，请先运行 prod_build.sh"
fi

# 启动后端服务（后台运行，端口 9091）
info "启动后端服务..."
cd "$ROOT_DIR/server"
PORT=9091 node dist/index.js &
BACKEND_PID=$!
cd "$ROOT_DIR"

# 等待后端启动
sleep 2
info "后端服务已启动，PID: $BACKEND_PID"

# 使用 serve 启动前端静态文件服务
info "启动前端服务..."
cd "$ROOT_DIR/client"
exec npx serve dist -l "$PORT" -s
