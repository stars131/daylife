# 个人日程与目标管理 Web App

这是一个移动端优先的 Next.js App Router 项目，用于管理今日事项、周任务、月任务和长期目标。后端使用 Prisma + SQLite，AI 解析通过服务端 OpenAI-compatible Chat Completions 接口完成，前端不会接触大模型 API key。

## 本地开发

1. 安装依赖：

```bash
npm install
```

2. 复制环境变量模板并填写服务端配置：

```bash
cp .env.example .env
```

3. 初始化数据库：

```bash
npm run db:generate
npm run db:migrate
```

4. 启动开发服务器：

```bash
npm run dev
```

打开 `http://localhost:3000`，使用 `.env` 中 `ADMIN_PASSWORD_HASH` 对应的管理员密码登录。

## 环境变量

`.env.example` 只包含占位符。不要把真实 API key、真实 session secret 或真实密码写入仓库。

关键变量：

- `APP_URL`：生产访问地址。
- `APP_TIMEZONE`：默认 `Australia/Perth`。
- `SESSION_SECRET`：至少 32 字节的随机字符串。
- `ADMIN_PASSWORD_HASH`：bcrypt 哈希，不保存明文密码。
- `LLM_BASE_URL`：OpenAI-compatible 服务地址，默认 `https://x666.me`。
- `LLM_MODEL`：模型名，默认 `gemini-2.5-flash`。
- `LLM_API_KEY`：只在服务端环境变量中配置。
- `LLM_CHAT_COMPLETIONS_PATH`：默认 `/v1/chat/completions`。
- `DATABASE_URL`：SQLite 路径，Docker 中使用 `file:/app/data/prod.db`。

生成 bcrypt 哈希示例：

```bash
npm run hash-password -- "your-admin-password"
```

## Docker 部署

1. 在服务器上准备 `.env`，确保 `DATABASE_URL=file:/app/data/prod.db`。
2. 启动：

```bash
docker compose up -d --build
```

`docker-compose.yml` 会把 `./data` 挂载到 `/app/data`，容器重启后 SQLite 数据不会丢失。

## 反向代理与 HTTPS

生产环境建议使用 Nginx、Caddy 或 Traefik 终止 HTTPS，再反向代理到容器的 `3000` 端口。Nginx 示例：

```nginx
server {
  listen 443 ssl http2;
  server_name your-domain.example;

  ssl_certificate /etc/letsencrypt/live/your-domain.example/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.example/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## AI 工作流

AI 页面采用两阶段流程：

1. `POST /api/ai/parse-schedule`：服务端查询相关事项，把当前时间、时区、用户输入和 existingEvents 发给大模型。返回内容必须经过严格 JSON 解析、Zod schema 校验和业务规则校验。此阶段不写入事项数据。
2. `POST /api/ai/confirm-actions`：用户确认后，服务端再次校验 actions。删除、修改、完成、取消、低置信度和模糊匹配操作不能绕过服务端校验。

如需轮换大模型 API key，只更新服务器或部署平台中的 `LLM_API_KEY`，然后重启应用。不要把真实 key 写入 README、前端代码或构建产物。

不要在含真实 `.env` 的环境中公开粘贴 `docker compose config` 输出；该命令会展开 `env_file` 中的变量。

## API

- `GET /api/events?from=2026-06-01&to=2026-06-30&scope=MONTH&status=TODO&type=TASK`
- `POST /api/events`
- `GET /api/events/:id`
- `PATCH /api/events/:id`
- `DELETE /api/events/:id`
- `POST /api/ai/parse-schedule`
- `POST /api/ai/confirm-actions`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

所有管理页面和业务 API 都需要登录。

## 测试和质量检查

```bash
npm run typecheck
npm run test
npm run build
```

测试覆盖：

- 数据模型和输入 schema 校验。
- AI JSON 解析和业务安全规则。
- 关键 UI 页面组件基础渲染。
- API 通过服务端 schema 和 session 保护执行业务逻辑。

当前工作区已通过 `npm run typecheck`、`npm run test` 和 `npm run build`。本机执行 `docker compose build` 时，如果遇到 Docker Buildx lock 文件权限问题，请先修复当前用户对 Docker 配置目录的权限，或在具备 Docker 权限的服务器上执行部署命令。

## 手动验收清单

1. `docker compose up -d --build` 可以启动应用。
2. 手机浏览器打开应用后可以登录。
3. 首页能看到今日、逾期、本周、本月和长期目标分区。
4. 可以手动创建、编辑、删除、完成事项。
5. AI 页面输入自然语言后显示“待确认修改”。
6. 确认后数据库被正确修改。
7. AI 返回非法 JSON 时页面显示错误，不崩溃。
8. 删除或模糊匹配操作不能绕过确认和服务端校验。
9. 真实 API key 不出现在前端构建产物、日志或仓库文件中。
10. Docker 重启后 `./data` 中的数据仍存在。
