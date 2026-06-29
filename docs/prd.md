# PRD: Rufo

## 1. 产品定位

Rufo 是一个面向创作者和产品团队的图片与视频生成工作台。用户可以在画布中组织提示词、参考素材、生成任务和媒体结果，并在同一项目内持续迭代。

MVP 目标不是做完整设计协作平台，而是完成可运行、可持久化、可扩展供应商的无限媒体生成画布。

## 2. 目标用户

- 需要批量探索图片创意的设计师
- 需要快速生成商品图、运营图、概念图的产品和市场人员
- 需要把多轮 prompt、生成结果和参数保存成项目资产的内部团队

## 3. 首期范围

### 3.1 必须实现

- 项目工作台首页
- Supabase Auth 登录、注册、退出
- 首页顶部生图输入对话框
- 首页项目卡片列表
- 项目列表页新建、删除项目
- React Flow 画布
- Generation 节点
- Asset 节点
- 任意节点连线、边重连和媒体拖线续作
- 底部浮动工具条
- 右侧对话与 Skill 面板
- 图片与视频供应商目录及用户自带 API Key
- 调用本项目后端 API 发起图片或视频任务
- 生成任务占位节点、实时进度和状态展示
- 生成结果展示
- 上传参考图，支持参考图、首帧、首尾帧、多图和关键帧模式
- 图片与视频结果自动添加到画布
- 画布媒体自由拖动、等比调整尺寸、改名和全屏预览
- 项目生成历史、失败原因、解决办法、再次生成和重新加入画布
- Supabase 保存项目、画布快照、生成任务、生成资产
- Supabase Storage 保存参考图和生成图片
- 中文结构化错误提示与操作建议
- 环境变量驱动配置

### 3.2 暂不实现

- 多人实时协作
- 复杂权限管理后台
- 商业计费系统
- 多版本图像编辑器
- 图层级图片编辑
- 第三方登录以外的企业 SSO

## 4. 页面与路由

### 4.1 `/`

首页。

内容：

- 顶部生图输入对话框
- 最近项目卡片列表
- 登录用户菜单

### 4.2 `/projects`

项目列表页。

内容：

- 全部项目卡片
- 新建项目
- 删除项目

### 4.3 `/projects/[projectId]`

项目默认工作台。

内容：

- 顶部轻量项目栏
- 中间大面积 React Flow 空白画布
- 底部浮动工具条
- 右侧对话与 Skill 面板
- 底部对话输入框

### 4.4 后续可扩展路由

- `/assets`：生成资产库
- `/settings`：用户和供应商配置状态

首期以 `/projects/[projectId]` 作为核心画布页。

## 5. 核心用户流程

### 5.1 创建生成流程

1. 用户进入工作台。
2. 用户在右侧对话输入框输入创作想法，或点击 Skill 进入预设流程。
3. 系统立即创建带目标比例和进度的 Generation 节点。
4. 用户选择可用的图片或视频模型。
5. 用户点击 Generate。
6. 前端调用 `POST /api/media-generation`。
7. 后端调用对应第三方供应商；异步视频通过同一接口轮询。
8. 前端实时更新 Generation 节点状态和进度。
9. 成功后创建 Asset 节点并自动连接任务节点，失败则显示中文原因和解决办法。
10. 后端将媒体文件存入 Supabase Storage。
11. 任务、媒体元数据和画布快照保存到 Supabase，并可在历史记录中恢复。

### 5.2 保存画布

1. 用户调整节点、连线、视口。
2. 用户点击 Save。
3. 前端序列化 React Flow 节点、边、视口。
4. 后端写入 `canvas_snapshots`。
5. 页面提示保存成功。

## 6. 画布节点

### 6.1 Prompt 节点

用途：保存图片生成提示词和基础参数。

字段：

- `prompt`
- `negativePrompt`
- `width`
- `height`
- `seed`
- `metadata`

### 6.2 Generation 节点

用途：表示一次图片或视频生成任务。

字段：

- `provider`
- `model`
- `mediaType`
- `status`
- `taskId`
- `progress`
- `aspectRatio`
- `quality`
- `errorCode`
- `errorMessage`
- `errorSolution`
- `createdAt`

### 6.3 Asset 节点

用途：展示生成图片或视频结果。

字段：

- `assetId`
- `assetUrl`
- `storagePath`
- `mediaType`
- `width`
- `height`
- `mimeType`

## 7. 媒体生成供应商

模型目录见 [docs/free-models.md](./free-models.md)。统一抽象由 `lib/media-generation` 负责，前端不得直接请求第三方供应商。

当前约定：

- 前端只调用 `POST /api/media-generation`
- 服务端读取供应商 API Key
- 服务端统一处理错误
- 服务端统一返回项目内标准结构
- 用户自带 Key 只按请求发送，不写入任务、数据库或日志
- 公共模型按项目规则限制每日共享额度

## 8. Supabase 数据

首期需要以下表：

- `projects`
- `canvas_snapshots`
- `generation_tasks`
- `generated_assets`
- `generated-assets` Storage bucket

详细结构见 [docs/supabase.md](./supabase.md) 与 [supabase/migrations/0001_initial_schema.sql](../supabase/migrations/0001_initial_schema.sql)。

## 9. 权限要求

首期默认每个项目属于一个用户。

要求：

- 用户只能读取自己的项目。
- 用户只能读取自己的画布快照。
- 用户只能读取自己的生成任务。
- 用户只能读取自己的生成资产。
- 用户只能读取、上传、删除自己路径下的 Storage 文件。
- 服务端受控流程可使用 `SUPABASE_SERVICE_ROLE_KEY` 执行必要写入。

## 10. UI 要求

首期采用工作台布局，不做营销落地页。

布局：

- 顶部：轻量项目名称、同步状态、积分或会员入口
- 中间：大面积空白画布，默认只显示轻提示
- 底部：浮动工具条，包含选择、定位、图片、网格、框选、画笔、文字、生成、上传、对话入口
- 左下：画布缩放和图层等低频控制
- 右侧：对话面板、Skill 快捷入口、prompt 输入框

视觉：

- 清晰、紧凑、工具化
- 以白色、浅灰、深色文本为主
- 操作按钮必须有明确图标或文本
- 不使用装饰性渐变背景
- 首屏应接近 `images/reference-lovert-workspace.jpg` 的信息架构和留白比例

参考图见 `images/`。

## 11. 错误处理

必须覆盖：

- 环境变量缺失
- 用户未登录
- prompt 为空
- provider 不支持
- 第三方鉴权失败
- 第三方限流
- 第三方超时
- 第三方返回结构异常
- Supabase 写入失败

所有前端可见生成错误必须包含中文 `message` 和可执行的 `solution`。供应商原始响应、堆栈和密钥不得返回给浏览器。

## 12. 验收标准

首期完成时必须满足：

- `npm run typecheck` 通过
- `npm run lint` 通过
- 首页可以打开
- 登录、注册、退出可用
- 首页项目卡片列表可用
- 项目列表新建、删除可用
- 画布可以渲染
- 顶部轻量栏、底部浮动工具条、右侧对话面板可见
- 生成图片可以自动添加到 React Flow 画布
- 生成任务提交后画布立即显示比例正确的任务节点与进度
- 图片与视频节点可以拖动和调整尺寸
- 媒体拖线到空白处可以创建续作任务，节点之间可以自由连线
- 媒体名称可以编辑，支持全屏预览
- 生成历史可以查看任务、结果、失败原因和解决办法
- 项目、任务、资产、画布快照可持久化到 Supabase
- 参考图和生成图可存入 Supabase Storage
- `.env.example` 覆盖所有必要变量
- `POST /api/media-generation` 有明确请求和返回结构
- Supabase schema 和 RLS 有文档与 migration
- 生图供应商缺真实配置时返回结构化错误，不暴露密钥

## 13. 待确认问题

- 是否需要登录后才能进入工作台？
- 首期是否只支持单项目，还是必须支持项目列表？
- 生成图片是否必须下载并转存 Supabase Storage？
- Nano Banana 官方 API 的真实路径、参数、响应字段是什么？
- GPTlmage2 名称是否准确，是否应为 GPTImage2 或其他服务名？
- GPTlmage2 官方 API 的真实路径、参数、响应字段是什么？
- 图片尺寸枚举是否受供应商限制？
- 是否需要内容安全审核或敏感词拦截？
