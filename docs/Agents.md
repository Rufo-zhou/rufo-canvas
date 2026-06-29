# Agents.md

## 1. 文档目的

本文件是当前项目后续所有开发工作的强制执行标准。任何新增功能、重构、修复、接口封装、组件实现、画布能力、后端能力、生图能力和配置调整，都必须遵守本文件约定。

如后续需求、技术方案或实现细节与本文件冲突，应优先更新本文件并明确变更原因，再进行代码实现。

## 2. 技术栈约定

### 2.1 前端框架

- 使用 Next.js 作为应用框架。
- 使用 TypeScript 作为唯一开发语言。
- 使用 Tailwind CSS 作为主要样式方案。
- 页面路由、布局、服务端组件、客户端组件等实现方式必须遵循当前 Next.js 项目的目录结构与版本能力。

### 2.2 画布能力

- 画布、节点、边、拖拽、连线、缩放、布局等可视化编辑能力统一使用 React Flow。
- React Flow 使用 MIT 协议版本，禁止引入协议不兼容或商业授权不明确的画布库替代核心画布能力。
- 与画布相关的节点数据、边数据、视口状态、选中状态、节点配置面板等必须有明确 TypeScript 类型定义。

### 2.3 后端能力

- 后端数据、认证、存储、实时订阅、服务端能力优先使用 Supabase。
- Supabase 客户端初始化、查询、变更、上传、认证等操作必须统一封装在 `lib` 目录下。
- 禁止在页面组件或业务组件中散落编写重复的 Supabase 初始化逻辑。

### 2.4 生图能力

- 项目需要集成第三方生图 API：Nano Banana、GPTlmage2。
- 生图 API 调用必须通过统一服务层封装，不允许在页面或组件中直接硬编码请求地址、鉴权头、密钥或请求细节。
- 生图请求、响应、错误、状态轮询、图片结果、计费字段等结构必须定义 TypeScript 类型。

## 3. 目录规范

项目根目录下核心目录约定如下：

```text
app/
components/
lib/
docs/
```

### 3.1 `app`

`app` 用于存放 Next.js 页面路由与路由级结构。

要求：

- 页面路由、布局、loading、error、not-found 等路由文件放在 `app` 内。
- 路由级数据加载、页面组合和页面状态边界在 `app` 内完成。
- 不应在 `app` 中堆叠复杂业务组件实现；复杂 UI 和业务组件应拆分到 `components`。
- 不应在 `app` 中直接编写底层 Supabase 操作或第三方生图 API 请求。

### 3.2 `components`

`components` 用于存放公共组件、业务组件和可复用 UI 组件。

要求：

- 通用 UI 组件、表单组件、弹窗、工具栏、侧边栏、画布节点、画布边、属性面板等放在 `components`。
- 组件应按职责拆分，避免单个组件承担过多状态、渲染和副作用。
- 组件 props 必须显式定义 TypeScript 类型。
- 可复用组件不得绑定特定页面路由逻辑。
- 画布相关组件建议按功能归类，例如：

```text
components/canvas/
components/forms/
components/layout/
components/ui/
```

### 3.3 `lib`

`lib` 用于封装 Supabase、第三方服务、工具函数和共享业务逻辑。

要求：

- Supabase 客户端创建、服务端客户端、浏览器客户端、认证工具、数据库操作统一放在 `lib/supabase` 或等价子目录。
- Nano Banana、GPTlmage2 等第三方 API 封装统一放在 `lib` 下的服务目录中，例如 `lib/image-generation`。
- 工具函数放在 `lib/utils` 或明确命名的工具文件中。
- `lib` 中的函数应尽量保持纯粹、可测试、可复用。
- 禁止在 `lib` 中读取未声明的全局变量或硬编码环境配置。

### 3.4 `docs`

`docs` 用于存放项目文档。

允许内容：

- 需求文档
- API 文档
- 数据结构说明
- 产品流程
- 技术方案
- 参考图
- 画布节点规范
- 第三方服务接入说明

要求：

- 所有重要需求变更、接口约定、外部服务接入方式应在 `docs` 中留下文档记录。
- 后续开发中若新增关键架构、API 或业务规则，应同步更新 `docs`。

## 4. TypeScript 开发规范

### 4.1 类型要求

- 严格使用 TypeScript 类型。
- 禁止使用隐式 `any`。
- 不得为了绕过类型错误滥用 `any`、`as unknown as` 或宽泛类型。
- API 请求、API 响应、Supabase 数据模型、画布节点、画布边、组件 props、表单数据都必须定义明确类型。
- 公共类型应集中放置在贴近业务的 `types.ts` 文件或专门的类型目录中。

### 4.2 类型命名

- 组件 props 类型使用 `ComponentNameProps` 命名。
- API 响应类型使用 `XxxResponse` 命名。
- API 请求类型使用 `XxxRequest` 或 `XxxPayload` 命名。
- Supabase 表数据类型应尽量与数据库表名和业务含义保持一致。
- React Flow 节点数据类型应明确区分节点外壳和节点业务数据。

示例：

```ts
export type ImageGenerationProvider = "nano-banana" | "gptlmage2";

export type GenerateImageRequest = {
  provider: ImageGenerationProvider;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
};

export type GenerateImageResponse = {
  id: string;
  imageUrl: string;
  provider: ImageGenerationProvider;
  status: "pending" | "processing" | "completed" | "failed";
};
```

## 5. 组件开发规范

### 5.1 拆分原则

- 组件必须按职责拆分。
- 页面组件只负责页面级组合，不承载复杂业务细节。
- 复杂模块应拆分为容器组件、展示组件、表单组件、状态组件和服务调用层。
- 重复出现两次以上且语义一致的 UI 或逻辑，应考虑抽取为可复用组件或 hook。

### 5.2 客户端组件

- 只有需要浏览器状态、事件、React Flow、用户交互、副作用或浏览器 API 的组件才使用 `"use client"`。
- 不应把整个页面无差别标记为客户端组件。
- 客户端组件中不得直接暴露服务端密钥。

### 5.3 样式规范

- 样式优先使用 Tailwind CSS。
- Tailwind class 应保持可读，避免过长且无结构的 class 堆叠。
- 复杂样式应通过组件拆分、变量、工具函数或局部封装降低维护成本。
- 不得引入与 Tailwind CSS 冲突的大型样式体系，除非经过明确技术决策。

## 6. Supabase 使用规范

### 6.1 统一封装

所有 Supabase 操作必须统一封装，禁止在页面或组件中直接重复创建客户端或散落查询逻辑。

推荐结构：

```text
lib/supabase/
  client.ts
  server.ts
  auth.ts
  database.ts
```

### 6.2 环境变量

Supabase 配置必须通过环境变量读取。

允许的公开变量示例：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

服务端专用密钥必须仅在服务端使用，禁止暴露给浏览器：

```text
SUPABASE_SERVICE_ROLE_KEY
```

要求：

- 禁止硬编码 Supabase URL、anon key、service role key。
- 禁止把 `.env`、`.env.local`、密钥截图、密钥文档提交到仓库。
- 服务端密钥只能在服务端代码、API route、server action 或受控服务层中使用。

### 6.3 数据访问

- 数据库读写应封装为语义化函数，例如 `getProjectById`、`createGenerationTask`、`updateCanvasSnapshot`。
- 查询结果必须处理错误状态。
- 不允许忽略 Supabase 返回的 `error`。
- 涉及用户数据的查询必须考虑权限、用户 ID、RLS 策略和越权风险。

## 7. React Flow 画布规范

### 7.1 类型定义

- 节点类型、节点数据、边类型、边数据必须显式声明。
- 不同业务节点应有稳定的 `type`。
- 节点数据不得使用松散对象保存未定义字段。

### 7.2 状态管理

- 画布节点、边、选中项、视口、编辑状态应有清晰的数据来源。
- 持久化数据结构应与 React Flow 内部 UI 状态适当解耦。
- 保存到 Supabase 的画布数据必须是可版本化、可迁移的结构。

### 7.3 扩展规范

- 新增节点类型时，必须同步补充：
  - 节点 TypeScript 类型
  - 节点渲染组件
  - 默认节点数据
  - 属性编辑面板
  - 序列化与持久化逻辑

## 8. 生图 API 集成规范

### 8.1 服务封装

Nano Banana、GPTlmage2 第三方生图能力必须通过统一接口封装。

推荐结构：

```text
lib/image-generation/
  types.ts
  providers.ts
  nano-banana.ts
  gptlmage2.ts
  service.ts
```

### 8.2 Provider 抽象

不同生图供应商应共享统一业务接口。

示例：

```ts
export type ImageGenerationProvider = "nano-banana" | "gptlmage2";

export type ImageGenerationClient = {
  generateImage: (input: GenerateImageRequest) => Promise<GenerateImageResponse>;
  getGenerationStatus?: (id: string) => Promise<GenerateImageResponse>;
};
```

### 8.3 密钥管理

- Nano Banana、GPTlmage2 API Key 必须通过服务端环境变量读取。
- 禁止在客户端组件、前端 bundle、文档示例或测试数据中硬编码真实密钥。
- 前端只能调用本项目后端封装后的接口，不能直接请求第三方生图 API。

推荐环境变量命名：

```text
NANO_BANANA_API_KEY
NANO_BANANA_API_BASE_URL
GPTLMAGE2_API_KEY
GPTLMAGE2_API_BASE_URL
```

### 8.4 错误处理

生图服务必须统一处理以下情况：

- 参数缺失
- prompt 为空
- provider 不支持
- 第三方 API 超时
- 第三方 API 限流
- 第三方 API 鉴权失败
- 生成失败
- 返回结构不符合预期

错误返回应保持结构化，便于前端展示和日志追踪。

### 8.5 图片与视频模型

- 新增生成能力统一使用 `lib/media-generation` 中的模型目录、类型和服务层。
- 模型必须声明媒体类型、供应商、实际模型 ID、是否需要 Key、是否支持参考图。
- 前端展示的“免费”必须与供应商实际政策一致，不得把限时试用或付费模型描述为永久无限免费。
- 无 Key 公共接口必须设置每日生成上限，并明确可能存在限流和无 SLA。
- 图片和视频生成结果必须存入 Supabase Storage，画布快照只保存元数据和 Storage 路径。
- 视频节点必须使用浏览器原生播放控件，并支持画布拖动、缩放、保存和恢复。
- 第三方模型目录变更时，必须同步更新 `docs/free-models.md`。

## 9. API 与服务端规范

- 外部 API 调用必须走服务端封装。
- API route 或 server action 应只负责请求校验、权限校验、调用服务层和返回结构化结果。
- 业务逻辑应优先放在 `lib` 服务层中。
- 所有输入必须校验。
- 所有错误必须有明确处理路径。
- 返回给前端的错误信息不得泄露密钥、内部堆栈或第三方完整响应。

## 10. 配置与安全规范

- 禁止硬编码任何密钥、token、数据库连接串、第三方 API key。
- 所有敏感配置必须通过环境变量读取。
- 客户端可见变量必须使用 `NEXT_PUBLIC_` 前缀，并确认其公开安全性。
- 服务端密钥不得传入客户端组件 props。
- 日志中不得输出密钥、完整鉴权头、用户敏感数据。
- 上传文件、图片 URL、用户输入 prompt 等必须考虑安全校验和权限边界。

## 11. 文档维护规范

- 新增重要功能前，应在 `docs` 中补充需求或技术说明。
- 修改 API 结构时，应同步更新 API 文档。
- 修改 Supabase 表结构、RLS、存储桶或函数时，应同步更新相关文档。
- 新增画布节点类型时，应同步更新节点规范。
- 新增或替换第三方图片、视频供应商时，应同步更新生成 API 与免费额度文档。

## 12. 后续开发执行规则

后续所有开发必须遵守以下规则：

1. 先确认需求是否影响目录结构、API、Supabase、画布或生图能力。
2. 涉及核心约定变更时，先更新 `docs/Agents.md` 或相关文档。
3. 实现代码时严格遵守 Next.js + TypeScript + Tailwind CSS 技术栈。
4. 画布能力统一基于 React Flow 实现。
5. 后端能力统一基于 Supabase 封装。
6. Supabase 和第三方 API 操作必须走 `lib` 服务层。
7. 所有密钥必须使用环境变量，禁止硬编码。
8. 所有公共组件和业务组件必须有明确类型。
9. 所有外部服务调用必须有错误处理。
10. 完成功能后应根据变更范围补充或更新文档。

## 13. 禁止事项

- 禁止使用 JavaScript 替代 TypeScript 编写业务代码。
- 禁止在组件中直接硬编码 Supabase 或第三方 API 密钥。
- 禁止在页面组件中堆叠大量业务逻辑。
- 禁止绕过 `lib` 直接散落调用 Supabase。
- 禁止在客户端直接调用 Nano Banana、GPTlmage2 等第三方生图 API。
- 禁止引入未确认协议兼容性的核心依赖替代 React Flow。
- 禁止提交真实 `.env` 文件或任何真实密钥。
- 禁止忽略 TypeScript 类型错误和外部 API 错误。

## 14. 默认实现优先级

当没有额外说明时，开发优先级如下：

1. 类型安全
2. 密钥安全
3. 清晰目录结构
4. 可维护组件拆分
5. Supabase 统一封装
6. 第三方 API 统一封装
7. 文档同步
8. UI 一致性
9. 可测试性
10. 性能优化

本文件自创建后立即生效，作为当前项目后续所有开发、协作和代码审查的基础规范。
