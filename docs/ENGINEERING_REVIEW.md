# 工程审计与优化记录

本记录面向长期维护、扩展、稳定性和生产适配能力，列出当前已经处理的高确定性问题，以及后续仍建议持续优化的方向。

## 已修复的高风险点

1. AI 确认执行改为单事务

   原实现逐条执行 AI actions。多个动作中途失败时，可能出现前半已写库、后半失败的部分提交。现在 `confirmAiActions` 在一个 Prisma transaction 内执行所有 actions，并在失败时回滚业务写入。

2. 父目标关系加入循环保护

   原实现只校验 `parentId` 是否存在，无法阻止父目标指向自身或形成环。现在服务层会拒绝自引用和循环链路，避免目标树在后续展示、统计或递归拆解时失控。

3. 日期范围改为基于 `APP_TIMEZONE`

   原实现使用 Node 本地时区计算今日、本周、本月边界，部署服务器时区不同会造成首页和日历范围错位。现在日期边界与显示都基于应用配置时区。

4. SQLite 加入 enum-like CHECK 约束

   Prisma SQLite 当前不支持原生 enum 字段。为避免绕过 API 写入非法 `type/scope/status/priority`，初始迁移已加入 CHECK 约束，API 层仍保留 Zod 校验。

5. 构建产物密钥防护

   Next standalone 构建曾会复制 `.env`。当前 build 脚本会在构建结束后清理 `.next/standalone` 中的 `.env*` 文件，降低构建产物泄露风险。

6. 标签筛选改为精确语义

   事件标签存储为 JSON 字符串。原先直接使用 `contains` 会出现 `work` 命中 `homework` 这类误匹配。现在数据库只做 JSON 字符串片段预过滤，服务层再基于解析后的 tags 做精确匹配。

7. 空更新请求被显式拒绝

   原先空 PATCH 可能进入服务层并产生无意义写入或隐藏调用方错误。现在 API 和服务层都会拒绝空更新。

8. 初始迁移补齐 `updatedAt` 默认值

   手写 SQLite 迁移中 `updatedAt` 曾是 NOT NULL 但没有默认值。新数据库通过 `migrate deploy` 后创建事项可能触发数据库约束失败。现在迁移中使用 `DEFAULT CURRENT_TIMESTAMP`。

9. 表单时间展示语义更明确

   浏览器 `datetime-local` 输入和应用展示时区之间存在潜在认知差异。表单现在明确提示保存后按 `APP_TIMEZONE` 展示。

## 当前架构评估

- 前后端职责清晰：页面通过本项目 API 写数据，大模型只在服务端调用。
- 业务规则集中在 `lib/event-service.ts`、`lib/ai/service.ts` 和 `lib/schemas.ts`，可测试性尚可。
- SQLite + Prisma 适合个人生产使用；若未来多人协作、并发写入或复杂报表增多，建议迁移 PostgreSQL。
- AI action schema 已覆盖主要安全边界，但自然语言多目标匹配仍应持续增强交互式澄清能力。

## 后续建议

1. 引入端到端测试

   当前有 schema、service、API route 和组件测试。建议后续加入 Playwright，覆盖登录、创建、AI 解析确认、删除确认、移动端布局。

2. 增加数据导出和备份

   SQLite 部署应配合定期备份 `./data/prod.db`。可以增加 `/api/export` 或 CLI 备份脚本。

3. 增加结构化操作日志

   当前删除和 AI action 有日志。后续可把 create/update/complete/cancel 都写入统一审计表，方便恢复和排查。

4. 改善目标拆解模型

   当前用 `parentId` 表示目标与任务关联。后续可增加 `GoalProgress` 或 rollup service，计算长期目标完成率。

5. 增加速率限制

   登录和 AI API 建议加入 IP/session 级速率限制，避免暴力尝试密码或消耗 LLM 配额。

6. 明确时间输入语义

   当前浏览器 `datetime-local` 会按访问者本地时区转换为 UTC，并在页面中按 `APP_TIMEZONE` 展示。个人使用通常可接受；跨时区使用时建议实现固定应用时区输入组件，而不是依赖浏览器本地时区。
