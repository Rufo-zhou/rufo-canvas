# GPTlmage2 API 接入文档

## 1. 当前状态

项目已预留 GPTlmage2 provider adapter，但服务名称和官方 API 细节仍需确认。

在未填写以下环境变量前，服务端会返回 `PROVIDER_CONFIG_MISSING`：

```text
GPTLMAGE2_API_KEY
GPTLMAGE2_API_BASE_URL
GPTLMAGE2_GENERATE_PATH
GPTLMAGE2_STATUS_PATH
```

## 2. 命名待确认

当前项目按用户提供名称使用：

```text
GPTlmage2
```

待确认该名称是否应为：

- `GPTImage2`
- `GPT-Image-2`
- 其他供应商名称

代码和文档当前保留 `gptlmage2` 作为 provider id，避免擅自改名导致和现有约定冲突。

## 3. 默认鉴权约定

当前代码按 Bearer Token 发送：

```http
Authorization: Bearer ${GPTLMAGE2_API_KEY}
Content-Type: application/json
```

待确认：

- GPTlmage2 是否使用 Bearer Token。
- 是否需要 organization、project、model 或 account header。

## 4. Generate Request 映射

项目内部请求会被映射为：

```json
{
  "prompt": "A product hero image with clean lighting",
  "negative_prompt": "low quality, blurry",
  "width": 1024,
  "height": 1024,
  "n": 1,
  "seed": 1234,
  "metadata": {}
}
```

待确认：

- 官方字段名。
- 是否支持负向 prompt。
- 是否支持 seed。
- 是否支持批量数量。
- 图片尺寸限制。
- 模型参数是否必填。

## 5. Generate Response 兼容读取

当前 adapter 会尝试读取：

```json
{
  "id": "task-id",
  "status": "completed",
  "imageUrl": "https://example.com/image.png"
}
```

同时兼容：

- `task_id`
- `request_id`
- `image_url`
- `url`
- `output[0].url`
- `output[0].image_url`

待确认：

- 官方任务 ID 字段。
- 官方状态枚举。
- 图片 URL 字段位置。
- 返回 base64 时是否需要服务端转存。

## 6. Status Request

`GPTLMAGE2_STATUS_PATH` 支持 `{id}` 占位符。

示例：

```text
/v1/images/tasks/{id}
```

待确认：

- 是否存在状态查询接口。
- 查询接口 method 是否为 GET。
- 是否需要 body。
