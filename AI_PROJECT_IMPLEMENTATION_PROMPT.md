# 企业级项目落地提示词：个人日程与目标管理 Web App

你是一名资深全栈工程师、产品架构师和安全工程师。请基于以下要求，完整落地一个可部署、可维护、适合手机使用的个人日程与目标管理 Web App。你需要直接产出项目代码、配置、部署文件、数据库结构、AI 调用逻辑、前后端页面和必要文档。

## 一、项目背景

我要做一个网页应用，用于管理个人日程、周任务、月任务和长期目标。用户主要通过手机访问，也可以在电脑上使用。

核心目标：

1. 方便查看今日、本周、本月和长期目标。
2. 方便通过自然语言随时增加、修改、删除、完成或取消日程。
3. 使用大模型解析用户输入，但不能让大模型直接操作数据库。
4. 支持 Docker 部署到 Linux 服务器。
5. 项目代码需要清晰、稳定、可维护，达到企业级落地标准。

## 二、关键安全要求

必须严格遵守：

1. 不要把任何 API key 写入前端代码、仓库、日志、README 示例或构建产物。
2. 如果用户在对话中提供了真实 API key，视为已经泄露，只能建议用户轮换密钥，并在代码中使用环境变量占位。
3. 大模型 API key 只能通过服务端环境变量读取。
4. 前端只能调用本项目后端接口，不能直接调用大模型接口。
5. 所有 AI 返回内容必须经过 JSON 解析、schema 校验和业务规则校验。
6. 删除、批量修改、低置信度修改、匹配多个日程的操作必须要求用户二次确认。
7. 管理页面必须有登录保护。
8. 生产部署必须支持 HTTPS 反向代理。
9. `.env` 必须加入 `.gitignore`。

## 三、推荐技术栈

优先使用以下技术栈，除非已有代码仓库明显使用其他技术：

- 前端和后端：Next.js App Router + TypeScript
- 样式：Tailwind CSS
- UI 组件：根据项目需要使用轻量组件，移动端优先
- 数据库：SQLite，使用 Prisma ORM
- 表单和校验：Zod
- 认证：简单密码登录或 NextAuth，MVP 可使用服务端 session cookie
- AI 调用：服务端 API route 调用 OpenAI-compatible Chat Completions 接口
- 部署：Docker + Docker Compose
- 运行环境：Linux 服务器

如果使用其他栈，必须说明原因，并保持同等能力。

## 四、环境变量

必须使用 `.env.example` 提供占位符：

```env
NODE_ENV=production
APP_URL=https://your-domain.example
APP_TIMEZONE=Australia/Perth
SESSION_SECRET=replace-with-long-random-secret
ADMIN_PASSWORD_HASH=replace-with-bcrypt-hash

LLM_BASE_URL=https://x666.me
LLM_MODEL=gemini-2.5-flash
LLM_API_KEY=replace-with-real-key-in-server-env-only

DATABASE_URL=file:/app/data/prod.db
```

不要生成真实密钥。

## 五、产品页面

至少实现以下页面。

### 1. 首页 `/`

手机优先展示：

- 今日事项
- 逾期未完成事项
- 本周任务
- 本月任务
- 长期目标
- 快捷入口：新增日程、AI 管理、日历视图、目标页

要求：

- 布局适合手机单手查看。
- 信息密度适中，避免营销页风格。
- 每个事项显示标题、时间、优先级、状态、标签。
- 支持快速标记完成。

### 2. 日历页 `/calendar`

提供：

- 日视图
- 周视图
- 月视图
- 按状态、类型、标签筛选

### 3. AI 管理页 `/ai`

提供：

- 自然语言输入框
- 示例输入提示，但不要占用主界面太多空间
- 提交后调用后端 AI 解析接口
- 展示 AI 解析出的待执行操作
- 用户确认后才真正写入数据库

示例输入：

- 明天下午 3 点提醒我交报告
- 每周一晚上 8 点安排健身
- 删除下周三的牙医预约
- 把本周的读书任务标记完成
- 给我增加一个长期目标：三个月内完成英语口语训练

### 4. 目标页 `/goals`

展示：

- 长期目标
- 年度目标
- 月度目标
- 可关联到具体任务的目标拆解

### 5. 手动编辑页 `/events/new` 和 `/events/[id]`

即使有 AI，也必须支持手动增删改查。

## 六、数据模型

使用 Prisma 定义至少以下模型。

```prisma
model Event {
  id          String      @id @default(cuid())
  title       String
  description String?
  startAt     DateTime?
  endAt       DateTime?
  allDay      Boolean     @default(false)
  type        EventType
  scope       EventScope
  status      EventStatus @default(TODO)
  priority    Priority    @default(MEDIUM)
  tags        String      @default("[]")
  repeatRule  String?
  reminderAt  DateTime?
  parentId    String?
  parent      Event?      @relation("EventParent", fields: [parentId], references: [id])
  children    Event[]     @relation("EventParent")
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

enum EventType {
  EVENT
  TASK
  HABIT
  GOAL
}

enum EventScope {
  DAY
  WEEK
  MONTH
  LONG_TERM
}

enum EventStatus {
  TODO
  DOING
  DONE
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

model AiActionLog {
  id          String   @id @default(cuid())
  userInput   String
  rawResponse  String
  actionsJson  String
  status      String
  error       String?
  createdAt   DateTime @default(now())
}
```

## 七、AI 操作流程

必须采用两阶段流程。

第一阶段：解析

```txt
POST /api/ai/parse-schedule
```

输入：

```json
{
  "input": "明天下午 3 点提醒我交报告"
}
```

后端需要：

1. 读取当前时间和时区。
2. 查询相关 existingEvents，提供给大模型用于匹配修改或删除目标。
3. 调用大模型。
4. 严格解析 JSON。
5. 使用 Zod 校验。
6. 返回待确认 actions，不写数据库。

第二阶段：确认执行

```txt
POST /api/ai/confirm-actions
```

输入：

```json
{
  "actions": []
}
```

后端需要：

1. 再次校验 actions。
2. 对 delete/update/complete/cancel 操作确认目标是否存在。
3. 禁止直接执行模糊匹配、多目标匹配和低置信度操作。
4. 执行数据库写入。
5. 记录 AiActionLog。

## 八、大模型接口

大模型服务信息：

- Base URL：`https://x666.me`
- Model：`gemini-2.5-flash`
- API key：只能从 `LLM_API_KEY` 读取

优先按 OpenAI-compatible Chat Completions 方式实现：

```txt
POST {LLM_BASE_URL}/v1/chat/completions
Authorization: Bearer {LLM_API_KEY}
Content-Type: application/json
```

如果实际服务路径不同，需要把路径做成可配置项，例如：

```env
LLM_CHAT_COMPLETIONS_PATH=/v1/chat/completions
```

## 九、大模型 System Prompt

服务端调用大模型时，必须使用类似以下 system prompt。可以优化，但不得降低约束强度。

```txt
你是一个个人日程管理助手。你的任务是把用户的自然语言请求转换成严格 JSON，用于创建、更新、删除、完成或取消日程。

你不能直接执行任何操作，只能返回结构化 JSON。
不要输出解释文字，不要输出 Markdown，不要输出代码块，只输出 JSON。

当前时区由服务端提供。
当前日期时间由服务端提供。
所有相对日期都必须基于 currentDateTime 和 timezone 计算。

你必须遵守：
1. 只能返回合法 JSON。
2. 不确定具体时间时，使用 null，并设置 clarificationNeeded 为 true。
3. 涉及“今天、明天、后天、下周、周末、月底、下个月、今年、明年”等相对日期时，必须基于服务端提供的 currentDateTime 计算。
4. 删除、修改、完成、取消已有日程时，必须优先在 existingEvents 中匹配。
5. 不允许编造 existingEvents 中不存在的 id。
6. 如果匹配多个 existingEvents，不能直接操作，必须设置 clarificationNeeded 为 true。
7. 用户要求“提醒”时，生成 reminderAt。
8. 用户要求“每天、每周、每月、每年、工作日、周末”等重复任务时，生成 repeatRule。
9. 长期目标没有明确日期时，scope 使用 LONG_TERM，type 使用 GOAL。
10. 输出日期时间必须是 ISO 8601 格式，并包含时区偏移。
11. confidence 低于 0.75 的操作不应自动执行。
12. 不要把不存在的信息当作事实；缺失信息必须明确要求澄清。

返回 JSON 格式必须完全符合：

{
  "clarificationNeeded": false,
  "clarificationQuestion": null,
  "actions": [
    {
      "action": "create",
      "targetId": null,
      "matchQuery": null,
      "data": {
        "title": "",
        "description": "",
        "startAt": null,
        "endAt": null,
        "allDay": false,
        "type": "TASK",
        "scope": "DAY",
        "status": "TODO",
        "priority": "MEDIUM",
        "tags": [],
        "repeatRule": null,
        "reminderAt": null,
        "parentId": null
      },
      "confidence": 0.95,
      "reason": ""
    }
  ]
}

action 只能是：
- create
- update
- delete
- complete
- cancel

type 只能是：
- EVENT
- TASK
- HABIT
- GOAL

scope 只能是：
- DAY
- WEEK
- MONTH
- LONG_TERM

status 只能是：
- TODO
- DOING
- DONE
- CANCELLED

priority 只能是：
- LOW
- MEDIUM
- HIGH
```

## 十、大模型 User Prompt 模板

后端每次调用大模型时，使用以下 JSON 作为用户消息内容：

```json
{
  "currentDateTime": "2026-06-08T09:00:00+08:00",
  "timezone": "Australia/Perth",
  "userInput": "用户输入的自然语言",
  "existingEvents": [
    {
      "id": "event_id",
      "title": "示例日程",
      "description": "",
      "startAt": "2026-06-10T15:00:00+08:00",
      "endAt": null,
      "type": "TASK",
      "scope": "DAY",
      "status": "TODO",
      "priority": "MEDIUM",
      "tags": []
    }
  ]
}
```

## 十一、API 设计

至少实现：

```txt
GET    /api/events
POST   /api/events
GET    /api/events/:id
PATCH  /api/events/:id
DELETE /api/events/:id

POST   /api/ai/parse-schedule
POST   /api/ai/confirm-actions

POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

查询参数支持：

```txt
GET /api/events?from=2026-06-01&to=2026-06-30&scope=MONTH&status=TODO&type=TASK
```

## 十二、前端体验要求

1. 手机优先，默认宽度按 360px 到 430px 设计。
2. 页面底部提供常用导航：首页、日历、AI、目标。
3. 按钮和表单控件要适合触屏。
4. 不做营销落地页，打开就是可用的应用界面。
5. 使用清晰的状态颜色，但不要让界面被单一色系支配。
6. 不要使用大量装饰性卡片、巨大 hero、渐变背景。
7. 信息列表要易扫读。
8. 所有空状态、加载状态、错误状态都要处理。
9. AI 解析结果必须以“待确认修改”的形式展示。
10. 删除操作要有明确视觉警告。

## 十三、业务规则

1. 今日事项：`startAt` 在当天，或 scope 为 DAY 且未完成。
2. 本周任务：`startAt` 在本周，或 scope 为 WEEK。
3. 本月任务：`startAt` 在本月，或 scope 为 MONTH。
4. 长期目标：scope 为 LONG_TERM 或 type 为 GOAL 且无具体日期。
5. 逾期事项：`startAt` 早于当前时间且 status 不是 DONE/CANCELLED。
6. 完成事项不删除，只改变 status。
7. 删除应保留操作日志。
8. 重复任务 MVP 阶段可以只保存 repeatRule，不强制展开实例；如果实现展开，需要保证幂等。

## 十四、Docker 部署

必须提供：

```txt
Dockerfile
docker-compose.yml
.dockerignore
.env.example
README.md
```

`docker-compose.yml` 至少包含：

```yaml
services:
  schedule-app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

README 需要说明：

1. 本地开发启动。
2. 数据库初始化。
3. Docker 部署。
4. 如何设置环境变量。
5. 如何配置反向代理和 HTTPS。
6. 如何轮换大模型 API key。

## 十五、测试和质量要求

至少实现：

1. 数据模型校验测试。
2. AI JSON 解析和 schema 校验测试。
3. 关键 API 测试。
4. 删除、批量修改、低置信度操作的安全测试。
5. 前端关键页面基本渲染测试，或提供可执行的手动验收清单。

代码质量要求：

1. TypeScript 严格模式。
2. 后端 API 输入输出使用 Zod 校验。
3. 错误处理不能只 `console.log`。
4. 不要吞掉 AI 解析错误。
5. 不要相信前端传入的 targetId、status、scope，需要服务端再次校验。
6. 关键逻辑要拆分到可测试的 service 层。

## 十六、交付物

最终必须交付：

1. 完整可运行源码。
2. Docker 部署配置。
3. SQLite/Prisma 数据模型和迁移。
4. AI 解析服务。
5. 前端页面。
6. 登录保护。
7. `.env.example`。
8. README。
9. 测试或验收清单。

## 十七、实施顺序

请按以下顺序实施：

1. 初始化项目结构。
2. 配置 TypeScript、Tailwind、Prisma、SQLite。
3. 创建数据模型和迁移。
4. 实现事件 CRUD API。
5. 实现认证和页面保护。
6. 实现首页、日历页、目标页、手动编辑页。
7. 实现 AI 解析接口。
8. 实现 AI 确认执行接口。
9. 实现 AI 管理页。
10. 增加 Docker 部署文件。
11. 增加 README 和 `.env.example`。
12. 运行测试和构建。
13. 修复所有构建、类型、lint 和测试问题。

## 十八、验收标准

项目完成后必须满足：

1. `docker compose up -d --build` 可以启动应用。
2. 手机浏览器打开应用后可以登录。
3. 首页可以看到今日、本周、本月和长期目标。
4. 可以手动创建、编辑、删除、完成日程。
5. 可以在 AI 页面输入自然语言并得到待确认操作。
6. 确认后数据库被正确修改。
7. AI 返回非法 JSON 时页面能显示错误，不会崩溃。
8. 删除或模糊匹配操作不会绕过确认。
9. API key 不出现在前端构建产物、日志和仓库文件中。
10. Docker 重启后数据不丢失。

## 十九、执行原则

请直接开始实现，不要只给建议。遇到不明确的地方，采用保守、可维护、适合个人生产使用的默认方案。

如果必须做取舍，优先级如下：

1. 数据安全和 API key 安全。
2. 日程数据准确性。
3. 手机端可用性。
4. 部署稳定性。
5. 界面美观。

最终输出时，请说明：

1. 已完成内容。
2. 如何启动。
3. 如何部署。
4. 如何配置大模型。
5. 已运行的测试。
6. 仍需用户手动配置的内容。
