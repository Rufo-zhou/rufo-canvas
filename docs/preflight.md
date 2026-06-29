# 前置准备清单

## 1. 已补齐

- Next.js + TypeScript + Tailwind CSS 基础项目结构
- Supabase Auth 登录、注册、退出模块
- 首页 prompt 输入与项目卡片列表
- 项目列表页新建、删除项目
- React Flow 无限画布项目页
- 右侧 Agent 对话侧栏
- 参考图上传到 Supabase Storage
- 文字生图与参考图图生图 API 调用链路
- 生成图片自动加入画布
- 图片节点拖动与尺寸调整
- Supabase 类型、客户端和服务端封装
- 生图服务统一抽象
- `POST /api/image-generation` 后端入口，包含任务、资产和 Storage 持久化
- `.env.example`
- `docs/prd.md`
- `docs/supabase.md`
- `docs/canvas.md`
- `api/` 生图接口文档
- `supabase/migrations/0001_initial_schema.sql`
- `images/` 参考图资源
- 用户提供的参考图 `images/reference-lovert-workspace.jpg`
- `scripts/preflight.mjs` 静态自检脚本

## 2. 仍需用户提供真实值

以下内容无法由代码侧凭空生成，必须由项目 owner 或第三方服务后台提供：

- Supabase Project URL
- Supabase anon key
- Supabase service role key
- Nano Banana API key
- Nano Banana API base URL
- Nano Banana generate path
- Nano Banana status path
- GPTlmage2 API key
- GPTlmage2 API base URL
- GPTlmage2 generate path
- GPTlmage2 status path

## 3. 上线前必须确认

- GPTlmage2 服务名称拼写是否准确。
- 第三方生图 API 是否都使用 Bearer Token。
- 第三方返回结构是否包含 `id`、`status`、`imageUrl` 或等价字段。
- 图片当前默认转存到 Supabase Storage。
- 用户登录方式当前为 Supabase 邮箱密码登录。
- RLS 策略是否满足产品权限需求。

## 4. 推荐下一步

1. 填写 `.env.local`。
2. 在 Supabase 执行 migration。
3. 确认第三方 API 文档字段。
4. 运行 `npm install`。
5. 运行 `npm run preflight`、`npm run typecheck`、`npm run lint`、`npm run build`。
6. 启动 `npm run dev` 验证工作台。
