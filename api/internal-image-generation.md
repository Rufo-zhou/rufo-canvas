# Internal API: Image Generation

## 1. Endpoint

```http
POST /api/image-generation
```

前端只能调用本接口，不允许直接请求 Nano Banana 或 GPTlmage2。

## 2. Request

```json
{
  "projectId": "00000000-0000-0000-0000-000000000000",
  "provider": "nano-banana",
  "prompt": "A product hero image with clean lighting",
  "negativePrompt": "low quality, blurry",
  "referenceImagePath": "user-id/project-id/references/file.png",
  "width": 1024,
  "height": 1024,
  "count": 1,
  "seed": 1234,
  "metadata": {
    "projectId": "project-id",
    "nodeId": "node-id"
  }
}
```

### 字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `projectId` | `string` | 是 | Supabase 项目 ID |
| `provider` | `"nano-banana" | "gptlmage2"` | 是 | 生图供应商 |
| `prompt` | `string` | 是 | 正向提示词 |
| `negativePrompt` | `string` | 否 | 负向提示词 |
| `referenceImagePath` | `string` | 否 | 已上传到 Supabase Storage 的参考图路径 |
| `width` | `number` | 否 | 图片宽度，最大 4096 |
| `height` | `number` | 否 | 图片高度，最大 4096 |
| `count` | `number` | 否 | 生成数量，最大 8 |
| `seed` | `number` | 否 | 随机种子 |
| `metadata` | `object` | 否 | 项目内追踪信息 |

## 3. Success Response

```json
{
  "data": {
    "generation": {
      "id": "provider-task-id",
      "provider": "nano-banana",
      "status": "completed",
      "imageUrl": "https://example.com/generated.png",
      "raw": {}
    },
    "asset": {
      "assetId": "asset-id",
      "imageUrl": "https://signed.supabase.url",
      "storagePath": "user-id/project-id/generations/task-id/file.png",
      "sourceUrl": "https://example.com/generated.png",
      "prompt": "A product hero image with clean lighting",
      "provider": "nano-banana",
      "width": 1024,
      "height": 1024
    }
  }
}
```

### 字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 第三方任务 ID；如供应商未返回则由服务端生成 |
| `provider` | `string` | 生图供应商 |
| `status` | `string` | `pending`、`processing`、`completed`、`failed` |
| `imageUrl` | `string` | 生成图片 URL |
| `raw` | `unknown` | 第三方原始返回，服务端内部可存储 |

`asset` 为前端加入 React Flow 画布所需的项目内资产结构。

## 4. Error Response

```json
{
  "error": {
    "code": "PROVIDER_CONFIG_MISSING",
    "message": "Missing provider endpoint configuration: NANO_BANANA_API_BASE_URL or NANO_BANANA_GENERATE_PATH.",
    "provider": "nano-banana"
  }
}
```

## 5. 错误码

| code | HTTP | 说明 |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | 请求参数不合法 |
| `UNAUTHENTICATED` | 401 | 缺少或无效用户 session |
| `PROVIDER_UNSUPPORTED` | 400 | 不支持的供应商 |
| `PROVIDER_CONFIG_MISSING` | 501 | 服务端供应商配置缺失 |
| `PROVIDER_NETWORK_ERROR` | 502 | 第三方网络请求失败 |
| `PROVIDER_RESPONSE_ERROR` | 第三方状态码 | 第三方返回错误 |
| `PROVIDER_RESPONSE_INVALID` | 502 | 第三方返回结构异常 |
| `INTERNAL_ERROR` | 500 | 未预期错误 |
