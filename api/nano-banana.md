# Nano Banana API 接入文档

## 1. 当前状态

项目已预留 Nano Banana provider adapter，但缺少服务商官方文档中的真实路径、参数和返回结构。

在未填写以下环境变量前，服务端会返回 `PROVIDER_CONFIG_MISSING`：

```text
NANO_BANANA_API_KEY
NANO_BANANA_API_BASE_URL
NANO_BANANA_GENERATE_PATH
NANO_BANANA_STATUS_PATH
```

## 2. 默认鉴权约定

当前代码按 Bearer Token 发送：

```http
Authorization: Bearer ${NANO_BANANA_API_KEY}
Content-Type: application/json
```

待确认：

- Nano Banana 是否使用 Bearer Token。
- 是否需要额外 header。
- 是否需要账号 ID、模型 ID 或 region。

## 3. Generate Request 映射

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

- 官方字段是否叫 `negative_prompt`。
- 生成数量字段是否叫 `n`。
- 是否支持 `seed`。
- 尺寸字段是否为任意数字或枚举。
- 是否需要 model 字段。

## 4. Generate Response 兼容读取

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
- 官方状态字段枚举。
- 图片 URL 字段位置。
- 异步任务是否需要轮询。

## 5. Status Request

`NANO_BANANA_STATUS_PATH` 支持 `{id}` 占位符。

示例：

```text
/v1/images/tasks/{id}
```

待确认：

- 是否存在状态查询接口。
- 查询接口 method 是否为 GET。
- 是否使用路径参数或 query 参数。
