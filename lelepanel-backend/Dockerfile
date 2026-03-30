# Dockerfile
# 使用官方 Python 基础镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 复制依赖文件并安装依赖
COPY lelepanel-backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/

# 复制后端代码和数据库文件（如果数据库已存在）
COPY lelepanel-backend/main.py .
COPY lelepanel-backend/models.py .
# 这是复制已存在的数据库文件，包含您的链接和admin账户
COPY lelepanel-backend/database.db .

# 复制前端文件（我们将让 FastAPI 容器也提供静态文件）
COPY lelepanel-frontend /app/static

# 端口 8000
EXPOSE 8000

# 启动命令：使用 Uvicorn 运行应用
# 使用 --host 0.0.0.0 允许外部访问
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# 将仓库连接到容器映像
LABEL org.opencontainers.image.source=https://github.com/camel52zhang/Lele-Panel