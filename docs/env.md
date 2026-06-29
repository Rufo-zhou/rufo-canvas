# 环境变量说明

## 1. 文件策略

- `.env.example` 可以提交，用于说明变量名。
- `.env.local` 只能本地创建，不能提交。
- 真实密钥不得写入 Markdown、截图、日志或测试 fixture。

## 2. 运行模式

| 变量 | 可选值 | 说明 |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_MODE` | `demo` / `supabase` | `demo` 使用浏览器本地持久化；`supabase` 使用真实 Auth、Database 与 Storage |

## 3. Supabase

| 变量 | 必填 | 暴露范围 | 说明 |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 是 | 浏览器可见 | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 是 | 浏览器可见 | Supabase anon key |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | 是 | 浏览器可见 | 生成图片与参考图 Storage bucket，默认 `generated-assets` |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端写入时必填 | 服务端 | Service role key |

## 4. Nano Banana

| 变量 | 必填 | 暴露范围 | 说明 |
| --- | --- | --- | --- |
| `NANO_BANANA_API_KEY` | 是 | 服务端 | API Key |
| `NANO_BANANA_API_BASE_URL` | 是 | 服务端 | API Base URL |
| `NANO_BANANA_GENERATE_PATH` | 是 | 服务端 | 生成接口路径 |
| `NANO_BANANA_STATUS_PATH` | 异步任务必填 | 服务端 | 状态查询接口路径，支持 `{id}` |

## 5. GPTlmage2

| 变量 | 必填 | 暴露范围 | 说明 |
| --- | --- | --- | --- |
| `GPTLMAGE2_API_KEY` | 是 | 服务端 | API Key |
| `GPTLMAGE2_API_BASE_URL` | 是 | 服务端 | API Base URL |
| `GPTLMAGE2_GENERATE_PATH` | 是 | 服务端 | 生成接口路径 |
| `GPTLMAGE2_STATUS_PATH` | 异步任务必填 | 服务端 | 状态查询接口路径，支持 `{id}` |

## 6. 共享变量

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `IMAGE_GENERATION_TIMEOUT_MS` | 否 | `60000` | 第三方生图请求超时时间 |
| `IMAGE_GENERATION_MOCK` | 否 | `false` | 本地无第三方密钥时可设为 `true`，使用 mock 图片完成端到端验证 |

## 7. 免费模型供应商

| 变量 | 必填 | 暴露范围 | 说明 |
| --- | --- | --- | --- |
| `POLLINATIONS_API_KEY` | 高级图片、视频模型必填 | 服务端 | Pollinations secret key。启用 Nano Banana、GPT Image、Seedream、Ideogram、Wan、Seedance、Veo、LTX 等模型 |
| `HUGGINGFACE_API_KEY` | Hugging Face 模型必填 | 服务端 | Hugging Face Inference Providers token |
| `AGNES_API_KEY` | Agnes 模型必填 | 服务端 | Agnes AI API Key。启用 Agnes Image 2.0/2.1 与 Agnes Video 2.0 |

以上密钥不允许使用 `NEXT_PUBLIC_` 前缀，不允许写入 GitHub。配置后重启 Next 服务，`GET /api/media-generation` 会把对应模型标记为 `available: true`。

用户也可以在画布右侧 Agent 的“自助接入 API”设置中填写自己的供应商 Key。默认只保存在当前浏览器会话；勾选“在此设备记住密钥”后保存到当前浏览器。密钥仅随对应供应商的生成请求通过 HTTPS 临时发送到服务端，不写入 Supabase、任务记录或日志。

Agnes 视频使用短轮询请求查询异步任务，不要求部署平台维持数分钟的单次 HTTP 长连接。

## 8. 本地创建

```bash
cp .env.example .env.local
```

填写真实值后再启动开发服务。

没有 Supabase 项目时可以先使用：

```text
NEXT_PUBLIC_APP_MODE=demo
IMAGE_GENERATION_MOCK=true
```
