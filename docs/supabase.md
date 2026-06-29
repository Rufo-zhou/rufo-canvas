# Supabase 准备说明

## 1. 环境变量

必需变量：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET
SUPABASE_SERVICE_ROLE_KEY
```

`NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 可在浏览器端使用。

`NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` 默认使用 `generated-assets`，用于参考图和生成图文件。

`SUPABASE_SERVICE_ROLE_KEY` 只能在服务端使用，禁止传入客户端组件、日志或前端 bundle。

## 2. 数据表

### 2.1 `projects`

项目表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `uuid` | 主键 |
| `owner_id` | `uuid` | 项目所有者，引用 `auth.users.id` |
| `name` | `text` | 项目名称 |
| `created_at` | `timestamptz` | 创建时间 |
| `updated_at` | `timestamptz` | 更新时间 |

### 2.2 `canvas_snapshots`

画布快照表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `uuid` | 主键 |
| `project_id` | `uuid` | 所属项目 |
| `version` | `integer` | 快照版本 |
| `snapshot` | `jsonb` | React Flow 序列化数据 |
| `created_by` | `uuid` | 创建者 |
| `created_at` | `timestamptz` | 创建时间 |

### 2.3 `generation_tasks`

生图任务表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `uuid` | 主键 |
| `project_id` | `uuid` | 所属项目 |
| `provider` | `text` | `nano-banana` 或 `gptlmage2` |
| `prompt` | `text` | 正向提示词 |
| `negative_prompt` | `text` | 负向提示词 |
| `status` | `text` | `draft`、`pending`、`processing`、`completed`、`failed` |
| `request_payload` | `jsonb` | 请求快照 |
| `response_payload` | `jsonb` | 第三方返回快照 |
| `error_message` | `text` | 错误摘要 |
| `created_by` | `uuid` | 创建者 |
| `created_at` | `timestamptz` | 创建时间 |
| `updated_at` | `timestamptz` | 更新时间 |

### 2.4 `generated_assets`

生成资产表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `uuid` | 主键 |
| `task_id` | `uuid` | 所属任务 |
| `project_id` | `uuid` | 所属项目 |
| `provider` | `text` | 生图供应商 |
| `prompt` | `text` | 生成 prompt |
| `storage_bucket` | `text` | Supabase Storage bucket |
| `storage_path` | `text` | Supabase Storage path |
| `source_url` | `text` | 第三方原始图片 URL |
| `width` | `integer` | 图片宽度 |
| `height` | `integer` | 图片高度 |
| `mime_type` | `text` | MIME 类型 |
| `metadata` | `jsonb` | 参考图、供应商任务 ID 等扩展信息 |
| `created_by` | `uuid` | 创建者 |
| `created_at` | `timestamptz` | 创建时间 |

## 3. RLS 策略

默认原则：

- 用户只能访问 `owner_id = auth.uid()` 的项目。
- 子表通过 `project_id` 关联 `projects` 判断权限。
- Storage 对象路径以 `{userId}/` 开头，用户只能访问自己路径下的文件。
- 服务端使用 service role 时必须限制业务入口，不能把 service role 暴露给前端。

初始 SQL 见 [supabase/migrations/0001_initial_schema.sql](../supabase/migrations/0001_initial_schema.sql)。

## 4. Storage 建议

建议创建 bucket：

```text
generated-assets
```

路径规则：

```text
{userId}/{projectId}/references/{fileName}
{userId}/{projectId}/generations/{taskId}/{assetId}.png
```

当前策略：

- 参考图上传到 `references` 路径。
- 生成图转存到 `generations` 路径。
- bucket 默认为私有，前端通过签名 URL 展示图片。
- 可在 `generated_assets.source_url` 保留第三方原始图片 URL。
